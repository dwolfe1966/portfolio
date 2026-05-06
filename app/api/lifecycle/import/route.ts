import { DeltaChangeType, Prisma, SubscriptionStatus, UserSegment } from "@prisma/client";
import { apiError, apiOk, apiUnhandledError } from "@/lib/api-contract";
import { db } from "@/lib/db";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { isDemoMutationAllowed } from "@/lib/env-guard";
import { createEventId } from "@/lib/logging";
import { getToolImportSchema, normalizeEnumValue } from "@/lib/tool-data-imports";
import { createWorkspaceDatasetSnapshot } from "@/lib/workspace-dataset-snapshots";

type CsvRow = Record<string, unknown>;

type LifecycleImportPayload = {
  sourceName?: unknown;
  sourceMetadata?: unknown;
  users?: CsvRow[];
  entities?: CsvRow[];
  interestEdges?: CsvRow[];
  changeEvents?: CsvRow[];
};

const lifecycleImportSchema = getToolImportSchema("lifecycle");
const maxRowsByObject = Object.fromEntries(
  lifecycleImportSchema.objects.map((object) => [object.key, object.maxRows])
) as Record<"users" | "entities" | "interestEdges" | "changeEvents", number>;

function clean(value: unknown, max = 180) {
  return String(value ?? "").trim().slice(0, max);
}

function normalizeEmail(value: unknown) {
  return clean(value).toLowerCase();
}

function normalizeUserSegment(value: unknown) {
  return normalizeEnumValue(clean(value), Object.values(UserSegment)) as UserSegment;
}

function normalizeSubscriptionStatus(value: unknown) {
  return normalizeEnumValue(clean(value), Object.values(SubscriptionStatus)) as SubscriptionStatus;
}

function normalizeDeltaChangeType(value: unknown) {
  return normalizeEnumValue(clean(value), Object.values(DeltaChangeType)) as DeltaChangeType;
}

function isValidDate(value: string) {
  return value.length > 0 && !Number.isNaN(new Date(value).getTime());
}

function validatePayload(payload: LifecycleImportPayload) {
  const errors: string[] = [];
  const users = Array.isArray(payload.users) ? payload.users.slice(0, maxRowsByObject.users) : [];
  const entities = Array.isArray(payload.entities) ? payload.entities.slice(0, maxRowsByObject.entities) : [];
  const interestEdges = Array.isArray(payload.interestEdges) ? payload.interestEdges.slice(0, maxRowsByObject.interestEdges) : [];
  const changeEvents = Array.isArray(payload.changeEvents) ? payload.changeEvents.slice(0, maxRowsByObject.changeEvents) : [];

  if (users.length === 0) errors.push("At least one user row is required.");
  if (entities.length === 0) errors.push("At least one entity row is required.");
  if (interestEdges.length === 0) errors.push("At least one interest edge row is required.");
  if (changeEvents.length === 0) errors.push("At least one change event row is required.");

  users.forEach((row, index) => {
    const label = `users row ${index + 1}`;
    const email = normalizeEmail(row.email);
    if (!clean(row.fullName, 120)) errors.push(`${label}: fullName is required.`);
    if (!email.includes("@")) errors.push(`${label}: valid email is required.`);
    if (!Object.values(UserSegment).includes(normalizeUserSegment(row.segment))) errors.push(`${label}: segment is invalid.`);
    if (!Object.values(SubscriptionStatus).includes(normalizeSubscriptionStatus(row.subscriptionStatus))) errors.push(`${label}: subscriptionStatus is invalid.`);
    const lastActiveAt = clean(row.lastActiveAt);
    if (lastActiveAt && !isValidDate(lastActiveAt)) errors.push(`${label}: lastActiveAt must be a date.`);
  });

  entities.forEach((row, index) => {
    const label = `entities row ${index + 1}`;
    if (!clean(row.name, 120)) errors.push(`${label}: name is required.`);
    if (!clean(row.entityType, 60)) errors.push(`${label}: entityType is required.`);
  });

  interestEdges.forEach((row, index) => {
    const label = `interestEdges row ${index + 1}`;
    const score = Number(row.interestScore);
    if (!normalizeEmail(row.userEmail).includes("@")) errors.push(`${label}: userEmail is required.`);
    if (!clean(row.entityName, 120)) errors.push(`${label}: entityName is required.`);
    if (!Number.isFinite(score) || score < 0 || score > 1) errors.push(`${label}: interestScore must be between 0 and 1.`);
    if (!clean(row.source, 80)) errors.push(`${label}: source is required.`);
  });

  changeEvents.forEach((row, index) => {
    const label = `changeEvents row ${index + 1}`;
    if (!clean(row.entityName, 120)) errors.push(`${label}: entityName is required.`);
    if (!Object.values(DeltaChangeType).includes(normalizeDeltaChangeType(row.changeType))) errors.push(`${label}: changeType is invalid.`);
    if (!clean(row.deltaSummary, 240)) errors.push(`${label}: deltaSummary is required.`);
    if (!isValidDate(clean(row.detectedAt))) errors.push(`${label}: detectedAt must be a date.`);
  });

  return { errors: errors.slice(0, 30), rows: { users, entities, interestEdges, changeEvents } };
}

