import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  runAuctionRound,
  type AdvertiserSnapshot,
  type BehaviorMode,
  type BidSnapshot,
  type SlotSnapshot
} from "@/lib/auction-engine";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { apiCompatibilityError, apiError, apiOk, apiUnhandledError } from "@/lib/api-contract";
import { isDemoMutationAllowed } from "@/lib/env-guard";
import { createEventId, logApiEvent } from "@/lib/logging";

const DEFAULT_TOTAL = 60;
const MAX_TOTAL = 500;

export async function GET() {
  const eventId = createEventId("auc_runs_get");
  try {
    const runs = await db.auctionRun.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { _count: { select: { results: true, spendSnapshots: true } } }
    });
    return apiOk({ runs, eventId });
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      return apiOk({ compatibilityMode: true, runs: [], eventId });
    }
    logApiEvent("error", eventId, "auction.runs.list.unhandled_error");
    return apiUnhandledError(error, eventId);
  }
}

export async function POST(req: NextRequest) {
  const eventId = createEventId("auc_runs_post");
  if (!isDemoMutationAllowed()) {
    return apiError(403, "MUTATION_DISABLED", "Auction run mutations are disabled.", { eventId });
  }

  const body = await req.json().catch(() => ({}));
  const requestedTotal = Math.round(Number(body.totalAuctions ?? DEFAULT_TOTAL));
  const totalAuctions = Math.max(1, Math.min(requestedTotal, MAX_TOTAL));
  const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 240) : null;

  try {
    const [advertisers, slots, bids] = await Promise.all([
      db.auctionAdvertiser.findMany(),
      db.auctionSlot.findMany(),
      db.auctionBid.findMany()
    ]);

    if (advertisers.length === 0) {
      return apiError(400, "NO_ADVERTISERS", "Add at least one advertiser before running auctions.", { eventId });
    }
    if (slots.length === 0) {
      return apiError(400, "NO_SLOTS", "Add at least one inventory slot before running auctions.", { eventId });
    }
    if (bids.length === 0) {
      return apiError(400, "NO_BIDS", "No bids submitted; add bids in the Inputs page first.", { eventId });
    }

    const advertiserSnapshots: AdvertiserSnapshot[] = advertisers.map((a) => ({
      id: a.id,
      qualityScore: a.qualityScore,
      dailyBudgetCents: a.dailyBudgetCents,
      smoothingFactor: a.smoothingFactor,
      behaviorMode: a.behaviorMode as BehaviorMode,
      targetCacCents: a.targetCacCents
    }));
    const slotSnapshots: SlotSnapshot[] = slots.map((s) => ({
      id: s.id,
      reservePriceCents: s.reservePriceCents,
      expectedDailyVolume: s.expectedDailyVolume
    }));
    const bidSnapshots: BidSnapshot[] = bids.map((b) => ({
      advertiserId: b.advertiserId,
      slotId: b.slotId,
      bidCents: b.bidCents
    }));

    const round = runAuctionRound(advertiserSnapshots, slotSnapshots, bidSnapshots, {
      totalAuctions
    });

    if (round.results.length === 0) {
      return apiError(422, "RUN_PRODUCED_NO_AUCTIONS", "Auction round produced no results — check inputs.", { eventId });
    }

    const persisted = await db.$transaction(async (tx) => {
      const run = await tx.auctionRun.create({
        data: {
          totalAuctions: round.results.length,
          totalRevenueCents: round.kpis.totalRevenueCents,
          fillRate: round.kpis.fillRate,
          fillQuality: round.kpis.fillQuality,
          revenueStability: round.kpis.revenueStability,
          bidderTrustProxy: round.kpis.bidderTrustProxy,
          notes
        }
      });

      for (const r of round.results) {
        const created = await tx.auctionResult.create({
          data: {
            runId: run.id,
            slotId: r.slotId,
            iterationIndex: r.iterationIndex,
            filled: r.filled,
            winnerAdvertiserId: r.winnerAdvertiserId,
            clearingPriceCents: r.clearingPriceCents,
            reservePriceCents: r.reservePriceCents
          }
        });
        if (r.rankedBids.length > 0) {
          await tx.auctionResultRow.createMany({
            data: r.rankedBids.map((row) => ({
              resultId: created.id,
              advertiserId: row.advertiserId,
              bidCents: row.bidCents,
              effectiveBidCents: row.effectiveBidCents,
              qualityScore: row.qualityScore,
              adjustedScore: row.adjustedScore,
              eligible: row.eligible,
              ineligibilityReason: row.ineligibilityReason,
              rank: row.rank
            }))
          });
        }
      }

      if (round.rollups.length > 0) {
        await tx.auctionAdvertiserSpend.createMany({
          data: round.rollups.map((rollup) => ({
            runId: run.id,
            advertiserId: rollup.advertiserId,
            totalSpendCents: rollup.totalSpendCents,
            totalWins: rollup.totalWins,
            averageClearingCents: rollup.averageClearingCents,
            fillShare: rollup.fillShare
          }))
        });
      }

      await tx.auctionAuditLog.create({
        data: {
          runId: run.id,
          actor: "demo-operator",
          action: "auction_run_completed",
          metadata: {
            totalAuctions: round.results.length,
            totalRevenueCents: round.kpis.totalRevenueCents,
            fillRate: Number(round.kpis.fillRate.toFixed(4)),
            advertisers: advertisers.length,
            slots: slots.length,
            bids: bids.length
          }
        }
      });

      return run;
    });

    logApiEvent("info", eventId, "auction.runs.create.completed", {
      runId: persisted.id,
      totalAuctions: round.results.length
    });

    return apiOk({
      run: persisted,
      kpis: round.kpis,
      rollups: round.rollups,
      eventId
    });
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      return apiCompatibilityError("Auction tables are missing.", { eventId });
    }
    logApiEvent("error", eventId, "auction.runs.create.unhandled_error");
    return apiUnhandledError(error, eventId);
  }
}
