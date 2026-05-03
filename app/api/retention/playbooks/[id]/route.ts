import { db } from "@/lib/db";
import { apiCompatibilityError, apiError, apiOk, apiUnhandledError } from "@/lib/api-contract";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { isDemoMutationAllowed } from "@/lib/env-guard";
import { createEventId } from "@/lib/logging";
import { validateRetentionPlaybookInput } from "@/lib/retention-engine";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const eventId = createEventId("retention_playbook_patch");
  if (!isDemoMutationAllowed()) return apiError(403, "MUTATION_DISABLED", "Retention playbook editing is disabled.", { eventId });
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const parsed = validateRetentionPlaybookInput(body);
  if (!parsed.ok) return apiError(400, "INVALID_PLAYBOOK", parsed.errors.join("; "), { eventId });

  try {
    const playbook = await db.retentionPlaybook.update({ where: { id }, data: parsed.value });
    await db.retentionAuditLog.create({
      data: {
        actor: "demo-operator",
        action: "playbook_updated",
        detail: `Updated retention playbook ${playbook.name}.`,
        metadata: { eventId, playbookId: playbook.id }
      }
    });
    return apiOk({ playbook, eventId });
  } catch (error) {
    if (isMissingDemoTableError(error)) return apiCompatibilityError("Retention tables are missing.", { eventId });
    return apiUnhandledError(error, eventId);
  }
}
