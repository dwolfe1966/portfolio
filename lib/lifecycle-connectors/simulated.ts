import type {
  LifecycleConnectorCapability,
  LifecycleConnectorAuditEvent,
  LifecycleConnectorHealth,
  LifecycleConnectorKind,
  LifecycleConnectorProvider,
  LifecycleDeliveryConnector,
  LifecycleDeliveryRequest,
  LifecycleDeliveryResult,
  LifecycleDiscoveryResult,
  LifecycleObjectKey,
  LifecycleObservedEvent,
  LifecycleObservationConnector,
  LifecycleObservationRequest,
  LifecycleObservationResult,
  LifecyclePreviewRequest,
  LifecyclePreviewResult,
  LifecycleSourceConnector,
  LifecycleSourceObjectSchema,
  LifecycleSyncRequest,
  LifecycleSyncResult
} from "./types";

const BASE_TIME = "2026-05-07T12:00:00.000Z";

const SOURCE_ROWS: Record<LifecycleObjectKey, Record<string, unknown>[]> = {
  users: [
    {
      externalUserId: "usr_001",
      fullName: "Jordan Lee",
      email: "jordan@example.com",
      segment: "TRIAL",
      subscriptionStatus: "TRIALING",
      consentEmail: true,
      lastActiveAt: "2026-05-06"
    },
    {
      externalUserId: "usr_002",
      fullName: "Morgan Patel",
      email: "morgan@example.com",
      segment: "ACTIVE",
      subscriptionStatus: "ACTIVE",
      consentEmail: true,
      lastActiveAt: "2026-05-05"
    }
  ],
  entities: [
    {
      externalEntityId: "ent_001",
      name: "Acme Holdings",
      entityType: "business",
      city: "Austin",
      state: "TX",
      updatedAt: "2026-05-06"
    },
    {
      externalEntityId: "ent_002",
      name: "123 Main St",
      entityType: "property",
      city: "Denver",
      state: "CO",
      updatedAt: "2026-05-05"
    }
  ],
  interestEdges: [
    {
      externalEdgeId: "edge_001",
      userExternalId: "usr_001",
      entityExternalId: "ent_001",
      userEmail: "jordan@example.com",
      entityName: "Acme Holdings",
      interestScore: 0.84,
      source: "saved_search"
    },
    {
      externalEdgeId: "edge_002",
      userExternalId: "usr_002",
      entityExternalId: "ent_002",
      userEmail: "morgan@example.com",
      entityName: "123 Main St",
      interestScore: 0.67,
      source: "product_view"
    }
  ],
  events: [
    {
      externalEventId: "evt_001",
      entityExternalId: "ent_001",
      entityName: "Acme Holdings",
      changeType: "EMPLOYEE_RECORD_ADDED",
      deltaSummary: "A new employee record was added.",
      detectedAt: "2026-05-07"
    },
    {
      externalEventId: "evt_002",
      entityExternalId: "ent_002",
      entityName: "123 Main St",
      changeType: "LEGAL_RECORD_ADDED",
      deltaSummary: "A new legal record was detected.",
      detectedAt: "2026-05-06"
    }
  ],
  consent: [
    {
      externalConsentId: "consent_001",
      userExternalId: "usr_001",
      email: "jordan@example.com",
      channel: "email",
      allowed: true,
      source: "warehouse"
    },
    {
      externalConsentId: "consent_002",
      userExternalId: "usr_002",
      email: "morgan@example.com",
      channel: "email",
      allowed: true,
      source: "esp"
    }
  ],
  deliveryEvents: [],
  engagementEvents: [],
  conversionEvents: [],
  revenueEvents: []
};

