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
import { acquisitionProviderSnapshotScopeLabel } from "@/lib/acquisition-provider-snapshots";
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

export default async function ConnectionsPage({
  searchParams
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const encryptionReady = isOAuthEncryptionAvailable();
  const googleReady = isGoogleOAuthConfigured();
  const metaReady = isMetaOAuthConfigured();
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
  const syncBlockedCount = connections.filter((conn) => !conn.isTestAccount || formatGrantHealth(conn.credentialGrant).tone === "unhealthy").length;
  const providers: Array<{ key: ProviderKey; label: string; ready: boolean; connections: ConnectionWithGrant[] }> = [
    { key: "google_ads", label: "Google Ads", ready: providerReady("google_ads", encryptionReady, googleReady, metaReady), connections: googleConnections },
    { key: "meta_ads", label: "Meta Ads", ready: providerReady("meta_ads", encryptionReady, googleReady, metaReady), connections: metaConnections }
  ];

  return (
    <>
      <Section eyebrow="Operations" title="Connections">
        <p>
          Manage ad-platform accounts, credential health, dataset sync readiness,
          and the handoff from provider data into acquisition inputs.
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
            <p className="small">Needs attention</p>
            <div className="kpi">{syncBlockedCount}</div>
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
          </div>
          <div className="card">
            <h3>Meta Ads</h3>
            <p className={`small bandText--${metaReady ? "healthy" : "watch"}`}>
              {metaReady
                ? "Meta app credentials detected."
                : "Meta OAuth env vars missing. See setup guide."}
            </p>
          </div>
        </div>
      </Section>

      <Section title="Connect a provider">
        <div className="grid grid-2">
          {providers.map((provider) => {
            const latestConnection = provider.connections[0];
            const providerSynced = provider.connections.filter((conn) => datasetByConnectionId.has(conn.id)).length;
            const providerBlocked = provider.connections.filter((conn) => !conn.isTestAccount || formatGrantHealth(conn.credentialGrant).tone === "unhealthy").length;
            const providerActive = activeConnection?.provider === provider.key;
            return (
              <div className="card" key={provider.key}>
                <div className="statusPillStack" style={{ alignItems: "flex-start" }}>
                  <span className={`statusPill ${provider.ready ? "live" : "progress"}`}>
                    {provider.ready ? "configured" : "setup needed"}
                  </span>
                  {provider.connections.length > 0 ? (
                    <span className={`statusPill ${providerBlocked > 0 ? "warning" : "live"}`}>
                      {providerBlocked > 0 ? `${providerBlocked} blocked` : "sync eligible"}
                    </span>
                  ) : null}
                  {providerActive ? <span className="statusPill live">active inputs</span> : null}
                </div>
                <h3 style={{ marginTop: 12 }}>{provider.label}</h3>
                <p className="small">{providerDescription(provider.key)}</p>
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
                      Review accounts
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
                      {latestConnection ? "Reconnect" : "Start OAuth"}
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
                          <div className="small">{acquisitionProviderSnapshotScopeLabel(latestDataset.metadata, { sentenceCase: true })} · {rowCountTotal(latestDataset.rowCounts).toLocaleString()} rows</div>
                          {isActiveConnection ? <div className="small bandText--healthy">Active inputs source</div> : null}
                        </>
                      ) : isActiveConnection && activeDataset ? (
                        <>
                          <Link href={`/workspace/datasets/${activeDataset.id}`}>
                            {activeDataset.name}
                          </Link>
                          <div className="small">{acquisitionProviderSnapshotScopeLabel(activeDataset.metadata, { sentenceCase: true })} · {rowCountTotal(activeDataset.rowCounts).toLocaleString()} rows</div>
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
