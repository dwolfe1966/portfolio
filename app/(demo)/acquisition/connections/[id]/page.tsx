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
import { acquisitionProviderDryRunAdapterAvailable } from "@/lib/acquisition-agent-generalization";
import { acquisitionProviderSnapshotScopeLabel } from "@/lib/acquisition-provider-snapshots";
import { buildProviderWritePreflight } from "@/lib/provider-preflight";
import {
  applyProviderConnectionDatasetAction,
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
  selectedAdGroupId?: string | null
): Promise<ProviderLiveData> {
  const connector = connectorForProvider(provider, accountUserId);
  if (!connector) {
    return { campaigns: [], selectedCampaign: null, selectedPerformance: null, adGroups: [], ads: [], error: "Live-data view not yet implemented for this provider." };
  }

  try {
    const campaigns = await connector.fetchCampaigns(externalAccountId);
    const end = new Date();
    const start = new Date(end.getTime() - 13 * 86400000);
    const range = { start: isoDate(start), end: isoDate(end) };

    // Fetch perf for up to the first 8 campaigns to keep page load bounded.
    const limited = campaigns.slice(0, 8);
    const enriched: CampaignWithPerformance[] = [];
    for (const campaign of limited) {
      try {
        const performance = await connector.fetchPerformance(externalAccountId, campaign.externalCampaignId, range);
        enriched.push({ campaign, performance, perfError: null });
      } catch (err) {
        enriched.push({
          campaign,
          performance: null,
          perfError: err instanceof Error ? err.message : "unknown error"
        });
      }
    }

    const selectedCampaign = campaigns.find((campaign) => campaign.externalCampaignId === selectedCampaignId)
      ?? campaigns[0]
      ?? null;
    let selectedPerformance: RemotePerformance | null = null;
    let adGroups: RemoteAdGroup[] = [];
    let ads: RemoteAdUnit[] = [];
    if (selectedCampaign) {
      selectedPerformance = await connector.fetchPerformance(externalAccountId, selectedCampaign.externalCampaignId, range);
      adGroups = await connector.fetchAdGroups(externalAccountId, selectedCampaign.externalCampaignId);
      const selectedAdGroup = selectedAdGroupId && adGroups.some((group) => group.externalAdGroupId === selectedAdGroupId)
        ? selectedAdGroupId
        : null;
      ads = await connector.fetchAds(externalAccountId, selectedCampaign.externalCampaignId, selectedAdGroup);
    }

    return { campaigns: enriched, selectedCampaign, selectedPerformance, adGroups, ads, error: null };
  } catch (err) {
    if (err instanceof GoogleAdsNotTestAccountError || err instanceof MetaAdsNotTestAccountError) {
      return { campaigns: [], selectedCampaign: null, selectedPerformance: null, adGroups: [], ads: [], error: err.message };
    }
    return {
      campaigns: [],
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
    syncError?: string;
    syncedDatasetId?: string;
    syncApplied?: string;
  }>;
};

function campaignHref(connectionId: string, campaignId: string, adGroupId?: string | null) {
  const params = new URLSearchParams({ campaignId });
  if (adGroupId) params.set("adGroupId", adGroupId);
  return `/acquisition/connections/${connectionId}?${params.toString()}`;
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
  if (!connection.isTestAccount) {
    return {
      label: "Production access needed",
      tone: "warning",
      detail: "This account is connected, but provider API production access is required before the app can read and sync it."
    };
  }
  if (live?.error) {
    return {
      label: "Live read blocked",
      tone: "warning",
      detail: live.error
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
  if (error === "not_test_account") {
    return "This account is not marked as a Google Ads test account, so the demo will not read or mutate it.";
  }
  if (error) {
    return "Provider sync failed. Try another connected account or check the server log for the provider response.";
  }
  return "";
}

function syncSuccessCopy(applied: boolean) {
  return applied
    ? "Provider snapshot synced and applied to acquisition inputs."
    : "Provider snapshot synced and saved as an acquisition dataset.";
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

  const isGoogle = connection.provider === "google_ads";
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
  const activeProviderDataset = syncedDatasets.find((dataset) => dataset.id === activeDatasetId) ?? null;
  const live = isLiveProvider
    ? await loadProviderLiveData(connection.provider, connection.externalAccountId, accountUserId, selected.campaignId, selected.adGroupId)
    : null;
  const syncState = syncStatus({ connection, live, latestDataset });
  const syncReady = isLiveProvider && syncState.label !== "Production access needed" && syncState.label !== "Live read blocked" && syncState.label !== "Token expired" && syncState.label !== "Grant inactive" && syncState.label !== "Reconnect required";
  const selectedAdGroupId = live?.adGroups.some((group) => group.externalAdGroupId === selected.adGroupId)
    ? selected.adGroupId
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
        title={`${PROVIDER_LABEL[connection.provider] ?? connection.provider} · ${connection.externalAccountId}`}
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
        <Section title="Workspace dataset sync">
          <div className="card">
            {selected.syncedDatasetId ? (
              <div className="card compact" style={{ marginBottom: 12 }}>
                <p className="statusPill live">{selected.syncApplied === "1" ? "Synced and applied" : "Synced"}</p>
                <h3 style={{ marginTop: 10 }}>{syncSuccessCopy(selected.syncApplied === "1")}</h3>
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
                <div className="ctaRow">
                  <form action={syncProviderConnectionDatasetAction}>
                    <input type="hidden" name="connectionId" value={connection.id} />
                    <button className="btn" type="submit" disabled={!syncReady}>Sync dataset only</button>
                  </form>
                  <form action={syncProviderConnectionDatasetAction}>
                    <input type="hidden" name="connectionId" value={connection.id} />
                    <input type="hidden" name="applyAfterSync" value="1" />
                    <button className="btn primary" type="submit" disabled={!syncReady}>Sync and apply to inputs</button>
                  </form>
                </div>
                {!syncReady ? <p className="small bandText--unhealthy">{syncState.detail}</p> : null}
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
                      {acquisitionProviderSnapshotScopeLabel(activeProviderDataset.metadata, { sentenceCase: true })}
                      {" · "}
                      {rowCountTotal(activeProviderDataset.rowCounts).toLocaleString()} rows
                      {" · "}
                      {formatDateTime(activeProviderDataset.createdAt)}
                    </p>
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

      {isLiveProvider && syncedDatasets.length > 0 ? (
        <Section title="Synced dataset history">
          <table className="table">
            <thead>
              <tr>
                <th>Dataset</th>
                <th>Scope</th>
                <th>Rows</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {syncedDatasets.map((dataset) => (
                <tr key={dataset.id}>
                  <td>
                    <Link href={`/workspace/datasets/${dataset.id}`}>{dataset.name}</Link>
                    {dataset.id === latestDataset?.id ? <p className="small">Latest sync</p> : null}
                    {dataset.id === activeDatasetId ? <p className="small">Active inputs source</p> : null}
                  </td>
                  <td>{acquisitionProviderSnapshotScopeLabel(dataset.metadata, { sentenceCase: true })}</td>
                  <td>{rowCountTotal(dataset.rowCounts).toLocaleString()}</td>
                  <td>{formatDateTime(dataset.createdAt)}</td>
                  <td>
                    <div className="ctaRow">
                      <Link className="btn smallBtn" href={`/workspace/datasets/${dataset.id}`}>Review</Link>
                      <form action={applyProviderConnectionDatasetAction}>
                        <input type="hidden" name="connectionId" value={connection.id} />
                        <input type="hidden" name="datasetId" value={dataset.id} />
                        <button className="btn smallBtn primary" type="submit" disabled={dataset.id === activeDatasetId}>
                          {dataset.id === activeDatasetId ? "Active" : "Apply"}
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
          <Section title="Provider object selection">
            {live?.error ? (
              <div className="card">
                <p className="bandText--unhealthy small">Could not fetch campaigns: {live.error}</p>
              </div>
            ) : live && live.campaigns.length === 0 ? (
              <div className="card">
                <p>No campaigns found in this test account. Create a campaign in Google Ads to see live data here.</p>
              </div>
            ) : (
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
                        <Link className="btn smallBtn" href={campaignHref(connection.id, row.campaign.externalCampaignId)}>
                          Inspect
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                    Use this selection to materialize only the current campaign
                    {selectedAdGroupId ? ` and ${childGroupSingular}` : ""}, or to request a provider-write dry-run.
                  </p>
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
                      <button className="btn" type="submit" disabled={!syncReady}>Sync selected scope</button>
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
                      <button className="btn primary" type="submit" disabled={!syncReady}>Sync selected and apply</button>
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
                    <button className="btn primary" type="submit" disabled={!preflight.readyForApproval}>Request dry-run approval</button>
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
                  <p>No {childGroupLabel.toLowerCase()} found for this campaign.</p>
                </div>
              ) : (
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
                          <Link
                            className="btn smallBtn"
                            href={campaignHref(connection.id, live.selectedCampaign!.externalCampaignId, group.externalAdGroupId)}
                          >
                            Select
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Section>
          ) : null}

          {live?.selectedCampaign ? (
            <Section title={selectedAdGroupId ? `Ads in selected ${childGroupSingular}` : "Ads in selected campaign"}>
              {live.ads.length === 0 ? (
                <div className="card">
                  <p>No ads found for this scope.</p>
                </div>
              ) : (
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
