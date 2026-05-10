import { db } from "@/lib/db";
import { decryptOAuthToken, isOAuthEncryptionAvailable } from "@/lib/oauth-tokens";
import { loadMetaOAuthConfig, metaGraphApiBase, type MetaOAuthConfig } from "./meta-oauth";
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

export class MetaAdsConnectorError extends Error {}
export class MetaAdsNotTestAccountError extends MetaAdsConnectorError {
  constructor(externalAccountId: string) {
    super(`Refusing to fetch from non-test Meta ad account ${externalAccountId}. Demo scope is read-only against test accounts only.`);
    this.name = "MetaAdsNotTestAccountError";
  }
}

type StoredConnection = {
  id: string;
  externalAccountId: string;
  accountName: string;
  isTestAccount: boolean;
  encryptedAccessToken: string;
  expiresAt: Date | null;
};

type MetaPage<T> = {
  data?: T[];
  paging?: { next?: string };
};

export class MetaAdsConnector implements AdConnector {
  readonly provider: AdProvider = "meta_ads";

  constructor(private readonly accountUserId: string | null = null) {}

  private ownedOrLegacyWhere() {
    return {
      OR: this.accountUserId
        ? [{ accountUserId: this.accountUserId }, { accountUserId: null }]
        : [{ accountUserId: null }]
    };
  }

  async fetchAccounts(): Promise<RemoteAdAccount[]> {
    if (!isOAuthEncryptionAvailable()) throw new MetaAdsConnectorError("OAUTH_ENCRYPTION_KEY is not configured");
    const connections = await db.adAccountConnection.findMany({
      where: { provider: "meta_ads", ...this.ownedOrLegacyWhere() },
      orderBy: { createdAt: "asc" }
    });

    return connections.map((conn) => ({
      provider: "meta_ads",
      externalAccountId: conn.externalAccountId,
      name: conn.accountName,
      currencyCode: "USD",
      isTestAccount: conn.isTestAccount
    }));
  }

  async fetchCampaigns(externalAccountId: string): Promise<RemoteCampaign[]> {
    const { connection, accessToken, config } = await this.resolveAuth(externalAccountId);
    this.assertTestAccount(connection);
    const rows = await this.metaGetAll<{
      id: string;
      name?: string;
      status?: string;
      start_time?: string;
      stop_time?: string;
    }>(`${connection.externalAccountId}/campaigns`, {
      fields: "id,name,status,start_time,stop_time",
      limit: "100"
    }, accessToken, config);
    await this.markFetched(connection.id);

    return rows.map((row) => ({
      externalCampaignId: row.id,
      name: row.name ?? `Campaign ${row.id}`,
      status: this.normalizeStatus(row.status),
      startDate: row.start_time?.slice(0, 10) ?? null,
      endDate: row.stop_time?.slice(0, 10) ?? null
    }));
  }

  async fetchAdGroups(externalAccountId: string, externalCampaignId: string): Promise<RemoteAdGroup[]> {
    const { connection, accessToken, config } = await this.resolveAuth(externalAccountId);
    this.assertTestAccount(connection);
    const rows = await this.metaGetAll<{
      id: string;
      name?: string;
      status?: string;
      campaign_id?: string;
    }>(`${externalCampaignId}/adsets`, {
      fields: "id,name,status,campaign_id",
      limit: "100"
    }, accessToken, config);
    await this.markFetched(connection.id);

    return rows.map((row) => ({
      externalCampaignId: row.campaign_id ?? externalCampaignId,
      externalAdGroupId: row.id,
      name: row.name ?? `Ad set ${row.id}`,
      status: this.normalizeStatus(row.status)
    }));
  }

  async fetchAds(externalAccountId: string, externalCampaignId: string, externalAdGroupId?: string | null): Promise<RemoteAdUnit[]> {
    const { connection, accessToken, config } = await this.resolveAuth(externalAccountId);
    this.assertTestAccount(connection);
    const edge = externalAdGroupId ? `${externalAdGroupId}/ads` : `${externalCampaignId}/ads`;
    const rows = await this.metaGetAll<{
      id: string;
      name?: string;
      status?: string;
      campaign_id?: string;
      adset_id?: string;
    }>(edge, {
      fields: "id,name,status,campaign_id,adset_id",
      limit: "100"
    }, accessToken, config);
    await this.markFetched(connection.id);

    return rows.map((row) => ({
      externalCampaignId: row.campaign_id ?? externalCampaignId,
      externalAdGroupId: row.adset_id ?? externalAdGroupId ?? null,
      externalAdId: row.id,
      name: row.name ?? `Ad ${row.id}`,
      status: this.normalizeStatus(row.status)
    }));
  }

