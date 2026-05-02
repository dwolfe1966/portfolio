import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { validateAdvertiserInput } from "@/lib/auction-engine";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { apiCompatibilityError, apiError, apiOk, apiUnhandledError } from "@/lib/api-contract";
import { isDemoMutationAllowed } from "@/lib/env-guard";
import { createEventId, logApiEvent } from "@/lib/logging";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const eventId = createEventId("auc_adv_patch");
  const { id } = await params;
  if (!isDemoMutationAllowed()) {
    return apiError(403, "MUTATION_DISABLED", "Auction mutations are disabled.", { eventId });
  }
  const body = await req.json().catch(() => ({}));
  const parsed = validateAdvertiserInput(body);
  if (!parsed.ok) {
    return apiError(400, "INVALID_INPUT", "Advertiser validation failed", { errors: parsed.errors, eventId });
  }
  try {
    const existing = await db.auctionAdvertiser.findUnique({ where: { id } });
    if (!existing) return apiError(404, "ADVERTISER_NOT_FOUND", "Advertiser not found", { eventId });
    const updated = await db.auctionAdvertiser.update({ where: { id }, data: parsed.value });
    return apiOk({ advertiser: updated, eventId });
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      return apiCompatibilityError("Auction tables are missing.", { eventId });
    }
    logApiEvent("error", eventId, "auction.advertisers.update.unhandled_error");
    return apiUnhandledError(error, eventId);
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const eventId = createEventId("auc_adv_delete");
  const { id } = await params;
  if (!isDemoMutationAllowed()) {
    return apiError(403, "MUTATION_DISABLED", "Auction mutations are disabled.", { eventId });
  }
  try {
    const existing = await db.auctionAdvertiser.findUnique({ where: { id } });
    if (!existing) return apiError(404, "ADVERTISER_NOT_FOUND", "Advertiser not found", { eventId });
    await db.auctionAdvertiser.delete({ where: { id } });
    return apiOk({ deletedId: id, eventId });
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      return apiCompatibilityError("Auction tables are missing.", { eventId });
    }
    logApiEvent("error", eventId, "auction.advertisers.delete.unhandled_error");
    return apiUnhandledError(error, eventId);
  }
}
