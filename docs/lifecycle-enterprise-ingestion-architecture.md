# Lifecycle Enterprise Data Ingestion Architecture

Last updated: 2026-05-07

This note defines L2: how the Lifecycle tool should ingest enterprise data from warehouses, CRMs, product analytics, webhooks, object stores, reverse ETL tools, and event streams.

It builds on [`docs/lifecycle-production-integration-architecture.md`](./lifecycle-production-integration-architecture.md). L2 covers inbound data only. Outbound ESP/SMTP delivery remains L3.

## Goal

Enterprise ingestion should let a customer connect existing systems and produce normalized Lifecycle inputs without bespoke code for every customer. The ingestion layer should:

- support batch, incremental, streaming, and hybrid sync modes;
- map external source fields into Lifecycle users, entities, interest edges, change events, and consent metadata;
- preserve raw source provenance and cursor state;
- validate data before it affects tool tables or agent decisions;
- create normalized workspace dataset snapshots for replay and audit;
- expose sync health, row counts, freshness, rejected rows, and dead-letter records.

## Source Types

| Source type | Examples | Best for | Ingestion mode |
|---|---|---|---|
| Warehouse | Snowflake, BigQuery, Redshift, Databricks, Postgres replica | canonical customer/account/event tables | scheduled query, incremental cursor |
| CRM | Salesforce, HubSpot, Pipedrive | account, contact, lifecycle stage, owner, deal events | API polling, webhook where available |
| Product analytics | Segment, Amplitude, Mixpanel, RudderStack | product events, traits, user/account activity | export API, webhook, stream |
| Object store | S3, GCS, Azure Blob | flat files, partner exports, data science outputs | object listing, manifest, file version |
| Reverse ETL | Hightouch, Census, RudderStack | prepared audience tables and computed attributes | destination table/API push |
| Webhook | customer apps, partner systems, billing events | near-real-time deltas | signed HTTP events |
| Event stream | Kafka, Kinesis, Pub/Sub, SQS/SNS | high-volume behavioral or entity changes | consumer group, checkpoint cursor |

## Normalized Lifecycle Objects

All sources must map into the existing Lifecycle import contract:

- `users`: reachable people or account users eligible for scoring.
- `entities`: companies, people, properties, products, accounts, or objects that can experience meaningful changes.
- `interestEdges`: evidence that a user has a relationship to an entity.
- `changeEvents`: detected events or deltas that may trigger lifecycle action.

Production ingestion should add metadata around these objects before expanding the core app schema:

- external source ids;
- source system and source table/topic/object;
- source cursor or version;
- observed time and ingested time;
- consent, suppression, region, and channel eligibility hints;
- confidence score when identity/entity matching is probabilistic.

## Ingestion Connector Contract

```ts
type IngestionSourceKind =
  | "warehouse"
  | "crm"
  | "product_analytics"
  | "object_store"
  | "reverse_etl"
  | "webhook"
  | "event_stream";

type SyncMode = "full_refresh" | "incremental" | "streaming" | "hybrid";

type IngestionCursor = {
  kind: "timestamp" | "offset" | "page_token" | "object_version" | "composite";
  value: string;
};

type IngestionBatchSummary = {
  sourceConfigId: string;
  workspaceId: string;
  kind: IngestionSourceKind;
  syncMode: SyncMode;
  startedAt: string;
  completedAt?: string;
  cursorBefore?: IngestionCursor;
  cursorAfter?: IngestionCursor;
  sourceRowsRead: number;
  normalizedRowsWritten: number;
  rejectedRows: number;
  deadLetterRows: number;
  freshnessLagSeconds?: number;
};
```

Every connector should support:

- `healthCheck`: verifies credentials, permissions, reachable source, and expected schema.
- `discoverSchema`: lists available tables, fields, event names, or object manifests.
- `preview`: fetches bounded sample rows for mapping.
- `validateMapping`: checks required Lifecycle fields and type coercions.
- `sync`: produces normalized rows and cursor state.
- `replay`: re-runs a prior source version/cursor window for debugging.

## Sync Modes

### Full Refresh

Use for low-volume tables or first setup. The connector reads all rows in scope, normalizes them, and creates a complete snapshot. Full refresh jobs should be capped and chunked so large customer tables do not block other jobs.

### Incremental

Use when source records have `updated_at`, CDC sequence, page token, or monotonic id. Incremental sync should save both cursor-before and cursor-after. If a job fails after partial write, retry must resume safely without duplicate normalized events.

### Streaming

Use for webhooks and event streams. Streaming ingestion should acknowledge only after validation and durable queue write. Bad records go to dead-letter storage with enough context to repair and replay.

### Hybrid

Use for production lifecycle programs: scheduled full or incremental refresh for identity/consent/account state, plus streaming events for triggers. Agent scoring should only execute when both event data and identity/consent data are fresh enough for policy.