const OBSERVED_EVENTS: LifecycleObservedEvent[] = [
  {
    eventId: "obs_delivery_001",
    eventType: "sent" as const,
    occurredAt: "2026-05-07T12:02:00.000Z",
    recipientEmail: "jordan@example.com",
    providerDeliveryId: "fake-delivery-001",
    messageId: "msg_001",
    metadata: { provider: "fake_esp" }
  },
  {
    eventId: "obs_engagement_001",
    eventType: "clicked" as const,
    occurredAt: "2026-05-07T12:07:00.000Z",
    recipientEmail: "jordan@example.com",
    providerDeliveryId: "fake-delivery-001",
    messageId: "msg_001",
    metadata: { url: "https://example.com/lifecycle/offer" }
  },
  {
    eventId: "obs_conversion_001",
    eventType: "converted" as const,
    occurredAt: "2026-05-07T12:18:00.000Z",
    userExternalId: "usr_001",
    recipientEmail: "jordan@example.com",
    providerDeliveryId: "fake-delivery-001",
    messageId: "msg_001",
    metadata: { conversionType: "activation" }
  },
  {
    eventId: "obs_revenue_001",
    eventType: "revenue" as const,
    occurredAt: "2026-05-07T12:19:00.000Z",
    userExternalId: "usr_001",
    recipientEmail: "jordan@example.com",
    providerDeliveryId: "fake-delivery-001",
    messageId: "msg_001",
    amountCents: 12900,
    metadata: { revenueType: "subscription_start" }
  }
];

export class FakeWarehouseConnector implements LifecycleSourceConnector {
  readonly provider: LifecycleConnectorProvider = "fake_warehouse";
  readonly kind: LifecycleConnectorKind = "warehouse";
  readonly capabilities: LifecycleConnectorCapability[] = [
    "read_users",
    "read_entities",
    "read_interest_edges",
    "read_events",
    "read_consent"
  ];

  async health(): Promise<LifecycleConnectorHealth> {
    return buildHealth(this.provider, this.kind, this.capabilities, "Lifecycle warehouse sandbox");
  }

  async discover(): Promise<LifecycleDiscoveryResult> {
    return {
      provider: this.provider,
      objects: [
        schema("users", "dw_users", "externalUserId", SOURCE_ROWS.users[0]),
        schema("entities", "dw_entities", "externalEntityId", SOURCE_ROWS.entities[0]),
        schema("interestEdges", "dw_interest_edges", "externalEdgeId", SOURCE_ROWS.interestEdges[0]),
        schema("events", "dw_lifecycle_events", "externalEventId", SOURCE_ROWS.events[0]),
        schema("consent", "dw_consent", "externalConsentId", SOURCE_ROWS.consent[0])
      ]
    };
  }

  async preview(request: LifecyclePreviewRequest): Promise<LifecyclePreviewResult> {
    return previewRows(request.objectKey, request.limit);
  }

  async sync(request: LifecycleSyncRequest): Promise<LifecycleSyncResult> {
    return syncRows(request, this.provider);
  }
}

export class FakeWebhookConnector implements LifecycleSourceConnector {
  readonly provider: LifecycleConnectorProvider = "fake_webhook";
  readonly kind: LifecycleConnectorKind = "webhook";
  readonly capabilities: LifecycleConnectorCapability[] = ["read_events"];

  async health(): Promise<LifecycleConnectorHealth> {
    return buildHealth(this.provider, this.kind, this.capabilities, "Lifecycle webhook sandbox");
  }

  async discover(): Promise<LifecycleDiscoveryResult> {
    return {
      provider: this.provider,
      objects: [schema("events", "lifecycle_event_webhook", "externalEventId", SOURCE_ROWS.events[0])]
    };
  }

  async preview(request: LifecyclePreviewRequest): Promise<LifecyclePreviewResult> {
    return previewRows(request.objectKey === "events" ? "events" : request.objectKey, request.limit);
  }

  async sync(request: LifecycleSyncRequest): Promise<LifecycleSyncResult> {
    const eventRequest = { ...request, objectKeys: request.objectKeys.filter((key) => key === "events") };
    return syncRows(eventRequest, this.provider);
  }
}

export class FakeEspConnector implements LifecycleDeliveryConnector, LifecycleObservationConnector {
  readonly provider: LifecycleConnectorProvider = "fake_esp";
  readonly kind: LifecycleConnectorKind = "esp";
  readonly capabilities: LifecycleConnectorCapability[] = [
    "send_message",
    "trigger_journey",
    "read_delivery_events",
    "read_engagement_events"
  ];

