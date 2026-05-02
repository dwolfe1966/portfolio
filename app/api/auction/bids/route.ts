import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { validateBidInput } from "@/lib/auction-engine";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { apiCompatibilityError, apiError, apiOk, apiUnhandledError } from "@/lib/api-contract";
import { isDemoMutationAllowed } from "@/lib/env-guard";
import { createEventId, logApiEvent } from "@/lib/logging";

export async function GET() {
  const eventId = createEventId("auc_bid_get");
  try {
    const bids = await db.auctionBid.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        advertiser: { select: { id: true, name: true, behaviorMode: true, qualityScore: true } },
        slot: { select: { id: true, name: true, reservePriceCents: true } }
      }
    });
    return apiOk({ bids, eventId });
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      return apiOk({ compatibilityMode: true, bids: [], eventId });
    }
    logApiEvent("error", eventId, "auction.bids.list.unhandled_error");
    return apiUnhandledError(error, eventId);
  }
}

export async function POST(req: NextRequest) {
  const eventId = createEventId("auc_bid_post");
  if (!isDemoMutationAllowed()) {
    return apiError(403, "MUTATION_DISABLED", "Auction mutations are disabled.", { eventId });
  }
  const body = await req.json().catch(() => ({}));
  const parsed = validateBidInput(body);
  if (!parsed.ok) {
    return apiError(400, "INVALID_INPUT", "Bid validation failed", { errors: parsed.errors, eventId });
  }
  try {
    const upserted = await db.auctionBid.upsert({
      where: { advertiserId_slotId: { advertiserId: parsed.value.advertiserId, slotId: parsed.value.slotId } },
      create: parsed.value,
      update: { bidCents: parsed.value.bidCents }
    });
    return apiOk({ bid: upserted, eventId });
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      return apiCompatibilityError("Auction tables are missing.", { eventId });
    }
    logApiEvent("error", eventId, "auction.bids.upsert.unhandled_error");
    return apiUnhandledError(error, eventId);
  }
}
