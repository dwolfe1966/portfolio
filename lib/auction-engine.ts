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

// ----- Validation helpers -----

export type AdvertiserInput = {
  name: string;
  qualityScore: number;
  dailyBudgetCents: number;
  smoothingFactor: number;
  behaviorMode: BehaviorMode;
  targetCacCents: number | null;
};

export type SlotInput = {
  name: string;
  reservePriceCents: number;
  expectedDailyVolume: number;
};

export type BidInput = {
  advertiserId: string;
  slotId: string;
  bidCents: number;
};

const BEHAVIOR_MODES: readonly BehaviorMode[] = ["truthful", "shaded", "auto_bid"];

export function validateAdvertiserInput(
  raw: unknown
): { ok: true; value: AdvertiserInput } | { ok: false; errors: string[] } {
  const body = (raw ?? {}) as { [key: string]: unknown };
  const errors: string[] = [];

  const name = String(body.name ?? "").trim();
  const qualityScore = Number(body.qualityScore);
  const dailyBudgetCents = Math.round(Number(body.dailyBudgetCents));
  const smoothingFactor = Number(body.smoothingFactor ?? 0.5);
  const behaviorRaw = String(body.behaviorMode ?? "truthful");
  const targetCacRaw = body.targetCacCents;

  if (!name) errors.push("name is required");
  if (name.length > 80) errors.push("name must be 80 characters or fewer");
  if (!Number.isFinite(qualityScore) || qualityScore <= 0 || qualityScore > 1) {
    errors.push("qualityScore must be between 0 and 1 (exclusive of 0)");
  }
  if (!Number.isFinite(dailyBudgetCents) || dailyBudgetCents < 0 || dailyBudgetCents > 10_000_000) {
    errors.push("dailyBudgetCents must be between 0 and 10000000");
  }
  if (!Number.isFinite(smoothingFactor) || smoothingFactor < 0.01 || smoothingFactor > 1) {
    errors.push("smoothingFactor must be between 0.01 and 1");
  }
  if (!BEHAVIOR_MODES.includes(behaviorRaw as BehaviorMode)) {
    errors.push(`behaviorMode must be one of: ${BEHAVIOR_MODES.join(", ")}`);
  }

  let targetCacCents: number | null = null;
  if (targetCacRaw !== undefined && targetCacRaw !== null && targetCacRaw !== "") {
    const parsed = Math.round(Number(targetCacRaw));
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1_000_000) {
      errors.push("targetCacCents must be between 0 and 1000000 when supplied");
    } else {
      targetCacCents = parsed;
    }
  }
  if (behaviorRaw === "auto_bid" && targetCacCents == null) {
    errors.push("targetCacCents is required when behaviorMode is auto_bid");
  }

  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      name,
      qualityScore,
      dailyBudgetCents,
      smoothingFactor,
      behaviorMode: behaviorRaw as BehaviorMode,
      targetCacCents
    }
  };
}

export function validateSlotInput(
  raw: unknown
): { ok: true; value: SlotInput } | { ok: false; errors: string[] } {
  const body = (raw ?? {}) as { [key: string]: unknown };
  const errors: string[] = [];

  const name = String(body.name ?? "").trim();
  const reservePriceCents = Math.round(Number(body.reservePriceCents));
  const expectedDailyVolume = Math.round(Number(body.expectedDailyVolume ?? 100));

  if (!name) errors.push("name is required");
  if (name.length > 80) errors.push("name must be 80 characters or fewer");
  if (!Number.isFinite(reservePriceCents) || reservePriceCents < 0 || reservePriceCents > 1_000_000) {
    errors.push("reservePriceCents must be between 0 and 1000000");
  }
  if (!Number.isFinite(expectedDailyVolume) || expectedDailyVolume < 1 || expectedDailyVolume > 100_000) {
    errors.push("expectedDailyVolume must be between 1 and 100000");
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: { name, reservePriceCents, expectedDailyVolume } };
}

