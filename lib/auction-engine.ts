/**
 * Vickrey-style auction engine for the Auction Desk demo.
 *
 * Pure functions only — no DB, no I/O. Inputs come in, results go out.
 * The route layer is responsible for persistence and orchestration.
 *
 * Clearing rule (quality-adjusted second-price / GSP-with-quality):
 *   - Filter ineligible bids (budget exhausted, pacing throttle, below reserve).
 *   - adjustedScore = effectiveBidCents × qualityScore
 *   - Highest adjustedScore wins.
 *   - clearingPrice = ceil(secondAdjustedScore / winnerQualityScore) + 1,
 *     clamped to be at least the reserve. If only one bid, clearingPrice = reserve.
 */

export type BehaviorMode = "truthful" | "shaded" | "auto_bid";

export type IneligibilityReason =
  | "budget_exhausted"
  | "pacing_throttle"
  | "below_reserve"
  | "ineligible";

const SHADED_BID_FACTOR = 0.85;

export type AuctionBidInput = {
  advertiserId: string;
  bidCents: number;
  qualityScore: number;
  behaviorMode: BehaviorMode;
  targetCacCents?: number | null;
  // Pacing/budget state — set by the orchestration layer before each auction.
  spentCentsToday: number;
  dailyBudgetCents: number;
  smoothingFactor: number;
  expectedRemainingAuctionsToday: number;
};

export type AuctionInputs = {
  slotId: string;
  reservePriceCents: number;
  bids: AuctionBidInput[];
};

export type RankedBidRow = {
  advertiserId: string;
  bidCents: number;
  effectiveBidCents: number;
  qualityScore: number;
  adjustedScore: number;
  eligible: boolean;
  ineligibilityReason: IneligibilityReason | null;
  rank: number;
};

export type AuctionResult = {
  slotId: string;
  filled: boolean;
  winnerAdvertiserId: string | null;
  clearingPriceCents: number | null;
  rankedBids: RankedBidRow[];
};

/**
 * Transform a submitted bid based on the advertiser's behavior mode.
 * Returns the cents-valued bid that will be used in ranking.
 */
export function applyBehaviorMode(
  bidCents: number,
  mode: BehaviorMode,
  options: { qualityScore: number; targetCacCents?: number | null }
): number {
  if (mode === "shaded") {
    return Math.max(0, Math.floor(bidCents * SHADED_BID_FACTOR));
  }
  if (mode === "auto_bid") {
    const { qualityScore, targetCacCents } = options;
    if (!targetCacCents || targetCacCents <= 0 || qualityScore <= 0) return bidCents;
    const cap = Math.floor(targetCacCents / Math.max(qualityScore, 0.0001));
    return Math.max(0, Math.min(bidCents, cap));
  }
  // truthful
  return bidCents;
}

function bidPaceAllowance(bid: AuctionBidInput): number {
  const remaining = Math.max(bid.expectedRemainingAuctionsToday, 1);
  const smooth = Math.min(Math.max(bid.smoothingFactor, 0.01), 1);
  const headroom = Math.max(bid.dailyBudgetCents - bid.spentCentsToday, 0);
  // Smooth across the remaining expected auctions today; advertisers with
  // smoothingFactor=1 get the full per-auction share, lower smoothing caps tighter.
  return Math.floor((headroom / remaining) * (1 / smooth));
}

/**
 * Run a single auction. Returns ranking, winner, and clearing price.
 * Pure function — does not touch the DB.
 */