function readSourceMetadata(value: unknown): Prisma.InputJsonValue | undefined {
  if (!value || typeof value !== "object") return undefined;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

async function recordImportLog(data: {
  sourceName: string;
  status: string;
  usersImported?: number;
  entitiesImported?: number;
  interestEdgesImported?: number;
  changeEventsImported?: number;
  validationErrors?: number;
  metadata?: Prisma.InputJsonValue;
}) {
  try {
    const log = await db.lifecycleImportLog.create({
      data: {
        sourceType: "csv",
        sourceName: data.sourceName,
        status: data.status,
        usersImported: data.usersImported ?? 0,
        entitiesImported: data.entitiesImported ?? 0,
        interestEdgesImported: data.interestEdgesImported ?? 0,
        changeEventsImported: data.changeEventsImported ?? 0,
        validationErrors: data.validationErrors ?? 0,
        metadata: data.metadata
      }
    });
    return log.id;
  } catch (error) {
    if (isMissingDemoTableError(error)) return null;
    throw error;
  }
}

export async function POST(request: Request) {
  const eventId = createEventId("lifecycle_import");
  if (!isDemoMutationAllowed()) return apiError(403, "MUTATION_DISABLED", "Lifecycle data import is disabled.", { eventId });

  const body = await request.json().catch(() => ({})) as LifecycleImportPayload;
  const validation = validatePayload(body);
  const sourceName = clean(body.sourceName, 120) || "CSV upload";
  const sourceMetadata = readSourceMetadata(body.sourceMetadata);
  if (validation.errors.length > 0) {
    await recordImportLog({
      sourceName,
      status: "validation_failed",
      validationErrors: validation.errors.length,
      metadata: {
        eventId,
        errors: validation.errors,
        sourceMetadata,
        rowCounts: {
          users: validation.rows.users.length,
          entities: validation.rows.entities.length,
          interestEdges: validation.rows.interestEdges.length,
          changeEvents: validation.rows.changeEvents.length
        }
      }
    });
    return apiError(400, "VALIDATION_ERROR", "Lifecycle import data is invalid.", { eventId, errors: validation.errors });
  }

  try {
    const result = await db.$transaction(async (tx) => {
      const userByEmail = new Map<string, string>();
      const entityByName = new Map<string, string>();
      let usersImported = 0;
      let entitiesImported = 0;
      let interestEdgesImported = 0;
      let changeEventsImported = 0;

      for (const row of validation.rows.users) {
        const email = normalizeEmail(row.email);
        const user = await tx.user.upsert({
          where: { email },
          update: {
            fullName: clean(row.fullName, 120),
            segment: normalizeUserSegment(row.segment),
            subscriptionStatus: normalizeSubscriptionStatus(row.subscriptionStatus),
            lastActiveAt: clean(row.lastActiveAt) ? new Date(clean(row.lastActiveAt)) : null
          },
          create: {
            fullName: clean(row.fullName, 120),
            email,
            segment: normalizeUserSegment(row.segment),
            subscriptionStatus: normalizeSubscriptionStatus(row.subscriptionStatus),
            lastActiveAt: clean(row.lastActiveAt) ? new Date(clean(row.lastActiveAt)) : null
          }
        });
        userByEmail.set(email, user.id);
        usersImported++;
      }

      for (const row of validation.rows.entities) {
        const name = clean(row.name, 120);
        const entityType = clean(row.entityType, 60);
        const existing = await tx.entity.findFirst({ where: { name, entityType }, select: { id: true } });
        const entity = existing
          ? await tx.entity.update({
              where: { id: existing.id },
              data: { city: clean(row.city, 80) || null, state: clean(row.state, 30) || null }
            })
          : await tx.entity.create({
              data: {
                name,
                entityType,
                city: clean(row.city, 80) || null,
                state: clean(row.state, 30) || null
              }
            });
        entityByName.set(name.toLowerCase(), entity.id);
        entitiesImported++;
      }

      for (const row of validation.rows.interestEdges) {
        const userId = userByEmail.get(normalizeEmail(row.userEmail));
        const entityId = entityByName.get(clean(row.entityName, 120).toLowerCase());
        if (!userId || !entityId) continue;
        await tx.interestEdge.upsert({
          where: {
            userId_entityId_source: {
              userId,
              entityId,
              source: clean(row.source, 80)
            }
          },
          update: {
            interestScore: Number(row.interestScore)
          },
          create: {
            userId,
            entityId,
            source: clean(row.source, 80),
            interestScore: Number(row.interestScore)
          }
        });
        interestEdgesImported++;
      }

      for (const row of validation.rows.changeEvents) {
        const entityId = entityByName.get(clean(row.entityName, 120).toLowerCase());
        if (!entityId) continue;
        const data = {
          entityId,
          changeType: normalizeDeltaChangeType(row.changeType),
          oldValue: clean(row.oldValue, 180) || null,
          newValue: clean(row.newValue, 180) || null,
          deltaSummary: clean(row.deltaSummary, 240),
          detectedAt: new Date(clean(row.detectedAt))
        };
        const existingDelta = await tx.entityDelta.findFirst({
          where: {
            entityId: data.entityId,
            changeType: data.changeType,
            deltaSummary: data.deltaSummary,
            detectedAt: data.detectedAt
          },
          select: { id: true }
        });
        if (!existingDelta) await tx.entityDelta.create({ data });
        changeEventsImported++;
      }

      return { usersImported, entitiesImported, interestEdgesImported, changeEventsImported };
    });

    const importLogId = await recordImportLog({
      sourceName,
      status: "imported",
      ...result,
      metadata: {
        eventId,
        sourceMetadata,
        rowCounts: {
          users: validation.rows.users.length,
          entities: validation.rows.entities.length,
          interestEdges: validation.rows.interestEdges.length,
          changeEvents: validation.rows.changeEvents.length
        }
      }
    });
    const rowCounts = {
      users: validation.rows.users.length,
      entities: validation.rows.entities.length,
      interestEdges: validation.rows.interestEdges.length,
      changeEvents: validation.rows.changeEvents.length
    };
    const dataset = await createWorkspaceDatasetSnapshot({
      app: "lifecycle",
      sourceType: "csv",
      name: sourceName,
      rowData: validation.rows,
      rowCounts,
      metadata: {
        eventId,
        importLogId,
        sourceMetadata,
        imported: result
      },
      cookieHeader: request.headers.get("cookie")
    });

    return apiOk({ eventId, import: { id: importLogId, datasetId: dataset?.id ?? null, ...result } });
  } catch (error) {
    return apiUnhandledError(error, eventId);
  }
}
