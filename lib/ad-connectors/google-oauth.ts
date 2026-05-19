/**
 * Google Ads OAuth helpers — URL builder, code exchange, token refresh,
 * and accessible-customer listing. All read-only against the user's
 * own test accounts.
 */

const AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const DEFAULT_GOOGLE_ADS_API_VERSION = "v22";
const ADWORDS_SCOPE = "https://www.googleapis.com/auth/adwords";

export type GoogleOAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  developerToken: string;
  loginCustomerId: string | null;
  apiBase: string;
};

export class GoogleOAuthConfigError extends Error {}

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

export function getGoogleAdsApiBase(version = process.env.GOOGLE_ADS_API_VERSION): string {
  const normalizedVersion = version?.trim() || DEFAULT_GOOGLE_ADS_API_VERSION;
  const pathVersion = normalizedVersion.startsWith("v") ? normalizedVersion : `v${normalizedVersion}`;
  return `https://googleads.googleapis.com/${pathVersion}`;
}

export function loadGoogleOAuthConfig(): GoogleOAuthConfig {
  const clientId = readEnv("GOOGLE_OAUTH_CLIENT_ID");
  const clientSecret = readEnv("GOOGLE_OAUTH_CLIENT_SECRET");
  const redirectUri = readEnv("GOOGLE_OAUTH_REDIRECT_URI");
  const developerToken = readEnv("GOOGLE_ADS_DEVELOPER_TOKEN");
  const loginCustomerId = readEnv("GOOGLE_ADS_LOGIN_CUSTOMER_ID")?.replaceAll("-", "") ?? null;

  const missing: string[] = [];
  if (!clientId) missing.push("GOOGLE_OAUTH_CLIENT_ID");
  if (!clientSecret) missing.push("GOOGLE_OAUTH_CLIENT_SECRET");
  if (!redirectUri) missing.push("GOOGLE_OAUTH_REDIRECT_URI");
  if (!developerToken) missing.push("GOOGLE_ADS_DEVELOPER_TOKEN");

  if (missing.length > 0) {
    throw new GoogleOAuthConfigError(
      `Missing Google OAuth environment variables: ${missing.join(", ")}`
    );
  }

  return {
    clientId: clientId!,
    clientSecret: clientSecret!,
    redirectUri: redirectUri!,
    developerToken: developerToken!,
    loginCustomerId,
    apiBase: getGoogleAdsApiBase()
  };
}

export function isGoogleOAuthConfigured(): boolean {
  try {
    loadGoogleOAuthConfig();
    return true;
  } catch {
    return false;
  }
}

export function buildGoogleAuthorizeUrl(state: string, config?: GoogleOAuthConfig): string {
  const cfg = config ?? loadGoogleOAuthConfig();
  const params = new URLSearchParams({
    response_type: "code",
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    scope: ADWORDS_SCOPE,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

export type GoogleTokenResponse = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date;
  scope: string;
};

export type GoogleAdsCustomerDiscovery = {
  customerId: string;
  descriptiveName: string | null;
  manager: boolean;
  testAccount: boolean | null;
  parentCustomerId: string | null;
  level: number | null;
};

export async function exchangeGoogleAuthCode(
  code: string,
  config?: GoogleOAuthConfig
): Promise<GoogleTokenResponse> {
  const cfg = config ?? loadGoogleOAuthConfig();
  const body = new URLSearchParams({
    code,
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    redirect_uri: cfg.redirectUri,
    grant_type: "authorization_code"
  });

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString()
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Google token exchange failed: ${response.status} ${text}`);
  }

  const json = (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope: string;
  };

  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? null,
    expiresAt: new Date(Date.now() + json.expires_in * 1000),
    scope: json.scope
  };
}

export async function refreshGoogleAccessToken(
  refreshToken: string,
  config?: GoogleOAuthConfig
): Promise<GoogleTokenResponse> {
  const cfg = config ?? loadGoogleOAuthConfig();
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    grant_type: "refresh_token"
  });

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString()
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Google token refresh failed: ${response.status} ${text}`);
  }

  const json = (await response.json()) as {
    access_token: string;
    expires_in: number;
    scope: string;
  };

  return {
    accessToken: json.access_token,
    refreshToken,
    expiresAt: new Date(Date.now() + json.expires_in * 1000),
    scope: json.scope
  };
}

