import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { validateAdvertiserInput } from "@/lib/auction-engine";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { apiCompatibilityError, apiError, apiOk, apiUnhandledError } from "@/lib/api-contract";
import { isDemoMutationAllowed } from "@/lib/env-guard";
import { createEventId, logApiEvent } from "@/lib/logging";

export async function GET() {
  const eventId = createEventId("auc_adv_get");
  try {
    const advertisers = await db.auctionAdvertiser.findMany({
      orderBy: { createdAt: "asc" }
    });
    return apiOk({ advertisers, eventId });
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      return apiOk({ compatibilityMode: true, advertisers: [], eventId });
    }
    logApiEvent("error", eventId, "auction.advertisers.list.unhandled_error");
    return apiUnhandledError(error, eventId);
  }
}

export async function POST(req: NextRequest) {
  const eventId = createEventId("auc_adv_post");
  if (!isDemoMutationAllowed()) {
    return apiError(403, "MUTATION_DISABLED", "Auction mutations are disabled in this environment.", { eventId });
  }
  const body = await req.json().catch(() => ({}));
  const parsed = validateAdvertiserInput(body);
  if (!parsed.ok) {
    return apiError(400, "INVALID_INPUT", "Advertiser validation failed", { errors: parsed.errors, eventId });
  }
  try {
    const created = await db.auctionAdvertiser.create({ data: parsed.value });
    return apiOk({ advertiser: created, eventId });
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      return apiCompatibilityError("Auction tables are missing.", { eventId });
    }
    logApiEvent("error", eventId, "auction.advertisers.create.unhandled_error");
    return apiUnhandledError(error, eventId);
  }
}
