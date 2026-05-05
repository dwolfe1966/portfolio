import { Prisma } from "@prisma/client";
import { ACCOUNT_SESSION_COOKIE, verifyAccountSessionToken } from "@/lib/account-session";
import { db } from "@/lib/db";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { getDefaultWorkspace } from "@/lib/workspace";

type WorkspaceDatasetSnapshotInput = {
  app: "lifecycle" | "pricing" | "retention" | "expansion" | "auction" | "acquisition";
  sourceType: string;
  name: string;
  status?: string;
  rowData: Record<string, unknown>;
  rowCounts: Record<string, number>;
  metadata?: Record<string, unknown>;
  cookieHeader?: string | null;
};

function readCookie(cookieHeader: string | null | undefined, name: string) {
  if (!cookieHeader) return undefined;
  const value = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
  return value ? decodeURIComponent(value) : undefined;
}

function toJson(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function createWorkspaceDatasetSnapshot(input: WorkspaceDatasetSnapshotInput) {
  try {
    const workspace = await getDefaultWorkspace();
    const token = readCookie(input.cookieHeader, ACCOUNT_SESSION_COOKIE);
    const session = verifyAccountSessionToken(token);
    const accountUser = session
      ? await db.accountUser.findUnique({ where: { id: session.userId }, select: { id: true } })
      : null;

    return await db.workspaceDataset.create({
      data: {
        workspaceId: workspace.id,
        accountUserId: accountUser?.id ?? null,
        app: input.app,
        sourceType: input.sourceType,
        name: input.name,
        status: input.status ?? "imported",
        rowData: toJson(input.rowData),
        rowCounts: toJson(input.rowCounts),
        metadata: input.metadata ? toJson(input.metadata) : undefined
      },
      select: {
        id: true,
        name: true,
        app: true,
        accountUserId: true
      }
    });
  } catch (error) {
    if (isMissingDemoTableError(error)) return null;
    throw error;
  }
}
