import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { apiCompatibilityError, apiError, apiOk, apiUnhandledError } from "@/lib/api-contract";
import { createEventId, logApiEvent } from "@/lib/logging";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const eventId = createEventId("auc_run_get");
  const { id } = await params;
  try {
    const run = await db.auctionRun.findUnique({
      where: { id },
      include: {
        results: {
          orderBy: { iterationIndex: "asc" },
          include: {
            slot: { select: { id: true, name: true, reservePriceCents: true } },
            rankedBids: {
              orderBy: { rank: "asc" },
              include: { advertiser: { select: { id: true, name: true, behaviorMode: true } } }
            }
          },
          take: 200
        },
        spendSnapshots: {
          include: { advertiser: { select: { id: true, name: true, behaviorMode: true } } }
        }
      }
    });
    if (!run) return apiError(404, "RUN_NOT_FOUND", "Auction run not found", { eventId });
    return apiOk({ run, eventId });
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      return apiCompatibilityError("Auction tables are missing.", { eventId });
    }
    logApiEvent("error", eventId, "auction.run.get.unhandled_error");
    return apiUnhandledError(error, eventId);
  }
}
