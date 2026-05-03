import { db } from "@/lib/db";
import { apiCompatibilityError, apiError, apiOk, apiUnhandledError } from "@/lib/api-contract";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { isDemoMutationAllowed } from "@/lib/env-guard";
import { createEventId } from "@/lib/logging";

function num(value: unknown, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const eventId = createEventId("acq_campaign_patch");
  if (!isDemoMutationAllowed()) return apiError(403, "MUTATION_DISABLED", "Campaign edits are disabled.", { eventId });
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  try {
    const campaign = await db.$transaction(async (tx) => {
      const updated = await tx.acquisitionCampaign.update({
        where: { id },
        data: {
          name: String(body.name ?? "").trim().slice(0, 120),
          objective: String(body.objective ?? "").trim().slice(0, 500),
          budgetCents: Math.max(0, Math.round(num(body.budgetCents))),
          targetCacCents: Math.max(0, Math.round(num(body.targetCacCents))),
          targetLtvCents: Math.max(0, Math.round(num(body.targetLtvCents))),
          maxBudgetShiftPct: clamp(num(body.maxBudgetShiftPct), 0.01, 0.5),
          minConfidence: clamp(num(body.minConfidence), 0.5, 0.95),
          cooldownHours: clamp(Math.round(num(body.cooldownHours, 24)), 1, 168),
          cacAutoPausePctOfTarget: clamp(num(body.cacAutoPausePctOfTarget), 1, 3),
          minLtvCacRatio: clamp(num(body.minLtvCacRatio), 1, 10),
          approvalCapPct: clamp(num(body.approvalCapPct), 0.01, 0.5)
        }
      });
      await tx.acquisitionAuditLog.create({
        data: {
          campaignId: id,
          actor: "operator",
          action: "campaign_inputs_updated",
          metadata: { eventId }
        }
      });
      return updated;
    });
    return apiOk({ campaign, eventId });
  } catch (error) {
    if (isMissingDemoTableError(error)) return apiCompatibilityError("Acquisition tables are missing.", { eventId });
    return apiUnhandledError(error, eventId);
  }
}
