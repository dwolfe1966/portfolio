import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { apiCompatibilityError, apiError, apiOk, apiUnhandledError } from "@/lib/api-contract";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { isDemoMutationAllowed } from "@/lib/env-guard";
import { createEventId } from "@/lib/logging";
import { validateRetentionInterventionInput } from "@/lib/retention-engine";

export async function POST(request: Request) {
  const eventId = createEventId("retention_intervention");
  if (!isDemoMutationAllowed()) return apiError(403, "MUTATION_DISABLED", "Retention interventions are disabled.", { eventId });

  const body = await request.json().catch(() => ({}));
  const parsed = validateRetentionInterventionInput(body);
  if (!parsed.ok) return apiError(400, "INVALID_INTERVENTION", parsed.errors.join("; "), { eventId });

  try {
    const account = await db.retentionAccount.findUnique({ where: { id: parsed.value.accountId } });
    const playbook = await db.retentionPlaybook.findUnique({ where: { id: parsed.value.playbookId } });
    if (!account || !playbook) return apiError(404, "NOT_FOUND", "Account or playbook not found.", { eventId });

    const intervention = await db.$transaction(async (tx) => {
      const created = await tx.retentionIntervention.create({
        data: {
          accountId: parsed.value.accountId,
          playbookId: parsed.value.playbookId,
          status: parsed.value.status,
          owner: parsed.value.owner,
          rationale: parsed.value.rationale,
          dueAt: new Date(Date.now() + playbook.slaHours * 60 * 60 * 1000)
        }
      });
      await tx.retentionAuditLog.create({
        data: {
          interventionId: created.id,
          actor: parsed.value.owner,
          action: "intervention_created",
          detail: `Queued ${playbook.name} for ${account.name}.`,
          metadata: {
            eventId,
            accountId: account.id,
            playbookId: playbook.id,
            status: parsed.value.status
          } as Prisma.InputJsonValue
        }
      });
      return created;
    });

    return apiOk({ intervention, eventId });
  } catch (error) {
    if (isMissingDemoTableError(error)) return apiCompatibilityError("Retention tables are missing.", { eventId });
    return apiUnhandledError(error, eventId);
  }
}
