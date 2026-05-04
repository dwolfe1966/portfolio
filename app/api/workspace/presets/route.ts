import { Prisma } from "@prisma/client";
import { apiError, apiOk, apiUnhandledError } from "@/lib/api-contract";
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
    const presets = await db.workspacePreset.findMany({
      where: { workspaceId: workspace.id, app, presetType },
      orderBy: { updatedAt: "desc" },
      take: 30
    });

    return apiOk({
      eventId,
      workspace: { id: workspace.id, name: workspace.name, slug: workspace.slug },
      presets: presets.map((preset) => ({
        id: preset.id,
        app: preset.app,
        presetType: preset.presetType,
        name: preset.name,
        values: preset.values,
        metadata: preset.metadata,
        createdAt: preset.createdAt.toISOString(),
        updatedAt: preset.updatedAt.toISOString()
      }))
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
    const preset = await db.workspacePreset.upsert({
      where: {
        workspaceId_app_presetType_name: {
          workspaceId: workspace.id,
          app: parsed.value.app,
          presetType: parsed.value.presetType,
          name: parsed.value.name
        }
      },
      update: {
        values: toJson(parsed.value.values),
        metadata: parsed.value.metadata ? toJson(parsed.value.metadata) : Prisma.JsonNull
      },
      create: {
        workspaceId: workspace.id,
        app: parsed.value.app,
        presetType: parsed.value.presetType,
        name: parsed.value.name,
        values: toJson(parsed.value.values),
        metadata: parsed.value.metadata ? toJson(parsed.value.metadata) : Prisma.JsonNull
      }
    });

    return apiOk({
      eventId,
      preset: {
        id: preset.id,
        app: preset.app,
        presetType: preset.presetType,
        name: preset.name,
        values: preset.values,
        metadata: preset.metadata,
        createdAt: preset.createdAt.toISOString(),
        updatedAt: preset.updatedAt.toISOString()
      }
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
    await db.workspacePreset.deleteMany({ where: { id, workspaceId: workspace.id } });
    return apiOk({ eventId, deleted: true });
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      return apiError(503, "COMPATIBILITY_MODE", "Workspace preset tables are missing.", { eventId, compatibilityMode: true });
    }
    return apiUnhandledError(error, eventId);
  }
}
