import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { apiCompatibilityError, apiError, apiOk, apiUnhandledError } from "@/lib/api-contract";
import { isDemoMutationAllowed } from "@/lib/env-guard";
import { createEventId, logApiEvent } from "@/lib/logging";

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const eventId = createEventId("conn_delete");
  const { id } = await params;

  if (!isDemoMutationAllowed()) {
    return apiError(
      403,
      "MUTATION_DISABLED",
      "Connection deletion is disabled in this environment.",
      { eventId }
    );
  }

  try {
    const existing = await db.adAccountConnection.findUnique({ where: { id } });
    if (!existing) return apiError(404, "CONNECTION_NOT_FOUND", "Connection not found", { eventId });

    await db.adAccountConnection.delete({ where: { id } });
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
