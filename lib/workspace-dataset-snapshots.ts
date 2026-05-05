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

type LegacyLifecycleImport = {
  id: string;
  sourceName: string;
  sourceType: string;
  usersImported: number;
  entitiesImported: number;
  interestEdgesImported: number;
  changeEventsImported: number;
  metadata: unknown;
};

function readMetadataRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export async function ensureLegacyLifecycleDatasetSnapshot(importLog: LegacyLifecycleImport | null | undefined) {
  if (!importLog) return null;
  const existing = await db.workspaceDataset.findFirst({
    where: {
      app: "lifecycle",
      metadata: {
        path: ["legacyImportLogId"],
        equals: importLog.id
      }
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      app: true,
      sourceType: true,
      accountUserId: true,
      rowCounts: true,
      createdAt: true
    }
  });
  if (existing) return existing;

  const [users, entities, interestEdges, changeEvents] = await Promise.all([
    db.user.findMany({
      orderBy: { createdAt: "asc" },
      select: { fullName: true, email: true, segment: true, subscriptionStatus: true, lastActiveAt: true }
    }),
    db.entity.findMany({
      orderBy: { createdAt: "asc" },
      select: { name: true, entityType: true, city: true, state: true }
    }),
    db.interestEdge.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        interestScore: true,
        source: true,
        user: { select: { email: true } },
        entity: { select: { name: true } }
      }
    }),
    db.entityDelta.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        changeType: true,
        oldValue: true,
        newValue: true,
        deltaSummary: true,
        detectedAt: true,
        entity: { select: { name: true } }
      }
    })
  ]);

  const rowCounts = {
    users: users.length,
    entities: entities.length,
    interestEdges: interestEdges.length,
    changeEvents: changeEvents.length
  };
  const importCounts = {
    users: importLog.usersImported,
    entities: importLog.entitiesImported,
    interestEdges: importLog.interestEdgesImported,
    changeEvents: importLog.changeEventsImported
  };
  const countsStillMatchImport = Object.entries(importCounts).every(([key, count]) => (
    rowCounts[key as keyof typeof rowCounts] === count
  ));
  if (!countsStillMatchImport) return null;

  const workspace = await getDefaultWorkspace();
  return db.workspaceDataset.create({
    data: {
      workspaceId: workspace.id,
      app: "lifecycle",
      sourceType: importLog.sourceType,
      name: importLog.sourceName,
      status: "imported",
      rowCounts: toJson(rowCounts),
      rowData: toJson({
        users: users.map((user) => ({
          fullName: user.fullName,
          email: user.email,
          segment: user.segment,
          subscriptionStatus: user.subscriptionStatus,
          lastActiveAt: user.lastActiveAt?.toISOString() ?? null
        })),
        entities,
        interestEdges: interestEdges.map((edge) => ({
          userEmail: edge.user.email,
          entityName: edge.entity.name,
          interestScore: edge.interestScore,
          source: edge.source
        })),
        changeEvents: changeEvents.map((event) => ({
          entityName: event.entity.name,
          changeType: event.changeType,
          oldValue: event.oldValue,
          newValue: event.newValue,
          deltaSummary: event.deltaSummary,
          detectedAt: event.detectedAt.toISOString()
        }))
      }),
      metadata: toJson({
        legacyImportLogId: importLog.id,
        sourceMetadata: readMetadataRecord(importLog.metadata).sourceMetadata ?? null,
        backfilledFromActiveTables: true
      })
    },
    select: {
      id: true,
      name: true,
      app: true,
      sourceType: true,
      accountUserId: true,
      rowCounts: true,
      createdAt: true
    }
  });
}
