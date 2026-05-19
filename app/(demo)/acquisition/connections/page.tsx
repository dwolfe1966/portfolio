import Link from "next/link";
import { cookies } from "next/headers";
import type { ProviderCredentialGrant } from "@prisma/client";
import { db } from "@/lib/db";
import { Section } from "@/components/site/Section";
import { ACCOUNT_SESSION_COOKIE, verifyAccountSessionToken } from "@/lib/account-session";
import { getActiveDataSourceSelection } from "@/lib/app-data-source-selection";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { isOAuthEncryptionAvailable } from "@/lib/oauth-tokens";
import { isGoogleOAuthConfigured } from "@/lib/ad-connectors/google-oauth";
import { isMetaOAuthConfigured } from "@/lib/ad-connectors/meta-oauth";
import { LIVE_PROVIDER_READS_ENV, liveProviderReadsEnabled } from "@/lib/ad-connectors/live-read-scope";
import {
  acquisitionProviderSnapshotScopeLabel,
  acquisitionProviderSnapshotSourceLabel
} from "@/lib/acquisition-provider-snapshots";
import { ConnectionDisconnectButton } from "@/components/acquisition/ConnectionDisconnectButton";

export const dynamic = "force-dynamic";

const PROVIDER_LABEL: Record<string, string> = {
  google_ads: "Google Ads",
  meta_ads: "Meta Ads",
  simulated: "Simulated"
};

type SearchParams = { error?: string; event?: string; connected?: string };
type ConnectionWithGrant = Awaited<ReturnType<typeof db.adAccountConnection.findMany>>[number] & {
  credentialGrant: ProviderCredentialGrant | null;
};
type ProviderKey = "google_ads" | "meta_ads";
type LatestDataset = {
  id: string;
  name: string;
  sourceType: string;
  rowCounts: unknown;
  metadata: unknown;
  createdAt: Date;
};

const CONNECTION_ERROR_COPY: Record<string, { message: string; href?: string; linkLabel?: string }> = {
  google_ads_api_disabled: {
    message:
      "Google Ads API is disabled for Google Cloud project 507389735523. Enable it in Google Cloud, wait a few minutes for propagation, then reconnect.",
    href: "https://console.developers.google.com/apis/api/googleads.googleapis.com/overview?project=507389735523",
    linkLabel: "Open Google Ads API settings"
  },
  google_ads_permission_denied: {
    message:
      "Google denied the Google Ads account listing request. Check that the Google Ads API is enabled, the developer token is approved, and the signed-in Google user has access to at least one Ads account."
  },
  list_customers_failed: {
    message:
      "Google OAuth completed, but the app could not list accessible Google Ads customers. Check the server event id for the provider response."
  },
  no_accessible_customers: {
    message:
      "Google OAuth completed, but the signed-in Google user does not have access to any Google Ads customers. Sign in with the Google account that can open the Ads manager/customer account in Google Ads, or add this Google user to the Ads account, then reconnect."
  }
};

function formatGrantHealth(grant: ProviderCredentialGrant | null) {
  if (!grant) return { tone: "watch", label: "Missing grant" };
  if (grant.status !== "active") return { tone: "unhealthy", label: grant.status };
  if (grant.tokenHealthStatus === "expired") return { tone: "unhealthy", label: "Token expired" };
  return { tone: "healthy", label: `${grant.environment} grant` };
}

function providerConnections(provider: ProviderKey, connections: ConnectionWithGrant[]) {
  return connections.filter((conn) => conn.provider === provider);
}

function providerReady(provider: ProviderKey, encryptionReady: boolean, googleReady: boolean, metaReady: boolean) {
  return encryptionReady && (provider === "google_ads" ? googleReady : metaReady);
}

function providerDescription(provider: ProviderKey) {
  if (provider === "google_ads") {
    return "OAuth-backed Google Ads accounts for campaign, ad group, ad, and performance sync.";
  }
  return "OAuth-backed Meta Ads accounts for campaign, ad set, ad, and performance sync.";
}

function providerConnectHref(provider: ProviderKey) {
  return provider === "google_ads" ? "/api/connections/google/start" : "/api/connections/meta/start";
}

function missingEnv(keys: string[]) {
  return keys.filter((key) => !process.env[key]?.trim());
}

function datasetConnectionId(dataset: LatestDataset) {
  const metadata = dataset.metadata && typeof dataset.metadata === "object" && !Array.isArray(dataset.metadata)
    ? dataset.metadata as Record<string, unknown>
    : {};
  return typeof metadata.connectionId === "string" ? metadata.connectionId : null;
}

