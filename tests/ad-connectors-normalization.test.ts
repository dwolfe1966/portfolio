import test from "node:test";
import assert from "node:assert/strict";
import {
  canonicalCampaignName,
  inferAdChannel,
  normalizeAttributionWindow,
  normalizeCampaignState,
  normalizeRemoteCampaign,
  normalizeRemotePerformance
} from "@/lib/ad-connectors";

test("normalizeCampaignState maps provider statuses into stable states", () => {
  assert.equal(normalizeCampaignState("ENABLED"), "active");
  assert.equal(normalizeCampaignState("ACTIVE"), "active");
  assert.equal(normalizeCampaignState("PAUSED"), "paused");
  assert.equal(normalizeCampaignState("REMOVED"), "removed");
  assert.equal(normalizeCampaignState("DRAFT"), "draft");
  assert.equal(normalizeCampaignState("unexpected"), "unknown");
});

test("inferAdChannel detects common cross-channel naming conventions", () => {
  assert.equal(inferAdChannel("Brand Search - US"), "search");
  assert.equal(inferAdChannel("Meta Social Prospecting"), "social");
  assert.equal(inferAdChannel("GDN Display Retargeting"), "display");
  assert.equal(inferAdChannel("YouTube Video Launch"), "video");
  assert.equal(inferAdChannel("General growth campaign"), "unknown");
});

test("canonicalCampaignName normalizes separators, whitespace, and case", () => {
  assert.equal(canonicalCampaignName("  Q2_Search | Trial-Growth / US  "), "q2 search trial growth us");
});

test("normalizeAttributionWindow applies provider defaults and clamps overrides", () => {
  assert.deepEqual(normalizeAttributionWindow("google_ads"), {
    clickDays: 30,
    viewDays: 1,
    model: "platform_reported"
  });
  assert.deepEqual(normalizeAttributionWindow("meta_ads", { clickDays: 400, viewDays: -2, model: "first_party" }), {
    clickDays: 365,
    viewDays: 0,
    model: "first_party"
  });
});

test("normalizeRemoteCampaign creates provider-agnostic campaign records", () => {
  const normalized = normalizeRemoteCampaign("google_ads", {
    externalCampaignId: "123",
    name: "Search - Trial Growth",
    status: "ENABLED",
    startDate: "2026-05-01",
    endDate: null
  });

  assert.deepEqual(normalized, {
    provider: "google_ads",
    externalCampaignId: "123",
    sourceName: "Search - Trial Growth",
    canonicalName: "search trial growth",
    channel: "search",
    state: "active",
    startDate: "2026-05-01",
    endDate: null
  });
});

test("normalizeRemotePerformance clamps metrics, filters range, attaches attribution, and recomputes totals", () => {
  const normalized = normalizeRemotePerformance(
    "simulated",
    {
      externalCampaignId: "camp-1",
      totals: { impressions: 9999, clicks: 9999, conversions: 9999, spendCents: 9999 },
      daily: [
        { date: "2026-05-01", impressions: 100.2, clicks: 5.4, conversions: 1.5, spendCents: 1234.6 },
        { date: "2026-05-02", impressions: -10, clicks: -1, conversions: -2, spendCents: -99 },
        { date: "2026-05-03", impressions: 80, clicks: 4, conversions: 1, spendCents: 900 }
      ]
    },
    { range: { start: "2026-05-01", end: "2026-05-02" } }
  );

  assert.deepEqual(normalized.totals, { impressions: 100, clicks: 5, conversions: 1.5, spendCents: 1235 });
  assert.equal(normalized.daily.length, 2);
  assert.deepEqual(normalized.daily[0].attributionWindow, { clickDays: 7, viewDays: 1, model: "platform_reported" });
  assert.deepEqual(normalized.daily[1], {
    date: "2026-05-02",
    impressions: 0,
    clicks: 0,
    conversions: 0,
    spendCents: 0,
    attributionWindow: { clickDays: 7, viewDays: 1, model: "platform_reported" }
  });
});
