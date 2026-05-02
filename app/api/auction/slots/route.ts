import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { validateSlotInput } from "@/lib/auction-engine";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { apiCompatibilityError, apiError, apiOk, apiUnhandledError } from "@/lib/api-contract";
import { isDemoMutationAllowed } from "@/lib/env-guard";
import { createEventId, logApiEvent } from "@/lib/logging";

export async function GET() {
  const eventId = createEventId("auc_slot_get");
  try {
    const slots = await db.auctionSlot.findMany({ orderBy: { createdAt: "asc" } });
    return apiOk({ slots, eventId });
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      return apiOk({ compatibilityMode: true, slots: [], eventId });
    }
    logApiEvent("error", eventId, "auction.slots.list.unhandled_error");
    return apiUnhandledError(error, eventId);
  }
}

export async function POST(req: NextRequest) {
  const eventId = createEventId("auc_slot_post");
  if (!isDemoMutationAllowed()) {
    return apiError(403, "MUTATION_DISABLED", "Auction mutations are disabled.", { eventId });
  }
  const body = await req.json().catch(() => ({}));
  const parsed = validateSlotInput(body);
  if (!parsed.ok) {
    return apiError(400, "INVALID_INPUT", "Slot validation failed", { errors: parsed.errors, eventId });
  }
  try {
    const created = await db.auctionSlot.create({ data: parsed.value });
    return apiOk({ slot: created, eventId });
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      return apiCompatibilityError("Auction tables are missing.", { eventId });
    }
    logApiEvent("error", eventId, "auction.slots.create.unhandled_error");
    return apiUnhandledError(error, eventId);
  }
}