function rowCountTotal(rowCounts: unknown) {
  if (!rowCounts || typeof rowCounts !== "object" || Array.isArray(rowCounts)) return 0;
  return Object.values(rowCounts).reduce((sum, value) => sum + (typeof value === "number" && Number.isFinite(value) ? value : 0), 0);
}

function formatDateTime(date: Date | null | undefined) {
  return date ? new Date(date).toLocaleString() : "None";
}

function connectionReadiness(conn: ConnectionWithGrant, dataset: LatestDataset | undefined) {
  const grantHealth = formatGrantHealth(conn.credentialGrant);
  if (!conn.credentialGrant) {
    return {
      label: "Reconnect required",
      tone: "progress",
      detail: "Credential grant is missing. Reconnect this provider account before syncing."
    };
  }
  if (grantHealth.tone === "unhealthy") {
    return {
      label: "Token attention",
      tone: "warning",
      detail: "The stored grant is not healthy. Reconnect before syncing or inspecting live data."
    };
  }
  if (!conn.isTestAccount) {
    return {
      label: liveProviderReadsEnabled() ? "Live read enabled" : "Live read blocked",
      tone: "warning",
      detail: liveProviderReadsEnabled()
        ? "Read-only inspection is enabled for this live provider account."
        : `Set ${LIVE_PROVIDER_READS_ENV}=true and restart localhost to inspect this live account in read-only mode.`
    };
  }
  if (dataset) {
    return {
      label: "Dataset synced",
      tone: "live",
      detail: `${rowCountTotal(dataset.rowCounts).toLocaleString()} rows saved ${formatDateTime(dataset.createdAt)}.`
    };
  }
  return {
    label: "Ready to sync",
    tone: "progress",
    detail: "Open this account to inspect provider objects and materialize an acquisition dataset."
  };
}

function providerAttentionSummary(connections: ConnectionWithGrant[]) {
  const unhealthyGrantCount = connections.filter((conn) => formatGrantHealth(conn.credentialGrant).tone === "unhealthy").length;
  const missingGrantCount = connections.filter((conn) => !conn.credentialGrant).length;
  const liveReadBlockedCount = connections.filter((conn) => conn.credentialGrant && formatGrantHealth(conn.credentialGrant).tone !== "unhealthy" && !conn.isTestAccount).length;
  const readyCount = connections.length - unhealthyGrantCount - missingGrantCount - liveReadBlockedCount;

  if (unhealthyGrantCount > 0 || missingGrantCount > 0) {
    return {
      label: `${unhealthyGrantCount + missingGrantCount} need reconnect`,
      tone: "warning",
      detail: "Reconnect these accounts before syncing or creating provider-shaped fallback datasets."
    };
  }
  if (liveReadBlockedCount > 0) {
    return {
      label: liveProviderReadsEnabled() ? `${liveReadBlockedCount} live-read opt-in` : `${liveReadBlockedCount} live-read blocked`,
      tone: "warning",
      detail: liveProviderReadsEnabled()
        ? "Read-only live inspection is enabled locally; provider writes remain dry-run/governed separately."
        : "Live provider reads are gated locally. Fallback datasets are available from each account page."
    };
  }
  if (readyCount > 0) {
    return {
      label: "sync eligible",
      tone: "live",
      detail: "Open an account to inspect objects and materialize a dataset."
    };
  }
  return {
    label: "no accounts",
    tone: "progress",
    detail: "Connect this provider to start account discovery."
  };
}

function connectionAttentionCounts(connections: ConnectionWithGrant[]) {
  let reconnect = 0;
  let liveReadGated = 0;
  for (const conn of connections) {
    const grantHealth = formatGrantHealth(conn.credentialGrant);
    if (!conn.credentialGrant || grantHealth.tone === "unhealthy") {
      reconnect += 1;
    } else if (!conn.isTestAccount) {
      liveReadGated += 1;
    }
  }
  return { reconnect, liveReadGated };
}

