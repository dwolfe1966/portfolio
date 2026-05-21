import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { Section } from "@/components/site/Section";
import { ACCOUNT_SESSION_COOKIE, verifyAccountSessionToken } from "@/lib/account-session";
import { getActiveDataSourceSelection } from "@/lib/app-data-source-selection";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { GoogleAdsConnector, GoogleAdsNotTestAccountError, MetaAdsConnector, MetaAdsNotTestAccountError } from "@/lib/ad-connectors";
import type { RemoteAdGroup, RemoteAdUnit, RemoteCampaign, RemotePerformance } from "@/lib/ad-connectors";
import { LIVE_PROVIDER_READS_ENV, liveProviderReadsEnabled } from "@/lib/ad-connectors/live-read-scope";
import { acquisitionProviderDryRunAdapterAvailable } from "@/lib/acquisition-agent-generalization";
import {
  acquisitionProviderSnapshotScopeLabel,
  acquisitionProviderSnapshotSourceLabel
} from "@/lib/acquisition-provider-snapshots";
import { ProviderOperationLink, ProviderOperationSubmit } from "@/components/acquisition/ProviderOperationSubmit";
import { buildProviderWritePreflight } from "@/lib/provider-preflight";
import {
  applyProviderConnectionDatasetAction,
  createProviderFallbackDatasetAction,
  requestProviderWriteDryRunApprovalAction,
  syncProviderConnectionDatasetAction
} from "./actions";

export const dynamic = "force-dynamic";

const PROVIDER_LABEL: Record<string, string> = {
  google_ads: "Google Ads",
  meta_ads: "Meta Ads",
  simulated: "Simulated"
};

type CampaignWithPerformance = {
  campaign: RemoteCampaign;
  performance: RemotePerformance | null;
  perfError: string | null;
};

type ProviderLiveData = {
  campaigns: CampaignWithPerformance[];
  totalCampaignCount: number;
  filteredCampaignCount: number;
  displayedCampaignCount: number;
  campaignPage: number;
  campaignPageCount: number;
  campaignPageSize: number;
  selectedCampaign: RemoteCampaign | null;
  selectedPerformance: RemotePerformance | null;
  adGroups: RemoteAdGroup[];
  ads: RemoteAdUnit[];
  error: string | null;
};
type LatestDataset = {
  id: string;
  name: string;
  rowCounts: unknown;
  metadata: unknown;
  createdAt: Date;
};
type DiagnosticTone = "live" | "progress" | "warning";
type ProviderDiagnostic = {
  key: string;
  label: string;
  status: string;
  tone: DiagnosticTone;
  detail: string;
};

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function connectorForProvider(provider: string, accountUserId: string | null) {
  if (provider === "google_ads") return new GoogleAdsConnector(accountUserId);
  if (provider === "meta_ads") return new MetaAdsConnector(accountUserId);
  return null;
}

async function loadProviderLiveData(
  provider: string,
  externalAccountId: string,
  accountUserId: string | null,
  selectedCampaignId?: string | null,
  selectedAdGroupId?: string | null,
  campaignQuery?: string | null,
  campaignPage?: string | null
): Promise<ProviderLiveData> {
  const connector = connectorForProvider(provider, accountUserId);
  if (!connector) {
    return {
      campaigns: [],
      totalCampaignCount: 0,
      filteredCampaignCount: 0,
      displayedCampaignCount: 0,
      campaignPage: 1,
      campaignPageCount: 1,
      campaignPageSize: 25,
      selectedCampaign: null,
      selectedPerformance: null,
      adGroups: [],
      ads: [],
      error: "Live-data view not yet implemented for this provider."
    };
  }

  try {
    const campaigns = await connector.fetchCampaigns(externalAccountId);
    const end = new Date();
    const start = new Date(end.getTime() - 13 * 86400000);
    const range = { start: isoDate(start), end: isoDate(end) };

    const query = campaignQuery?.trim().toLowerCase() ?? "";
    const filteredCampaigns = query
      ? campaigns.filter((campaign) => `${campaign.name} ${campaign.externalCampaignId} ${campaign.status}`.toLowerCase().includes(query))
      : campaigns;
    const campaignPageSize = 25;
    const campaignPageCount = Math.max(1, Math.ceil(filteredCampaigns.length / campaignPageSize));
    const parsedPage = Number(campaignPage ?? 1);
    const currentPage = Math.min(Math.max(Number.isFinite(parsedPage) ? Math.trunc(parsedPage) : 1, 1), campaignPageCount);
    const pagedCampaigns = filteredCampaigns.slice((currentPage - 1) * campaignPageSize, currentPage * campaignPageSize);

    // Fetch perf for up to the first 8 displayed campaigns to keep page load bounded.
    const limited = pagedCampaigns.slice(0, 8);
    const enriched = await Promise.all(limited.map(async (campaign): Promise<CampaignWithPerformance> => {
      try {
        const performance = await connector.fetchPerformance(externalAccountId, campaign.externalCampaignId, range);
        return { campaign, performance, perfError: null };
      } catch (err) {
        return {
          campaign,
          performance: null,
          perfError: err instanceof Error ? err.message : "unknown error"
        };
      }
    }));

    const rankedCampaigns = enriched.sort((a, b) => {
      const spendDelta = (b.performance?.totals.spendCents ?? 0) - (a.performance?.totals.spendCents ?? 0);
      return spendDelta || (b.performance?.totals.conversions ?? 0) - (a.performance?.totals.conversions ?? 0);
    });
    const enrichedIds = new Set(rankedCampaigns.map((row) => row.campaign.externalCampaignId));
    const displayedCampaigns = [
      ...rankedCampaigns,
      ...pagedCampaigns
        .filter((campaign) => !enrichedIds.has(campaign.externalCampaignId))
        .map((campaign) => ({ campaign, performance: null, perfError: null }))
    ];
    const selectedCampaign = campaigns.find((campaign) => campaign.externalCampaignId === selectedCampaignId)
      ?? displayedCampaigns[0]?.campaign
      ?? campaigns[0]
      ?? null;
    let selectedPerformance: RemotePerformance | null = null;
    let adGroups: RemoteAdGroup[] = [];
    let ads: RemoteAdUnit[] = [];
    if (selectedCampaign) {
      const enrichedSelected = enriched.find((row) => row.campaign.externalCampaignId === selectedCampaign.externalCampaignId);
      const [performanceResult, fetchedAdGroups] = await Promise.all([
        enrichedSelected?.performance
          ? Promise.resolve(enrichedSelected.performance)
          : connector.fetchPerformance(externalAccountId, selectedCampaign.externalCampaignId, range),
        connector.fetchAdGroups(externalAccountId, selectedCampaign.externalCampaignId)
      ]);
      selectedPerformance = performanceResult;
      adGroups = fetchedAdGroups;
      const selectedAdGroup = selectedAdGroupId && adGroups.some((group) => group.externalAdGroupId === selectedAdGroupId)
        ? selectedAdGroupId
        : null;
      ads = await connector.fetchAds(externalAccountId, selectedCampaign.externalCampaignId, selectedAdGroup);
    }

    return {
      campaigns: displayedCampaigns,
      totalCampaignCount: campaigns.length,
      filteredCampaignCount: filteredCampaigns.length,
      displayedCampaignCount: displayedCampaigns.length,
      campaignPage: currentPage,
      campaignPageCount,
      campaignPageSize,
      selectedCampaign,
      selectedPerformance,
      adGroups,
      ads,
      error: null
    };
  } catch (err) {
    if (err instanceof GoogleAdsNotTestAccountError || err instanceof MetaAdsNotTestAccountError) {
      return { campaigns: [], totalCampaignCount: 0, filteredCampaignCount: 0, displayedCampaignCount: 0, campaignPage: 1, campaignPageCount: 1, campaignPageSize: 25, selectedCampaign: null, selectedPerformance: null, adGroups: [], ads: [], error: err.message };
    }
    return {
      campaigns: [],
      totalCampaignCount: 0,
      filteredCampaignCount: 0,
      displayedCampaignCount: 0,
      campaignPage: 1,
      campaignPageCount: 1,
      campaignPageSize: 25,
      selectedCampaign: null,
      selectedPerformance: null,
      adGroups: [],
      ads: [],
      error: err instanceof Error ? err.message : "Failed to fetch live data"
    };
  }
}

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    campaignId?: string;
    adGroupId?: string;
    campaignQ?: string;
    campaignPage?: string;
    syncError?: string;
    syncedDatasetId?: string;
    syncApplied?: string;
    snapshotSource?: string;
  }>;
};

