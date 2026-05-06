import { Prisma } from "@prisma/client";
import { apiError, apiOk, apiUnhandledError } from "@/lib/api-contract";
import { ACCOUNT_SESSION_COOKIE, verifyAccountSessionToken } from "@/lib/account-session";
import { db } from "@/lib/db";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { isDemoMutationAllowed } from "@/lib/env-guard";
import { createEventId } from "@/lib/logging";
import { TOOL_IMPORT_SCHEMAS, type ToolKey } from "@/lib/tool-data-imports";
import { getDefaultWorkspace } from "@/lib/workspace";

const validTools = new Set(TOOL_IMPORT_SCHEMAS.map((schema) => schema.tool));
const validSourceTypes = new Set(["csv", "google_sheets", "live", "oauth"]);

function clean(value: unknown, max = 120) {
  return String(value ?? "").trim().slice(0, max);
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
}

function normalizeTool(value: unknown): ToolKey | null {
  return typeof value === "string" && validTools.has(value as ToolKey) ? value as ToolKey : null;
}

function normalizeSourceType(value: unknown) {
  return typeof value === "string" && validSourceTypes.has(value) ? value : null;
}

function jsonObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function readCookie(cookieHeader: string | null | undefined, name: string) {
  if (!cookieHeader) return undefined;
  const value = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
  return value ? decodeURIComponent(value) : undefined;
}

function accountUserIdFromRequest(request: Request) {
  const token = readCookie(request.headers.get("cookie"), ACCOUNT_SESSION_COOKIE);
  return verifyAccountSessionToken(token)?.userId ?? null;
}

function serializeConfig(config: {
  id: string;
  app: string;
  sourceType: string;
  name: string;
  accountUserId?: string | null;
  mappings: Prisma.JsonValue;
  metadata: Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: config.id,
    app: config.app,
    sourceType: config.sourceType,
    name: config.name,
    accountUserId: config.accountUserId ?? null,
    mappings: config.mappings,
    metadata: config.metadata,
    createdAt: config.createdAt.toISOString(),
    updatedAt: config.updatedAt.toISOString()
  };
}

export async function GET(request: Request) {
  const eventId = createEventId("workspace_source_configs_get");
  const url = new URL(request.url);
  const app = normalizeTool(url.searchParams.get("app"));
  const sourceType = normalizeSourceType(url.searchParams.get("sourceType"));

  try {
    const workspace = await getDefaultWorkspace();
    const accountUserId = accountUserIdFromRequest(request);
    const configs = await db.lifecycleMappingPreset.findMany({
      where: {
        workspaceId: workspace.id,
        OR: accountUserId
          ? [{ accountUserId }, { accountUserId: null }]
          : [{ accountUserId: null }],
        ...(app ? { app } : {}),
        ...(sourceType ? { sourceType } : {})
      },
      orderBy: { updatedAt: "desc" },
      take: 40
    });

    return apiOk({
      eventId,
      workspace: { id: workspace.id, name: workspace.name, slug: workspace.slug },
      configs: configs.map(serializeConfig)
    });
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      return apiError(503, "COMPATIBILITY_MODE", "Workspace source config tables are missing.", { eventId, compatibilityMode: true });
    }
    return apiUnhandledError(error, eventId);
  }
}

