export type LifecycleConnectorProvider =
  | "fake_warehouse"
  | "fake_webhook"
  | "fake_esp"
  | "fake_smtp"
  | "fake_engagement"
  | "fake_conversion";

export type LifecycleConnectorKind =
  | "warehouse"
  | "webhook"
  | "esp"
  | "smtp"
  | "engagement"
  | "conversion";

export type LifecycleConnectorCapability =
  | "read_users"
  | "read_entities"
  | "read_interest_edges"
  | "read_events"
  | "read_consent"
  | "send_message"
  | "trigger_journey"
  | "read_delivery_events"
  | "read_engagement_events"
  | "read_conversion_events"
  | "read_revenue_events";

export type LifecycleObjectKey =
  | "users"
  | "entities"
  | "interestEdges"
  | "events"
  | "consent"
  | "deliveryEvents"
  | "engagementEvents"
  | "conversionEvents"
  | "revenueEvents";

export type LifecycleConnectorHealth = {
  ok: boolean;
  provider: LifecycleConnectorProvider;
  kind: LifecycleConnectorKind;
  accountLabel: string;
  capabilities: LifecycleConnectorCapability[];
  lastSyncAt?: string;
  nextSyncAt?: string;
  permissionWarnings: string[];
  freshnessWarnings: string[];
};

export type LifecycleConnectorAuditEvent = {
  eventType:
    | "source.discovered"
    | "source.previewed"
    | "source.synced"
    | "delivery.accepted"
    | "delivery.suppressed"
    | "delivery.failed"
    | "outcome.observed";
  provider: LifecycleConnectorProvider;
  occurredAt: string;
  idempotencyKey?: string;
  objectKey?: LifecycleObjectKey;
  metadata: Record<string, unknown>;
};

export type LifecycleSourceField = {
  name: string;
  type: "string" | "number" | "date" | "boolean" | "json";
  nullable: boolean;
};

export type LifecycleSourceObjectSchema = {
  objectKey: LifecycleObjectKey;
  externalName: string;
  fields: LifecycleSourceField[];
  primaryKey: string;
};

export type LifecycleDiscoveryResult = {
  provider: LifecycleConnectorProvider;
  objects: LifecycleSourceObjectSchema[];
};

export type LifecyclePreviewRequest = {
  objectKey: LifecycleObjectKey;
  limit?: number;
};

export type LifecyclePreviewResult = {
  objectKey: LifecycleObjectKey;
  rows: Record<string, unknown>[];
  cursor?: string;
  rejectedRows: number;
  warnings: string[];
};

export type LifecycleSyncRequest = {
  objectKeys: LifecycleObjectKey[];
  cursor?: string;
  idempotencyKey: string;
};

export type LifecycleSyncResult = {
  cursor: string;
  normalizedCounts: Partial<Record<LifecycleObjectKey, number>>;
  rejectedRows: number;
  warnings: string[];
  auditEvents: LifecycleConnectorAuditEvent[];
};

export type LifecycleDeliveryRequest = {
  workspaceId: string;
  messageId: string;
  recipientEmail: string;
  subject: string;
  bodyText: string;
  idempotencyKey: string;
  mode: "test" | "production";
};

export type LifecycleDeliveryResult = {
  providerDeliveryId: string;
  status: "accepted" | "sent" | "suppressed" | "failed";
  idempotencyKey: string;
  warnings: string[];
  auditEvents: LifecycleConnectorAuditEvent[];
};

export type LifecycleObservedEvent = {
  eventId: string;
  eventType:
    | "sent"
    | "delivered"
    | "opened"
    | "clicked"
    | "visited"
    | "replied"
    | "unsubscribed"
    | "complained"
    | "bounced"
    | "converted"
    | "revenue";
  occurredAt: string;
  userExternalId?: string;
  recipientEmail?: string;
  providerDeliveryId?: string;
  messageId?: string;
  amountCents?: number;
  metadata: Record<string, unknown>;
};

export type LifecycleObservationRequest = {
  since: string;
  cursor?: string;
  limit?: number;
};

export type LifecycleObservationResult = {
  cursor: string;
  events: LifecycleObservedEvent[];
  warnings: string[];
  auditEvents: LifecycleConnectorAuditEvent[];
};

export interface LifecycleConnector {
  readonly provider: LifecycleConnectorProvider;
  readonly kind: LifecycleConnectorKind;
  readonly capabilities: LifecycleConnectorCapability[];

  health(): Promise<LifecycleConnectorHealth>;
}

export interface LifecycleSourceConnector extends LifecycleConnector {
  discover(): Promise<LifecycleDiscoveryResult>;
  preview(request: LifecyclePreviewRequest): Promise<LifecyclePreviewResult>;
  sync(request: LifecycleSyncRequest): Promise<LifecycleSyncResult>;
}

export interface LifecycleDeliveryConnector extends LifecycleConnector {
  send(request: LifecycleDeliveryRequest): Promise<LifecycleDeliveryResult>;
}

export interface LifecycleObservationConnector extends LifecycleConnector {
  observe(request: LifecycleObservationRequest): Promise<LifecycleObservationResult>;
}