export function validateBidInput(
  raw: unknown
): { ok: true; value: BidInput } | { ok: false; errors: string[] } {
  const body = (raw ?? {}) as { [key: string]: unknown };
  const errors: string[] = [];

  const advertiserId = String(body.advertiserId ?? "").trim();
  const slotId = String(body.slotId ?? "").trim();
  const bidCents = Math.round(Number(body.bidCents));

  if (!advertiserId) errors.push("advertiserId is required");
  if (!slotId) errors.push("slotId is required");
  if (!Number.isFinite(bidCents) || bidCents < 0 || bidCents > 1_000_000) {
    errors.push("bidCents must be between 0 and 1000000");
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: { advertiserId, slotId, bidCents } };
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

// ----- Run orchestrator -----

export type AdvertiserSnapshot = {
  id: string;
  qualityScore: number;
  dailyBudgetCents: number;
  smoothingFactor: number;
  behaviorMode: BehaviorMode;
  targetCacCents: number | null;
};

export type SlotSnapshot = {
  id: string;
  reservePriceCents: number;
  expectedDailyVolume: number;
};

export type BidSnapshot = {
  advertiserId: string;
  slotId: string;
  bidCents: number;
};

export type RunOptions = {
  totalAuctions: number;
  bidNoiseFraction?: number; // ±X fraction added to each bid per iteration; default 0.05
  qualityNoiseFraction?: number; // ±X fraction on quality score; default 0.02
  random?: () => number; // injectable RNG for deterministic tests
};

export type RunOutput = {
  results: Array<AuctionResult & { iterationIndex: number; reservePriceCents: number }>;
  spendByAdvertiser: Map<string, number>;
  kpis: RunKpis;
  rollups: AdvertiserRollup[];
};

function clampQuality(value: number): number {
  if (!Number.isFinite(value)) return 0.0001;
  return Math.min(Math.max(value, 0.0001), 1);
}

/**
 * Run a full N-auction round against snapshots of advertisers, slots, and bids.
 * Pure function — no DB. The route layer wraps this in a transaction and
 * persists the returned results.
 *
 * Slots are cycled in input order weighted by expectedDailyVolume so high-volume
 * inventory dominates the run, matching real marketplaces.
 */
export function runAuctionRound(
  advertisers: AdvertiserSnapshot[],
  slots: SlotSnapshot[],
  bids: BidSnapshot[],
  options: RunOptions
): RunOutput {
  const random = options.random ?? Math.random;
  const bidNoise = options.bidNoiseFraction ?? 0.05;
  const qualityNoise = options.qualityNoiseFraction ?? 0.02;
  const total = Math.max(1, Math.min(options.totalAuctions, 500));

  if (advertisers.length === 0 || slots.length === 0 || bids.length === 0) {
    return {
      results: [],
      spendByAdvertiser: new Map(),
      kpis: computeRunKpis([], new Map()),
      rollups: []
    };
  }

  const advertiserById = new Map(advertisers.map((a) => [a.id, a]));
  const bidsBySlot = new Map<string, BidSnapshot[]>();
  for (const bid of bids) {
    const list = bidsBySlot.get(bid.slotId) ?? [];
    list.push(bid);
    bidsBySlot.set(bid.slotId, list);
  }

  // Build a slot-volume-weighted iteration plan so high-volume slots get more auctions.
  const totalVolume = slots.reduce((acc, s) => acc + Math.max(s.expectedDailyVolume, 1), 0);
  const plan: SlotSnapshot[] = [];
  for (const slot of slots) {
    const share = Math.max(slot.expectedDailyVolume, 1) / totalVolume;
    const auctionsForSlot = Math.max(1, Math.round(total * share));
    for (let i = 0; i < auctionsForSlot; i++) plan.push(slot);
  }
  // Shuffle the plan a bit so slots are interleaved rather than batched.
  for (let i = plan.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [plan[i], plan[j]] = [plan[j], plan[i]];
  }
  // Trim or pad to exactly `total`.
  while (plan.length > total) plan.pop();
  while (plan.length < total && plan.length > 0) plan.push(plan[plan.length - 1]);

  const spendByAdvertiser = new Map<string, number>();
  const results: Array<AuctionResult & { iterationIndex: number; reservePriceCents: number }> = [];
  const winnerLookup = new Map<string, { qualityScore: number; bidCents: number }>();

  let iterationIndex = 0;
  for (const slot of plan) {
    const slotBids = bidsBySlot.get(slot.id) ?? [];
    const expectedRemaining = Math.max(total - iterationIndex, 1);

    const auctionBids: AuctionBidInput[] = [];
    for (const bid of slotBids) {
      const advertiser = advertiserById.get(bid.advertiserId);
      if (!advertiser) continue;

      const noisyBid = Math.max(0, Math.round(bid.bidCents * (1 + (random() * 2 - 1) * bidNoise)));
      const noisyQuality = clampQuality(
        advertiser.qualityScore * (1 + (random() * 2 - 1) * qualityNoise)
      );

      auctionBids.push({
        advertiserId: advertiser.id,
        bidCents: noisyBid,
        qualityScore: noisyQuality,
        behaviorMode: advertiser.behaviorMode,
        targetCacCents: advertiser.targetCacCents,
        spentCentsToday: spendByAdvertiser.get(advertiser.id) ?? 0,
        dailyBudgetCents: advertiser.dailyBudgetCents,
        smoothingFactor: advertiser.smoothingFactor,
        expectedRemainingAuctionsToday: expectedRemaining
      });
    }

    const result = runAuction({
      slotId: slot.id,
      reservePriceCents: slot.reservePriceCents,
      bids: auctionBids
    });

    if (result.filled && result.winnerAdvertiserId && result.clearingPriceCents != null) {
      const prior = spendByAdvertiser.get(result.winnerAdvertiserId) ?? 0;
      spendByAdvertiser.set(result.winnerAdvertiserId, prior + result.clearingPriceCents);
      const winnerInput = auctionBids.find((b) => b.advertiserId === result.winnerAdvertiserId);
      if (winnerInput) {
        winnerLookup.set(result.winnerAdvertiserId, {
          qualityScore: winnerInput.qualityScore,
          bidCents: winnerInput.bidCents
        });
      }
    }

    results.push({ ...result, iterationIndex, reservePriceCents: slot.reservePriceCents });
    iterationIndex++;
  }

  const kpis = computeRunKpis(results, winnerLookup);
  const rollups = computeAdvertiserRollups(results);

  return { results, spendByAdvertiser, kpis, rollups };
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
