import { db } from "@/lib/db";
import { ACCOUNT_SESSION_COOKIE, verifyAccountSessionToken } from "@/lib/account-session";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { apiCompatibilityError, apiOk, apiUnhandledError } from "@/lib/api-contract";
import { createEventId, logApiEvent } from "@/lib/logging";

export async function GET(request: Request) {
  const eventId = createEventId("connections_get");
  const cookieHeader = request.headers.get("cookie") ?? "";
  const token = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${ACCOUNT_SESSION_COOKIE}=`))
    ?.slice(ACCOUNT_SESSION_COOKIE.length + 1);
  const accountUserId = verifyAccountSessionToken(token ? decodeURIComponent(token) : undefined)?.userId ?? null;

  try {
    const connections = await db.adAccountConnection.findMany({
      where: { accountUserId },
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
