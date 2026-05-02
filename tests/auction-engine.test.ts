import test from "node:test";
import assert from "node:assert/strict";
import {
  applyBehaviorMode,
  computeAdvertiserRollups,
  computeMarketplaceHealth,
  computeRunKpis,
  runAuction,
  suggestReserve,
  type AuctionBidInput,
  type AuctionResult
} from "@/lib/auction-engine";

const HEADROOM_BID = (overrides: Partial<AuctionBidInput> = {}): AuctionBidInput => ({
  advertiserId: "adv-1",
  bidCents: 500,
  qualityScore: 0.8,
  behaviorMode: "truthful",
  targetCacCents: null,
  spentCentsToday: 0,
  dailyBudgetCents: 100_000,
  smoothingFactor: 1,
  expectedRemainingAuctionsToday: 100,
  ...overrides
});

test("applyBehaviorMode: truthful uses verbatim bid", () => {
  assert.equal(applyBehaviorMode(500, "truthful", { qualityScore: 0.8 }), 500);
});

test("applyBehaviorMode: shaded multiplies by 0.85 and floors", () => {
  assert.equal(applyBehaviorMode(500, "shaded", { qualityScore: 0.8 }), 425);
});

test("applyBehaviorMode: auto_bid caps bid at targetCac/qualityScore", () => {
  // bid 500, target 300, quality 0.5 → cap = 600 → unaffected
  assert.equal(applyBehaviorMode(500, "auto_bid", { qualityScore: 0.5, targetCacCents: 300 }), 500);
  // bid 500, target 300, quality 1.0 → cap = 300 → bid clamped
  assert.equal(applyBehaviorMode(500, "auto_bid", { qualityScore: 1.0, targetCacCents: 300 }), 300);
  // missing targetCac falls back to verbatim bid
  assert.equal(applyBehaviorMode(500, "auto_bid", { qualityScore: 1, targetCacCents: null }), 500);
});

test("runAuction: highest adjusted score wins", () => {
  const result = runAuction({
    slotId: "slot-1",
    reservePriceCents: 100,
    bids: [
      HEADROOM_BID({ advertiserId: "a", bidCents: 600, qualityScore: 0.5 }), // adj 300
      HEADROOM_BID({ advertiserId: "b", bidCents: 400, qualityScore: 0.9 })  // adj 360
    ]
  });
  assert.equal(result.filled, true);
  assert.equal(result.winnerAdvertiserId, "b");
});

test("runAuction: clearing price uses second-highest adjusted / winner quality + 1", () => {
  const result = runAuction({
    slotId: "slot-1",
    reservePriceCents: 50,
    bids: [
      HEADROOM_BID({ advertiserId: "a", bidCents: 1000, qualityScore: 0.8 }), // adj 800
      HEADROOM_BID({ advertiserId: "b", bidCents: 500, qualityScore: 0.6 })   // adj 300
    ]
  });
  // winner: a (adj 800). Clearing = ceil(300 / 0.8) + 1 = 376
  assert.equal(result.winnerAdvertiserId, "a");
  assert.equal(result.clearingPriceCents, 376);
});

test("runAuction: clearing falls back to reserve when only one bid is eligible", () => {
  const result = runAuction({
    slotId: "slot-1",
    reservePriceCents: 250,
    bids: [
      HEADROOM_BID({ advertiserId: "a", bidCents: 1000, qualityScore: 0.8 }),
      HEADROOM_BID({ advertiserId: "b", bidCents: 100, qualityScore: 0.9 }) // below reserve
    ]
  });
  assert.equal(result.winnerAdvertiserId, "a");
  assert.equal(result.clearingPriceCents, 250);
});

test("runAuction: clearing is clamped to reserve as a floor", () => {
  const result = runAuction({
    slotId: "slot-1",
    reservePriceCents: 700,
    bids: [
      HEADROOM_BID({ advertiserId: "a", bidCents: 1000, qualityScore: 0.9 }),
      HEADROOM_BID({ advertiserId: "b", bidCents: 800, qualityScore: 0.5 }) // adj 400
    ]
  });
  // raw clearing = ceil(400/0.9)+1 = 446 → clamped up to reserve 700
  assert.equal(result.clearingPriceCents, 700);
});

