import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { Section } from "@/components/site/Section";
import { ACCOUNT_SESSION_COOKIE, verifyAccountSessionToken } from "@/lib/account-session";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { GoogleAdsConnector, GoogleAdsNotTestAccountError, MetaAdsConnector, MetaAdsNotTestAccountError } from "@/lib/ad-connectors";
import type { RemoteAdGroup, RemoteAdUnit, RemoteCampaign, RemotePerformance } from "@/lib/ad-connectors";
import { acquisitionProviderDryRunAdapterAvailable } from "@/lib/acquisition-agent-generalization";
import { buildProviderWritePreflight } from "@/lib/provider-preflight";
import { requestProviderWriteDryRunApprovalAction } from "./actions";

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
  searchParams: Promise<{ campaignId?: string; adGroupId?: string }>;
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
  const live = isLiveProvider
    ? await loadProviderLiveData(connection.provider, connection.externalAccountId, accountUserId, selected.campaignId, selected.adGroupId)
    : null;
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
            <h3>Access token expiry</h3>
            <p className="small">
              {connection.expiresAt ? new Date(connection.expiresAt).toLocaleString() : "—"}
            </p>
            <p className="small">
              {connection.encryptedRefreshToken ? "Refresh token stored." : "No refresh token — reconnect on expiry."}
            </p>
          </div>
        </div>
      </Section>

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
                  <h3>Dry-run context</h3>
                  <p className="small">These provider IDs are the context that should flow into an approval request and provider-write dry-run.</p>
                  <pre className="code">{JSON.stringify(dryRunContext(connection, live.selectedCampaign, selectedAdGroupId), null, 2)}</pre>
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