function campaignHref(connectionId: string, campaignId: string, adGroupId?: string | null, campaignQ?: string | null) {
  const params = new URLSearchParams({ campaignId });
  if (adGroupId) params.set("adGroupId", adGroupId);
  if (campaignQ?.trim()) params.set("campaignQ", campaignQ.trim());
  return `/acquisition/connections/${connectionId}?${params.toString()}`;
}

function campaignPageHref(connectionId: string, selected: { campaignId?: string; adGroupId?: string; campaignQ?: string }, page: number) {
  const params = new URLSearchParams();
  if (selected.campaignId) params.set("campaignId", selected.campaignId);
  if (selected.adGroupId) params.set("adGroupId", selected.adGroupId);
  if (selected.campaignQ?.trim()) params.set("campaignQ", selected.campaignQ.trim());
  if (page > 1) params.set("campaignPage", String(page));
  const query = params.toString();
  return query ? `/acquisition/connections/${connectionId}?${query}` : `/acquisition/connections/${connectionId}`;
}

function dryRunContext(connection: { provider: string; externalAccountId: string }, campaign: RemoteCampaign | null, adGroupId?: string | null) {
  const childContext = connection.provider === "meta_ads"
    ? { externalAdSetId: adGroupId ?? null }
    : { externalAdGroupId: adGroupId ?? null };
  return {
    provider: connection.provider,
    operationType: connection.provider === "meta_ads" && adGroupId ? "update_ad_set_budget" : "update_budget",
    externalAccountId: connection.externalAccountId,
    externalCampaignId: campaign?.externalCampaignId ?? null,
    ...childContext
  };
}

function selectedSpendExposureCents(performance: RemotePerformance | null) {
  return performance?.totals.spendCents ?? 0;
}

function preflightTone(severity: string) {
  if (severity === "pass") return "healthy";
  if (severity === "warn") return "watch";
  return "unhealthy";
}

function rowCountTotal(rowCounts: unknown) {
  if (!rowCounts || typeof rowCounts !== "object" || Array.isArray(rowCounts)) return 0;
  return Object.values(rowCounts).reduce((sum, value) => sum + (typeof value === "number" && Number.isFinite(value) ? value : 0), 0);
}