test("runAuction: ineligible bids are flagged with reasons but still appear in rankedBids", () => {
  const result = runAuction({
    slotId: "slot-1",
    reservePriceCents: 200,
    bids: [
      HEADROOM_BID({ advertiserId: "ok", bidCents: 500 }),
      HEADROOM_BID({
        advertiserId: "bust",
        bidCents: 500,
        spentCentsToday: 100_000 // exhausted
      }),
      HEADROOM_BID({
        advertiserId: "below",
        bidCents: 100 // below reserve
      })
    ]
  });
  const reasons = Object.fromEntries(
    result.rankedBids.map((row) => [row.advertiserId, row.ineligibilityReason])
  );
  assert.equal(reasons.ok, null);
  assert.equal(reasons.bust, "budget_exhausted");
  assert.equal(reasons.below, "below_reserve");
  assert.equal(result.winnerAdvertiserId, "ok");
});

test("runAuction: pacing throttle blocks bids that exceed per-auction cap", () => {
  const result = runAuction({
    slotId: "slot-1",
    reservePriceCents: 100,
    bids: [
      HEADROOM_BID({
        advertiserId: "throttled",
        bidCents: 5000,
        dailyBudgetCents: 1000,
        smoothingFactor: 0.1,
        expectedRemainingAuctionsToday: 100
      })
    ]
  });
  assert.equal(result.filled, false);
  assert.equal(result.rankedBids[0].ineligibilityReason, "pacing_throttle");
});

test("runAuction: returns unfilled when all bids ineligible", () => {
  const result = runAuction({
    slotId: "slot-1",
    reservePriceCents: 1000,
    bids: [HEADROOM_BID({ advertiserId: "low", bidCents: 100 })]
  });
  assert.equal(result.filled, false);
  assert.equal(result.winnerAdvertiserId, null);
  assert.equal(result.clearingPriceCents, null);
});

test("runAuction: deterministic tiebreak when adjusted scores tie", () => {
  const result = runAuction({
    slotId: "slot-1",
    reservePriceCents: 50,
    bids: [
      HEADROOM_BID({ advertiserId: "z", bidCents: 500, qualityScore: 0.5 }), // adj 250
      HEADROOM_BID({ advertiserId: "a", bidCents: 500, qualityScore: 0.5 })  // adj 250
    ]
  });
  // Tie broken by advertiser ID ascending → "a" wins.
  assert.equal(result.winnerAdvertiserId, "a");
});

test("computeRunKpis: empty results yield zero KPIs except trust=1", () => {
  const kpis = computeRunKpis([], new Map());
  assert.equal(kpis.totalAuctions, 0);
  assert.equal(kpis.fillRate, 0);
  assert.equal(kpis.bidderTrustProxy, 1);
});

test("computeRunKpis: revenue stability is 1 when all clearing prices match", () => {
  const results: AuctionResult[] = [
    { slotId: "s", filled: true, winnerAdvertiserId: "a", clearingPriceCents: 500, rankedBids: [] },
    { slotId: "s", filled: true, winnerAdvertiserId: "a", clearingPriceCents: 500, rankedBids: [] }
  ];
  const lookup = new Map([["a", { qualityScore: 0.8, bidCents: 600 }]]);
  const kpis = computeRunKpis(results, lookup);
  assert.equal(kpis.revenueStability, 1);
});

test("computeRunKpis: bidder trust proxy is median of clearing/winnerBid", () => {
  const results: AuctionResult[] = [
    { slotId: "s", filled: true, winnerAdvertiserId: "a", clearingPriceCents: 300, rankedBids: [] },
    { slotId: "s", filled: true, winnerAdvertiserId: "a", clearingPriceCents: 600, rankedBids: [] },
    { slotId: "s", filled: true, winnerAdvertiserId: "a", clearingPriceCents: 450, rankedBids: [] }
  ];
  // winnerBid 1000 → ratios 0.30, 0.60, 0.45 → sorted 0.30, 0.45, 0.60 → median 0.45
  const lookup = new Map([["a", { qualityScore: 0.8, bidCents: 1000 }]]);
  const kpis = computeRunKpis(results, lookup);
  assert.equal(kpis.bidderTrustProxy, 0.45);
});

