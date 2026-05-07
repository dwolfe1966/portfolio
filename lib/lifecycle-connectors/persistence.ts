import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type {
  LifecycleConnector,
  LifecycleConnectorAuditEvent,
  LifecycleConnectorHealth,
  LifecycleConnectorProvider,
  LifecycleObjectKey,
  LifecycleObservationResult,
  LifecycleSyncResult
} from "./types";

type WorkspaceRef = {
  id: string;
};

type SessionRef = {
  userId: string;
};

type ConnectorConfigRef = {
  id: string;
};

function parseDate(value: string | undefined) {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : new Date(timestamp);
}

function providerLabel(provider: LifecycleConnectorProvider) {
  return provider
    .replace(/^fake_/, "Fake ")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function jsonInput(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

export async function upsertLifecycleConnectorConfig(
  workspace: WorkspaceRef,
  session: SessionRef,
  connector: Pick<LifecycleConnector, "provider" | "kind" | "capabilities">
) {
  return db.lifecycleConnectorConfig.upsert({
    where: {
      workspaceId_accountUserId_provider: {
        workspaceId: workspace.id,
        accountUserId: session.userId,
        provider: connector.provider
      }
    },
    update: {
      kind: connector.kind,
      displayName: providerLabel(connector.provider),
      capabilities: connector.capabilities,
      status: "configured"
    },
    create: {
      workspaceId: workspace.id,
      accountUserId: session.userId,
      provider: connector.provider,
      kind: connector.kind,
      displayName: providerLabel(connector.provider),
      capabilities: connector.capabilities,
      settings: {}
    }
  });
}

export async function recordLifecycleConnectorHealth(
  workspace: WorkspaceRef,
  config: ConnectorConfigRef,
  health: LifecycleConnectorHealth
) {
  return db.lifecycleConnectorHealthSnapshot.create({
    data: {
      workspaceId: workspace.id,
      connectorConfigId: config.id,
      provider: health.provider,
      kind: health.kind,
      ok: health.ok,
      accountLabel: health.accountLabel,
      capabilities: health.capabilities,
      permissionWarnings: jsonInput(health.permissionWarnings),
      freshnessWarnings: jsonInput(health.freshnessWarnings),
      lastSyncAt: parseDate(health.lastSyncAt),
      nextSyncAt: parseDate(health.nextSyncAt)
    }
  });
}

export async function recordLifecycleConnectorAuditEvents(
  workspace: WorkspaceRef,
  session: SessionRef,
  config: ConnectorConfigRef | null,
  events: LifecycleConnectorAuditEvent[],
  syncRunId?: string
) {
  if (events.length === 0) return { count: 0 };
  return db.lifecycleConnectorAuditEvent.createMany({
    data: events.map((event) => ({
      workspaceId: workspace.id,
      accountUserId: session.userId,
      connectorConfigId: config?.id,
      syncRunId,
      provider: event.provider,
      eventType: event.eventType,
      objectKey: event.objectKey,
      idempotencyKey: event.idempotencyKey,
      metadata: jsonInput(event.metadata),
      occurredAt: parseDate(event.occurredAt) ?? new Date()
    }))
  });
}

export function connectorActionAuditEvent(
  provider: LifecycleConnectorProvider,
  eventType: LifecycleConnectorAuditEvent["eventType"],
  metadata: Record<string, unknown>,
  objectKey?: LifecycleObjectKey,
  idempotencyKey?: string
): LifecycleConnectorAuditEvent {
  return {
    provider,
    eventType,
    objectKey,
    idempotencyKey,
    metadata,
    occurredAt: new Date().toISOString()
  };
}

export async function recordLifecycleConnectorSyncRun(
  workspace: WorkspaceRef,
  session: SessionRef,
  config: ConnectorConfigRef,
  provider: LifecycleConnectorProvider,
  action: "syncDryRun" | "testSend" | "observe",
  result: LifecycleSyncResult | LifecycleObservationResult | {
    idempotencyKey?: string;
    status?: string;
    warnings?: string[];
    auditEvents?: LifecycleConnectorAuditEvent[];
  },
  options: {
    objectKeys?: LifecycleObjectKey[];
    idempotencyKey?: string;
    cursor?: string;
    metadata?: Record<string, unknown>;
  } = {}
) {
  const syncResult = "normalizedCounts" in result ? result : null;
  const observationResult = "events" in result ? result : null;
  const warnings = "warnings" in result ? result.warnings : [];
  const run = await db.lifecycleConnectorSyncRun.create({
    data: {
      workspaceId: workspace.id,
      accountUserId: session.userId,
      connectorConfigId: config.id,
      provider,
      action,
      status: "status" in result && result.status ? result.status : "completed",
      idempotencyKey: options.idempotencyKey ?? ("idempotencyKey" in result ? result.idempotencyKey : undefined),
      cursor: options.cursor ?? ("cursor" in result ? result.cursor : undefined),
      objectKeys: options.objectKeys ?? [],
      normalizedCounts: syncResult?.normalizedCounts ? jsonInput(syncResult.normalizedCounts) : undefined,
      rejectedRows: syncResult?.rejectedRows ?? 0,
      warnings: jsonInput(warnings),
      metadata: jsonInput({
        ...(options.metadata ?? {}),
        observedEvents: observationResult?.events.length
      }),
      completedAt: new Date()
    }
  });
  await recordLifecycleConnectorAuditEvents(workspace, session, config, result.auditEvents ?? [], run.id);
  return run;
}
