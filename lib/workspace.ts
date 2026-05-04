import { db } from "@/lib/db";

export const DEFAULT_WORKSPACE = {
  slug: "default-demo-workspace",
  name: "Default Workspace"
};

export function normalizeWorkspaceName(value: unknown) {
  const normalized = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);

  return normalized || DEFAULT_WORKSPACE.name;
}

export async function getDefaultWorkspace() {
  return db.workspace.upsert({
    where: { slug: DEFAULT_WORKSPACE.slug },
    update: {},
    create: DEFAULT_WORKSPACE
  });
}

export async function updateDefaultWorkspaceName(name: string) {
  const normalizedName = normalizeWorkspaceName(name);

  return db.workspace.upsert({
    where: { slug: DEFAULT_WORKSPACE.slug },
    update: { name: normalizedName },
    create: { ...DEFAULT_WORKSPACE, name: normalizedName }
  });
}