export function runAuction(inputs: AuctionInputs): AuctionResult {
  const { slotId, reservePriceCents, bids } = inputs;

  type Computed = RankedBidRow & { sortKey: number };

  const computed: Computed[] = bids.map((bid) => {
    const effective = applyBehaviorMode(bid.bidCents, bid.behaviorMode, {
      qualityScore: bid.qualityScore,
      targetCacCents: bid.targetCacCents
    });

    let eligible = true;
    let reason: IneligibilityReason | null = null;

    if (bid.spentCentsToday >= bid.dailyBudgetCents) {
      eligible = false;
      reason = "budget_exhausted";
    } else if (effective > bidPaceAllowance(bid)) {
      eligible = false;
      reason = "pacing_throttle";
    } else if (effective < reservePriceCents) {
      eligible = false;
      reason = "below_reserve";
    }

    const adjusted = eligible ? effective * bid.qualityScore : 0;

    return {
      advertiserId: bid.advertiserId,
      bidCents: bid.bidCents,
      effectiveBidCents: effective,
      qualityScore: bid.qualityScore,
      adjustedScore: adjusted,
      eligible,
      ineligibilityReason: reason,
      rank: 0,
      sortKey: adjusted
    };
  });

  // Rank eligible bids by adjusted score desc; ineligible rows get rank 0.
  const eligible = computed.filter((row) => row.eligible);
  eligible.sort((a, b) => b.sortKey - a.sortKey || a.advertiserId.localeCompare(b.advertiserId));
  eligible.forEach((row, idx) => {
    row.rank = idx + 1;
  });

  const ranked: RankedBidRow[] = computed.map((row) => ({
    advertiserId: row.advertiserId,
    bidCents: row.bidCents,
    effectiveBidCents: row.effectiveBidCents,
    qualityScore: row.qualityScore,
    adjustedScore: row.adjustedScore,
    eligible: row.eligible,
    ineligibilityReason: row.ineligibilityReason,
    rank: row.rank
  }));

  if (eligible.length === 0) {
    return {
      slotId,
      filled: false,
      winnerAdvertiserId: null,
      clearingPriceCents: null,
      rankedBids: ranked
    };
  }

  const winner = eligible[0];
  const second = eligible[1];

  let clearing: number;
  if (!second) {
    clearing = reservePriceCents;
  } else {
    clearing = Math.ceil(second.adjustedScore / Math.max(winner.qualityScore, 0.0001)) + 1;
  }
  clearing = Math.max(clearing, reservePriceCents);
  clearing = Math.min(clearing, winner.effectiveBidCents);

  return {
    slotId,
    filled: true,
    winnerAdvertiserId: winner.advertiserId,
    clearingPriceCents: clearing,
    rankedBids: ranked
  };
}

// ----- Run-level types and KPIs -----

export type RunKpis = {
  totalAuctions: number;
  filledAuctions: number;
  totalRevenueCents: number;
  fillRate: number;
  fillQuality: number;
  revenueStability: number;
  bidderTrustProxy: number;
};

export type AdvertiserRollup = {
  advertiserId: string;
  totalSpendCents: number;
  totalWins: number;
  averageClearingCents: number;
  fillShare: number;
};

export function computeRunKpis(results: AuctionResult[], winnerLookup: Map<string, { qualityScore: number; bidCents: number }>): RunKpis {
  const total = results.length;
  const filled = results.filter((r) => r.filled);
  const filledCount = filled.length;

  const revenues = filled.map((r) => r.clearingPriceCents ?? 0);
  const totalRevenue = revenues.reduce((a, b) => a + b, 0);

  const meanRevenue = filledCount > 0 ? totalRevenue / filledCount : 0;
  const variance = filledCount > 0
    ? revenues.reduce((acc, v) => acc + (v - meanRevenue) ** 2, 0) / filledCount
    : 0;
  const stdev = Math.sqrt(variance);
  const cov = meanRevenue > 0 ? stdev / meanRevenue : 0;

  const qualitySum = filled.reduce((acc, r) => {
    const lookup = r.winnerAdvertiserId ? winnerLookup.get(r.winnerAdvertiserId) : undefined;
    return acc + (lookup?.qualityScore ?? 0);
  }, 0);

  const trustRatios = filled
    .map((r) => {
      const lookup = r.winnerAdvertiserId ? winnerLookup.get(r.winnerAdvertiserId) : undefined;
      const winnerBid = lookup?.bidCents ?? 0;
      if (!winnerBid || r.clearingPriceCents == null) return null;
      return r.clearingPriceCents / winnerBid;
    })
    .filter((v): v is number => v != null)
    .sort((a, b) => a - b);
  const trustProxy = trustRatios.length > 0
    ? trustRatios[Math.floor(trustRatios.length / 2)]
    : 1;

  return {
    totalAuctions: total,
    filledAuctions: filledCount,
    totalRevenueCents: totalRevenue,
    fillRate: total > 0 ? filledCount / total : 0,
    fillQuality: filledCount > 0 ? qualitySum / filledCount : 0,
    revenueStability: Math.max(0, 1 - cov),
    bidderTrustProxy: trustProxy
  };
}