  async fetchPerformance(externalAccountId: string, externalCampaignId: string, range: DateRange): Promise<RemotePerformance> {
    const { connection, accessToken, config } = await this.resolveAuth(externalAccountId);
    this.assertTestAccount(connection);
    const rows = await this.metaGetAll<{
      date_start: string;
      impressions?: string;
      clicks?: string;
      spend?: string;
      actions?: Array<{ action_type?: string; value?: string }>;
    }>(`${externalCampaignId}/insights`, {
      fields: "date_start,impressions,clicks,spend,actions",
      time_increment: "1",
      time_range: JSON.stringify({ since: range.start, until: range.end }),
      limit: "100"
    }, accessToken, config);
    await this.markFetched(connection.id);

    const daily: RemotePerformancePoint[] = rows.map((row) => ({
      date: row.date_start,
      impressions: Math.max(0, Math.round(Number(row.impressions ?? 0))),
      clicks: Math.max(0, Math.round(Number(row.clicks ?? 0))),
      conversions: this.conversionsFromActions(row.actions ?? []),
      spendCents: Math.max(0, Math.round(Number(row.spend ?? 0) * 100))
    }));

    const totals = daily.reduce(
      (acc, point) => ({
        impressions: acc.impressions + point.impressions,
        clicks: acc.clicks + point.clicks,
        conversions: acc.conversions + point.conversions,
        spendCents: acc.spendCents + point.spendCents
      }),
      { impressions: 0, clicks: 0, conversions: 0, spendCents: 0 }
    );

    return { externalCampaignId, totals, daily };
  }

  private async resolveAuth(externalAccountId: string): Promise<{
    connection: StoredConnection;
    accessToken: string;
    config: MetaOAuthConfig;
  }> {
    if (!isOAuthEncryptionAvailable()) throw new MetaAdsConnectorError("OAUTH_ENCRYPTION_KEY is not configured");
    const config = loadMetaOAuthConfig();
    const connection = await db.adAccountConnection.findFirst({
      where: { provider: "meta_ads", externalAccountId, ...this.ownedOrLegacyWhere() },
      orderBy: { createdAt: "desc" }
    });
    if (!connection) throw new MetaAdsConnectorError(`No Meta Ads connection for account ${externalAccountId}`);
    return { connection, accessToken: decryptOAuthToken(connection.encryptedAccessToken), config };
  }

  private assertTestAccount(connection: StoredConnection) {
    if (!connection.isTestAccount) throw new MetaAdsNotTestAccountError(connection.externalAccountId);
    if (connection.expiresAt && connection.expiresAt.getTime() <= Date.now()) {
      throw new MetaAdsConnectorError(`Access token expired for Meta ad account ${connection.externalAccountId}. Reconnect from /acquisition/connections.`);
    }
  }

  private async metaGetAll<T>(
    path: string,
    params: Record<string, string>,
    accessToken: string,
    config: MetaOAuthConfig
  ): Promise<T[]> {
    const out: T[] = [];
    let url: string | null = this.metaUrl(path, { ...params, access_token: accessToken }, config);
    for (let page = 0; page < 5 && url; page++) {
      const response = await fetch(url);
      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new MetaAdsConnectorError(`Meta Graph API request failed (${response.status}) for ${path}: ${text.slice(0, 240)}`);
      }
      const json = (await response.json()) as MetaPage<T>;
      out.push(...(json.data ?? []));
      url = json.paging?.next ?? null;
    }
    return out;
  }

  private metaUrl(path: string, params: Record<string, string>, config: MetaOAuthConfig) {
    const cleanPath = path.replace(/^\/+/, "");
    const search = new URLSearchParams(params);
    return `${metaGraphApiBase(config)}/${cleanPath}?${search.toString()}`;
  }

  private async markFetched(id: string) {
    await db.adAccountConnection.update({
      where: { id },
      data: { lastFetchedAt: new Date() }
    });
  }

  private normalizeStatus(status?: string): RemoteCampaign["status"] {
    if (status === "ACTIVE") return "ENABLED";
    if (status === "PAUSED") return "PAUSED";
    if (status === "DELETED" || status === "ARCHIVED") return "REMOVED";
    return "UNKNOWN";
  }

  private conversionsFromActions(actions: Array<{ action_type?: string; value?: string }>) {
    const conversionTypes = new Set([
      "purchase",
      "lead",
      "complete_registration",
      "offsite_conversion.fb_pixel_purchase",
      "offsite_conversion.fb_pixel_lead"
    ]);
    return actions.reduce((sum, action) => (
      conversionTypes.has(action.action_type ?? "") ? sum + Math.max(0, Number(action.value ?? 0)) : sum
    ), 0);
  }
}