function inputSourceDetail({
  activeConnection,
  activeDataset,
  activeSelectionLabel
}: {
  activeConnection: ConnectionWithGrant | null;
  activeDataset: LatestDataset | null;
  activeSelectionLabel: string | null;
}) {
  if (activeConnection && activeDataset) {
    return {
      label: "Provider dataset active",
      tone: "live",
      detail: `${PROVIDER_LABEL[activeConnection.provider] ?? activeConnection.provider} ${activeConnection.externalAccountId} is powering Acquisition inputs from ${activeDataset.name}.`
    };
  }
  if (activeDataset) {
    return {
      label: "Imported dataset active",
      tone: "progress",
      detail: `${activeDataset.name} is powering Acquisition inputs.`
    };
  }
  return {
    label: "Sample data active",
    tone: "warning",
    detail: activeSelectionLabel
      ? `${activeSelectionLabel} is selected. Connect or apply a provider snapshot to move off sample data.`
      : "Acquisition inputs are still using default sample data."
  };
}

export default async function ConnectionsPage({
  searchParams
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const encryptionReady = isOAuthEncryptionAvailable();
  const googleReady = isGoogleOAuthConfigured();
  const metaReady = isMetaOAuthConfigured();
  const googleMissing = missingEnv([
    "GOOGLE_OAUTH_CLIENT_ID",
    "GOOGLE_OAUTH_CLIENT_SECRET",
    "GOOGLE_ADS_DEVELOPER_TOKEN",
    "GOOGLE_OAUTH_REDIRECT_URI"
  ]);
  const metaMissing = missingEnv(["META_APP_ID", "META_APP_SECRET", "META_OAUTH_REDIRECT_URI"]);
  const cookieStore = await cookies();
  const accountUserId = verifyAccountSessionToken(cookieStore.get(ACCOUNT_SESSION_COOKIE)?.value)?.userId ?? null;
  const ownedOrLegacy = {
    OR: accountUserId
      ? [{ accountUserId }, { accountUserId: null }]
      : [{ accountUserId: null }]
  };

  let connections: ConnectionWithGrant[] = [];
  let latestDatasets: LatestDataset[] = [];
  let activeDataset: LatestDataset | null = null;
  let activeSelectionLabel: string | null = null;
  let tableMissing = false;

  try {
    connections = await db.adAccountConnection.findMany({
      where: ownedOrLegacy,
      include: { credentialGrant: true },
      orderBy: { createdAt: "desc" }
    });
    latestDatasets = await db.workspaceDataset.findMany({
      where: {
        app: "acquisition",
        sourceType: { in: ["google_ads", "meta_ads"] },
        OR: accountUserId
          ? [{ accountUserId }, { accountUserId: null }]
          : [{ accountUserId: null }]
      },
      select: {
        id: true,
        name: true,
        sourceType: true,
        rowCounts: true,
        metadata: true,
        createdAt: true
      },
      orderBy: { createdAt: "desc" },
      take: 50
    });
    const activeSelection = await getActiveDataSourceSelection("acquisition", accountUserId);
    activeSelectionLabel = activeSelection?.label ?? null;
    activeDataset = activeSelection?.mode === "imported" && activeSelection.datasetId
      ? latestDatasets.find((dataset) => dataset.id === activeSelection.datasetId)
        ?? await db.workspaceDataset.findFirst({
          where: {
            id: activeSelection.datasetId,
            app: "acquisition",
            sourceType: { in: ["google_ads", "meta_ads"] },
            OR: accountUserId
              ? [{ accountUserId }, { accountUserId: null }]
              : [{ accountUserId: null }]
          },
          select: {
            id: true,
            name: true,
            sourceType: true,
            rowCounts: true,
            metadata: true,
            createdAt: true
          }
        })
      : null;
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      tableMissing = true;
    } else {
      throw error;
    }
  }

  const googleConnections = providerConnections("google_ads", connections);
  const metaConnections = providerConnections("meta_ads", connections);
  const datasetByConnectionId = new Map<string, LatestDataset>();
  for (const dataset of latestDatasets) {
    const connectionId = datasetConnectionId(dataset);
    if (connectionId && !datasetByConnectionId.has(connectionId)) {
      datasetByConnectionId.set(connectionId, dataset);
    }
  }
  const activeConnectionId = activeDataset ? datasetConnectionId(activeDataset) : null;
  if (activeConnectionId && activeDataset && !datasetByConnectionId.has(activeConnectionId)) {
    datasetByConnectionId.set(activeConnectionId, activeDataset);
  }
  const activeConnection = activeConnectionId ? connections.find((conn) => conn.id === activeConnectionId) ?? null : null;
  const syncedConnectionCount = connections.filter((conn) => datasetByConnectionId.has(conn.id)).length;
  const attentionCounts = connectionAttentionCounts(connections);
  const inputSource = inputSourceDetail({ activeConnection, activeDataset, activeSelectionLabel });
  const providers: Array<{ key: ProviderKey; label: string; ready: boolean; connections: ConnectionWithGrant[] }> = [
    { key: "google_ads", label: "Google Ads", ready: providerReady("google_ads", encryptionReady, googleReady, metaReady), connections: googleConnections },
    { key: "meta_ads", label: "Meta Ads", ready: providerReady("meta_ads", encryptionReady, googleReady, metaReady), connections: metaConnections }
  ];

  return (
    <>
      <Section eyebrow="Operations" title="Connections">
        <p>
          Manage the handoff from ad-platform OAuth to account review, dataset sync,
          and Acquisition inputs. Provider writes stay dry-run/governed separately.
        </p>

        {params.connected ? (
          <div className="card" style={{ marginTop: 12 }}>
            <p>Connected {params.connected} account{params.connected === "1" ? "" : "s"}.</p>
          </div>
        ) : null}

        {params.error ? (
          <div className="card" style={{ marginTop: 12 }}>
            {(() => {
              const copy = CONNECTION_ERROR_COPY[params.error ?? ""] ?? CONNECTION_ERROR_COPY.list_customers_failed;
              return (
                <p className="small">
                  {copy.message}
                  {copy.href ? (
                    <>
                      {" "}
                      <a href={copy.href}>{copy.linkLabel}</a>.
                    </>
                  ) : null}
                </p>
              );
            })()}
            <p className="bandText--unhealthy small">
              Connection error: <code className="small">{params.error}</code>
              {params.event ? <> · event <code className="small">{params.event}</code></> : null}
            </p>
          </div>
        ) : null}
      </Section>

      <Section title="Connection workflow">
        <div className="grid grid-4">
          <div className="card compact">
            <p className="statusPill progress">1</p>
            <h3>Connect provider</h3>
            <p className="small">Start or refresh OAuth for Google Ads or Meta Ads.</p>
          </div>
          <div className="card compact">
            <p className="statusPill progress">2</p>
            <h3>Choose account</h3>
            <p className="small">Open a discovered account and review test/live-read status.</p>
          </div>
          <div className="card compact">
            <p className="statusPill progress">3</p>
            <h3>Create snapshot</h3>
            <p className="small">Sync live provider rows when allowed, or create provider-shaped fallback data.</p>
          </div>
          <div className="card compact">
            <p className="statusPill progress">4</p>
            <h3>Apply inputs</h3>
            <p className="small">Apply the snapshot so Acquisition campaigns, simulations, and outputs use it.</p>
          </div>
        </div>
      </Section>

      <Section title="Provider control center">
        <div className="grid grid-4">
          <div className="card compact">
            <p className="small">Connected accounts</p>
            <div className="kpi">{connections.length}</div>
          </div>
          <div className="card compact">
            <p className="small">Synced datasets</p>
            <div className="kpi">{syncedConnectionCount}</div>
          </div>
          <div className="card compact">
            <p className="small">Reconnect needed</p>
            <div className="kpi">{attentionCounts.reconnect}</div>
          </div>
          <div className="card compact">
            <p className="small">Live-read gated</p>
            <div className="kpi">{attentionCounts.liveReadGated}</div>
            <p className="small">{liveProviderReadsEnabled() ? "Opt-in enabled locally" : "Fallback available"}</p>
          </div>
          <div className="card compact">
            <p className="small">Active input source</p>
            <div className="kpi">{activeConnection ? PROVIDER_LABEL[activeConnection.provider] ?? activeConnection.provider : activeDataset ? "Other" : "Sample"}</div>
            <p className="small">
              {activeConnection
                ? activeConnection.accountName
                : activeSelectionLabel ?? "Default acquisition sample data"}
            </p>
          </div>
        </div>
        <div className="card compact" style={{ marginTop: 12 }}>
          <p className={`statusPill ${inputSource.tone}`}>{inputSource.label}</p>
          <p className="small" style={{ marginTop: 8 }}>{inputSource.detail}</p>
          <div className="ctaRow">
            {activeConnection ? (
              <Link className="btn smallBtn" href={`/acquisition/connections/${activeConnection.id}`}>Open active provider</Link>
            ) : null}
            {activeDataset ? (
              <Link className="btn smallBtn" href={`/workspace/datasets/${activeDataset.id}`}>Review active dataset</Link>
            ) : null}
            <Link className="btn smallBtn primary" href="/acquisition/inputs">Open inputs</Link>
          </div>
        </div>
      </Section>

      <Section title="Configuration status">
        <div className="grid grid-3">
          <div className="card">
            <h3>OAuth encryption key</h3>
            <p className={`small bandText--${encryptionReady ? "healthy" : "unhealthy"}`}>
              {encryptionReady
                ? "OAUTH_ENCRYPTION_KEY is set."
                : "OAUTH_ENCRYPTION_KEY is missing. Generate one and add it to .env.local."}
            </p>
            {!encryptionReady ? (
              <pre className="code">{`node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`}</pre>
            ) : null}
          </div>
          <div className="card">
            <h3>Google Ads</h3>
            <p className={`small bandText--${googleReady ? "healthy" : "watch"}`}>
              {googleReady
                ? "Google OAuth client + developer token detected."
                : "Google OAuth env vars missing. See setup guide."}
            </p>
            <p className="small">
              Redirect URI: <code className="small">{process.env.GOOGLE_OAUTH_REDIRECT_URI || "not set"}</code>
            </p>
            {googleMissing.length > 0 ? (
              <p className="small bandText--watch">Missing: <code className="small">{googleMissing.join(", ")}</code></p>
            ) : null}
          </div>
          <div className="card">
            <h3>Meta Ads</h3>
            <p className={`small bandText--${metaReady ? "healthy" : "watch"}`}>
              {metaReady
                ? "Meta app credentials detected."
                : "Meta OAuth env vars missing. See setup guide."}
            </p>
            <p className="small">
              Redirect URI: <code className="small">{process.env.META_OAUTH_REDIRECT_URI || "not set"}</code>
            </p>
            {metaMissing.length > 0 ? (
              <p className="small bandText--watch">Missing: <code className="small">{metaMissing.join(", ")}</code></p>
            ) : null}
          </div>
        </div>
      </Section>

      <Section title="Providers">
        <div className="grid grid-2">
          {providers.map((provider) => {
            const latestConnection = provider.connections[0];
            const providerSynced = provider.connections.filter((conn) => datasetByConnectionId.has(conn.id)).length;
            const providerAttention = providerAttentionSummary(provider.connections);
            const providerActive = activeConnection?.provider === provider.key;
            return (
              <div className="card" key={provider.key}>
                <div className="statusPillStack" style={{ alignItems: "flex-start" }}>
                  <span className={`statusPill ${provider.ready ? "live" : "progress"}`}>
                    {provider.ready ? "configured" : "setup needed"}
                  </span>
                  {provider.connections.length > 0 ? (
                    <span className={`statusPill ${providerAttention.tone}`}>
                      {providerAttention.label}
                    </span>
                  ) : null}
                  {providerActive ? <span className="statusPill live">active inputs</span> : null}
                </div>
                <h3 style={{ marginTop: 12 }}>{provider.label}</h3>
                <p className="small">{providerDescription(provider.key)}</p>
                {provider.connections.length > 0 ? (
                  <p className={`small bandText--${providerAttention.tone === "live" ? "healthy" : "watch"}`}>
                    {providerAttention.detail}
                  </p>
                ) : null}
                <div className="grid grid-3" style={{ gap: 10, marginTop: 12 }}>
                  <div>
                    <p className="small">Accounts</p>
                    <strong>{provider.connections.length}</strong>
                  </div>
                  <div>
                    <p className="small">Datasets</p>
                    <strong>{providerSynced}</strong>
                  </div>
                  <div>
                    <p className="small">Last fetch</p>
                    <strong>{formatDateTime(latestConnection?.lastFetchedAt).split(",")[0]}</strong>
                  </div>
                </div>
                <div className="ctaRow">
                  {latestConnection ? (
                    <Link className="btn primary" href={`/acquisition/connections/${latestConnection.id}`}>
                      Review latest account
                    </Link>
                  ) : provider.ready ? (
                    // OAuth start is a regular HTTP redirect; keep prefetch out of the flow.
                    // eslint-disable-next-line @next/next/no-html-link-for-pages
                    <a className="btn primary" href={providerConnectHref(provider.key)} rel="external">
                      Connect {provider.label}
                    </a>
                  ) : (
                    <span className="small bandText--watch">Resolve configuration before connecting.</span>
                  )}
                  {provider.ready ? (
                    // eslint-disable-next-line @next/next/no-html-link-for-pages
                    <a className="btn" href={providerConnectHref(provider.key)} rel="external">
                      {latestConnection ? "Refresh OAuth" : "Start OAuth"}
                    </a>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="Connected accounts">
        {tableMissing ? (
          <div className="card">
            <p>Connection table is missing. Run database migrations.</p>
          </div>
        ) : connections.length === 0 ? (
          <div className="card">
            <p>No accounts connected yet.</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Provider</th>
                <th>Account</th>
                <th>Test</th>
                <th>Sync readiness</th>
                <th>Latest dataset</th>
                <th>Scopes</th>
                <th>Token</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {connections.map((conn) => {
                const grantHealth = formatGrantHealth(conn.credentialGrant);
                const latestDataset = datasetByConnectionId.get(conn.id);
                const readiness = connectionReadiness(conn, latestDataset);
                const isActiveConnection = conn.id === activeConnectionId;
                return (
                  <tr key={conn.id}>
                    <td>{PROVIDER_LABEL[conn.provider] ?? conn.provider}</td>
                    <td>
                      <Link href={`/acquisition/connections/${conn.id}`}>
                        <code className="small">{conn.externalAccountId}</code>
                      </Link>
                      <div className="small">{conn.accountName}</div>
                    </td>
                    <td>
                      <span className={`small bandText--${conn.isTestAccount ? "healthy" : "unhealthy"}`}>
                        {conn.isTestAccount ? "Test" : "Live"}
                      </span>
                    </td>
                    <td>
                      <span className={`statusPill ${readiness.tone}`}>{readiness.label}</span>
                      <div className="small">{readiness.detail}</div>
                    </td>
                    <td>
                      {latestDataset ? (
                        <>
                          <Link href={`/workspace/datasets/${latestDataset.id}`}>
                            {latestDataset.name}
                          </Link>
                          <div className="small">
                            {acquisitionProviderSnapshotSourceLabel(latestDataset.metadata)}
                            {" · "}
                            {acquisitionProviderSnapshotScopeLabel(latestDataset.metadata, { sentenceCase: true })}
                            {" · "}
                            {rowCountTotal(latestDataset.rowCounts).toLocaleString()} rows
                          </div>
                          {isActiveConnection ? <div className="small bandText--healthy">Active inputs source</div> : null}
                        </>
                      ) : isActiveConnection && activeDataset ? (
                        <>
                          <Link href={`/workspace/datasets/${activeDataset.id}`}>
                            {activeDataset.name}
                          </Link>
                          <div className="small">
                            {acquisitionProviderSnapshotSourceLabel(activeDataset.metadata)}
                            {" · "}
                            {acquisitionProviderSnapshotScopeLabel(activeDataset.metadata, { sentenceCase: true })}
                            {" · "}
                            {rowCountTotal(activeDataset.rowCounts).toLocaleString()} rows
                          </div>
                          <div className="small bandText--healthy">Active inputs source</div>
                        </>
                      ) : (
                        <span className="small">No dataset snapshot yet.</span>
                      )}
                    </td>
                    <td>
                      {conn.scopes.length > 0 ? (
                        <code className="small">{conn.scopes.join(" ")}</code>
                      ) : (
                        <span className="small">—</span>
                      )}
                    </td>
                    <td>
                      <span className={`small bandText--${grantHealth.tone}`}>{grantHealth.label}</span>
                      {conn.credentialGrant ? (
                        <div className="small">
                          {conn.credentialGrant.capabilities.length} capabilities · expires {formatDateTime(conn.expiresAt)}
                        </div>
                      ) : (
                        <div className="small">Reconnect to create a grant.</div>
                      )}
                    </td>
                    <td>
                      <Link className="btn smallBtn" href={`/acquisition/connections/${conn.id}`}>Open</Link>
                      <ConnectionDisconnectButton
                        id={conn.id}
                        label={`${PROVIDER_LABEL[conn.provider] ?? conn.provider} ${conn.externalAccountId}`}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Section>

      <Section title="What's next">
        <p>
          Open an eligible account to inspect provider objects and sync a workspace dataset.
          Synced snapshots appear in <Link href="/workspace/datasets?tool=acquisition#imported-snapshots">workspace datasets</Link>,
          then can be applied from acquisition inputs. See <Link href="/acquisition/audit">audit feed</Link> for the full activity log.
        </p>
      </Section>
    </>
  );
}
