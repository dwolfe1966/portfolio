import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiCompatibilityError, apiError, apiOk, apiUnhandledError } from "@/lib/api-contract";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { isDemoMutationAllowed } from "@/lib/env-guard";
import { createEventId } from "@/lib/logging";
import { validatePricingDecisionInput } from "@/lib/pricing-engine";

const STATE_BY_DECISION = {
  promote: "PROMOTED",
  extend: "RUNNING",
  pause: "PAUSED",
  rollback: "ROLLED_BACK"
} as const;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const eventId = createEventId("price_decision_post");
  if (!isDemoMutationAllowed()) return apiError(403, "MUTATION_DISABLED", "Pricing decisions are disabled.", { eventId });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = validatePricingDecisionInput(body);
  if (!parsed.ok) return apiError(400, "INVALID_INPUT", "Decision validation failed.", { errors: parsed.errors, eventId });
  try {
    const result = await db.$transaction(async (tx) => {
      const decision = await tx.pricingDecision.create({
        data: { experimentId: id, ...parsed.value }
      });
      const experiment = await tx.pricingExperiment.update({
        where: { id },
        data: { state: STATE_BY_DECISION[parsed.value.decision] }
      });
      await tx.pricingAuditLog.create({
        data: {
          experimentId: id,
          actor: parsed.value.actor,
          action: `decision_${parsed.value.decision}`,
          detail: parsed.value.rationale,
          metadata: { eventId }
        }
      });
      return { decision, experiment };
    });
    return apiOk({ ...result, eventId });
  } catch (error) {
    if (isMissingDemoTableError(error)) return apiCompatibilityError("Pricing tables are missing.", { eventId });
    return apiUnhandledError(error, eventId);
  }
}