  async health(): Promise<LifecycleConnectorHealth> {
    return buildHealth(this.provider, this.kind, this.capabilities, "Lifecycle ESP sandbox");
  }

  async send(request: LifecycleDeliveryRequest): Promise<LifecycleDeliveryResult> {
    return deliveryResult("fake-esp", request);
  }

  async observe(request: LifecycleObservationRequest): Promise<LifecycleObservationResult> {
    return observeEvents(request, ["sent", "delivered", "opened", "clicked", "unsubscribed", "complained", "bounced"]);
  }
}

export class FakeSmtpConnector implements LifecycleDeliveryConnector {
  readonly provider: LifecycleConnectorProvider = "fake_smtp";
  readonly kind: LifecycleConnectorKind = "smtp";
  readonly capabilities: LifecycleConnectorCapability[] = ["send_message"];

  async health(): Promise<LifecycleConnectorHealth> {
    return buildHealth(
      this.provider,
      this.kind,
      this.capabilities,
      "Lifecycle SMTP sandbox",
      ["SMTP cannot read provider consent, templates, suppressions, or revenue outcomes."]
    );
  }

  async send(request: LifecycleDeliveryRequest): Promise<LifecycleDeliveryResult> {
    return deliveryResult("fake-smtp", request);
  }
}

export class FakeEngagementConnector implements LifecycleObservationConnector {
  readonly provider: LifecycleConnectorProvider = "fake_engagement";
  readonly kind: LifecycleConnectorKind = "engagement";
  readonly capabilities: LifecycleConnectorCapability[] = ["read_engagement_events"];

  async health(): Promise<LifecycleConnectorHealth> {
    return buildHealth(this.provider, this.kind, this.capabilities, "Lifecycle engagement sandbox");
  }

  async observe(request: LifecycleObservationRequest): Promise<LifecycleObservationResult> {
    return observeEvents(request, ["opened", "clicked", "visited", "replied"]);
  }
}

export class FakeConversionConnector implements LifecycleObservationConnector {
  readonly provider: LifecycleConnectorProvider = "fake_conversion";
  readonly kind: LifecycleConnectorKind = "conversion";
  readonly capabilities: LifecycleConnectorCapability[] = ["read_conversion_events", "read_revenue_events"];

  async health(): Promise<LifecycleConnectorHealth> {
    return buildHealth(this.provider, this.kind, this.capabilities, "Lifecycle conversion sandbox");
  }

  async observe(request: LifecycleObservationRequest): Promise<LifecycleObservationResult> {
    return observeEvents(request, ["converted", "revenue"]);
  }
}

function buildHealth(
  provider: LifecycleConnectorProvider,
  kind: LifecycleConnectorKind,
  capabilities: LifecycleConnectorCapability[],
  accountLabel: string,
  permissionWarnings: string[] = []
): LifecycleConnectorHealth {
  return {
    ok: true,
    provider,
    kind,
    accountLabel,
    capabilities,
    lastSyncAt: BASE_TIME,
    nextSyncAt: "2026-05-07T12:15:00.000Z",
    permissionWarnings,
    freshnessWarnings: []
  };
}

function schema(
  objectKey: LifecycleObjectKey,
  externalName: string,
  primaryKey: string,
  sample: Record<string, unknown> | undefined
): LifecycleSourceObjectSchema {
  return {
    objectKey,
    externalName,
    primaryKey,
    fields: Object.entries(sample ?? {}).map(([name, value]) => ({
      name,
      type: fieldType(value),
      nullable: value == null
    }))
  };
}

function fieldType(value: unknown): "string" | "number" | "date" | "boolean" | "json" {
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) return "date";
  if (typeof value === "string") return "string";
  return "json";
}

function previewRows(objectKey: LifecycleObjectKey, limit = 25): LifecyclePreviewResult {
  const rows = SOURCE_ROWS[objectKey] ?? [];
  return {
    objectKey,
    rows: rows.slice(0, Math.max(0, Math.min(limit, 100))),
    cursor: `${objectKey}:preview:${rows.length}`,
    rejectedRows: 0,
    warnings: []
  };
}

