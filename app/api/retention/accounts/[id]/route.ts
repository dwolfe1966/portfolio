import { db } from "@/lib/db";
import { apiCompatibilityError, apiError, apiOk, apiUnhandledError } from "@/lib/api-contract";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { isDemoMutationAllowed } from "@/lib/env-guard";
import { createEventId } from "@/lib/logging";
import { validateRetentionAccountInput } from "@/lib/retention-engine";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const eventId = createEventId("retention_account_patch");
  if (!isDemoMutationAllowed()) return apiError(403, "MUTATION_DISABLED", "Retention account editing is disabled.", { eventId });
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const parsed = validateRetentionAccountInput(body);
  if (!parsed.ok) return apiError(400, "INVALID_ACCOUNT", parsed.errors.join("; "), { eventId });

  try {
    const account = await db.retentionAccount.update({ where: { id }, data: parsed.value });
    await db.retentionAuditLog.create({
      data: {
        actor: "demo-operator",
        action: "account_updated",
        detail: `Updated retention account ${account.name}.`,
        metadata: { eventId, accountId: account.id }
      }
    });
    return apiOk({ account, eventId });
  } catch (error) {
    if (isMissingDemoTableError(error)) return apiCompatibilityError("Retention tables are missing.", { eventId });
    return apiUnhandledError(error, eventId);
  }
}
