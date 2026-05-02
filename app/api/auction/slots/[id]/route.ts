import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { validateSlotInput } from "@/lib/auction-engine";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { apiCompatibilityError, apiError, apiOk, apiUnhandledError } from "@/lib/api-contract";
import { isDemoMutationAllowed } from "@/lib/env-guard";
import { createEventId, logApiEvent } from "@/lib/logging";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const eventId = createEventId("auc_slot_patch");
  const { id } = await params;
  if (!isDemoMutationAllowed()) {
    return apiError(403, "MUTATION_DISABLED", "Auction mutations are disabled.", { eventId });
  }
  const body = await req.json().catch(() => ({}));
  const parsed = validateSlotInput(body);
  if (!parsed.ok) {
    return apiError(400, "INVALID_INPUT", "Slot validation failed", { errors: parsed.errors, eventId });
  }
  try {
    const existing = await db.auctionSlot.findUnique({ where: { id } });
    if (!existing) return apiError(404, "SLOT_NOT_FOUND", "Slot not found", { eventId });
    const updated = await db.auctionSlot.update({ where: { id }, data: parsed.value });
    return apiOk({ slot: updated, eventId });
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      return apiCompatibilityError("Auction tables are missing.", { eventId });
    }
    logApiEvent("error", eventId, "auction.slots.update.unhandled_error");
    return apiUnhandledError(error, eventId);
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const eventId = createEventId("auc_slot_delete");
  const { id } = await params;
  if (!isDemoMutationAllowed()) {
    return apiError(403, "MUTATION_DISABLED", "Auction mutations are disabled.", { eventId });
  }
  try {
    const existing = await db.auctionSlot.findUnique({ where: { id } });
    if (!existing) return apiError(404, "SLOT_NOT_FOUND", "Slot not found", { eventId });
    await db.auctionSlot.delete({ where: { id } });
    return apiOk({ deletedId: id, eventId });
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      return apiCompatibilityError("Auction tables are missing.", { eventId });
    }
    logApiEvent("error", eventId, "auction.slots.delete.unhandled_error");
    return apiUnhandledError(error, eventId);
  }
}
