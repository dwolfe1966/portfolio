import { NextRequest } from "next/server";
import { ACCOUNT_SESSION_COOKIE, verifyAccountSessionToken } from "@/lib/account-session";
import { apiError, apiOk, apiUnhandledError } from "@/lib/api-contract";
import {
  getLifecycleConnector,
  getLifecycleDeliveryConnector,
  getLifecycleObservationConnector,
  getLifecycleSourceConnector,
  type LifecycleConnectorProvider,
  type LifecycleObjectKey
} from "@/lib/lifecycle-connectors";
import {
  connectorActionAuditEvent,
  recordLifecycleConnectorAuditEvents,
  recordLifecycleConnectorHealth,
  recordLifecycleConnectorSyncRun,
  upsertLifecycleConnectorConfig
} from "@/lib/lifecycle-connectors/persistence";
import { buildLifecycleConnectorDiagnostics } from "@/lib/lifecycle-connectors/diagnostics";
import { createEventId } from "@/lib/logging";
import { getDefaultWorkspace } from "@/lib/workspace";

const providers = [
  "fake_warehouse",
  "fake_webhook",
  "fake_esp",
  "fake_smtp",
  "fake_engagement",
  "fake_conversion"
] as const satisfies LifecycleConnectorProvider[];

const sourceProviders = new Set<LifecycleConnectorProvider>(["fake_warehouse", "fake_webhook"]);
const deliveryProviders = new Set<LifecycleConnectorProvider>(["fake_esp", "fake_smtp"]);
const observationProviders = new Set<LifecycleConnectorProvider>(["fake_esp", "fake_engagement", "fake_conversion"]);
const objectKeys = new Set<LifecycleObjectKey>([
  "users",
  "entities",
  "interestEdges",
  "events",
  "consent",
  "deliveryEvents",
  "engagementEvents",
  "conversionEvents",
  "revenueEvents"
]);

function sessionFromRequest(request: NextRequest) {
  return verifyAccountSessionToken(request.cookies.get(ACCOUNT_SESSION_COOKIE)?.value);
}

function normalizeProvider(value: unknown): LifecycleConnectorProvider | null {
  return typeof value === "string" && providers.includes(value as LifecycleConnectorProvider)
    ? value as LifecycleConnectorProvider
    : null;
}

function normalizeObjectKey(value: unknown): LifecycleObjectKey | null {
  return typeof value === "string" && objectKeys.has(value as LifecycleObjectKey) ? value as LifecycleObjectKey : null;
}

function normalizeObjectKeys(value: unknown): LifecycleObjectKey[] {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeObjectKey).filter((item): item is LifecycleObjectKey => Boolean(item));
}

function clean(value: unknown, max = 200) {
  return String(value ?? "").trim().slice(0, max);
}

function positiveLimit(value: unknown, fallback = 5) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(1, Math.min(Math.floor(numeric), 25)) : fallback;
}

async function connectorSummary(provider: LifecycleConnectorProvider, workspace: { id: string }, session: { userId: string }) {
  const connector = getLifecycleConnector(provider);
  const health = await connector.health();
  const config = await upsertLifecycleConnectorConfig(workspace, session, connector);
  await recordLifecycleConnectorHealth(workspace, config, health);
  const discovery = sourceProviders.has(provider)
    ? await getLifecycleSourceConnector(provider as "fake_warehouse" | "fake_webhook").discover()
    : null;
  const diagnostics = buildLifecycleConnectorDiagnostics({
    health,
    configuredStatus: config.status,
    credentialGrantId: config.credentialGrantId
  });
  return {
    provider,
    config: { id: config.id, status: config.status, credentialGrantId: config.credentialGrantId },
    kind: connector.kind,
    capabilities: connector.capabilities,
    health,
    diagnostics,
    discovery
  };
}

export async function GET(request: NextRequest) {
  const eventId = createEventId("workspace_lifecycle_connectors_get");
  const session = sessionFromRequest(request);
  if (!session) {
    return apiError(401, "AUTH_REQUIRED", "Sign in to inspect lifecycle connector health.", { eventId });
  }

  try {
    const workspace = await getDefaultWorkspace();
    const connectors = await Promise.all(providers.map((provider) => connectorSummary(provider, workspace, session)));
    return apiOk({
      eventId,
      account: { userId: session.userId, email: session.email },
      workspace: { id: workspace.id, name: workspace.name, slug: workspace.slug },
      connectors
    });
  } catch (error) {
    return apiUnhandledError(error, eventId);
  }
}

