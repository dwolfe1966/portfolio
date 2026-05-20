import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { ACCOUNT_SESSION_COOKIE, verifyAccountSessionToken } from "@/lib/account-session";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { apiCompatibilityError, apiError, apiOk, apiUnhandledError } from "@/lib/api-contract";
import { isDemoMutationAllowed } from "@/lib/env-guard";
import { createEventId, logApiEvent } from "@/lib/logging";

function metadataObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? { ...(value as Record<string, unknown>) }
    : {};
}

function requestAccountUserId(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const token = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${ACCOUNT_SESSION_COOKIE}=`))
    ?.slice(ACCOUNT_SESSION_COOKIE.length + 1);
  return verifyAccountSessionToken(token ? decodeURIComponent(token) : undefined)?.userId ?? null;
}

export async function GET(request: Request) {
  const eventId = createEventId("connections_get");
  const accountUserId = requestAccountUserId(request);

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

export async function PATCH(request: Request) {
  const eventId = createEventId("connections_bulk_patch");
  const accountUserId = requestAccountUserId(request);

  if (!isDemoMutationAllowed()) {
    return apiError(
      403,
      "MUTATION_DISABLED",
      "Connection updates are disabled in this environment.",
      { eventId }
    );
  }

  try {
    const body = await request.json().catch(() => ({})) as { ids?: unknown; hidden?: unknown };
    if (!Array.isArray(body.ids) || body.ids.some((id) => typeof id !== "string") || body.ids.length === 0 || body.ids.length > 500) {
      return apiError(400, "INVALID_CONNECTION_UPDATE", "Bulk connection update requires 1-500 connection ids.", { eventId });
    }
    if (typeof body.hidden !== "boolean") {
      return apiError(400, "INVALID_CONNECTION_UPDATE", "Bulk connection update requires hidden=true or hidden=false.", { eventId });
    }

    const ids = Array.from(new Set(body.ids));
    const connections = await db.adAccountConnection.findMany({
      where: { id: { in: ids }, accountUserId },
      include: { credentialGrant: { select: { id: true, metadata: true } } }
    });
    const updatable = connections.filter((conn) => conn.credentialGrant);

    await db.$transaction(updatable.map((conn) => {
      const metadata = metadataObject(conn.credentialGrant?.metadata);
      return db.providerCredentialGrant.update({
        where: { id: conn.credentialGrant!.id },
        data: {
          metadata: {
            ...metadata,
            workspaceHidden: body.hidden,
            workspaceHiddenAt: body.hidden ? new Date().toISOString() : null
          } as Prisma.InputJsonValue
        }
      });
    }));

    logApiEvent("info", eventId, "connections.bulk_patch.completed", {
      requested: ids.length,
      matched: connections.length,
      updated: updatable.length,
      hidden: body.hidden
    });
    return apiOk({ requested: ids.length, matched: connections.length, updated: updatable.length, hidden: body.hidden, eventId });
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      return apiCompatibilityError("AdAccountConnection table is missing.", { eventId });
    }
    logApiEvent("error", eventId, "connections.bulk_patch.unhandled_error");
    return apiUnhandledError(error, eventId);
  }
}
