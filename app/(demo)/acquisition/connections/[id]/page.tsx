import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { Section } from "@/components/site/Section";
import { ACCOUNT_SESSION_COOKIE, verifyAccountSessionToken } from "@/lib/account-session";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { GoogleAdsConnector, GoogleAdsNotTestAccountError } from "@/lib/ad-connectors";
import type { RemoteCampaign, RemotePerformance } from "@/lib/ad-connectors";

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

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

async function loadGoogleAdsLiveData(externalAccountId: string, accountUserId: string | null): Promise<{
  campaigns: CampaignWithPerformance[];
  error: string | null;
}> {
  const connector = new GoogleAdsConnector(accountUserId);
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
    return { campaigns: enriched, error: null };
  } catch (err) {
    if (err instanceof GoogleAdsNotTestAccountError) {
      return { campaigns: [], error: err.message };
    }
    return {
      campaigns: [],
      error: err instanceof Error ? err.message : "Failed to fetch live data"
    };
  }
}

type PageProps = { params: Promise<{ id: string }> };

export default async function ConnectionDetailPage({ params }: PageProps) {
  const { id } = await params;
  const cookieStore = await cookies();
  const accountUserId = verifyAccountSessionToken(cookieStore.get(ACCOUNT_SESSION_COOKIE)?.value)?.userId ?? null;
  const ownedOrLegacy = {
    OR: accountUserId
      ? [{ accountUserId }, { accountUserId: null }]
      : [{ accountUserId: null }]
  };

  let connection;
  try {
    connection = await db.adAccountConnection.findFirst({ where: { id, ...ownedOrLegacy } });
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
  const live = isGoogle ? await loadGoogleAdsLiveData(connection.externalAccountId, accountUserId) : null;

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

      {!isGoogle ? (
        <Section title="Live data">
          <div className="card">
            <p>Live-data view not yet implemented for provider <code className="small">{connection.provider}</code>.</p>
          </div>
        </Section>
      ) : (
        <>
          <Section title="Live campaigns (Google Ads test account)">
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
                    <th>Start</th>
                    <th>End</th>
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
                      <td>{row.campaign.startDate ?? "—"}</td>
                      <td>{row.campaign.endDate ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>

          <Section title="Last 14 days · per-campaign performance">
            {live?.error ? null : live && live.campaigns.length === 0 ? null : (
              <div className="grid grid-2">
                {live?.campaigns.map((row) => (
                  <div className="card" key={row.campaign.externalCampaignId}>
                    <h3>{row.campaign.name}</h3>
                    {row.perfError ? (
                      <p className="bandText--unhealthy small">Performance error: {row.perfError}</p>
                    ) : row.performance ? (
                      <>
                        <div className="grid grid-2" style={{ gap: 8 }}>
                          <div>
                            <p className="small">Impressions</p>
                            <div className="kpi">{row.performance.totals.impressions.toLocaleString()}</div>
                          </div>
                          <div>
                            <p className="small">Clicks</p>
                            <div className="kpi">{row.performance.totals.clicks.toLocaleString()}</div>
                          </div>
                          <div>
                            <p className="small">Conversions</p>
                            <div className="kpi">{row.performance.totals.conversions.toLocaleString()}</div>
                          </div>
                          <div>
                            <p className="small">Spend</p>
                            <div className="kpi">${(row.performance.totals.spendCents / 100).toFixed(2)}</div>
                          </div>
                        </div>
                        <p className="small" style={{ marginTop: 8 }}>
                          {row.performance.daily.length} day{row.performance.daily.length === 1 ? "" : "s"} returned
                        </p>
                      </>
                    ) : (
                      <p className="small">No performance data.</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Section>
        </>
      )}
    </>
  );
}