export function computeAdvertiserRollups(
  results: AuctionResult[]
): AdvertiserRollup[] {
  const map = new Map<string, { spend: number; wins: number }>();
  let totalSpend = 0;
  for (const r of results) {
    if (!r.filled || !r.winnerAdvertiserId || r.clearingPriceCents == null) continue;
    const cur = map.get(r.winnerAdvertiserId) ?? { spend: 0, wins: 0 };
    cur.spend += r.clearingPriceCents;
    cur.wins += 1;
    map.set(r.winnerAdvertiserId, cur);
    totalSpend += r.clearingPriceCents;
  }
  return Array.from(map.entries()).map(([advertiserId, agg]) => ({
    advertiserId,
    totalSpendCents: agg.spend,
    totalWins: agg.wins,
    averageClearingCents: agg.wins > 0 ? Math.round(agg.spend / agg.wins) : 0,
    fillShare: totalSpend > 0 ? agg.spend / totalSpend : 0
  }));
}

// ----- Reserve auto-tuning -----

export type ReserveSuggestion = {
  slotId: string;
  currentReserveCents: number;
  suggestedReserveCents: number;
  expectedRevenueLift: number;
  sampleSize: number;
};

/**
 * Suggest a reserve price at the 25th percentile of historical clearing
 * prices for a slot. Setting the reserve at this level raises the floor
 * without throwing away most of the existing fill — the bottom-quarter
 * auctions either re-clear at the new reserve or go unfilled.
 *
 * expectedRevenueLift = (newReserveSum - oldClearingSum) / oldClearingSum
 * across the sample, treating sub-reserve auctions as unfilled (revenue 0).
 */
export function suggestReserve(args: {
  slotId: string;
  currentReserveCents: number;
  clearingPricesCents: number[];
}): ReserveSuggestion {
  const { slotId, currentReserveCents, clearingPricesCents: prices } = args;
  if (prices.length < 4) {
    return {
      slotId,
      currentReserveCents,
      suggestedReserveCents: currentReserveCents,
      expectedRevenueLift: 0,
      sampleSize: prices.length
    };
  }

  const sorted = [...prices].sort((a, b) => a - b);
  const idx = Math.floor(sorted.length * 0.25);
  const suggested = Math.max(currentReserveCents, sorted[idx]);

  const oldRevenue = sorted.reduce((a, b) => a + b, 0);
  const newRevenue = sorted.reduce((acc, p) => acc + (p >= suggested ? Math.max(p, suggested) : 0), 0);
  const lift = oldRevenue > 0 ? (newRevenue - oldRevenue) / oldRevenue : 0;

  return {
    slotId,
    currentReserveCents,
    suggestedReserveCents: suggested,
    expectedRevenueLift: Number(lift.toFixed(4)),
    sampleSize: prices.length
  };
}

// ----- Marketplace health -----

export type HealthSummary = {
  fillRateTrend: number[];
  revenueStabilityTrend: number[];
  hhi: number;
  bidderChurnProxy: number;
  totalRunsAnalyzed: number;
};

/**
 * Aggregate KPIs across the most recent runs (oldest → newest).
 *
 * - fillRateTrend / revenueStabilityTrend: per-run KPIs in temporal order
 * - hhi: Herfindahl-Hirschman concentration index across the most recent run's
 *   advertiser spend; sum of marketShare². Range 0 (perfectly competitive)
 *   to 1 (single advertiser captures all revenue). Multiply by 10000 for the
 *   antitrust-standard form.
 * - bidderChurnProxy: count of advertisers with wins in run N-1 but zero wins
 *   in run N (the most recent two runs). 0 if fewer than two runs supplied.
 */
export function computeMarketplaceHealth(runs: Array<{
  fillRate: number;
  revenueStability: number;
  rollups: AdvertiserRollup[];
}>): HealthSummary {
  if (runs.length === 0) {
    return {
      fillRateTrend: [],
      revenueStabilityTrend: [],
      hhi: 0,
      bidderChurnProxy: 0,
      totalRunsAnalyzed: 0
    };
  }

  const fillRateTrend = runs.map((r) => r.fillRate);
  const revenueStabilityTrend = runs.map((r) => r.revenueStability);

  const latest = runs[runs.length - 1];
  const hhi = latest.rollups.reduce((acc, row) => acc + row.fillShare ** 2, 0);

  let churn = 0;
  if (runs.length >= 2) {
    const prior = runs[runs.length - 2];
    const priorWinners = new Set(prior.rollups.filter((r) => r.totalWins > 0).map((r) => r.advertiserId));
    const latestWinners = new Set(latest.rollups.filter((r) => r.totalWins > 0).map((r) => r.advertiserId));
    for (const id of priorWinners) {
      if (!latestWinners.has(id)) churn++;
    }
  }

  return {
    fillRateTrend,
    revenueStabilityTrend,
    hhi: Number(hhi.toFixed(4)),
    bidderChurnProxy: churn,
    totalRunsAnalyzed: runs.length
  };
}