## Mapping And Validation

Mapping should be explicit and versioned. A source config should store:

- source provider and source kind;
- object mappings for users, entities, interest edges, and change events;
- field-level transforms and enum normalization;
- required field coverage;
- validation policy version;
- sample preview rows and last validation result;
- owner, workspace, visibility, and credential grant.

Validation should reject or quarantine rows when:

- required identifiers are missing;
- email/hash/customer id is malformed;
- event timestamp is invalid or outside allowed bounds;
- entity references cannot be resolved;
- consent or suppression state is missing for send-eligible rows;
- duplicate event id appears inside the same idempotency window;
- row exceeds payload or metadata limits.

Rejected rows should not disappear. They should be counted, sampled in the UI, and stored with redacted/raw metadata for repair.

## Idempotency And Replay

Ingestion must be replayable because performance-based revenue work depends on defensible measurement.

Use stable idempotency keys:

- source row: `workspaceId + sourceConfigId + sourceObject + externalId + sourceVersion`
- event: `workspaceId + sourceConfigId + eventType + externalEventId`
- file: `workspaceId + sourceConfigId + objectKey + objectVersion + rowNumber`
- webhook: `workspaceId + sourceConfigId + providerEventId`

Replay must not double-trigger messages. Replayed data can update normalized snapshots and diagnostics, but agent action jobs should require a separate explicit replay mode before scoring or sending.

## Job Pipeline

1. Schedule or receive trigger.
2. Load workspace, source config, credential grant, and mapping version.
3. Run connector health and permission check.
4. Read source rows/events in bounded chunks.
5. Normalize into Lifecycle object rows.
6. Validate rows and route failures to rejected/dead-letter storage.
7. Create a normalized workspace dataset snapshot.
8. Advance cursor only after durable write.
9. Emit audit event and health metrics.
10. Optionally enqueue downstream identity/consent resolution and scoring.

The connector should never mutate active product tables directly. It writes a normalized snapshot first; the existing app selection/import path can apply that snapshot into the Lifecycle tool.

## Freshness And Health

Customer-visible health should answer:

- Is the source connected?
- Does the credential still have required permissions?
- When did sync last start and complete?
- How stale is the data relative to policy?
- How many rows were read, normalized, rejected, and dead-lettered?
- Which required Lifecycle objects are available?
- Which mappings are missing or degraded?
- What cursor/version is currently active?

Suggested states:

- `healthy`: sync completed, freshness inside policy, no blocking validation errors.
- `degraded`: sync works but freshness, schema drift, or rejected row rate needs attention.
- `blocked`: credentials, permissions, schema, or validation prevent use.
- `paused`: customer or operator intentionally disabled sync.

## Security And Privacy

Minimum controls:

- encrypt credentials and store only credential grants on source configs;
- redact raw payloads in logs;
- hash or tokenize sensitive identifiers where raw value is not needed;
- separate dead-letter visibility from normal analyst visibility;
- enforce workspace membership before previewing source rows;
- allow customer-configured PII retention for raw previews and dead letters;
- record source access in workspace audit events.

## Implementation Sequence

1. Add generalized `WorkspaceSourceConfig` concept or extend current mapping presets with source kind, provider, sync mode, cursor, health, and visibility metadata.
2. Add fake warehouse, webhook, and object-store connectors for tests.
3. Add schema discovery and preview API around the connector contract.
4. Add mapping validation using the current `TOOL_IMPORT_SCHEMAS` lifecycle object definitions.
5. Add durable ingestion job records with cursor, row counts, status, and retry metadata.
6. Add rejected/dead-letter row storage with redaction policy.
7. Add snapshot creation from normalized ingestion output.
8. Add workspace UI for source health, cursor, rejected rows, and replay.
9. Add provider-specific first connector after the fake connector tests stabilize.

## First Provider Recommendation

Start with one warehouse-style connector and one webhook-style connector:

- Warehouse: Postgres read-only connection or BigQuery service account, because query/cursor semantics are easy to validate locally.
- Webhook: signed HTTP endpoint with JSON schema validation, because it proves near-real-time event ingestion without depending on a specific vendor.

Do not start with every CRM and warehouse at once. The durable ingestion contract, mapping validation, idempotency, and dead-letter handling are the hard parts.

## Open Decisions

- Whether source configs should become a new table or remain an evolution of lifecycle mapping presets.
- Which first real warehouse connector should ship: Postgres, BigQuery, or Snowflake.
- Whether webhooks should accept customer-defined JSON schemas or require mapping through discovered sample payloads.
- How much raw source data can be retained for debugging under customer privacy requirements.
- Whether reverse ETL should push into our API or write into customer-owned staging tables that we read.
- How source freshness should block downstream agent scoring for different lifecycle program types.
