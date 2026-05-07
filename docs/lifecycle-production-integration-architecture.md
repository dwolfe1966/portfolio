# Lifecycle Production Integration Architecture

Last updated: 2026-05-07

This note defines how the Lifecycle tool should move from account-owned imports and sample data into customer infrastructure where David Wolfe agents can detect lifecycle events, generate approved actions, and deliver messages through partner systems.

## Goal

Lifecycle should plug into a partner's infrastructure without forcing them into one data or messaging stack. The production system needs to:

- ingest customer, account, entity, event, and consent data from arbitrary systems;
- normalize those records into the Lifecycle tool schema;
- resolve identity safely across customer IDs, emails, hashed identifiers, accounts, and entities;
- score opportunities and generate messages under policy;
- deliver messages through the customer's ESP, marketing automation platform, or SMTP provider;
- observe outcomes, suppressions, bounces, unsubscribes, and revenue events;
- maintain a durable audit trail that supports approval, compliance, and performance-based fees.

The source-of-truth boundary matters: the Lifecycle app should not assume an ESP contains the complete customer graph. Users, entities, interest edges, and captured lifecycle events usually live in warehouses, CRMs, product databases, analytics tools, webhooks, object stores, or event streams. ESPs can enrich profile, suppression, campaign, and delivery state, but direct data connectors should be the primary path for customer users, entities, user-entity relationships, and event capture.

## Integration Layers

| Layer | Responsibility | Examples |
|---|---|---|
| Source ingestion | Pull or receive raw records and events. | Warehouse query, CRM export, webhook, S3/GCS file, reverse ETL sync, event stream. |
| Identity and consent | Resolve who can be contacted and through which channel. | Customer IDs, account IDs, hashed emails, opt-outs, geography, channel eligibility. |
| Lifecycle normalization | Convert raw records into users, entities, interest edges, and change events. | Current CSV/Sheets import schema becomes the canonical normalized contract. |
| Decision engine | Score opportunities and choose lifecycle action candidates. | Event detection, priority scoring, value thresholds, policy gates. |
| Content generation | Draft subject, body, landing copy, and rationale. | OpenAI generation plus deterministic prompt/context logging. |
| Approval and execution | Decide whether to send, queue approval, or suppress. | Human approval queue, policy auto-approval, holdout/control assignment. |
| Delivery connector | Send or schedule through the customer's channel provider. | Iterable, Braze, Klaviyo, Customer.io, HubSpot, Salesforce Marketing Cloud, Mailchimp, SMTP. |
| Observation | Read delivery, engagement, conversion, and revenue outcomes. | Sent, delivered, bounced, opened, clicked, purchased, unsubscribed, spam complaint. |
| Audit and measurement | Prove what happened and why. | Agent run, source snapshot, policy version, approval, message payload, delivery id, outcome attribution. |

## Connector Contract

Every production connector should implement the same lifecycle around health, permissions, sync, mutation, and audit.

```ts
type ConnectorKind =
  | "warehouse"
  | "crm"
  | "product_analytics"
  | "event_stream"
  | "object_store"
  | "reverse_etl"
  | "esp"
  | "smtp";

type ConnectorCapability =
  | "read_users"
  | "read_entities"
  | "read_events"
  | "read_consent"
  | "write_profile"
  | "send_message"
  | "schedule_campaign"
  | "read_delivery_events"
  | "read_revenue_events";

type ConnectorHealth = {
  ok: boolean;
  provider: string;
  accountLabel: string;
  capabilities: ConnectorCapability[];
  lastSyncAt?: string;
  nextSyncAt?: string;
  permissionWarnings: string[];
};
```

Connector implementations must be idempotent, scoped to one workspace, and backed by a credential grant rather than raw session state. Mutating connectors must support dry-run or sandbox mode before production sends are enabled.

Use connector capabilities to separate source systems from delivery systems. `read_users`, `read_entities`, `read_events`, and `read_consent` belong primarily to data connectors. ESP connectors may expose `read_profile`, `read_suppressions`, or `read_delivery_events`, but those reads should not be treated as complete lifecycle source data unless the customer explicitly proves the ESP is their system of record.

## ESP And SMTP Requirements

ESP connectors need a common abstraction even though providers differ. The minimum contract:

- profile lookup/upsert by provider user id, customer id, email, or hashed email;
- list/segment membership read and optional write;
- template discovery when the customer wants to use existing templates;
- transactional or triggered send when the agent sends one message at a time;
- campaign or journey trigger when the customer wants the ESP to own orchestration;
- suppression, unsubscribe, bounce, and complaint reads;
- message/campaign event reads for delivery and engagement outcomes;
- provider delivery id returned for every send attempt;
- test-send support to internal seed recipients;
- rate-limit and retry behavior surfaced to the job queue.

