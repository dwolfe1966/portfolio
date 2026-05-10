import { db } from "@/lib/db";
import {
  decryptOAuthToken,
  encryptOAuthToken,
  isOAuthEncryptionAvailable
} from "@/lib/oauth-tokens";
import {
  loadGoogleOAuthConfig,
  refreshGoogleAccessToken,
  type GoogleOAuthConfig
} from "./google-oauth";
import type {
  AdConnector,
  AdProvider,
  DateRange,
  RemoteAdAccount,
  RemoteAdGroup,
  RemoteAdUnit,
  RemoteCampaign,
  RemotePerformance,
  RemotePerformancePoint
} from "./types";

const ACCESS_TOKEN_REFRESH_BUFFER_MS = 60_000;

export class GoogleAdsConnectorError extends Error {}
export class GoogleAdsNotTestAccountError extends GoogleAdsConnectorError {
  constructor(externalAccountId: string) {
    super(
      `Refusing to fetch from non-test customer ${externalAccountId}. Demo scope is read-only against test accounts only.`
    );
    this.name = "GoogleAdsNotTestAccountError";
  }
}

type StoredConnection = {
  id: string;
  externalAccountId: string;
  accountName: string;
  isTestAccount: boolean;
  encryptedAccessToken: string;
  encryptedRefreshToken: string | null;
  expiresAt: Date | null;
};

type GoogleAdsErrorResponse = {
  error?: {
    code?: number;
    message?: string;
    status?: string;
    details?: Array<{
      errors?: Array<{
        errorCode?: Record<string, string>;
        message?: string;
      }>;
      requestId?: string;
    }>;
  };
};

function googleAdsFailureCodes(payload: GoogleAdsErrorResponse): string[] {
  return (payload.error?.details ?? []).flatMap((detail) =>
    (detail.errors ?? []).flatMap((error) => Object.values(error.errorCode ?? {}))
  );
}

function googleAdsFailureMessages(payload: GoogleAdsErrorResponse): string[] {
  return (payload.error?.details ?? []).flatMap((detail) =>
    (detail.errors ?? []).map((error) => error.message).filter((message): message is string => Boolean(message))
  );
}

function summarizeGoogleAdsError(status: number, text: string): string {
  try {
    const payload = JSON.parse(text) as GoogleAdsErrorResponse;
    const codes = googleAdsFailureCodes(payload);
    const messages = googleAdsFailureMessages(payload);
    const requestId = payload.error?.details?.find((detail) => detail.requestId)?.requestId;
    return [
      `${payload.error?.status ?? status}`,
      codes.length ? `codes=${codes.join(",")}` : null,
      messages.length ? messages.join(" ") : payload.error?.message,
      requestId ? `requestId=${requestId}` : null
    ].filter(Boolean).join(" · ");
  } catch {
    return text.slice(0, 500);
  }
}

function isDeveloperTokenTestAccountOnlyError(status: number, text: string): boolean {
  if (status !== 403) return false;
  try {
    return googleAdsFailureCodes(JSON.parse(text) as GoogleAdsErrorResponse).includes("DEVELOPER_TOKEN_NOT_APPROVED");
  } catch {
    return false;
  }
}

/**
 * Real Google Ads connector. Read-only against test customers.
 *
 * The connector is per-provider (not per-account) — each method looks up
 * the relevant AdAccountConnection from the database, refreshes the access
 * token if expired, verifies test_account=true on the live customer
 * resource before issuing data queries, and returns provider-shaped data.
 */
export class GoogleAdsConnector implements AdConnector {
  readonly provider: AdProvider = "google_ads";

  constructor(private readonly accountUserId: string | null = null) {}

  private ownedOrLegacyWhere() {
    return {
      OR: this.accountUserId
        ? [{ accountUserId: this.accountUserId }, { accountUserId: null }]
        : [{ accountUserId: null }]
    };
  }

