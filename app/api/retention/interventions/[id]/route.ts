import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { apiCompatibilityError, apiError, apiOk, apiUnhandledError } from "@/lib/api-contract";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { isDemoMutationAllowed } from "@/lib/env-guard";
import { createEventId } from "@/lib/logging";

const STATUSES = new Set(["queued", "in_progress", "completed", "cancelled"]);

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const eventId = createEventId("retention_intervention_patch");
  if (!isDemoMutationAllowed()) return apiError(403, "MUTATION_DISABLED", "Retention intervention edits are disabled.", { eventId });
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const status = typeof body.status === "string" && STATUSES.has(body.status) ? body.status : "queued";
  const savedRevenueCents = body.savedRevenueCents == null ? null : Math.max(0, Math.round(Number(body.savedRevenueCents) || 0));

  try {
    const intervention = await db.$transaction(async (tx) => {
      const updated = await tx.retentionIntervention.update({
        where: { id },
        data: {
          accountId: String(body.accountId ?? ""),
          playbookId: String(body.playbookId ?? ""),
          status,
          owner: String(body.owner ?? "").trim().slice(0, 80),
          rationale: String(body.rationale ?? "").trim().slice(0, 1000),
          dueAt: body.dueAt ? new Date(String(body.dueAt)) : null,
          savedRevenueCents
        }
      });
      await tx.retentionAuditLog.create({
        data: {
          interventionId: id,
          actor: updated.owner,
          action: "intervention_updated",
          detail: "Updated retention intervention.",
          metadata: { eventId, status } as Prisma.InputJsonValue
        }
      });
      return updated;
    });
    return apiOk({ intervention, eventId });
  } catch (error) {
    if (isMissingDemoTableError(error)) return apiCompatibilityError("Retention tables are missing.", { eventId });
    return apiUnhandledError(error, eventId);
  }
}