ESP profile reads are auxiliary. They can confirm provider ids, template/journey state, suppressions, and message history, but lifecycle scoring should be driven by normalized users, entities, interest edges, and change events from direct data connectors.

SMTP should be treated as a lower-level delivery connector. It can send messages, but it cannot be assumed to know profile state, consent, templates, suppressions, or revenue outcomes. SMTP requires a stronger local suppression store and bounce processor.

## Data Ingestion Requirements

Lifecycle source ingestion should accept both batch and streaming models:

- Batch: CSV, Google Sheets, warehouse query, S3/GCS object, reverse ETL table.
- Incremental: webhook events, product analytics stream, CDC feed, queue/topic subscription.
- Hybrid: nightly full refresh plus near-real-time event deltas.

Each ingestion job should write:

- source config id;
- connector credential grant id;
- raw source cursor or object version;
- normalized row counts;
- rejected row counts and validation errors;
- schema mapping version;
- workspace id and actor/service-agent id.

The current workspace dataset snapshot model should remain useful: each successful production import creates a normalized snapshot before it mutates tool tables or feeds agent scoring.

## Identity And Consent

Production lifecycle execution must fail closed when identity or consent is ambiguous.

Required checks:

- canonical person/account identity is resolved;
- email or channel address is valid and not suppressed;
- user is eligible for the message channel and geography;
- customer opt-out state and provider suppression state agree, or the stricter state wins;
- source event is recent enough and belongs to the resolved user/entity relationship;
- dedupe prevents repeated sends for the same event/action window;
- holdout/control assignment is applied before delivery.

The normalized lifecycle user should eventually include external ids and consent fields, but the first production step can keep those in metadata while policy code matures.

## Agent Runbook

The production David Wolfe lifecycle agent should run as a durable workflow:

1. Ingest source data or receive event.
2. Normalize records and create/import a workspace dataset snapshot.
3. Resolve identity, consent, eligibility, and dedupe window.
4. Score the opportunity using current lifecycle policy.
5. Generate message draft and rationale.
6. Apply policy gate: suppress, queue approval, test-send, or auto-send.
7. Deliver through ESP/SMTP connector with idempotency key.
8. Record delivery id, provider response, and audit event.
9. Observe delivery, engagement, conversion, unsubscribe, and revenue events.
10. Attribute outcomes against holdout/control and update performance reporting.

Every step needs retry metadata and a stable idempotency key so a failed job cannot double-send.

## Policy Gates

Minimum production gates before any send:

- workspace send enabled;
- connector health ok;
- approved channel and provider;
- valid consent and suppression state;
- frequency cap not exceeded;
- event freshness inside allowed window;
- generated content passed required checks;
- holdout assignment resolved;
- customer policy allows auto-send for this action type, or approval is complete;
- kill switch not active.

High-risk categories should require approval even if lower-risk events can auto-send.

## Audit Events

Lifecycle production audit should record:

- `source.ingested`
- `dataset.normalized`
- `identity.resolved`
- `consent.checked`
- `candidate.scored`
- `message.generated`
- `approval.requested`
- `approval.completed`
- `delivery.test_sent`
- `delivery.sent`
- `delivery.suppressed`
- `delivery.failed`
- `outcome.observed`
- `revenue.attributed`

Each event should include workspace id, actor/service-agent id, connector id, credential grant id, policy id/version, dataset id, candidate id, provider delivery id when available, and a public event id for customer support.

## Implementation Sequence

1. Generalize source config metadata around provider, capability, auth state, sync status, and visibility.
2. Add lifecycle connector interfaces and fake provider implementations for ESP, SMTP, warehouse, and webhook.
3. Add durable ingestion jobs with idempotency, retries, and dead-letter review.
4. Add identity/consent policy helpers and tests.
5. Add suppression and frequency-cap tables.
6. Add delivery job and audit event tables.
7. Add approval queue and customer-visible policy controls.
8. Add provider-specific connectors, starting with one ESP and one SMTP provider.
9. Add outcome ingestion and performance measurement.

## Open Decisions

- Whether first production ESP should be Customer.io, Klaviyo, HubSpot, or Braze.
- Whether SMTP should be available before suppression/bounce processing is complete.
- Whether journey/campaign triggers should be preferred over one-off transactional sends.
- How holdout/control assignment should persist across multiple lifecycle programs.
- Which consent fields belong in normalized tables versus provider metadata.
- Whether revenue attribution should live in Lifecycle first or in the cross-tool performance business layer.
