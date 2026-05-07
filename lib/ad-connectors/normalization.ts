import type {
  AdProvider,
  DateRange,
  RemoteCampaign,
  RemotePerformance,
  RemotePerformancePoint
} from "./types";

export type NormalizedAdChannel = "search" | "social" | "display" | "video" | "unknown";
export type NormalizedCampaignState = "active" | "paused" | "removed" | "draft" | "unknown";

export type AttributionWindow = {
  clickDays: number;
  viewDays: number;
  model: "platform_reported" | "first_party" | "blended";
};

export type NormalizedCampaign = {
  provider: AdProvider;
  externalCampaignId: string;
  sourceName: string;
  canonicalName: string;
  channel: NormalizedAdChannel;
  state: NormalizedCampaignState;
  startDate: string | null;
  endDate: string | null;
};

export type NormalizedPerformancePoint = RemotePerformancePoint & {
  attributionWindow: AttributionWindow;
};

export type NormalizedPerformance = {
  provider: AdProvider;
  externalCampaignId: string;
  attributionWindow: AttributionWindow;
  totals: RemotePerformance["totals"];
  daily: NormalizedPerformancePoint[];
};

const DEFAULT_ATTRIBUTION_BY_PROVIDER: Record<AdProvider, AttributionWindow> = {
  simulated: { clickDays: 7, viewDays: 1, model: "platform_reported" },
  google_ads: { clickDays: 30, viewDays: 1, model: "platform_reported" },
  meta_ads: { clickDays: 7, viewDays: 1, model: "platform_reported" }
};

const CHANNEL_PATTERNS: Array<[NormalizedAdChannel, RegExp]> = [
  ["search", /\b(search|sem|keyword|pmax|performance max)\b/i],
  ["social", /\b(social|meta|facebook|instagram|linkedin|tiktok)\b/i],
  ["display", /\b(display|gdn|banner|programmatic)\b/i],
  ["video", /\b(video|youtube|ctv|ott)\b/i]
];

export function normalizeAttributionWindow(
  provider: AdProvider,
  override?: Partial<AttributionWindow> | null
): AttributionWindow {
  const base = DEFAULT_ATTRIBUTION_BY_PROVIDER[provider];
  return {
    clickDays: clampWholeDays(override?.clickDays, base.clickDays),
    viewDays: clampWholeDays(override?.viewDays, base.viewDays),
    model: override?.model ?? base.model
  };
}

export function normalizeCampaignState(status: string | null | undefined): NormalizedCampaignState {
  const value = String(status ?? "").trim().toUpperCase();
  if (["ENABLED", "ACTIVE", "SERVING"].includes(value)) return "active";
  if (["PAUSED", "PAUSE"].includes(value)) return "paused";
  if (["REMOVED", "DELETED", "ARCHIVED"].includes(value)) return "removed";
  if (["DRAFT", "PENDING"].includes(value)) return "draft";
  return "unknown";
}

export function inferAdChannel(value: string | null | undefined): NormalizedAdChannel {
  const name = String(value ?? "");
  return CHANNEL_PATTERNS.find(([, pattern]) => pattern.test(name))?.[0] ?? "unknown";
}

export function canonicalCampaignName(value: string | null | undefined): string {
  return String(value ?? "")
    .trim()
    .replace(/[_|/]+/g, " ")
    .replace(/\s*-\s*/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function normalizeRemoteCampaign(provider: AdProvider, campaign: RemoteCampaign): NormalizedCampaign {
  return {
    provider,
    externalCampaignId: campaign.externalCampaignId,
    sourceName: campaign.name,
    canonicalName: canonicalCampaignName(campaign.name),
    channel: inferAdChannel(campaign.name),
    state: normalizeCampaignState(campaign.status),
    startDate: normalizeIsoDate(campaign.startDate),
    endDate: normalizeIsoDate(campaign.endDate)
  };
}

export function normalizeRemotePerformance(
  provider: AdProvider,
  performance: RemotePerformance,
  options: { attributionWindow?: Partial<AttributionWindow> | null; range?: DateRange } = {}
): NormalizedPerformance {
  const attributionWindow = normalizeAttributionWindow(provider, options.attributionWindow);
  const daily = performance.daily
    .filter((point) => isWithinRange(point.date, options.range))
    .map((point) => ({
      date: normalizeIsoDate(point.date) ?? point.date,
      impressions: nonNegativeInteger(point.impressions),
      clicks: nonNegativeInteger(point.clicks),
      conversions: nonNegativeNumber(point.conversions),
      spendCents: nonNegativeInteger(point.spendCents),
      attributionWindow
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

  return {
    provider,
    externalCampaignId: performance.externalCampaignId,
    attributionWindow,
    totals,
    daily
  };
}

function clampWholeDays(value: number | undefined, fallback: number) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.min(365, Math.round(numeric))) : fallback;
}

function normalizeIsoDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function nonNegativeInteger(value: number) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.round(numeric)) : 0;
}

function nonNegativeNumber(value: number) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, numeric) : 0;
}

function isWithinRange(date: string, range: DateRange | undefined) {
  if (!range) return true;
  const normalized = normalizeIsoDate(date);
  return Boolean(normalized && normalized >= range.start && normalized <= range.end);
}