  async fetchAccounts(): Promise<RemoteAdAccount[]> {
    if (!isOAuthEncryptionAvailable()) {
      throw new GoogleAdsConnectorError("OAUTH_ENCRYPTION_KEY is not configured");
    }

    const config = loadGoogleOAuthConfig();
    const connections = await db.adAccountConnection.findMany({
      where: { provider: "google_ads", ...this.ownedOrLegacyWhere() },
      orderBy: { createdAt: "asc" }
    });

    const out: RemoteAdAccount[] = [];
    for (const conn of connections) {
      try {
        const accessToken = await this.ensureAccessToken(conn, config);
        const customer = await this.fetchCustomerResource(conn.externalAccountId, accessToken, config);
        const isTest = customer.testAccount === true;
        if (!isTest && conn.isTestAccount) {
          // Drift detection: connection was assumed test but the customer
          // resource says otherwise. Persist the truth and refuse downstream.
          await db.adAccountConnection.update({
            where: { id: conn.id },
            data: { isTestAccount: false, accountName: customer.descriptiveName ?? conn.accountName }
          });
        } else if (customer.descriptiveName && customer.descriptiveName !== conn.accountName) {
          await db.adAccountConnection.update({
            where: { id: conn.id },
            data: { accountName: customer.descriptiveName, isTestAccount: isTest }
          });
        }

        out.push({
          provider: "google_ads",
          externalAccountId: conn.externalAccountId,
          name: customer.descriptiveName ?? conn.accountName,
          currencyCode: customer.currencyCode ?? "USD",
          isTestAccount: isTest
        });
      } catch (err) {
        // Surface unreachable customers as a row marked non-test/empty so the
        // UI can render the error rather than the page failing entirely.
        out.push({
          provider: "google_ads",
          externalAccountId: conn.externalAccountId,
          name: `${conn.accountName} (error: ${err instanceof Error ? err.message.slice(0, 80) : "unknown"})`,
          currencyCode: "USD",
          isTestAccount: false
        });
      }
    }
    return out;
  }

  async fetchCampaigns(externalAccountId: string): Promise<RemoteCampaign[]> {
    const { connection, accessToken, config } = await this.resolveAuth(externalAccountId);
    await this.assertTestAccount(connection, accessToken, config);

    const query = [
      "SELECT campaign.id, campaign.name, campaign.status,",
      "campaign.start_date, campaign.end_date",
      "FROM campaign",
      "ORDER BY campaign.id"
    ].join(" ");

    const results = await this.googleAdsSearch<{
      campaign: {
        id: string;
        name: string;
        status: string;
        startDate?: string;
        endDate?: string;
      };
    }>(externalAccountId, query, accessToken, config);

    await db.adAccountConnection.update({
      where: { id: connection.id },
      data: { lastFetchedAt: new Date() }
    });

    return results.map((row) => ({
      externalCampaignId: row.campaign.id,
      name: row.campaign.name,
      status: this.normalizeCampaignStatus(row.campaign.status),
      startDate: row.campaign.startDate ?? null,
      endDate: row.campaign.endDate ?? null
    }));
  }

  async fetchAdGroups(externalAccountId: string, externalCampaignId: string): Promise<RemoteAdGroup[]> {
    const { connection, accessToken, config } = await this.resolveAuth(externalAccountId);
    await this.assertTestAccount(connection, accessToken, config);

    const query = [
      "SELECT ad_group.id, ad_group.name, ad_group.status, campaign.id",
      "FROM ad_group",
      `WHERE campaign.id = ${externalCampaignId}`,
      "ORDER BY ad_group.id"
    ].join(" ");

    const results = await this.googleAdsSearch<{
      campaign: { id: string };
      adGroup: {
        id: string;
        name: string;
        status: string;
      };
    }>(externalAccountId, query, accessToken, config);

    await db.adAccountConnection.update({
      where: { id: connection.id },
      data: { lastFetchedAt: new Date() }
    });

    return results.map((row) => ({
      externalCampaignId: row.campaign.id,
      externalAdGroupId: row.adGroup.id,
      name: row.adGroup.name,
      status: this.normalizeCampaignStatus(row.adGroup.status)
    }));
  }

