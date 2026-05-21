const DEFAULT_GRAPH_API_VERSION = "v25.0";
const AUTHORIZE_URL = "https://www.facebook.com/dialog/oauth";
const META_SCOPE = "ads_read";

export type MetaOAuthConfig = {
  appId: string;
  appSecret: string;
  redirectUri: string;
  graphApiVersion: string;
};

export class MetaOAuthConfigError extends Error {}

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function normalizeGraphApiVersion(version = process.env.META_GRAPH_API_VERSION) {
  const trimmed = version?.trim() || DEFAULT_GRAPH_API_VERSION;
  return trimmed.startsWith("v") ? trimmed : `v${trimmed}`;
}

export function loadMetaOAuthConfig(): MetaOAuthConfig {
  const appId = readEnv("META_APP_ID");
  const appSecret = readEnv("META_APP_SECRET");
  const redirectUri = readEnv("META_OAUTH_REDIRECT_URI");

  const missing: string[] = [];
  if (!appId) missing.push("META_APP_ID");
  if (!appSecret) missing.push("META_APP_SECRET");
  if (!redirectUri) missing.push("META_OAUTH_REDIRECT_URI");

  if (missing.length > 0) {
    throw new MetaOAuthConfigError(`Missing Meta OAuth environment variables: ${missing.join(", ")}`);
  }

  return {
    appId: appId!,
    appSecret: appSecret!,
    redirectUri: redirectUri!,
    graphApiVersion: normalizeGraphApiVersion()
  };
}

export function isMetaOAuthConfigured(): boolean {
  try {
    loadMetaOAuthConfig();
    return true;
  } catch {
    return false;
  }
}

export function metaGraphApiBase(config?: MetaOAuthConfig) {
  const version = normalizeGraphApiVersion(config?.graphApiVersion);
  return `https://graph.facebook.com/${version}`;
}

export function buildMetaAuthorizeUrl(state: string, config?: MetaOAuthConfig): string {
  const cfg = config ?? loadMetaOAuthConfig();
  const params = new URLSearchParams({
    client_id: cfg.appId,
    redirect_uri: cfg.redirectUri,
    state,
    response_type: "code",
    scope: META_SCOPE
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

export type MetaTokenResponse = {
  accessToken: string;
  expiresAt: Date | null;
  scope: string;
};

export async function exchangeMetaAuthCode(code: string, config?: MetaOAuthConfig): Promise<MetaTokenResponse> {
  const cfg = config ?? loadMetaOAuthConfig();
  const params = new URLSearchParams({
    client_id: cfg.appId,
    client_secret: cfg.appSecret,
    redirect_uri: cfg.redirectUri,
    code
  });

  const response = await fetch(`${metaGraphApiBase(cfg)}/oauth/access_token?${params.toString()}`);
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Meta token exchange failed: ${response.status} ${text}`);
  }

  const json = (await response.json()) as {
    access_token: string;
    expires_in?: number;
  };

  return {
    accessToken: json.access_token,
    expiresAt: json.expires_in ? new Date(Date.now() + json.expires_in * 1000) : null,
    scope: META_SCOPE
  };
}

export type MetaAdAccountSummary = {
  id: string;
  name: string;
  currency: string;
  accountStatus: number | null;
};

export async function listMetaAdAccounts(accessToken: string, config?: MetaOAuthConfig): Promise<MetaAdAccountSummary[]> {
  const base = metaGraphApiBase(config);
  const params = new URLSearchParams({
    fields: "id,name,currency,account_status",
    limit: "100",
    access_token: accessToken
  });
  const accounts: Array<{ id: string; name?: string; currency?: string; account_status?: number | string }> = [];
  let url: string | null = `${base}/me/adaccounts?${params.toString()}`;

  for (let page = 0; page < 10 && url; page++) {
    const response = await fetch(url);
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`Meta list ad accounts failed: ${response.status} ${text}`);
    }

    const json = (await response.json()) as {
      data?: Array<{ id: string; name?: string; currency?: string; account_status?: number | string }>;
      paging?: { next?: string };
    };
    accounts.push(...(json.data ?? []));
    url = json.paging?.next ?? null;
  }

  return accounts.map((account) => ({
    id: account.id,
    name: account.name ?? `Meta Ads ${account.id}`,
    currency: account.currency ?? "USD",
    accountStatus: typeof account.account_status === "number"
      ? account.account_status
      : Number.isFinite(Number(account.account_status))
        ? Number(account.account_status)
        : null
  }));
}