function syncRows(
  request: LifecycleSyncRequest,
  provider: LifecycleConnectorProvider
): LifecycleSyncResult {
  const normalizedCounts = Object.fromEntries(
    request.objectKeys.map((key) => [key, SOURCE_ROWS[key]?.length ?? 0])
  ) as Partial<Record<LifecycleObjectKey, number>>;
  return {
    cursor: `${request.idempotencyKey}:${request.objectKeys.join(",")}:synced`,
    normalizedCounts,
    rejectedRows: 0,
    warnings: request.objectKeys.length === 0 ? ["No lifecycle objects requested for sync."] : [],
    auditEvents: request.objectKeys.map((objectKey) => auditEvent(provider, "source.synced", {
      objectKey,
      idempotencyKey: request.idempotencyKey,
      metadata: { rows: SOURCE_ROWS[objectKey]?.length ?? 0 }
    }))
  };
}

function deliveryResult(prefix: string, request: LifecycleDeliveryRequest): LifecycleDeliveryResult {
  const blocked = request.mode === "production" && request.recipientEmail.endsWith("@example.com");
  const status = blocked ? "suppressed" : "accepted";
  return {
    providerDeliveryId: `${prefix}-${hashString(request.idempotencyKey).toString(16)}`,
    status,
    idempotencyKey: request.idempotencyKey,
    warnings: blocked ? ["Example-domain recipients are suppressed in fake production mode."] : [],
    auditEvents: [
      auditEvent(prefix === "fake-smtp" ? "fake_smtp" : "fake_esp", blocked ? "delivery.suppressed" : "delivery.accepted", {
        idempotencyKey: request.idempotencyKey,
        metadata: {
          messageId: request.messageId,
          mode: request.mode,
          recipientEmail: request.recipientEmail,
          status
        }
      })
    ]
  };
}

function observeEvents(
  request: LifecycleObservationRequest,
  eventTypes: Array<(typeof OBSERVED_EVENTS)[number]["eventType"]>
): LifecycleObservationResult {
  const sinceTime = Date.parse(request.since);
  const filtered = OBSERVED_EVENTS.filter((event) => {
    const occurredAt = Date.parse(event.occurredAt);
    return eventTypes.includes(event.eventType) && (Number.isNaN(sinceTime) || occurredAt >= sinceTime);
  });
  const limit = Math.max(0, Math.min(request.limit ?? filtered.length, 100));
  return {
    cursor: `${request.cursor ?? "start"}:${limit}:${filtered.length}`,
    events: filtered.slice(0, limit),
    warnings: Number.isNaN(sinceTime) ? ["Invalid since timestamp; returned available fake events."] : [],
    auditEvents: [
      auditEvent(resolveObservationProvider(eventTypes), "outcome.observed", {
        metadata: {
          eventTypes,
          returnedEvents: filtered.slice(0, limit).length,
          since: request.since
        }
      })
    ]
  };
}

function resolveObservationProvider(
  eventTypes: Array<LifecycleObservedEvent["eventType"]>
): "fake_esp" | "fake_engagement" | "fake_conversion" {
  if (eventTypes.includes("converted") || eventTypes.includes("revenue")) return "fake_conversion";
  if (eventTypes.includes("sent") || eventTypes.includes("delivered") || eventTypes.includes("bounced")) return "fake_esp";
  return "fake_engagement";
}

function auditEvent(
  provider: LifecycleConnectorAuditEvent["provider"],
  eventType: LifecycleConnectorAuditEvent["eventType"],
  options: {
    idempotencyKey?: string;
    objectKey?: LifecycleObjectKey;
    metadata?: Record<string, unknown>;
  } = {}
): LifecycleConnectorAuditEvent {
  return {
    eventType,
    provider,
    occurredAt: BASE_TIME,
    idempotencyKey: options.idempotencyKey,
    objectKey: options.objectKey,
    metadata: options.metadata ?? {}
  };
}

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}
