import { db } from "@/lib/db";
import {
  computeMarketplaceHealth,
  suggestReserve,
  type AdvertiserRollup
} from "@/lib/auction-engine";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { apiCompatibilityError, apiOk, apiUnhandledError } from "@/lib/api-contract";
import { createEventId, logApiEvent } from "@/lib/logging";

const RECENT_RUN_LIMIT = 10;
const RESERVE_SAMPLE_LIMIT = 200;

export async function GET() {
  const eventId = createEventId("auc_health_get");
  try {
    const recentRuns = await db.auctionRun.findMany({
      orderBy: { createdAt: "desc" },
      take: RECENT_RUN_LIMIT,
      include: {
        spendSnapshots: {
          include: { advertiser: { select: { id: true, name: true } } }
        }
      }
    });

    const orderedRuns = [...recentRuns].reverse(); // oldest -> newest for trend orientation

    const summary = computeMarketplaceHealth(
      orderedRuns.map((run) => ({
        fillRate: run.fillRate,
        revenueStability: run.revenueStability,
        rollups: run.spendSnapshots.map<AdvertiserRollup>((snap) => ({
          advertiserId: snap.advertiserId,
          totalSpendCents: snap.totalSpendCents,
          totalWins: snap.totalWins,
          averageClearingCents: snap.averageClearingCents,
          fillShare: snap.fillShare
        }))
      }))
    );

    const slots = await db.auctionSlot.findMany({ orderBy: { createdAt: "asc" } });
    const reserveSuggestions = await Promise.all(
      slots.map(async (slot) => {
        const recentResults = await db.auctionResult.findMany({
          where: { slotId: slot.id, filled: true, clearingPriceCents: { not: null } },
          orderBy: { createdAt: "desc" },
          take: RESERVE_SAMPLE_LIMIT,
          select: { clearingPriceCents: true }
        });
        const prices = recentResults
          .map((r) => r.clearingPriceCents ?? 0)
          .filter((p) => p > 0);
        const suggestion = suggestReserve({
          slotId: slot.id,
          currentReserveCents: slot.reservePriceCents,
          clearingPricesCents: prices
        });
        return {
          slotId: slot.id,
          slotName: slot.name,
          currentReserveCents: slot.reservePriceCents,
          suggestedReserveCents: suggestion.suggestedReserveCents,
          expectedRevenueLift: suggestion.expectedRevenueLift,
          sampleSize: suggestion.sampleSize
        };
      })
    );

    // Latest-run advertiser rollup table (for HHI display alongside the bare number).
    const latestRun = orderedRuns[orderedRuns.length - 1];
    const latestRollups = latestRun
      ? latestRun.spendSnapshots.map((snap) => ({
          advertiserId: snap.advertiserId,
          advertiserName: snap.advertiser.name,
          totalSpendCents: snap.totalSpendCents,
          totalWins: snap.totalWins,
          fillShare: snap.fillShare
        }))
      : [];

    return apiOk({
      summary,
      reserveSuggestions,
      latestRollups,
      latestRunId: latestRun?.id ?? null,
      eventId
    });
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      return apiCompatibilityError("Auction tables are missing.", { eventId });
    }
    logApiEvent("error", eventId, "auction.health.unhandled_error");
    return apiUnhandledError(error, eventId);
  }
}