  async fetchAds(externalAccountId: string, externalCampaignId: string, externalAdGroupId?: string | null): Promise<RemoteAdUnit[]> {
    const { connection, accessToken, config } = await this.resolveAuth(externalAccountId);
    await this.assertTestAccount(connection, accessToken, config);

    const where = [
      `campaign.id = ${externalCampaignId}`,
      externalAdGroupId ? `ad_group.id = ${externalAdGroupId}` : null
    ].filter(Boolean).join(" AND ");
    const query = [
      "SELECT ad_group.id, campaign.id, ad_group_ad.ad.id, ad_group_ad.ad.name, ad_group_ad.status",
      "FROM ad_group_ad",
      `WHERE ${where}`,
      "ORDER BY ad_group.id, ad_group_ad.ad.id"
    ].join(" ");

    const results = await this.googleAdsSearch<{
      campaign: { id: string };
      adGroup: { id: string };
      adGroupAd: {
        status: string;
        ad: {
          id: string;
          name?: string;
        };
      };
    }>(externalAccountId, query, accessToken, config);

    await db.adAccountConnection.update({
      where: { id: connection.id },
      data: { lastFetchedAt: new Date() }
    });

    return results.map((row) => ({
      externalCampaignId: row.campaign.id,
      externalAdGroupId: row.adGroup.id,
      externalAdId: row.adGroupAd.ad.id,
      name: row.adGroupAd.ad.name ?? `Ad ${row.adGroupAd.ad.id}`,
      status: this.normalizeCampaignStatus(row.adGroupAd.status)
    }));
  }

  async fetchPerformance(
    externalAccountId: string,
    externalCampaignId: string,
    range: DateRange
  ): Promise<RemotePerformance> {
    const { connection, accessToken, config } = await this.resolveAuth(externalAccountId);
    await this.assertTestAccount(connection, accessToken, config);

    const query = [
      "SELECT segments.date, metrics.impressions, metrics.clicks,",
      "metrics.conversions, metrics.cost_micros",
      "FROM campaign",
      `WHERE campaign.id = ${externalCampaignId}`,
      `AND segments.date BETWEEN '${range.start}' AND '${range.end}'`,
      "ORDER BY segments.date"
    ].join(" ");

    const results = await this.googleAdsSearch<{
      segments: { date: string };
      metrics: {
        impressions?: string;
        clicks?: string;
        conversions?: number;
        costMicros?: string;
      };
    }>(externalAccountId, query, accessToken, config);

    const daily: RemotePerformancePoint[] = results.map((row) => {
      const impressions = Number(row.metrics.impressions ?? 0);
      const clicks = Number(row.metrics.clicks ?? 0);
      const conversions = Number(row.metrics.conversions ?? 0);
      const costMicros = Number(row.metrics.costMicros ?? 0);
      const spendCents = Math.round(costMicros / 10_000);
      return {
        date: row.segments.date,
        impressions,
        clicks,
        conversions,
        spendCents
      };
    });

    const totals = daily.reduce(
      (acc, p) => ({
        impressions: acc.impressions + p.impressions,
        clicks: acc.clicks + p.clicks,
        conversions: acc.conversions + p.conversions,
        spendCents: acc.spendCents + p.spendCents
      }),
      { impressions: 0, clicks: 0, conversions: 0, spendCents: 0 }
    );

    await db.adAccountConnection.update({
      where: { id: connection.id },
      data: { lastFetchedAt: new Date() }
    });

    return { externalCampaignId, totals, daily };
  }

  // ----- internals -----

  private async resolveAuth(externalAccountId: string): Promise<{
    connection: StoredConnection;
    accessToken: string;
    config: GoogleOAuthConfig;
  }> {
    if (!isOAuthEncryptionAvailable()) {
      throw new GoogleAdsConnectorError("OAUTH_ENCRYPTION_KEY is not configured");
    }
    const config = loadGoogleOAuthConfig();
    const connection = await db.adAccountConnection.findFirst({
      where: { provider: "google_ads", externalAccountId, ...this.ownedOrLegacyWhere() },
      orderBy: { createdAt: "desc" }
    });
    if (!connection) {
      throw new GoogleAdsConnectorError(`No Google Ads connection for customer ${externalAccountId}`);
    }
    const accessToken = await this.ensureAccessToken(connection, config);
    return { connection, accessToken, config };
  }

