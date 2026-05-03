import { db } from "@/lib/db";
import { apiCompatibilityError, apiError, apiOk, apiUnhandledError } from "@/lib/api-contract";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { isDemoMutationAllowed } from "@/lib/env-guard";
import { createEventId } from "@/lib/logging";

const MOTIONS = new Set(["seat_expansion", "feature_upgrade", "usage_commit", "services_attach"]);

function num(value: unknown, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const eventId = createEventId("expansion_offer_patch");
  if (!isDemoMutationAllowed()) return apiError(403, "MUTATION_DISABLED", "Expansion offer editing is disabled.", { eventId });
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const motion = typeof body.motion === "string" && MOTIONS.has(body.motion) ? body.motion : "seat_expansion";

  try {
    const offer = await db.expansionOffer.update({
      where: { id },
      data: {
        name: String(body.name ?? "").trim().slice(0, 100),
        motion,
        targetSegment: String(body.targetSegment ?? "").trim().slice(0, 60),
        expectedLiftPercent: clamp(num(body.expectedLiftPercent), 0, 1),
        costCents: Math.max(0, Math.round(num(body.costCents))),
        marginPercent: clamp(num(body.marginPercent), 0, 1),
        slaDays: Math.max(1, Math.round(num(body.slaDays, 1)))
      }
    });
    await db.expansionAuditLog.create({
      data: {
        actor: "demo-operator",
        action: "offer_updated",
        detail: `Updated expansion offer ${offer.name}.`,
        metadata: { eventId, offerId: offer.id }
      }
    });
    return apiOk({ offer, eventId });
  } catch (error) {
    if (isMissingDemoTableError(error)) return apiCompatibilityError("Expansion tables are missing.", { eventId });
    return apiUnhandledError(error, eventId);
  }
}
