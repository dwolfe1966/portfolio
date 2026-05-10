import Link from "next/link";
import { cookies } from "next/headers";
import type { ProviderCredentialGrant } from "@prisma/client";
import { db } from "@/lib/db";
import { Section } from "@/components/site/Section";
import { ACCOUNT_SESSION_COOKIE, verifyAccountSessionToken } from "@/lib/account-session";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { isOAuthEncryptionAvailable } from "@/lib/oauth-tokens";
import { isGoogleOAuthConfigured } from "@/lib/ad-connectors/google-oauth";
import { isMetaOAuthConfigured } from "@/lib/ad-connectors/meta-oauth";
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
  let tableMissing = false;

  try {
    connections = await db.adAccountConnection.findMany({
      where: ownedOrLegacy,
      include: { credentialGrant: true },
      orderBy: { createdAt: "desc" }
    });
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      tableMissing = true;
    } else {
      throw error;
    }
  }

  const googleConnections = connections.filter((conn) => conn.provider === "google_ads");
  const metaConnections = connections.filter((conn) => conn.provider === "meta_ads");

  return (
    <>
      <Section eyebrow="Operations" title="Connections">
        <p>
          OAuth-backed connections to real ad platforms. Scope is{" "}
          <strong>read-only against test accounts</strong>. The acquisition
          simulation continues to drive the demo loop; connected accounts
          surface live remote data alongside the simulation. See{" "}
          <a href="/docs/ad-connector-setup.md">
            <code className="small">docs/ad-connector-setup.md</code>
          </a>{" "}
          for setup steps.
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
          <div className="card">
            <h3>Google Ads</h3>
            <p className="small">
              Read-only access to your test customer accounts. After consenting,
              the demo will list accessible customers and store one connection
              row per customer.
            </p>
            {googleConnections.length > 0 ? (
              <>
                <p className="small bandText--healthy">
                  {googleConnections.length} Google Ads account{googleConnections.length === 1 ? "" : "s"} connected.
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <Link className="btn primary" href={`/acquisition/connections/${googleConnections[0].id}`}>
                    Review Google Ads accounts
                  </Link>
                  {/* OAuth start is a regular HTTP redirect; keep prefetch out of the flow. */}
                  {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                  <a className="btn" href="/api/connections/google/start" rel="external">
                    Reconnect Google Ads
                  </a>
                </div>
              </>
            ) : encryptionReady && googleReady ? (
              // OAuth start is a regular HTTP redirect; we don't want Link prefetch
              // because that would trigger the state cookie + redirect prematurely.
              // eslint-disable-next-line @next/next/no-html-link-for-pages
              <a className="btn primary" href="/api/connections/google/start" rel="external">
                Connect Google Ads
              </a>
            ) : (
              <p className="small bandText--watch">
                Configuration incomplete. Resolve the items above to enable connection.
              </p>
            )}
          </div>
          <div className="card">
            <h3>Meta Ads</h3>
            <p className="small">
              Read-only access to your Meta test ad accounts. The detail page
              uses the same campaign, ad set, ad, and performance inspection
              workflow as Google Ads.
            </p>
            {metaConnections.length > 0 ? (
              <>
                <p className="small bandText--healthy">
                  {metaConnections.length} Meta Ads account{metaConnections.length === 1 ? "" : "s"} connected.
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <Link className="btn primary" href={`/acquisition/connections/${metaConnections[0].id}`}>
                    Review Meta Ads accounts
                  </Link>
                  {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                  <a className="btn" href="/api/connections/meta/start" rel="external">
                    Reconnect Meta Ads
                  </a>
                </div>
              </>
            ) : encryptionReady && metaReady ? (
              // eslint-disable-next-line @next/next/no-html-link-for-pages
              <a className="btn primary" href="/api/connections/meta/start" rel="external">
                Connect Meta Ads
              </a>
            ) : (
              <p className="small bandText--watch">
                Configuration incomplete. Resolve the items above to enable connection.
              </p>
            )}
          </div>
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
                <th>Grant</th>
                <th>Scopes</th>
                <th>Connected</th>
                <th>Last fetch</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {connections.map((conn) => {
                const grantHealth = formatGrantHealth(conn.credentialGrant);
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
                      <span className={`small bandText--${grantHealth.tone}`}>{grantHealth.label}</span>
                      {conn.credentialGrant ? (
                        <div className="small">
                          {conn.credentialGrant.capabilities.length} capabilities · {conn.credentialGrant.tokenHealthStatus}
                        </div>
                      ) : (
                        <div className="small">Reconnect to create a grant.</div>
                      )}
                    </td>
                    <td>
                      {conn.scopes.length > 0 ? (
                        <code className="small">{conn.scopes.join(" ")}</code>
                      ) : (
                        <span className="small">—</span>
                      )}
                    </td>
                    <td>{new Date(conn.createdAt).toLocaleDateString()}</td>
                    <td>
                      {conn.lastFetchedAt ? new Date(conn.lastFetchedAt).toLocaleString() : "—"}
                    </td>
                    <td>
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
          Google Ads and Meta Ads connections now support live read-only campaign,
          child group, ad, and recent performance inspection for test accounts.
          Next, selected provider IDs should flow directly into approval and dry-run payloads.
          See <Link href="/acquisition/audit">audit feed</Link> for the full activity log.
        </p>
      </Section>
    </>
  );
}