/**
 * Returns the customer IDs the access token has access to.
 * The Google Ads REST API returns resourceNames like "customers/1234567890".
 */
export async function listAccessibleCustomers(
  accessToken: string,
  config?: GoogleOAuthConfig
): Promise<string[]> {
  const cfg = config ?? loadGoogleOAuthConfig();
  const response = await fetch(`${cfg.apiBase}/customers:listAccessibleCustomers`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "developer-token": cfg.developerToken
    }
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Google Ads listAccessibleCustomers failed: ${response.status} ${text}`);
  }

  const json = (await response.json()) as { resourceNames?: string[] };
  return (json.resourceNames ?? []).map((rn) => rn.replace(/^customers\//, ""));
}

function uniqueCustomers(customers: GoogleAdsCustomerDiscovery[]) {
  const byCustomerId = new Map<string, GoogleAdsCustomerDiscovery>();
  for (const customer of customers) {
    const existing = byCustomerId.get(customer.customerId);
    if (!existing || (existing.parentCustomerId === null && customer.parentCustomerId !== null)) {
      byCustomerId.set(customer.customerId, customer);
    }
  }
  return [...byCustomerId.values()].sort((a, b) => {
    if (a.parentCustomerId && !b.parentCustomerId) return 1;
    if (!a.parentCustomerId && b.parentCustomerId) return -1;
    return a.customerId.localeCompare(b.customerId);
  });
}

function customerIdFromResource(resourceName: string | null | undefined) {
  return String(resourceName ?? "").replace(/^customers\//, "").trim() || null;
}

async function listCustomerClients(
  managerCustomerId: string,
  accessToken: string,
  config: GoogleOAuthConfig
): Promise<GoogleAdsCustomerDiscovery[]> {
  const query = [
    "SELECT customer_client.client_customer, customer_client.id,",
    "customer_client.descriptive_name, customer_client.manager,",
    "customer_client.test_account, customer_client.level",
    "FROM customer_client",
    "WHERE customer_client.level <= 1"
  ].join(" ");
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "developer-token": config.developerToken,
    "Content-Type": "application/json",
    "login-customer-id": config.loginCustomerId ?? managerCustomerId
  };

  const response = await fetch(`${config.apiBase}/customers/${managerCustomerId}/googleAds:search`, {
    method: "POST",
    headers,
    body: JSON.stringify({ query })
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Google Ads customer-client discovery failed: ${response.status} ${text}`);
  }

  const json = (await response.json()) as {
    results?: Array<{
      customerClient?: {
        clientCustomer?: string;
        id?: string;
        descriptiveName?: string;
        manager?: boolean;
        testAccount?: boolean;
        level?: number;
      };
    }>;
  };

  return (json.results ?? []).flatMap((row) => {
    const client = row.customerClient;
    const customerId = customerIdFromResource(client?.clientCustomer) ?? client?.id ?? null;
    if (!customerId || customerId === managerCustomerId) return [];
    return [{
      customerId,
      descriptiveName: client?.descriptiveName ?? null,
      manager: client?.manager === true,
      testAccount: typeof client?.testAccount === "boolean" ? client.testAccount : null,
      parentCustomerId: managerCustomerId,
      level: typeof client?.level === "number" ? client.level : null
    }];
  });
}

export async function discoverAccessibleGoogleAdsCustomers(
  accessToken: string,
  config?: GoogleOAuthConfig
): Promise<GoogleAdsCustomerDiscovery[]> {
  const cfg = config ?? loadGoogleOAuthConfig();
  const roots = await listAccessibleCustomers(accessToken, cfg);
  const discovered: GoogleAdsCustomerDiscovery[] = roots.map((customerId) => ({
    customerId,
    descriptiveName: null,
    manager: false,
    testAccount: null,
    parentCustomerId: null,
    level: null
  }));

  for (const rootCustomerId of roots) {
    try {
      discovered.push(...await listCustomerClients(rootCustomerId, accessToken, cfg));
    } catch {
      // Some accessible customers are not managers or cannot expose hierarchy.
      // Keep the root customer and continue discovering from other roots.
    }
  }

  return uniqueCustomers(discovered);
}
