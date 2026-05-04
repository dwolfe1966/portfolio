import { Prisma } from "@prisma/client";
import { apiError, apiOk, apiUnhandledError } from "@/lib/api-contract";
import { db } from "@/lib/db";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { isDemoMutationAllowed } from "@/lib/env-guard";
import { createEventId } from "@/lib/logging";

const defaultWorkspace = {
  slug: "default-demo-workspace",
  name: "Default Demo Workspace"
};

async function getDefaultWorkspace() {
  return db.workspace.upsert({
    where: { slug: defaultWorkspace.slug },
    update: { name: defaultWorkspace.name },
    create: defaultWorkspace
  });
}

function clean(value: unknown, max = 120) {
  return String(value ?? "").trim().slice(0, max);
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
}

export async function GET() {
  const eventId = createEventId("lifecycle_mapping_presets_get");
  try {
    const workspace = await getDefaultWorkspace();
    const presets = await db.lifecycleMappingPreset.findMany({
      where: { workspaceId: workspace.id, app: "lifecycle", sourceType: "csv" },
      orderBy: { updatedAt: "desc" },
      take: 20
    });

    return apiOk({
      eventId,
      workspace: { id: workspace.id, name: workspace.name, slug: workspace.slug },
      presets: presets.map((preset) => ({
        id: preset.id,
        name: preset.name,
        mappings: preset.mappings,
        metadata: preset.metadata,
        createdAt: preset.createdAt.toISOString(),
        updatedAt: preset.updatedAt.toISOString()
      }))
    });
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      return apiError(503, "COMPATIBILITY_MODE", "Mapping preset tables are missing.", { eventId, compatibilityMode: true });
    }
    return apiUnhandledError(error, eventId);
  }
}

export async function POST(request: Request) {
  const eventId = createEventId("lifecycle_mapping_presets_post");
  if (!isDemoMutationAllowed()) return apiError(403, "MUTATION_DISABLED", "Mapping preset editing is disabled.", { eventId });

  const body = await request.json().catch(() => ({}));
  const name = clean(body.name) || "Lifecycle CSV mapping";

  try {
    const workspace = await getDefaultWorkspace();
    const preset = await db.lifecycleMappingPreset.upsert({
      where: {
        workspaceId_app_sourceType_name: {
          workspaceId: workspace.id,
          app: "lifecycle",
          sourceType: "csv",
          name
        }
      },
      update: {
        mappings: toJson(body.mappings),
        metadata: toJson(body.metadata)
      },
      create: {
        workspaceId: workspace.id,
        app: "lifecycle",
        sourceType: "csv",
        name,
        mappings: toJson(body.mappings),
        metadata: toJson(body.metadata)
      }
    });

    return apiOk({
      eventId,
      preset: {
        id: preset.id,
        name: preset.name,
        mappings: preset.mappings,
        metadata: preset.metadata,
        createdAt: preset.createdAt.toISOString(),
        updatedAt: preset.updatedAt.toISOString()
      }
    });
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      return apiError(503, "COMPATIBILITY_MODE", "Mapping preset tables are missing.", { eventId, compatibilityMode: true });
    }
    return apiUnhandledError(error, eventId);
  }
}

export async function DELETE(request: Request) {
  const eventId = createEventId("lifecycle_mapping_presets_delete");
  if (!isDemoMutationAllowed()) return apiError(403, "MUTATION_DISABLED", "Mapping preset editing is disabled.", { eventId });

  const body = await request.json().catch(() => ({}));
  const id = clean(body.id, 80);
  if (!id) return apiError(400, "VALIDATION_ERROR", "Mapping preset id is required.", { eventId });

  try {
    const workspace = await getDefaultWorkspace();
    await db.lifecycleMappingPreset.deleteMany({
      where: { id, workspaceId: workspace.id, app: "lifecycle", sourceType: "csv" }
    });
    return apiOk({ eventId, deleted: true });
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      return apiError(503, "COMPATIBILITY_MODE", "Mapping preset tables are missing.", { eventId, compatibilityMode: true });
    }
    return apiUnhandledError(error, eventId);
  }
}
