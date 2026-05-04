export const WORKSPACE_PRESET_APPS = ["acquisition", "auction", "expansion", "lifecycle", "pricing", "retention"] as const;
export const WORKSPACE_PRESET_TYPES = ["scenario", "simulation", "configuration"] as const;

export type WorkspacePresetApp = typeof WORKSPACE_PRESET_APPS[number];
export type WorkspacePresetType = typeof WORKSPACE_PRESET_TYPES[number];

export type WorkspacePresetInput = {
  app: string | null | undefined;
  presetType: string | null | undefined;
  name: unknown;
  values: unknown;
  metadata?: unknown;
};

export type ValidWorkspacePresetInput = {
  app: WorkspacePresetApp;
  presetType: WorkspacePresetType;
  name: string;
  values: Record<string, unknown>;
  metadata: Record<string, unknown> | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeName(value: unknown) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
}

export function normalizePresetScope(value: string | null | undefined, allowed: readonly string[]) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return allowed.includes(normalized) ? normalized : null;
}

export function validateWorkspacePresetInput(input: WorkspacePresetInput) {
  const errors: string[] = [];
  const app = normalizePresetScope(input.app, WORKSPACE_PRESET_APPS) as WorkspacePresetApp | null;
  const presetType = normalizePresetScope(input.presetType, WORKSPACE_PRESET_TYPES) as WorkspacePresetType | null;
  const name = normalizeName(input.name);

  if (!app) errors.push("app must be one of the supported workspace tools.");
  if (!presetType) errors.push("presetType must be scenario, simulation, or configuration.");
  if (!name) errors.push("name is required.");
  if (!isRecord(input.values)) errors.push("values must be an object.");
  if (input.metadata !== undefined && input.metadata !== null && !isRecord(input.metadata)) {
    errors.push("metadata must be an object when provided.");
  }

  if (errors.length || !app || !presetType || !isRecord(input.values)) {
    return { ok: false as const, errors };
  }

  return {
    ok: true as const,
    value: {
      app,
      presetType,
      name,
      values: input.values,
      metadata: isRecord(input.metadata) ? input.metadata : null
    } satisfies ValidWorkspacePresetInput
  };
}