export async function POST(request: NextRequest) {
  const eventId = createEventId("workspace_lifecycle_connectors_post");
  const session = sessionFromRequest(request);
  if (!session) {
    return apiError(401, "AUTH_REQUIRED", "Sign in to use lifecycle connector actions.", { eventId });
  }

  const body = await request.json().catch(() => ({}));
  const action = clean(body.action, 40);
  const provider = normalizeProvider(body.provider);
  if (!provider) return apiError(400, "VALIDATION_ERROR", "A valid lifecycle connector provider is required.", { eventId });

  try {
    const workspace = await getDefaultWorkspace();
    const baseConnector = getLifecycleConnector(provider);
    const config = await upsertLifecycleConnectorConfig(workspace, session, baseConnector);
    const health = await baseConnector.health();
    await recordLifecycleConnectorHealth(workspace, config, health);

    if (action === "preview") {
      if (!sourceProviders.has(provider)) return apiError(400, "UNSUPPORTED_ACTION", "Preview requires a source connector.", { eventId });
      const objectKey = normalizeObjectKey(body.objectKey) ?? "users";
      const connector = getLifecycleSourceConnector(provider as "fake_warehouse" | "fake_webhook");
      const preview = await connector.preview({ objectKey, limit: positiveLimit(body.limit) });
      await recordLifecycleConnectorAuditEvents(workspace, session, config, [
        connectorActionAuditEvent(provider, "source.previewed", {
          returnedRows: preview.rows.length,
          rejectedRows: preview.rejectedRows,
          cursor: preview.cursor
        }, objectKey)
      ]);
      return apiOk({ eventId, workspace: { id: workspace.id }, provider, preview });
    }

    if (action === "syncDryRun") {
      if (!sourceProviders.has(provider)) return apiError(400, "UNSUPPORTED_ACTION", "Sync dry-run requires a source connector.", { eventId });
      const objectKeys = normalizeObjectKeys(body.objectKeys);
      const requestedObjectKeys = objectKeys.length > 0 ? objectKeys : ["users", "entities", "interestEdges", "events", "consent"] as const;
      const idempotencyKey = clean(body.idempotencyKey, 120) || `${workspace.id}:${provider}:dry-run`;
      const connector = getLifecycleSourceConnector(provider as "fake_warehouse" | "fake_webhook");
      const result = await connector.sync({
        objectKeys: [...requestedObjectKeys],
        cursor: clean(body.cursor, 120) || undefined,
        idempotencyKey
      });
      await recordLifecycleConnectorSyncRun(workspace, session, config, provider, "syncDryRun", result, {
        objectKeys: [...requestedObjectKeys],
        idempotencyKey,
        cursor: result.cursor
      });
      return apiOk({ eventId, workspace: { id: workspace.id }, provider, result });
    }

    if (action === "testSend") {
      if (!deliveryProviders.has(provider)) return apiError(400, "UNSUPPORTED_ACTION", "Test send requires a delivery connector.", { eventId });
      const connector = getLifecycleDeliveryConnector(provider as "fake_esp" | "fake_smtp");
      const idempotencyKey = clean(body.idempotencyKey, 120) || `${workspace.id}:${provider}:test-send`;
      const result = await connector.send({
        workspaceId: workspace.id,
        messageId: clean(body.messageId, 120) || "connector-lab-message",
        recipientEmail: clean(body.recipientEmail, 180) || session.email,
        subject: clean(body.subject, 120) || "Lifecycle connector test",
        bodyText: clean(body.bodyText, 2000) || "A lifecycle connector test message.",
        idempotencyKey,
        mode: body.mode === "production" ? "production" : "test"
      });
      await recordLifecycleConnectorSyncRun(workspace, session, config, provider, "testSend", result, {
        idempotencyKey,
        metadata: { providerDeliveryId: result.providerDeliveryId, status: result.status }
      });
      return apiOk({ eventId, workspace: { id: workspace.id }, provider, result });
    }

    if (action === "observe") {
      if (!observationProviders.has(provider)) return apiError(400, "UNSUPPORTED_ACTION", "Observation preview requires an observation connector.", { eventId });
      const connector = getLifecycleObservationConnector(provider as "fake_esp" | "fake_engagement" | "fake_conversion");
      const result = await connector.observe({
        since: clean(body.since, 80) || "2026-05-07T12:00:00.000Z",
        cursor: clean(body.cursor, 120) || undefined,
        limit: positiveLimit(body.limit, 10)
      });
      await recordLifecycleConnectorSyncRun(workspace, session, config, provider, "observe", result, {
        cursor: result.cursor,
        metadata: { returnedEvents: result.events.length }
      });
      return apiOk({ eventId, workspace: { id: workspace.id }, provider, result });
    }

    return apiError(400, "UNSUPPORTED_ACTION", "Unsupported lifecycle connector action.", { eventId });
  } catch (error) {
    return apiUnhandledError(error, eventId);
  }
}