  private async ensureAccessToken(connection: StoredConnection, config: GoogleOAuthConfig): Promise<string> {
    const decrypted = decryptOAuthToken(connection.encryptedAccessToken);
    const expiresAt = connection.expiresAt?.getTime() ?? 0;
    if (expiresAt - Date.now() > ACCESS_TOKEN_REFRESH_BUFFER_MS) {
      return decrypted;
    }
    if (!connection.encryptedRefreshToken) {
      throw new GoogleAdsConnectorError(
        `Access token expired for customer ${connection.externalAccountId} and no refresh token is stored. Reconnect from /acquisition/connections.`
      );
    }
    const refreshToken = decryptOAuthToken(connection.encryptedRefreshToken);
    const refreshed = await refreshGoogleAccessToken(refreshToken, config);
    await db.adAccountConnection.update({
      where: { id: connection.id },
      data: {
        encryptedAccessToken: encryptOAuthToken(refreshed.accessToken),
        expiresAt: refreshed.expiresAt
      }
    });
    return refreshed.accessToken;
  }

  private async assertTestAccount(
    connection: StoredConnection,
    accessToken: string,
    config: GoogleOAuthConfig
  ): Promise<void> {
    let customer: Awaited<ReturnType<GoogleAdsConnector["fetchCustomerResource"]>>;
    try {
      customer = await this.fetchCustomerResource(connection.externalAccountId, accessToken, config);
    } catch (error) {
      if (error instanceof GoogleAdsNotTestAccountError && connection.isTestAccount) {
        await db.adAccountConnection.update({
          where: { id: connection.id },
          data: { isTestAccount: false }
        });
      }
      throw error;
    }
    if (customer.testAccount !== true) {
      if (connection.isTestAccount) {
        await db.adAccountConnection.update({
          where: { id: connection.id },
          data: { isTestAccount: false }
        });
      }
      throw new GoogleAdsNotTestAccountError(connection.externalAccountId);
    }
  }

  private async fetchCustomerResource(
    customerId: string,
    accessToken: string,
    config: GoogleOAuthConfig
  ): Promise<{ id: string; descriptiveName?: string; currencyCode?: string; testAccount?: boolean }> {
    const query =
      "SELECT customer.id, customer.descriptive_name, customer.currency_code, customer.test_account FROM customer LIMIT 1";
    const rows = await this.googleAdsSearch<{
      customer: {
        id: string;
        descriptiveName?: string;
        currencyCode?: string;
        testAccount?: boolean;
      };
    }>(customerId, query, accessToken, config);
    if (rows.length === 0) {
      throw new GoogleAdsConnectorError(`Customer ${customerId} returned no resource row`);
    }
    return rows[0].customer;
  }

  private async googleAdsSearch<T>(
    customerId: string,
    query: string,
    accessToken: string,
    config: GoogleOAuthConfig
  ): Promise<T[]> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      "developer-token": config.developerToken,
      "Content-Type": "application/json"
    };
    if (config.loginCustomerId) {
      headers["login-customer-id"] = config.loginCustomerId;
    }

    const response = await fetch(`${config.apiBase}/customers/${customerId}/googleAds:search`, {
      method: "POST",
      headers,
      body: JSON.stringify({ query })
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      if (isDeveloperTokenTestAccountOnlyError(response.status, text)) {
        throw new GoogleAdsNotTestAccountError(customerId);
      }
      throw new GoogleAdsConnectorError(
        `Google Ads search failed (${response.status}) for customer ${customerId}: ${summarizeGoogleAdsError(response.status, text)}`
      );
    }

    const json = (await response.json()) as { results?: T[] };
    return json.results ?? [];
  }

  private normalizeCampaignStatus(status: string): RemoteCampaign["status"] {
    if (status === "ENABLED") return "ENABLED";
    if (status === "PAUSED") return "PAUSED";
    if (status === "REMOVED") return "REMOVED";
    return "UNKNOWN";
  }
}
