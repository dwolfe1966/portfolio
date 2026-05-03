import { db } from "@/lib/db";
import { apiCompatibilityError, apiError, apiOk, apiUnhandledError } from "@/lib/api-contract";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { isDemoMutationAllowed } from "@/lib/env-guard";
import { createEventId } from "@/lib/logging";
import { validateRetentionPolicyInput } from "@/lib/retention-engine";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const eventId = createEventId("retention_policy_patch");
  if (!isDemoMutationAllowed()) return apiError(403, "MUTATION_DISABLED", "Retention policy editing is disabled.", { eventId });
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const parsed = validateRetentionPolicyInput(body);
  if (!parsed.ok) return apiError(400, "INVALID_POLICY", parsed.errors.join("; "), { eventId });

  try {
    const policy = await db.retentionPolicy.update({ where: { id }, data: parsed.value });
    await db.retentionAuditLog.create({
      data: {
        actor: "demo-operator",
        action: "policy_updated",
        detail: `Updated retention policy ${policy.name}.`,
        metadata: { eventId, policyId: policy.id }
      }
    });
    return apiOk({ policy, eventId });
  } catch (error) {
    if (isMissingDemoTableError(error)) return apiCompatibilityError("Retention tables are missing.", { eventId });
    return apiUnhandledError(error, eventId);
  }
}
