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
  const eventId = createEventId("expansion_policy_patch");
  if (!isDemoMutationAllowed()) return apiError(403, "MUTATION_DISABLED", "Expansion policy editing is disabled.", { eventId });
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  try {
    const policy = await db.expansionPolicy.update({
      where: { id },
      data: {
        name: String(body.name ?? "").trim().slice(0, 100),
        highReadinessThreshold: clamp(num(body.highReadinessThreshold), 0, 1),
        mediumReadinessThreshold: clamp(num(body.mediumReadinessThreshold), 0, 1),
        minMarginPercent: clamp(num(body.minMarginPercent), 0, 1),
        minPaybackRatio: clamp(num(body.minPaybackRatio), 0, 20),
        maxSlaDays: Math.max(1, Math.round(num(body.maxSlaDays, 1)))
      }
    });
    await db.expansionAuditLog.create({
      data: {
        actor: "demo-operator",
        action: "policy_updated",
        detail: `Updated expansion policy ${policy.name}.`,
        metadata: { eventId, policyId: policy.id }
      }
    });
    return apiOk({ policy, eventId });
  } catch (error) {
    if (isMissingDemoTableError(error)) return apiCompatibilityError("Expansion tables are missing.", { eventId });
    return apiUnhandledError(error, eventId);
  }
}
