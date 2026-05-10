import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ACCOUNT_SESSION_COOKIE, verifyAccountSessionToken } from "@/lib/account-session";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { apiCompatibilityError, apiError, apiOk, apiUnhandledError } from "@/lib/api-contract";
import { isDemoMutationAllowed } from "@/lib/env-guard";
import { createEventId, logApiEvent } from "@/lib/logging";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const eventId = createEventId("conn_delete");
  const { id } = await params;
  const token = request.cookies.get(ACCOUNT_SESSION_COOKIE)?.value;
  const accountUserId = verifyAccountSessionToken(token)?.userId ?? null;

  if (!isDemoMutationAllowed()) {
    return apiError(
      403,
      "MUTATION_DISABLED",
      "Connection deletion is disabled in this environment.",
      { eventId }
    );
  }

  try {
    const existing = await db.adAccountConnection.findFirst({ where: { id, accountUserId } });
    if (!existing) return apiError(404, "CONNECTION_NOT_FOUND", "Connection not found", { eventId });

    await db.adAccountConnection.delete({ where: { id } });
    if (existing.credentialGrantId) {
      await db.providerCredentialGrant.update({
        where: { id: existing.credentialGrantId },
        data: {
          status: "revoked",
          revokedAt: new Date()
        }
      });
    }
    logApiEvent("info", eventId, "connections.delete.completed", { id, provider: existing.provider });
    return apiOk({ deletedId: id, eventId });
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      return apiCompatibilityError("AdAccountConnection table is missing.", { eventId });
    }
    logApiEvent("error", eventId, "connections.delete.unhandled_error");
    return apiUnhandledError(error, eventId);
  }
}
