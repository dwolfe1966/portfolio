/**
 * AdConnector — read-only contract for ad-platform integrations.
 *
 * Scope: portfolio demo, test-tier credentials, read-only API calls against
 * the user's own test accounts. No write operations are exposed; the
 * acquisition simulation loop continues to drive campaign state in-app via
 * the SimulatedConnector. Real provider connectors (GoogleAdsConnector,
 * MetaAdsConnector) surface live read-only data alongside the simulation
 * so the demo can show "this code actually talks to Google/Meta" without
 * any money exposure.
 */

export type AdProvider = "simulated" | "google_ads" | "meta_ads";

export type RemoteAdAccount = {
  provider: AdProvider;
  externalAccountId: string;
  name: string;
  currencyCode: string;
  isTestAccount: boolean;
};

export type RemoteCampaign = {
  externalCampaignId: string;
  name: string;
  status: "ENABLED" | "PAUSED" | "REMOVED" | "UNKNOWN";
  startDate: string | null;
  endDate: string | null;
};

export type RemoteAdGroup = {
  externalCampaignId: string;
  externalAdGroupId: string;
  name: string;
  status: "ENABLED" | "PAUSED" | "REMOVED" | "UNKNOWN";
};

export type RemoteAdUnit = {
  externalCampaignId: string;
  externalAdGroupId: string | null;
  externalAdId: string;
  name: string;
  status: "ENABLED" | "PAUSED" | "REMOVED" | "UNKNOWN";
};

export type RemotePerformancePoint = {
  date: string;
  impressions: number;
  clicks: number;
  conversions: number;
  spendCents: number;
};

export type RemotePerformance = {
  externalCampaignId: string;
  totals: {
    impressions: number;
    clicks: number;
    conversions: number;
    spendCents: number;
  };
  daily: RemotePerformancePoint[];
};

export type DateRange = {
  start: string; // ISO date (YYYY-MM-DD)
  end: string;
};

export interface AdConnector {
  readonly provider: AdProvider;

  /**
   * List ad accounts this connection has access to. For test-tier
   * credentials this should only return test/sandbox accounts.
   */
  fetchAccounts(): Promise<RemoteAdAccount[]>;

  /**
   * List campaigns under a given account. Read-only.
   */
  fetchCampaigns(externalAccountId: string): Promise<RemoteCampaign[]>;

  /**
   * List child campaign groups. Google returns ad groups; Meta returns ad sets.
   * Read-only.
   */
  fetchAdGroups(externalAccountId: string, externalCampaignId: string): Promise<RemoteAdGroup[]>;

  /**
   * List ads under a campaign, optionally scoped to an ad group/ad set. Read-only.
   */
  fetchAds(externalAccountId: string, externalCampaignId: string, externalAdGroupId?: string | null): Promise<RemoteAdUnit[]>;

  /**
   * Fetch performance metrics for a campaign over a date range. Read-only.
   */
  fetchPerformance(
    externalAccountId: string,
    externalCampaignId: string,
    range: DateRange
  ): Promise<RemotePerformance>;
}