test("computeAdvertiserRollups: shares sum to 1 when revenue exists", () => {
  const results: AuctionResult[] = [
    { slotId: "s", filled: true, winnerAdvertiserId: "a", clearingPriceCents: 600, rankedBids: [] },
    { slotId: "s", filled: true, winnerAdvertiserId: "b", clearingPriceCents: 400, rankedBids: [] }
  ];
  const rollups = computeAdvertiserRollups(results);
  const totalShare = rollups.reduce((acc, r) => acc + r.fillShare, 0);
  assert.ok(Math.abs(totalShare - 1) < 1e-9);
});

test("suggestReserve: bumps reserve to 25th percentile of clearing prices", () => {
  const result = suggestReserve({
    slotId: "s",
    currentReserveCents: 100,
    clearingPricesCents: [200, 300, 400, 500, 600, 700, 800, 900]
  });
  // 25th percentile index = floor(8 * 0.25) = 2 → sorted[2] = 400
  assert.equal(result.suggestedReserveCents, 400);
  assert.equal(result.sampleSize, 8);
});

test("suggestReserve: returns current reserve unchanged when sample is too small", () => {
  const result = suggestReserve({
    slotId: "s",
    currentReserveCents: 250,
    clearingPricesCents: [300, 400]
  });
  assert.equal(result.suggestedReserveCents, 250);
  assert.equal(result.expectedRevenueLift, 0);
});

test("suggestReserve: never lowers the reserve below the current setting", () => {
  const result = suggestReserve({
    slotId: "s",
    currentReserveCents: 1000,
    clearingPricesCents: [200, 300, 400, 500, 600, 700]
  });
  assert.equal(result.suggestedReserveCents, 1000);
});

test("computeMarketplaceHealth: empty input yields zero summary", () => {
  const summary = computeMarketplaceHealth([]);
  assert.deepEqual(summary, {
    fillRateTrend: [],
    revenueStabilityTrend: [],
    hhi: 0,
    bidderChurnProxy: 0,
    totalRunsAnalyzed: 0
  });
});

test("computeMarketplaceHealth: HHI is 1 when one advertiser captures all revenue", () => {
  const summary = computeMarketplaceHealth([
    {
      fillRate: 1,
      revenueStability: 1,
      rollups: [
        { advertiserId: "a", totalSpendCents: 1000, totalWins: 5, averageClearingCents: 200, fillShare: 1 }
      ]
    }
  ]);
  assert.equal(summary.hhi, 1);
});

test("computeMarketplaceHealth: HHI is 0.5 when two advertisers split spend evenly", () => {
  const summary = computeMarketplaceHealth([
    {
      fillRate: 1,
      revenueStability: 1,
      rollups: [
        { advertiserId: "a", totalSpendCents: 500, totalWins: 5, averageClearingCents: 100, fillShare: 0.5 },
        { advertiserId: "b", totalSpendCents: 500, totalWins: 5, averageClearingCents: 100, fillShare: 0.5 }
      ]
    }
  ]);
  assert.equal(summary.hhi, 0.5);
});

test("computeMarketplaceHealth: bidderChurnProxy counts advertisers who won previously but not now", () => {
  const summary = computeMarketplaceHealth([
    {
      fillRate: 1,
      revenueStability: 1,
      rollups: [
        { advertiserId: "a", totalSpendCents: 500, totalWins: 3, averageClearingCents: 100, fillShare: 0.5 },
        { advertiserId: "b", totalSpendCents: 500, totalWins: 3, averageClearingCents: 100, fillShare: 0.5 }
      ]
    },
    {
      fillRate: 1,
      revenueStability: 1,
      rollups: [
        { advertiserId: "a", totalSpendCents: 1000, totalWins: 6, averageClearingCents: 100, fillShare: 1 },
        { advertiserId: "b", totalSpendCents: 0, totalWins: 0, averageClearingCents: 0, fillShare: 0 }
      ]
    }
  ]);
  assert.equal(summary.bidderChurnProxy, 1);
});
