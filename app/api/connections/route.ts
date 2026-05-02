import { db } from "@/lib/db";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { apiCompatibilityError, apiOk, apiUnhandledError } from "@/lib/api-contract";
import { createEventId, logApiEvent } from "@/lib/logging";

export async function GET() {
  const eventId = createEventId("connections_get");
  try {
    const connections = await db.adAccountConnection.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        provider: true,
        externalAccountId: true,
        accountName: true,
        isTestAccount: true,
        scopes: true,
        expiresAt: true,
        lastFetchedAt: true,
        createdAt: true
      }
    });
    return apiOk({ connections, eventId });
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      return apiCompatibilityError("AdAccountConnection table is missing.", { eventId });
    }
    logApiEvent("error", eventId, "connections.list.unhandled_error");
    return apiUnhandledError(error, eventId);
  }
}
