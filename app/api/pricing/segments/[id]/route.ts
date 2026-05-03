import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiCompatibilityError, apiError, apiOk, apiUnhandledError } from "@/lib/api-contract";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { isDemoMutationAllowed } from "@/lib/env-guard";
import { createEventId } from "@/lib/logging";
import { validatePricingSegmentInput } from "@/lib/pricing-engine";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const eventId = createEventId("price_segment_patch");
  if (!isDemoMutationAllowed()) {
    return apiError(403, "MUTATION_DISABLED", "Pricing segment edits are disabled.", { eventId });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = validatePricingSegmentInput(body);
  if (!parsed.ok) {
    return apiError(400, "INVALID_INPUT", "Pricing segment validation failed.", { errors: parsed.errors, eventId });
  }

  try {
    const segment = await db.pricingSegment.update({
      where: { id },
      data: parsed.value
    });
    return apiOk({ segment, eventId });
  } catch (error) {
    if (isMissingDemoTableError(error)) return apiCompatibilityError("Pricing tables are missing.", { eventId });
    return apiUnhandledError(error, eventId);
  }
}
