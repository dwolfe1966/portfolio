import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { apiCompatibilityError, apiError, apiOk, apiUnhandledError } from "@/lib/api-contract";
import { isDemoMutationAllowed } from "@/lib/env-guard";
import { createEventId, logApiEvent } from "@/lib/logging";

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const eventId = createEventId("auc_bid_delete");
  const { id } = await params;
  if (!isDemoMutationAllowed()) {
    return apiError(403, "MUTATION_DISABLED", "Auction mutations are disabled.", { eventId });
  }
  try {
    const existing = await db.auctionBid.findUnique({ where: { id } });
    if (!existing) return apiError(404, "BID_NOT_FOUND", "Bid not found", { eventId });
    await db.auctionBid.delete({ where: { id } });
    return apiOk({ deletedId: id, eventId });
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      return apiCompatibilityError("Auction tables are missing.", { eventId });
    }
    logApiEvent("error", eventId, "auction.bids.delete.unhandled_error");
    return apiUnhandledError(error, eventId);
  }
}