export async function POST(request: Request) {
  const eventId = createEventId("workspace_source_configs_post");
  if (!isDemoMutationAllowed()) return apiError(403, "MUTATION_DISABLED", "Workspace source config editing is disabled.", { eventId });

  const body = await request.json().catch(() => ({}));
  const app = normalizeTool(body.app);
  const sourceType = normalizeSourceType(body.sourceType);
  const name = clean(body.name) || "Workspace source";

  if (!app || !sourceType) {
    return apiError(400, "VALIDATION_ERROR", "Valid app and sourceType values are required.", { eventId });
  }

  try {
    const workspace = await getDefaultWorkspace();
    const accountUserId = accountUserIdFromRequest(request);
    const existing = await db.lifecycleMappingPreset.findFirst({
      where: {
        workspaceId: workspace.id,
        accountUserId,
        app,
        sourceType,
        name
      }
    });
    const config = existing
      ? await db.lifecycleMappingPreset.update({
          where: { id: existing.id },
          data: {
            mappings: toJson(body.mappings),
            metadata: toJson(body.metadata)
          }
        })
      : await db.lifecycleMappingPreset.create({
          data: {
            workspaceId: workspace.id,
            accountUserId,
            app,
            sourceType,
            name,
            mappings: toJson(body.mappings),
            metadata: toJson(body.metadata)
          }
        });

    return apiOk({
      eventId,
      workspace: { id: workspace.id, name: workspace.name, slug: workspace.slug },
      config: serializeConfig(config)
    });
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      return apiError(503, "COMPATIBILITY_MODE", "Workspace source config tables are missing.", { eventId, compatibilityMode: true });
    }
    return apiUnhandledError(error, eventId);
  }
}

export async function PATCH(request: Request) {
  const eventId = createEventId("workspace_source_configs_patch");
  if (!isDemoMutationAllowed()) return apiError(403, "MUTATION_DISABLED", "Workspace source config editing is disabled.", { eventId });

  const body = await request.json().catch(() => ({}));
  const id = clean(body.id, 80);
  if (!id) return apiError(400, "VALIDATION_ERROR", "Source config id is required.", { eventId });

  try {
    const workspace = await getDefaultWorkspace();
    const accountUserId = accountUserIdFromRequest(request);
    const existing = await db.lifecycleMappingPreset.findFirst({
      where: {
        id,
        workspaceId: workspace.id,
        OR: accountUserId
          ? [{ accountUserId }, { accountUserId: null }]
          : [{ accountUserId: null }]
      }
    });
    if (!existing) return apiError(404, "NOT_FOUND", "Source config was not found.", { eventId });

    const metadataPatch = jsonObject(body.metadataPatch);
    const updates: Prisma.LifecycleMappingPresetUpdateInput = {};
    if (Object.keys(metadataPatch).length > 0) {
      updates.metadata = toJson({ ...jsonObject(existing.metadata), ...metadataPatch });
    }
    if (body.mappings !== undefined) {
      updates.mappings = toJson(body.mappings);
    }

    if (Object.keys(updates).length === 0) {
      return apiOk({
        eventId,
        workspace: { id: workspace.id, name: workspace.name, slug: workspace.slug },
        config: serializeConfig(existing)
      });
    }

    const config = await db.lifecycleMappingPreset.update({
      where: { id: existing.id },
      data: updates
    });

    return apiOk({
      eventId,
      workspace: { id: workspace.id, name: workspace.name, slug: workspace.slug },
      config: serializeConfig(config)
    });
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      return apiError(503, "COMPATIBILITY_MODE", "Workspace source config tables are missing.", { eventId, compatibilityMode: true });
    }
    return apiUnhandledError(error, eventId);
  }
}

export async function DELETE(request: Request) {
  const eventId = createEventId("workspace_source_configs_delete");
  if (!isDemoMutationAllowed()) return apiError(403, "MUTATION_DISABLED", "Workspace source config editing is disabled.", { eventId });

  const body = await request.json().catch(() => ({}));
  const id = clean(body.id, 80);
  if (!id) return apiError(400, "VALIDATION_ERROR", "Source config id is required.", { eventId });

  try {
    const workspace = await getDefaultWorkspace();
    const accountUserId = accountUserIdFromRequest(request);
    await db.lifecycleMappingPreset.deleteMany({ where: { id, workspaceId: workspace.id, accountUserId } });
    return apiOk({ eventId, deleted: true });
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      return apiError(503, "COMPATIBILITY_MODE", "Workspace source config tables are missing.", { eventId, compatibilityMode: true });
    }
    return apiUnhandledError(error, eventId);
  }
}
