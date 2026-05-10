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

/**
 * Deterministic mock connector used when no real provider is connected.
 * Returns shapes identical to what GoogleAdsConnector / MetaAdsConnector
 * will return so the Connections UI works end-to-end before any OAuth
 * setup is in place.
 */
export class SimulatedConnector implements AdConnector {
  readonly provider: AdProvider = "simulated";

  private accounts: RemoteAdAccount[] = [
    {
      provider: "simulated",
      externalAccountId: "sim-acct-001",
      name: "Demo Test Account A",
      currencyCode: "USD",
      isTestAccount: true
    },
    {
      provider: "simulated",
      externalAccountId: "sim-acct-002",
      name: "Demo Test Account B",
      currencyCode: "USD",
      isTestAccount: true
    }
  ];

  async fetchAccounts(): Promise<RemoteAdAccount[]> {
    return this.accounts;
  }

  async fetchCampaigns(externalAccountId: string): Promise<RemoteCampaign[]> {
    const seed = hashString(externalAccountId);
    const baseCount = 2 + (seed % 3);
    return Array.from({ length: baseCount }, (_, i) => ({
      externalCampaignId: `${externalAccountId}-camp-${i + 1}`,
      name: `Simulated campaign ${i + 1}`,
      status: i === 0 ? "ENABLED" : i === 1 ? "PAUSED" : "ENABLED",
      startDate: dateNDaysAgo(14 + i).toISOString().slice(0, 10),
      endDate: null
    }));
  }

  async fetchAdGroups(externalAccountId: string, externalCampaignId: string): Promise<RemoteAdGroup[]> {
    const seed = hashString(`${externalAccountId}:${externalCampaignId}:groups`);
    const count = 2 + (seed % 2);
    return Array.from({ length: count }, (_, i) => ({
      externalCampaignId,
      externalAdGroupId: `${externalCampaignId}-group-${i + 1}`,
      name: `Simulated ad group ${i + 1}`,
      status: i === 1 ? "PAUSED" : "ENABLED"
    }));
  }

  async fetchAds(externalAccountId: string, externalCampaignId: string, externalAdGroupId?: string | null): Promise<RemoteAdUnit[]> {
    const groups = externalAdGroupId
      ? [{ externalAdGroupId }]
      : await this.fetchAdGroups(externalAccountId, externalCampaignId);
    return groups.flatMap((group, groupIdx) => (
      Array.from({ length: 2 }, (_, i) => ({
        externalCampaignId,
        externalAdGroupId: group.externalAdGroupId,
        externalAdId: `${group.externalAdGroupId}-ad-${i + 1}`,
        name: `Simulated ad ${groupIdx + 1}.${i + 1}`,
        status: i === 1 ? "PAUSED" : "ENABLED"
      }))
    ));
  }

  async fetchPerformance(
    _externalAccountId: string,
    externalCampaignId: string,
    range: DateRange
  ): Promise<RemotePerformance> {
    const seed = hashString(externalCampaignId);
    const days = enumerateDates(range.start, range.end);
    const daily: RemotePerformancePoint[] = days.map((date, idx) => {
      const noise = ((seed + idx * 37) % 100) / 100;
      const impressions = Math.round(800 + noise * 1200);
      const clicks = Math.max(1, Math.round(impressions * (0.02 + noise * 0.02)));
      const conversions = Math.max(0, Math.round(clicks * (0.04 + noise * 0.04)));
      const spendCents = clicks * (180 + Math.round(noise * 120));
      return { date, impressions, clicks, conversions, spendCents };
    });

    const totals = daily.reduce(
      (acc, point) => ({
        impressions: acc.impressions + point.impressions,
        clicks: acc.clicks + point.clicks,
        conversions: acc.conversions + point.conversions,
        spendCents: acc.spendCents + point.spendCents
      }),
      { impressions: 0, clicks: 0, conversions: 0, spendCents: 0 }
    );

    return {
      externalCampaignId,
      totals,
      daily
    };
  }
}

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function dateNDaysAgo(n: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function enumerateDates(startIso: string, endIso: string): string[] {
  const start = new Date(`${startIso}T00:00:00Z`);
  const end = new Date(`${endIso}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return [];
  }
  const out: string[] = [];
  const cursor = new Date(start);
  // Cap at 92 days to avoid runaway loops.
  for (let i = 0; i < 92 && cursor <= end; i++) {
    out.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}