function rowCount(rowCounts: unknown, key: string) {
  if (!rowCounts || typeof rowCounts !== "object" || Array.isArray(rowCounts)) return 0;
  const value = (rowCounts as Record<string, unknown>)[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function datasetRowSummary(dataset: LatestDataset | null) {
  if (!dataset) return "No dataset saved";
  return [
    `${rowCount(dataset.rowCounts, "campaigns").toLocaleString()} campaigns`,
    `${rowCount(dataset.rowCounts, "audiences").toLocaleString()} audiences`,
    `${rowCount(dataset.rowCounts, "creatives").toLocaleString()} creatives`,
    `${rowCount(dataset.rowCounts, "performance").toLocaleString()} performance`
  ].join(" · ");
}

function datasetObjectCountGrid(dataset: LatestDataset) {
  return [
    { label: "Campaigns", value: rowCount(dataset.rowCounts, "campaigns") },
    { label: "Audiences", value: rowCount(dataset.rowCounts, "audiences") },
    { label: "Creatives", value: rowCount(dataset.rowCounts, "creatives") },
    { label: "Performance", value: rowCount(dataset.rowCounts, "performance") }
  ];
}

function providerScopeLevel(campaign: RemoteCampaign | null, adGroupId: string | null, childGroupSingular: string) {
  if (!campaign) return "Account";
  return adGroupId ? childGroupSingular : "Campaign";
}

function providerScopeRows({
  connection,
  campaign,
  adGroup,
  childGroupSingular
}: {
  connection: { externalAccountId: string; accountName: string };
  campaign: RemoteCampaign | null;
  adGroup: RemoteAdGroup | null;
  childGroupSingular: string;
}) {
  return [
    { label: "Account", value: connection.externalAccountId, detail: connection.accountName },
    {
      label: "Campaign",
      value: campaign?.name ?? "None selected",
      detail: campaign ? campaign.externalCampaignId : "Inspect campaigns before syncing a narrower scope."
    },
    {
      label: childGroupSingular === "ad set" ? "Ad set" : "Ad group",
      value: adGroup?.name ?? "All child objects",
      detail: adGroup ? adGroup.externalAdGroupId : "Dataset sync includes every child object under the selected campaign."
    }
  ];
}

function providerSyncPreview({
  live,
  campaign,
  selectedAdGroupId,
  childGroupLabel
}: {
  live: ProviderLiveData | null;
  campaign: RemoteCampaign | null;
  selectedAdGroupId: string | null;
  childGroupLabel: string;
}) {
  if (!live || live.error) {
    return [
      { label: "Campaigns", value: "Blocked" },
      { label: childGroupLabel, value: "Blocked" },
      { label: "Ads", value: "Blocked" },
      { label: "Performance", value: "Blocked" }
    ];
  }
  if (!campaign) {
    return [
      { label: "Campaigns", value: live.totalCampaignCount.toLocaleString() },
      { label: childGroupLabel, value: "Select campaign" },
      { label: "Ads", value: "Select campaign" },
      { label: "Performance", value: "Account scope" }
    ];
  }
  return [
    { label: "Campaigns", value: "1 selected" },
    { label: childGroupLabel, value: selectedAdGroupId ? "1 selected" : live.adGroups.length.toLocaleString() },
    { label: "Ads", value: live.ads.length.toLocaleString() },
    { label: "Performance", value: live.selectedPerformance ? "Last 14 days" : "No rows yet" }
  ];
}

function formatDateTime(date: Date | null | undefined) {
  return date ? new Date(date).toLocaleString() : "None";
}

function tokenStatus(connection: {
  credentialGrant: { status: string; tokenHealthStatus: string } | null;
  expiresAt: Date | null;
}) {
  if (!connection.credentialGrant) {
    return {
      label: "Reconnect required",
      tone: "progress",
      detail: "Credential grant is missing for this connection."
    };
  }
  if (connection.credentialGrant.status !== "active") {
    return {
      label: "Grant inactive",
      tone: "warning",
      detail: `Grant status is ${connection.credentialGrant.status}.`
    };
  }
  if (connection.credentialGrant.tokenHealthStatus === "expired") {
    return {
      label: "Token expired",
      tone: "warning",
      detail: "Reconnect this provider account before syncing."
    };
  }
  const expiresAt = connection.expiresAt?.getTime() ?? 0;
  if (expiresAt > 0 && expiresAt <= Date.now()) {
    return {
      label: "Token expired",
      tone: "warning",
      detail: "Reconnect this provider account before syncing."
    };
  }
  return {
    label: "Token healthy",
    tone: "live",
    detail: `Access token expires ${formatDateTime(connection.expiresAt)}.`
  };
}

function liveDataErrorKind(error: string | null | undefined) {
  if (!error) return null;
  if (error.includes("developer token is not approved")) return "developer_token";
  if (error.includes("PERMISSION_DENIED") || error.includes("does not have permission")) return "permission";
  if (error.includes(LIVE_PROVIDER_READS_ENV) || error.includes("Refusing to fetch from live")) return "live_read_env";
  return "provider_error";
}

function syncStatus({
  connection,
  live,
  latestDataset
}: {
  connection: {
    isTestAccount: boolean;
    credentialGrant: { status: string; tokenHealthStatus: string } | null;
    expiresAt: Date | null;
  };
  live: ProviderLiveData | null;
  latestDataset: LatestDataset | null;
}) {
  const token = tokenStatus(connection);
  if (token.tone === "warning" || token.label === "Reconnect required") return token;
  if (live?.error) {
    const kind = liveDataErrorKind(live.error);
    return {
      label: kind === "developer_token" ? "Developer token blocked" : "Live read blocked",
      tone: "warning",
      detail: liveDataErrorCopy(live.error)
    };
  }
  if (!connection.isTestAccount) {
    return {
      label: liveProviderReadsEnabled() ? "Live read enabled" : "Live read blocked",
      tone: "warning",
      detail: liveProviderReadsEnabled()
        ? "This live provider account can be inspected in read-only mode. Provider writes remain dry-run/governed separately."
        : `This is a live provider account. Set ${LIVE_PROVIDER_READS_ENV}=true and restart localhost to inspect it in read-only mode.`
    };
  }
  if (latestDataset) {
    return {
      label: "Dataset synced",
      tone: "live",
      detail: `${rowCountTotal(latestDataset.rowCounts).toLocaleString()} rows saved ${formatDateTime(latestDataset.createdAt)}.`
    };
  }
  return {
    label: "Ready to sync",
    tone: "progress",
    detail: "Provider objects can be materialized as an acquisition dataset snapshot."
  };
}

function syncErrorCopy(error: string | undefined, provider: string) {
  if (error === "permission_denied" && provider === "google_ads") {
    return "Google Ads denied this account read. If this customer is under a manager account, set GOOGLE_ADS_LOGIN_CUSTOMER_ID to the manager customer id, restart localhost, then retry. Otherwise try another connected customer.";
  }
  if (error === "developer_token_not_approved") {
    return "Live-read inspection is enabled, but Google Ads rejected the request because this developer token is not approved for live customer reads. Apply for Google Ads API Basic or Standard access, or use an approved developer token.";
  }
  if (error === "not_test_account") {
    const providerLabel = PROVIDER_LABEL[provider] ?? "provider";
    return `This is a live ${providerLabel} account. Set ${LIVE_PROVIDER_READS_ENV}=true and restart localhost to inspect it in read-only mode. Provider writes remain dry-run/governed separately.`;
  }
  if (error) {
    return "Provider sync failed. Try another connected account or check the server log for the provider response.";
  }
  return "";
}

function liveDataErrorCopy(error: string) {
  if (error.includes("developer token is not approved")) {
    return "Google Ads rejected this live read because the developer token is not approved for live customer reads. Apply for Google Ads API Basic or Standard access, or use an approved developer token.";
  }
  if (error.includes(LIVE_PROVIDER_READS_ENV) || error.includes("Refusing to fetch from live")) {
    return liveProviderReadsEnabled()
      ? "Live-read inspection is enabled locally, but Google Ads is still blocking this account read. The usual cause is Google Ads developer-token access level for live customers."
      : `This is a live provider account. Set ${LIVE_PROVIDER_READS_ENV}=true and restart localhost to inspect it in read-only mode.`;
  }
  return error;
}

function fallbackProviderCopy(providerLabel: string, liveError: string | null | undefined) {
  if (liveError && liveDataErrorKind(liveError) === "developer_token") {
    return `Create a deterministic acquisition dataset tied to this ${providerLabel} account while live reads wait for provider API approval.`;
  }
  return `Create a deterministic acquisition dataset tied to this ${providerLabel} account while live provider reads are unavailable.`;
}

function buildProviderDiagnostics({
  connection,
  live,
  latestDataset,
  syncReady
}: {
  connection: {
    provider: string;
    externalAccountId: string;
    isTestAccount: boolean;
    credentialGrant: { status: string; tokenHealthStatus: string; environment: string; capabilities: string[] } | null;
    expiresAt: Date | null;
  };
  live: ProviderLiveData | null;
  latestDataset: LatestDataset | null;
  syncReady: boolean;
}): ProviderDiagnostic[] {
  const token = tokenStatus(connection);
  const liveKind = liveDataErrorKind(live?.error);
  const localLiveReadsEnabled = connection.isTestAccount || liveProviderReadsEnabled();
  const providerLabel = PROVIDER_LABEL[connection.provider] ?? connection.provider;

  return [
    {
      key: "oauth",
      label: "OAuth grant",
      status: token.label,
      tone: token.tone === "live" ? "live" : "warning",
      detail: connection.credentialGrant
        ? `${connection.credentialGrant.environment} grant · ${connection.credentialGrant.capabilities.length} capabilities · ${token.detail}`
        : token.detail
    },
    {
      key: "account",
      label: "Account discovery",
      status: "Connected",
      tone: "live",
      detail: `${providerLabel} account ${connection.externalAccountId} is stored and visible to this workspace.`
    },
    {
      key: "live_reads",
      label: "Local live reads",
      status: localLiveReadsEnabled ? "Enabled" : "Blocked",
      tone: localLiveReadsEnabled ? "live" : "warning",
      detail: connection.isTestAccount
        ? "This is a test account, so provider reads are allowed without the live-read opt-in."
        : localLiveReadsEnabled
          ? "Read-only inspection is enabled locally. Provider writes remain dry-run/governed separately."
          : `Set ${LIVE_PROVIDER_READS_ENV}=true and restart localhost before inspecting live accounts.`
    },
    {
      key: "provider_access",
      label: "Provider API access",
      status: liveKind === "developer_token" ? "Token approval needed" : live?.error ? "Blocked" : "Readable",
      tone: live?.error ? "warning" : "live",
      detail: live?.error
        ? liveDataErrorCopy(live.error)
        : "Campaign, audience, creative, and performance reads are available for this account."
    },
    {
      key: "dataset_sync",
      label: "Dataset sync",
      status: latestDataset ? "Synced" : syncReady ? "Ready" : "Blocked",
      tone: latestDataset ? "live" : syncReady ? "progress" : "warning",
      detail: latestDataset
        ? `${rowCountTotal(latestDataset.rowCounts).toLocaleString()} rows saved ${formatDateTime(latestDataset.createdAt)}.`
        : syncReady
          ? "This account can be materialized as an acquisition dataset snapshot."
          : "Dataset sync is waiting on the blocked diagnostic above."
    },
    {
      key: "provider_writes",
      label: "Provider writes",
      status: acquisitionProviderDryRunAdapterAvailable() ? "Dry-run only" : "Adapter unavailable",
      tone: acquisitionProviderDryRunAdapterAvailable() ? "progress" : "warning",
      detail: acquisitionProviderDryRunAdapterAvailable()
        ? "Write proposals can be previewed with provider-shaped dry-runs; live mutations remain governed separately."
        : "No provider write dry-run adapter is available for this workspace."
    }
  ];
}

function syncSuccessCopy(applied: boolean, source?: string) {
  if (source === "fallback") {
    return applied
      ? "Provider-shaped fallback snapshot created and applied to acquisition inputs."
      : "Provider-shaped fallback snapshot created and saved as an acquisition dataset.";
  }
  return applied
    ? "Provider snapshot synced and applied to acquisition inputs."
    : "Provider snapshot synced and saved as an acquisition dataset.";
}

function syncSuccessLabel(applied: boolean, source?: string) {
  if (source === "fallback") return applied ? "Fallback created and applied" : "Fallback created";
  return applied ? "Synced and applied" : "Synced";
}

function materializeActionCopy(syncReady: boolean, providerLabel: string) {
  return syncReady
    ? `Live ${providerLabel} reads are available for this account.`
    : `Live ${providerLabel} reads are blocked for this account. Use the provider-shaped fallback while provider access is pending.`;
}

function providerModeCopy({
  isTestAccount,
  syncReady,
  latestDataset
}: {
  isTestAccount: boolean;
  syncReady: boolean;
  latestDataset: LatestDataset | null;
}) {
  if (syncReady) {
    return {
      label: isTestAccount ? "Test account read path" : "Live read path",
      tone: "live",
      detail: latestDataset
        ? "Live provider reads are available. You can refresh the synced dataset or apply the latest snapshot to Acquisition inputs."
        : "Live provider reads are available. Sync a dataset, then apply it to Acquisition inputs."
    };
  }
  return {
    label: "Fallback path",
    tone: "warning",
    detail: latestDataset
      ? "Live provider reads are blocked, but this account already has a saved provider-shaped snapshot that can be reviewed or applied."
      : "Live provider reads are blocked. Create a provider-shaped fallback snapshot to test the Acquisition workflow while provider approval is pending."
  };
}

function recommendedAction({
  syncReady,
  latestDataset,
  activeProviderDataset,
  live,
  providerLabel
}: {
  syncReady: boolean;
  latestDataset: LatestDataset | null;
  activeProviderDataset: LatestDataset | null;
  live: ProviderLiveData | null;
  providerLabel: string;
}) {
  if (activeProviderDataset) {
    return {
      label: "Active in Acquisition",
      tone: "live",
      detail: "This account already powers Acquisition inputs. Review campaign objects or refresh the dataset when new provider data is available.",
      href: "#provider-object-selection",
      action: "Review provider objects"
    };
  }
  if (latestDataset) {
    return {
      label: "Apply saved dataset",
      tone: "progress",
      detail: "A provider snapshot exists for this account but is not the active Acquisition input source.",
      href: "#workspace-dataset-sync",
      action: "Apply dataset"
    };
  }
  if (syncReady) {
    return {
      label: "Sync provider data",
      tone: "progress",
      detail: `Live ${providerLabel} reads are available. Save a dataset, then apply it to Acquisition inputs.`,
      href: "#workspace-dataset-sync",
      action: "Go to sync"
    };
  }
  if (live?.error) {
    return {
      label: "Use fallback or resolve access",
      tone: "warning",
      detail: liveDataErrorCopy(live.error),
      href: "#workspace-dataset-sync",
      action: "Review options"
    };
  }
  return {
    label: "Review account",
    tone: "progress",
    detail: "Review diagnostics and decide whether to sync live rows or create a provider-shaped fallback dataset.",
    href: "#connection-diagnostics",
    action: "Review diagnostics"
  };
}

export default async function ConnectionDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const selected = await searchParams;
  const cookieStore = await cookies();
  const accountUserId = verifyAccountSessionToken(cookieStore.get(ACCOUNT_SESSION_COOKIE)?.value)?.userId ?? null;
  const ownedOrLegacy = {
    OR: accountUserId
      ? [{ accountUserId }, { accountUserId: null }]
      : [{ accountUserId: null }]
  };

  let connection;
  try {
    connection = await db.adAccountConnection.findFirst({ where: { id, ...ownedOrLegacy }, include: { credentialGrant: true } });
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      return (
        <Section title="Connection">
          <div className="card">
            <p>Connections table is missing. Run database migrations.</p>
          </div>
        </Section>
      );
    }
    throw error;
  }

  if (!connection) notFound();

  const isLiveProvider = connection.provider === "google_ads" || connection.provider === "meta_ads";
  const childGroupLabel = connection.provider === "meta_ads" ? "Ad sets" : "Ad groups";
  const childGroupSingular = connection.provider === "meta_ads" ? "ad set" : "ad group";
  const syncedDatasets = isLiveProvider
    ? await db.workspaceDataset.findMany({
        where: {
          app: "acquisition",
          sourceType: connection.provider,
          OR: accountUserId
            ? [{ accountUserId }, { accountUserId: null }]
            : [{ accountUserId: null }],
          metadata: {
            path: ["connectionId"],
            equals: connection.id
          }
        },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          name: true,
          rowCounts: true,
          metadata: true,
          createdAt: true
        }
      })
    : [];
  const latestDataset = syncedDatasets[0] ?? null;
  const activeSelection = isLiveProvider
    ? await getActiveDataSourceSelection("acquisition", accountUserId)
    : null;
  const activeDatasetId = activeSelection?.mode === "imported" ? activeSelection.datasetId : null;
  const activeProviderDatasetFromHistory = syncedDatasets.find((dataset) => dataset.id === activeDatasetId) ?? null;
  const activeProviderDataset = activeProviderDatasetFromHistory
    ?? (isLiveProvider && activeDatasetId
      ? await db.workspaceDataset.findFirst({
          where: {
            id: activeDatasetId,
            app: "acquisition",
            sourceType: connection.provider,
            OR: accountUserId
              ? [{ accountUserId }, { accountUserId: null }]
              : [{ accountUserId: null }],
            metadata: {
              path: ["connectionId"],
              equals: connection.id
            }
          },
          select: {
            id: true,
            name: true,
            rowCounts: true,
            metadata: true,
            createdAt: true
          }
        })
      : null);
  const displayedSyncedDatasets = activeProviderDataset && !syncedDatasets.some((dataset) => dataset.id === activeProviderDataset.id)
    ? [activeProviderDataset, ...syncedDatasets]
    : syncedDatasets;
  const live = isLiveProvider
    ? await loadProviderLiveData(connection.provider, connection.externalAccountId, accountUserId, selected.campaignId, selected.adGroupId, selected.campaignQ, selected.campaignPage)
    : null;
  const syncState = syncStatus({ connection, live, latestDataset });
  const syncReady = isLiveProvider && syncState.label !== "Production access needed" && syncState.label !== "Developer token blocked" && syncState.label !== "Live read blocked" && syncState.label !== "Token expired" && syncState.label !== "Grant inactive" && syncState.label !== "Reconnect required";
  const providerLabel = PROVIDER_LABEL[connection.provider] ?? connection.provider;
  const diagnostics = isLiveProvider
    ? buildProviderDiagnostics({ connection, live, latestDataset, syncReady })
    : [];
  const providerMode = isLiveProvider
    ? providerModeCopy({ isTestAccount: connection.isTestAccount, syncReady, latestDataset })
    : null;
  const selectedAdGroupId = live?.adGroups.some((group) => group.externalAdGroupId === selected.adGroupId)
    ? selected.adGroupId ?? null
    : null;
  const selectedAdGroup = selectedAdGroupId
    ? live?.adGroups.find((group) => group.externalAdGroupId === selectedAdGroupId) ?? null
    : null;
  const scopeRows = providerScopeRows({
    connection,
    campaign: live?.selectedCampaign ?? null,
    adGroup: selectedAdGroup,
    childGroupSingular
  });
  const syncPreviewRows = providerSyncPreview({
    live,
    campaign: live?.selectedCampaign ?? null,
    selectedAdGroupId,
    childGroupLabel
  });
  const recommended = isLiveProvider
    ? recommendedAction({ syncReady, latestDataset, activeProviderDataset, live, providerLabel })
    : null;
  const preflight = live?.selectedCampaign
    ? buildProviderWritePreflight({
        provider: connection.provider,
        externalAccountId: connection.externalAccountId,
        externalCampaignId: live.selectedCampaign.externalCampaignId,
        externalAdGroupId: connection.provider === "google_ads" ? selectedAdGroupId : null,
        externalAdSetId: connection.provider === "meta_ads" ? selectedAdGroupId : null,
        credentialGrant: connection.credentialGrant,
        liveDataError: live.error,
        providerObjectSelected: true,
        approvalPolicyConfigured: true,
        dryRunAdapterAvailable: acquisitionProviderDryRunAdapterAvailable(),
        measurementConfigured: Boolean(process.env.ACQUISITION_PROVIDER_MEASUREMENT_READY?.trim())
      })
    : buildProviderWritePreflight({
        provider: connection.provider,
        externalAccountId: connection.externalAccountId,
        credentialGrant: connection.credentialGrant,
        liveDataError: live?.error,
        providerObjectSelected: false,
        approvalPolicyConfigured: true,
        dryRunAdapterAvailable: acquisitionProviderDryRunAdapterAvailable(),
        measurementConfigured: Boolean(process.env.ACQUISITION_PROVIDER_MEASUREMENT_READY?.trim())
      });

  return (
    <>
      <Section
        eyebrow="Connection"
        title={`${providerLabel} · ${connection.externalAccountId}`}
      >
        <p>
          {connection.accountName}
          {" · "}
          <span className={`bandText--${connection.isTestAccount ? "healthy" : "unhealthy"}`}>
            {connection.isTestAccount ? "Test account" : "Not a test account"}
          </span>
        </p>
        <div className="ctaRow">
          <Link className="btn" href="/acquisition/connections">Back to connections</Link>
        </div>
      </Section>

      {isLiveProvider && providerMode ? (
        <Section title="Account workflow">
          <div className="grid grid-3">
            <div className="card compact">
              <p className={`statusPill ${providerMode.tone}`}>{providerMode.label}</p>
              <h3 style={{ marginTop: 10 }}>Current path</h3>
              <p className="small">{providerMode.detail}</p>
            </div>
            <div className="card compact">
              <p className="statusPill progress">Dataset action</p>
              <h3 style={{ marginTop: 10 }}>{syncReady ? "Sync live rows" : "Create fallback"}</h3>
              <p className="small">
                {syncReady
                  ? "Save provider campaigns, child groups, ads, and recent performance as a workspace dataset."
                  : "Save deterministic provider-shaped data tied to this account so downstream pages can be tested."}
              </p>
            </div>
            <div className="card compact">
              <p className="statusPill progress">Input action</p>
              <h3 style={{ marginTop: 10 }}>Apply snapshot</h3>
              <p className="small">
                Applying a snapshot changes Acquisition inputs. Saving a dataset alone only stores it in workspace datasets.
              </p>
            </div>
          </div>
        </Section>
      ) : null}

      {isLiveProvider && recommended ? (
        <Section title="Command center">
          <div className="grid grid-4">
            <div className="card compact">
              <p className={`statusPill ${recommended.tone}`}>{recommended.label}</p>
              <h3 style={{ marginTop: 10 }}>Recommended action</h3>
              <p className="small">{recommended.detail}</p>
              <div className="ctaRow">
                <a className="btn smallBtn primary" href={recommended.href}>{recommended.action}</a>
              </div>
            </div>
            <div className="card compact">
              <p className="small">Latest dataset</p>
              <div className="kpi">{latestDataset ? rowCountTotal(latestDataset.rowCounts).toLocaleString() : "0"}</div>
              <p className="small">{datasetRowSummary(latestDataset)}</p>
            </div>
            <div className="card compact">
              <p className="small">Provider campaigns</p>
              <div className="kpi">{live?.totalCampaignCount.toLocaleString() ?? "—"}</div>
              <p className="small">
                {live?.selectedCampaign ? `Selected: ${live.selectedCampaign.name}` : live?.error ? "Provider read blocked" : "No campaign selected"}
              </p>
            </div>
            <div className="card compact">
              <p className="small">Selected scope</p>
              <div className="kpi">{providerScopeLevel(live?.selectedCampaign ?? null, selectedAdGroupId, childGroupSingular)}</div>
              <p className="small">
                {selectedAdGroupId
                  ? `${childGroupLabel.slice(0, -1)} ${selectedAdGroupId}`
                  : live?.selectedCampaign?.externalCampaignId ?? connection.externalAccountId}
              </p>
            </div>
          </div>
        </Section>
      ) : null}

      {isLiveProvider ? (
        <Section title="Selected provider scope">
          <div className="card">
            <div className="grid grid-3">
              {scopeRows.map((row) => (
                <div className="card compact" key={row.label}>
                  <p className="small">{row.label}</p>
                  <h3>{row.value}</h3>
                  <p className="small">{row.detail}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-4" style={{ gap: 8, marginTop: 12 }}>
              {syncPreviewRows.map((row) => (
                <div className="card compact" key={row.label}>
                  <p className="small">{row.label}</p>
                  <strong>{row.value}</strong>
                </div>
              ))}
            </div>
            <p className="small" style={{ marginTop: 12 }}>
              Inspecting provider data only reads from {providerLabel}. Syncing creates a workspace dataset. Applying a dataset changes Acquisition inputs.
            </p>
            <div className="ctaRow">
              <a className="btn smallBtn" href="#provider-object-selection">Inspect provider data</a>
              <a className="btn smallBtn primary" href="#workspace-dataset-sync">Sync or apply dataset</a>
            </div>
          </div>
        </Section>
      ) : null}

      <Section title="Token state">
        <div className="grid grid-3">
          <div className="card">
            <h3>Connected</h3>
            <p className="small">{new Date(connection.createdAt).toLocaleString()}</p>
          </div>
          <div className="card">
            <h3>Last fetch</h3>
            <p className="small">
              {connection.lastFetchedAt ? new Date(connection.lastFetchedAt).toLocaleString() : "—"}
            </p>
          </div>
          <div className="card">
            <h3>Token health</h3>
            <p className={`statusPill ${tokenStatus(connection).tone}`}>{tokenStatus(connection).label}</p>
            <p className="small">{tokenStatus(connection).detail}</p>
            <p className="small" style={{ marginTop: 8 }}>
              {connection.encryptedRefreshToken ? "Refresh token stored." : "No refresh token — reconnect on expiry."}
            </p>
          </div>
        </div>
      </Section>

      {isLiveProvider ? (
        <Section id="connection-diagnostics" title="Connection diagnostics">
          <div className="grid grid-3">
            {diagnostics.map((item) => (
              <div className="card compact" key={item.key}>
                <h3>{item.label}</h3>
                <p className={`statusPill ${item.tone}`}>{item.status}</p>
                <p className="small">{item.detail}</p>
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {isLiveProvider ? (
        <Section id="workspace-dataset-sync" title="Workspace dataset sync">
          <div className="card">
            {selected.syncedDatasetId ? (
              <div className="card compact" style={{ marginBottom: 12 }}>
                <p className={`statusPill ${selected.snapshotSource === "fallback" ? "progress" : "live"}`}>
                  {syncSuccessLabel(selected.syncApplied === "1", selected.snapshotSource)}
                </p>
                <h3 style={{ marginTop: 10 }}>{syncSuccessCopy(selected.syncApplied === "1", selected.snapshotSource)}</h3>
                <p className="small">Dataset {selected.syncedDatasetId.slice(0, 8)} is now listed in this account history.</p>
                <div className="ctaRow">
                  <Link className="btn smallBtn" href={`/workspace/datasets/${selected.syncedDatasetId}`}>Review dataset</Link>
                  <Link className="btn smallBtn primary" href="/acquisition/inputs?imported=1">Open acquisition inputs</Link>
                </div>
              </div>
            ) : null}
            <div className="grid grid-2">
              <div>
                <p className={`statusPill ${syncState.tone}`}>{syncState.label}</p>
                <h3 style={{ marginTop: 12 }}>Materialize this provider account</h3>
                <p className="small">
                  Fetch campaigns, {childGroupLabel.toLowerCase()}, ads, and recent performance from this connection,
                  then save the account-level snapshot as an acquisition dataset that can be applied from Inputs.
                </p>
                <p className={`small ${syncReady ? "bandText--healthy" : "bandText--watch"}`}>
                  {materializeActionCopy(syncReady, providerLabel)}
                </p>
                <div className="ctaRow">
                  <form action={syncProviderConnectionDatasetAction}>
                    <input type="hidden" name="connectionId" value={connection.id} />
                    <ProviderOperationSubmit
                      disabled={!syncReady}
                      pendingLabel="Syncing Google Ads data"
                      pendingDetail="Fetching campaigns, child groups, ads, and recent performance. This can take a moment."
                    >
                      {syncReady ? "Save live dataset only" : "Live sync blocked"}
                    </ProviderOperationSubmit>
                  </form>
                  <form action={syncProviderConnectionDatasetAction}>
                    <input type="hidden" name="connectionId" value={connection.id} />
                    <input type="hidden" name="applyAfterSync" value="1" />
                    <ProviderOperationSubmit
                      className="btn primary"
                      disabled={!syncReady}
                      pendingLabel="Syncing and applying provider data"
                      pendingDetail="Fetching live provider rows, saving a workspace dataset, and switching Acquisition inputs to the new snapshot."
                    >
                      {syncReady ? "Save live dataset and apply" : "Live apply blocked"}
                    </ProviderOperationSubmit>
                  </form>
                </div>
                {!syncReady ? <p className="small bandText--unhealthy">{syncState.detail}</p> : null}
                {!syncReady && connection.credentialGrant ? (
                  <div className="card compact" style={{ marginTop: 12 }}>
                    <p className="statusPill progress">Fallback available</p>
                    <h3 style={{ marginTop: 10 }}>Use provider-shaped fallback data</h3>
                    <p className="small">
                      {fallbackProviderCopy(providerLabel, live?.error)}
                    </p>
                    <div className="ctaRow">
                      <form action={createProviderFallbackDatasetAction}>
                        <input type="hidden" name="connectionId" value={connection.id} />
                        <ProviderOperationSubmit
                          className="btn smallBtn"
                          pendingLabel="Creating fallback dataset"
                          pendingDetail="Saving provider-shaped acquisition data for this account while live reads are unavailable."
                        >
                          Save fallback dataset only
                        </ProviderOperationSubmit>
                      </form>
                      <form action={createProviderFallbackDatasetAction}>
                        <input type="hidden" name="connectionId" value={connection.id} />
                        <input type="hidden" name="applyAfterSync" value="1" />
                        <ProviderOperationSubmit
                          className="btn smallBtn primary"
                          pendingLabel="Creating and applying fallback"
                          pendingDetail="Saving provider-shaped data and switching Acquisition inputs to the fallback snapshot."
                        >
                          Save fallback and apply
                        </ProviderOperationSubmit>
                      </form>
                    </div>
                  </div>
                ) : null}
              </div>
              <div>
                <h3>Active provider snapshot</h3>
                {activeProviderDataset ? (
                  <>
                    <p className="statusPill live">Active inputs source</p>
                    <p style={{ marginTop: 10 }}>
                      <Link href={`/workspace/datasets/${activeProviderDataset.id}`}>{activeProviderDataset.name}</Link>
                    </p>
                    <p className="small">
                      {acquisitionProviderSnapshotSourceLabel(activeProviderDataset.metadata)}
                      {" · "}
                      {acquisitionProviderSnapshotScopeLabel(activeProviderDataset.metadata, { sentenceCase: true })}
                      {" · "}
                      {rowCountTotal(activeProviderDataset.rowCounts).toLocaleString()} rows
                      {" · "}
                      {formatDateTime(activeProviderDataset.createdAt)}
                    </p>
                    <div className="grid grid-4" style={{ gap: 8, marginTop: 12 }}>
                      {datasetObjectCountGrid(activeProviderDataset).map((item) => (
                        <div className="card compact" key={item.label}>
                          <p className="small">{item.label}</p>
                          <strong>{item.value.toLocaleString()}</strong>
                        </div>
                      ))}
                    </div>
                    <div className="ctaRow">
                      <Link className="btn smallBtn primary" href="/acquisition/inputs?imported=1">Open acquisition inputs</Link>
                      <Link className="btn smallBtn" href={`/workspace/datasets/${activeProviderDataset.id}`}>Review dataset</Link>
                    </div>
                  </>
                ) : activeSelection?.mode === "imported" ? (
                  <>
                    <p className="statusPill progress">Different dataset active</p>
                    <p className="small">
                      Acquisition inputs are currently powered by {activeSelection.label}. Apply a provider snapshot below to switch this account into inputs.
                    </p>
                  </>
                ) : latestDataset ? (
                  <>
                    <p className="statusPill progress">Ready to apply</p>
                    <p>
                      <Link href={`/workspace/datasets/${latestDataset.id}`}>{latestDataset.name}</Link>
                    </p>
                    <p className="small">
                      Latest sync · {rowCountTotal(latestDataset.rowCounts).toLocaleString()} rows · {formatDateTime(latestDataset.createdAt)}
                    </p>
                    <p className="small">{datasetRowSummary(latestDataset)}</p>
                    <div className="ctaRow">
                      <Link className="btn smallBtn primary" href="/acquisition/inputs?imported=1">Open acquisition inputs</Link>
                      <Link className="btn smallBtn" href={`/workspace/datasets/${latestDataset.id}`}>Review dataset</Link>
                    </div>
                  </>
                ) : (
                  <p className="small">No acquisition dataset has been synced from this provider account yet.</p>
                )}
              </div>
            </div>
            {selected.syncError ? (
              <p className="small bandText--unhealthy">{syncErrorCopy(selected.syncError, connection.provider)}</p>
            ) : null}
          </div>
        </Section>
      ) : null}

      {isLiveProvider && displayedSyncedDatasets.length > 0 ? (
        <Section title="Synced dataset history">
          <div className="tableScroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Dataset</th>
                  <th>Scope</th>
                  <th>Objects</th>
                  <th>Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {displayedSyncedDatasets.map((dataset) => (
                  <tr key={dataset.id}>
                    <td>
                      <Link href={`/workspace/datasets/${dataset.id}`}>{dataset.name}</Link>
                      <p className="small">{acquisitionProviderSnapshotSourceLabel(dataset.metadata)}</p>
                      {dataset.id === latestDataset?.id ? <p className="small">Latest sync</p> : null}
                      {dataset.id === activeDatasetId ? <p className="small">Active inputs source</p> : null}
                    </td>
                    <td>{acquisitionProviderSnapshotScopeLabel(dataset.metadata, { sentenceCase: true })}</td>
                    <td>
                      <strong>{rowCountTotal(dataset.rowCounts).toLocaleString()} total</strong>
                      <p className="small">{datasetRowSummary(dataset)}</p>
                    </td>
                    <td>{formatDateTime(dataset.createdAt)}</td>
                    <td>
                      <div className="ctaRow">
                        <Link className="btn smallBtn" href={`/workspace/datasets/${dataset.id}`}>Review</Link>
                        <form action={applyProviderConnectionDatasetAction}>
                          <input type="hidden" name="connectionId" value={connection.id} />
                          <input type="hidden" name="datasetId" value={dataset.id} />
                          <ProviderOperationSubmit
                            className="btn smallBtn primary"
                            disabled={dataset.id === activeDatasetId}
                            pendingLabel="Applying dataset"
                            pendingDetail="Switching Acquisition inputs, simulations, campaigns, and outputs to this provider snapshot."
                          >
                            {dataset.id === activeDatasetId ? "Active inputs" : "Apply to inputs"}
                          </ProviderOperationSubmit>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      ) : null}

      <Section title="Provider preflight">
        <p className={`statusPill ${preflight.status === "blocked" ? "warning" : preflight.status === "ready" ? "live" : "progress"}`}>
          {preflight.status}
        </p>
        <p className="small">
          Approval: {preflight.readyForApproval ? "ready" : "blocked"} · Execution: {preflight.readyForExecution ? "ready" : "blocked"}
        </p>
        <div className="grid grid-3">
          {preflight.checks.map((check) => (
            <div className="card compact" key={check.key}>
              <h3>{check.label}</h3>
              <p className={`small bandText--${preflightTone(check.severity)}`}>{check.severity}</p>
              <p className="small">{check.detail}</p>
            </div>
          ))}
        </div>
      </Section>

      {!isLiveProvider ? (
        <Section title="Live data">
          <div className="card">
            <p>Live-data view not yet implemented for provider <code className="small">{connection.provider}</code>.</p>
          </div>
        </Section>
      ) : (
        <>
          <Section id="provider-object-selection" title="Inspect provider data">
            {live?.error ? (
              <div className="card">
                <p className="bandText--unhealthy small">Could not fetch campaigns: {liveDataErrorCopy(live.error)}</p>
                <p className="small">Live-read inspection: {liveProviderReadsEnabled() ? "enabled" : "blocked"}</p>
                {(!liveProviderReadsEnabled() && (live.error.includes(LIVE_PROVIDER_READS_ENV) || live.error.includes("live"))) ? (
                  <div className="ctaRow">
                    <code className="small">{LIVE_PROVIDER_READS_ENV}=true</code>
                    <p className="small">Add this to `.env.local`, restart localhost, then reload this account. This only enables read-only provider inspection.</p>
                  </div>
                ) : null}
              </div>
            ) : live && live.campaigns.length === 0 ? (
              <div className="card">
                <p>
                  {live.totalCampaignCount > 0
                    ? "No campaigns match this search."
                    : `No campaigns were returned for this ${providerLabel} account yet.`}
                </p>
                <p className="small">
                  {live.totalCampaignCount > 0
                    ? "Clear or broaden the search to inspect the campaigns Google returned."
                    : "If this is a newly connected or newly launched account, wait for campaign objects and performance rows to accrue in the provider, then reload this page. Dataset fallback remains available from Workspace dataset sync."}
                </p>
                {live.totalCampaignCount > 0 ? (
                  <div className="ctaRow">
                    <Link className="btn smallBtn" href={`/acquisition/connections/${connection.id}`}>Clear search</Link>
                  </div>
                ) : null}
              </div>
            ) : (
              <>
              <div className="card compact" style={{ marginBottom: 12 }}>
                <p className="small">
                  Showing {live?.displayedCampaignCount.toLocaleString() ?? "0"} of {live?.filteredCampaignCount.toLocaleString() ?? "0"} matching campaigns
                  {live && live.filteredCampaignCount !== live.totalCampaignCount ? ` from ${live.totalCampaignCount.toLocaleString()} total` : ""}.
                  This section only inspects provider objects; use Workspace dataset sync to save or apply data.
                </p>
                <form className="grid grid-3" style={{ marginTop: 12 }}>
                  {selected.campaignId ? <input type="hidden" name="campaignId" value={selected.campaignId} /> : null}
                  {selected.adGroupId ? <input type="hidden" name="adGroupId" value={selected.adGroupId} /> : null}
                  <label>
                    Search campaigns
                    <input name="campaignQ" defaultValue={selected.campaignQ ?? ""} placeholder="Campaign name, id, or status" />
                  </label>
                  <div className="ctaRow" style={{ alignSelf: "end" }}>
                    <button className="btn smallBtn primary" type="submit">Apply search</button>
                    <Link className="btn smallBtn" href={`/acquisition/connections/${connection.id}`}>Clear</Link>
                  </div>
                </form>
                {live && live.campaignPageCount > 1 ? (
                  <div className="ctaRow" style={{ marginTop: 12 }}>
                    <Link
                      className="btn smallBtn"
                      aria-disabled={live.campaignPage <= 1}
                      href={campaignPageHref(connection.id, selected, Math.max(1, live.campaignPage - 1))}
                    >
                      Previous
                    </Link>
                    <span className="small">
                      Page {live.campaignPage.toLocaleString()} of {live.campaignPageCount.toLocaleString()} · {live.campaignPageSize.toLocaleString()} per page
                    </span>
                    <Link
                      className="btn smallBtn"
                      aria-disabled={live.campaignPage >= live.campaignPageCount}
                      href={campaignPageHref(connection.id, selected, Math.min(live.campaignPageCount, live.campaignPage + 1))}
                    >
                      Next
                    </Link>
                  </div>
                ) : null}
              </div>
              <div className="tableScroll">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Campaign</th>
                      <th>Status</th>
                      <th>Recent spend</th>
                      <th>Conversions</th>
                      <th>Start</th>
                      <th>End</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {live?.campaigns.map((row) => (
                      <tr key={row.campaign.externalCampaignId}>
                        <td>
                          <code className="small">{row.campaign.externalCampaignId}</code>
                          <div>{row.campaign.name}</div>
                          {row.campaign.externalCampaignId === live.selectedCampaign?.externalCampaignId ? (
                            <div className="small bandText--healthy">Selected campaign</div>
                          ) : null}
                        </td>
                        <td>
                          <span className={`small bandText--${
                            row.campaign.status === "ENABLED" ? "healthy"
                            : row.campaign.status === "PAUSED" ? "watch"
                            : "neutral"
                          }`}>
                            {row.campaign.status}
                          </span>
                        </td>
                        <td>
                          {row.performance ? `$${(row.performance.totals.spendCents / 100).toFixed(2)}` : "—"}
                        </td>
                        <td>{row.performance ? row.performance.totals.conversions.toLocaleString() : "—"}</td>
                        <td>{row.campaign.startDate ?? "—"}</td>
                        <td>{row.campaign.endDate ?? "—"}</td>
                        <td>
                          <ProviderOperationLink
                            className="btn smallBtn"
                            href={campaignHref(connection.id, row.campaign.externalCampaignId, null, selected.campaignQ)}
                            pendingLabel="Inspecting campaign"
                            pendingDetail="Fetching selected campaign performance, child groups, and ads from the provider."
                          >
                            Inspect
                          </ProviderOperationLink>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </>
            )}
          </Section>

          {live?.selectedCampaign ? (
            <Section title={`Selected campaign · ${live.selectedCampaign.name}`}>
              <div className="grid grid-2">
                <div className="card">
                  <h3>Last 14 days</h3>
                  {live.selectedPerformance ? (
                    <div className="grid grid-2" style={{ gap: 8 }}>
                      <div>
                        <p className="small">Impressions</p>
                        <div className="kpi">{live.selectedPerformance.totals.impressions.toLocaleString()}</div>
                      </div>
                      <div>
                        <p className="small">Clicks</p>
                        <div className="kpi">{live.selectedPerformance.totals.clicks.toLocaleString()}</div>
                      </div>
                      <div>
                        <p className="small">Conversions</p>
                        <div className="kpi">{live.selectedPerformance.totals.conversions.toLocaleString()}</div>
                      </div>
                      <div>
                        <p className="small">Spend</p>
                        <div className="kpi">${(live.selectedPerformance.totals.spendCents / 100).toFixed(2)}</div>
                      </div>
                    </div>
                  ) : (
                    <p className="small">No performance data returned.</p>
                  )}
                </div>
                <div className="card">
                  <h3>Selected provider scope</h3>
                  <p className="small">
                    This is the current sync/write-review scope. The account page above shows exactly which provider objects will be included before you save a dataset.
                  </p>
                  <div className="grid grid-2" style={{ gap: 8 }}>
                    {syncPreviewRows.map((row) => (
                      <div className="card compact" key={row.label}>
                        <p className="small">{row.label}</p>
                        <strong>{row.value}</strong>
                      </div>
                    ))}
                  </div>
                  <pre className="code">{JSON.stringify(dryRunContext(connection, live.selectedCampaign, selectedAdGroupId), null, 2)}</pre>
                  <div className="ctaRow">
                    <form action={syncProviderConnectionDatasetAction}>
                      <input type="hidden" name="connectionId" value={connection.id} />
                      <input type="hidden" name="externalCampaignId" value={live.selectedCampaign.externalCampaignId} />
                      {connection.provider === "meta_ads" ? (
                        <input type="hidden" name="externalAdSetId" value={selectedAdGroupId ?? ""} />
                      ) : (
                        <input type="hidden" name="externalAdGroupId" value={selectedAdGroupId ?? ""} />
                      )}
                      <ProviderOperationSubmit
                        disabled={!syncReady}
                        pendingLabel="Syncing selected provider scope"
                        pendingDetail={`Fetching the selected campaign${selectedAdGroupId ? ` and ${childGroupSingular}` : ""}, then saving it as a workspace dataset.`}
                      >
                        Save selected dataset only
                      </ProviderOperationSubmit>
                    </form>
                    <form action={syncProviderConnectionDatasetAction}>
                      <input type="hidden" name="connectionId" value={connection.id} />
                      <input type="hidden" name="externalCampaignId" value={live.selectedCampaign.externalCampaignId} />
                      <input type="hidden" name="applyAfterSync" value="1" />
                      {connection.provider === "meta_ads" ? (
                        <input type="hidden" name="externalAdSetId" value={selectedAdGroupId ?? ""} />
                      ) : (
                        <input type="hidden" name="externalAdGroupId" value={selectedAdGroupId ?? ""} />
                      )}
                      <ProviderOperationSubmit
                        className="btn primary"
                        disabled={!syncReady}
                        pendingLabel="Syncing selected scope and applying"
                        pendingDetail={`Fetching the selected campaign${selectedAdGroupId ? ` and ${childGroupSingular}` : ""}, saving it, and switching Acquisition inputs to that snapshot.`}
                      >
                        Save selected and apply
                      </ProviderOperationSubmit>
                    </form>
                  </div>
                  {!syncReady ? <p className="small bandText--unhealthy">{syncState.detail}</p> : null}
                  <form action={requestProviderWriteDryRunApprovalAction} className="stackForm">
                    <input type="hidden" name="connectionId" value={connection.id} />
                    <input type="hidden" name="provider" value={connection.provider} />
                    <input type="hidden" name="externalAccountId" value={connection.externalAccountId} />
                    <input type="hidden" name="externalCampaignId" value={live.selectedCampaign.externalCampaignId} />
                    <input type="hidden" name="campaignName" value={live.selectedCampaign.name} />
                    <input type="hidden" name="operationType" value={connection.provider === "meta_ads" && selectedAdGroupId ? "update_ad_set_budget" : "update_budget"} />
                    <input type="hidden" name="spendExposureCents" value={selectedSpendExposureCents(live.selectedPerformance)} />
                    {connection.provider === "meta_ads" ? (
                      <input type="hidden" name="externalAdSetId" value={selectedAdGroupId ?? ""} />
                    ) : (
                      <input type="hidden" name="externalAdGroupId" value={selectedAdGroupId ?? ""} />
                    )}
                    <ProviderOperationSubmit
                      className="btn primary"
                      disabled={!preflight.readyForApproval}
                      pendingLabel="Creating approval request"
                      pendingDetail="Packaging the selected provider account, campaign, and operation context for Agent Operations review."
                    >
                      Request dry-run approval
                    </ProviderOperationSubmit>
                    {!preflight.readyForApproval ? (
                      <p className="small bandText--unhealthy">Resolve provider preflight blockers before requesting approval.</p>
                    ) : null}
                  </form>
                </div>
              </div>
            </Section>
          ) : null}

          {live?.selectedCampaign ? (
            <Section title={childGroupLabel}>
              {live.adGroups.length === 0 ? (
                <div className="card">
                  <p>No {childGroupLabel.toLowerCase()} were returned for this campaign.</p>
                  <p className="small">
                    You can still sync at campaign scope. If this campaign is new, wait for provider child objects to accrue, then inspect again.
                  </p>
                </div>
              ) : (
                <div className="tableScroll">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>{childGroupSingular === "ad set" ? "Ad set" : "Ad group"}</th>
                        <th>Status</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {live.adGroups.map((group) => (
                        <tr key={group.externalAdGroupId}>
                          <td>
                            <code className="small">{group.externalAdGroupId}</code>
                            <div>{group.name}</div>
                          </td>
                          <td>{group.status}</td>
                          <td>
                            <ProviderOperationLink
                              className="btn smallBtn"
                              href={campaignHref(connection.id, live.selectedCampaign!.externalCampaignId, group.externalAdGroupId, selected.campaignQ)}
                              pendingLabel={`Selecting ${childGroupSingular}`}
                              pendingDetail="Refreshing provider ads and selected-scope performance for this account."
                            >
                              Select
                            </ProviderOperationLink>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>
          ) : null}

          {live?.selectedCampaign ? (
            <Section title={selectedAdGroupId ? `Ads in selected ${childGroupSingular}` : "Ads in selected campaign"}>
              {live.ads.length === 0 ? (
                <div className="card">
                  <p>No ads were returned for this scope.</p>
                  <p className="small">
                    The selected campaign can still be saved as a dataset. If ads are newly created or paused, wait for provider data to accrue and reload.
                  </p>
                </div>
              ) : (
                <div className="tableScroll">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Ad</th>
                        <th>{childGroupSingular === "ad set" ? "Ad set" : "Ad group"}</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {live.ads.map((ad) => (
                        <tr key={ad.externalAdId}>
                          <td>
                            <code className="small">{ad.externalAdId}</code>
                            <div>{ad.name}</div>
                          </td>
                          <td><code className="small">{ad.externalAdGroupId ?? "—"}</code></td>
                          <td>{ad.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>
          ) : null}

          {live && live.campaigns.some((row) => row.perfError) ? (
            <Section title="Performance read warnings">
              <div className="grid grid-2">
                {live.campaigns.filter((row) => row.perfError).map((row) => (
                  <div className="card" key={row.campaign.externalCampaignId}>
                    <h3>{row.campaign.name}</h3>
                    <p className="bandText--unhealthy small">Performance error: {row.perfError}</p>
                  </div>
                ))}
              </div>
            </Section>
          ) : null}
        </>
      )}
    </>
  );
}
