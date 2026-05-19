import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
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

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const eventId = createEventId("conn_patch");
  const { id } = await params;
  const token = request.cookies.get(ACCOUNT_SESSION_COOKIE)?.value;
  const accountUserId = verifyAccountSessionToken(token)?.userId ?? null;

  if (!isDemoMutationAllowed()) {
    return apiError(
      403,
      "MUTATION_DISABLED",
      "Connection updates are disabled in this environment.",
      { eventId }
    );
  }

  try {
    const body = await request.json().catch(() => ({})) as { hidden?: unknown };
    if (typeof body.hidden !== "boolean") {
      return apiError(400, "INVALID_CONNECTION_UPDATE", "Connection update requires hidden=true or hidden=false.", { eventId });
    }

    const existing = await db.adAccountConnection.findFirst({
      where: { id, accountUserId },
      include: { credentialGrant: { select: { id: true, metadata: true } } }
    });
    if (!existing) return apiError(404, "CONNECTION_NOT_FOUND", "Connection not found", { eventId });
    if (!existing.credentialGrant) return apiError(409, "CONNECTION_GRANT_MISSING", "Connection has no credential grant to update.", { eventId });

    const metadata = metadataObject(existing.credentialGrant.metadata);
    const nextMetadata = {
      ...metadata,
      workspaceHidden: body.hidden,
      workspaceHiddenAt: body.hidden ? new Date().toISOString() : null
    };

    await db.providerCredentialGrant.update({
      where: { id: existing.credentialGrant.id },
      data: { metadata: nextMetadata as Prisma.InputJsonValue }
    });

    logApiEvent("info", eventId, "connections.patch.completed", { id, provider: existing.provider, hidden: body.hidden });
    return apiOk({ id, hidden: body.hidden, eventId });
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      return apiCompatibilityError("AdAccountConnection table is missing.", { eventId });
    }
    logApiEvent("error", eventId, "connections.patch.unhandled_error");
    return apiUnhandledError(error, eventId);
  }
}

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
