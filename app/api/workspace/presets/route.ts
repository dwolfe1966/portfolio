import { Prisma } from "@prisma/client";
import { apiError, apiOk, apiUnhandledError } from "@/lib/api-contract";
import { ACCOUNT_SESSION_COOKIE, verifyAccountSessionToken } from "@/lib/account-session";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { isDemoMutationAllowed } from "@/lib/env-guard";
import { createEventId } from "@/lib/logging";
import { getDefaultWorkspace } from "@/lib/workspace";
import {
  WORKSPACE_PRESET_APPS,
  WORKSPACE_PRESET_TYPES,
  normalizePresetScope,
  validateWorkspacePresetInput
} from "@/lib/workspace-presets";
import { db } from "@/lib/db";

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
}

function clean(value: unknown, max = 80) {
  return String(value ?? "").trim().slice(0, max);
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

function serializePreset(preset: {
  id: string;
  app: string;
  presetType: string;
  name: string;
  accountUserId?: string | null;
  values: Prisma.JsonValue;
  metadata: Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: preset.id,
    app: preset.app,
    presetType: preset.presetType,
    name: preset.name,
    accountUserId: preset.accountUserId ?? null,
    values: preset.values,
    metadata: preset.metadata,
    createdAt: preset.createdAt.toISOString(),
    updatedAt: preset.updatedAt.toISOString()
  };
}

export async function GET(request: Request) {
  const eventId = createEventId("workspace_presets_get");
  const url = new URL(request.url);
  const app = normalizePresetScope(url.searchParams.get("app"), WORKSPACE_PRESET_APPS);
  const presetType = normalizePresetScope(url.searchParams.get("presetType"), WORKSPACE_PRESET_TYPES);

  if (!app || !presetType) {
    return apiError(400, "VALIDATION_ERROR", "Valid app and presetType query parameters are required.", { eventId });
  }

  try {
    const workspace = await getDefaultWorkspace();
    const accountUserId = accountUserIdFromRequest(request);
    const presets = await db.workspacePreset.findMany({
      where: {
        workspaceId: workspace.id,
        app,
        presetType,
        OR: accountUserId
          ? [{ accountUserId }, { accountUserId: null }]
          : [{ accountUserId: null }]
      },
      orderBy: { updatedAt: "desc" },
      take: 30
    });

    return apiOk({
      eventId,
      workspace: { id: workspace.id, name: workspace.name, slug: workspace.slug },
      presets: presets.map(serializePreset)
    });
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      return apiError(503, "COMPATIBILITY_MODE", "Workspace preset tables are missing.", { eventId, compatibilityMode: true });
    }
    return apiUnhandledError(error, eventId);
  }
}

export async function POST(request: Request) {
  const eventId = createEventId("workspace_presets_post");
  if (!isDemoMutationAllowed()) return apiError(403, "MUTATION_DISABLED", "Workspace preset editing is disabled.", { eventId });

  const body = await request.json().catch(() => ({}));
  const parsed = validateWorkspacePresetInput({
    app: body.app,
    presetType: body.presetType,
    name: body.name,
    values: body.values,
    metadata: body.metadata
  });

  if (!parsed.ok) {
    return apiError(400, "VALIDATION_ERROR", "Workspace preset input validation failed.", { eventId, errors: parsed.errors });
  }

  try {
    const workspace = await getDefaultWorkspace();
    const accountUserId = accountUserIdFromRequest(request);
    const existing = await db.workspacePreset.findFirst({
      where: {
        workspaceId: workspace.id,
        accountUserId,
        app: parsed.value.app,
        presetType: parsed.value.presetType,
        name: parsed.value.name
      }
    });
    const preset = existing
      ? await db.workspacePreset.update({
          where: { id: existing.id },
          data: {
            values: toJson(parsed.value.values),
            metadata: parsed.value.metadata ? toJson(parsed.value.metadata) : Prisma.JsonNull
          }
        })
      : await db.workspacePreset.create({
          data: {
            workspaceId: workspace.id,
            accountUserId,
            app: parsed.value.app,
            presetType: parsed.value.presetType,
            name: parsed.value.name,
            values: toJson(parsed.value.values),
            metadata: parsed.value.metadata ? toJson(parsed.value.metadata) : Prisma.JsonNull
          }
        });

    return apiOk({
      eventId,
      preset: serializePreset(preset)
    });
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      return apiError(503, "COMPATIBILITY_MODE", "Workspace preset tables are missing.", { eventId, compatibilityMode: true });
    }
    return apiUnhandledError(error, eventId);
  }
}

export async function DELETE(request: Request) {
  const eventId = createEventId("workspace_presets_delete");
  if (!isDemoMutationAllowed()) return apiError(403, "MUTATION_DISABLED", "Workspace preset editing is disabled.", { eventId });

  const body = await request.json().catch(() => ({}));
  const id = clean(body.id);
  if (!id) return apiError(400, "VALIDATION_ERROR", "Workspace preset id is required.", { eventId });

  try {
    const workspace = await getDefaultWorkspace();
    const accountUserId = accountUserIdFromRequest(request);
    await db.workspacePreset.deleteMany({ where: { id, workspaceId: workspace.id, accountUserId } });
    return apiOk({ eventId, deleted: true });
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      return apiError(503, "COMPATIBILITY_MODE", "Workspace preset tables are missing.", { eventId, compatibilityMode: true });
    }
    return apiUnhandledError(error, eventId);
  }
}
