# Lifecycle Production Integration Architecture

Last updated: 2026-05-07

This note defines how the Lifecycle tool should move from account-owned imports and sample data into customer infrastructure where David Wolfe agents can detect lifecycle events, generate approved actions, and deliver messages through partner systems.

The current implementation path is intentionally lifecycle-first. Lifecycle has the richest event, identity, consent, delivery, observation, and revenue-attribution requirements, so it is the right app to harden the control loop first. The shared platform pieces built here - durable jobs, approval requests, worker execution, queue allowlists, scheduler auth, operations visibility, retries, and dead-letter review - should remain app-shaped so they can be generalized across Acquisition, Pricing, Retention, Expansion, Auction, and platform agents after the lifecycle control loop is stable.

Generalization should happen by moving app-neutral contracts up, not by weakening lifecycle-specific controls. Shared agent platform contracts include job persistence, approval persistence, queue transition policy, batch worker execution, scheduler authentication, queue allowlists, operations visibility, and governance posture. Lifecycle should keep its own identity/consent, event freshness, holdout, delivery, suppression, and attribution rules.

The first non-lifecycle expansion target should be Acquisition provider-write execution. Acquisition already uses approval requests, policy gates, fake provider writes, and measurable spend/revenue outcomes. Its generalization path should keep `acquisition:provider_write` as the owned queue, start with simulated writes, graduate to real provider dry runs, and only then enable approved mutations once rollback metadata, idempotency keys, protected-campaign checks, cooldowns, and spend-impact measurement are present.

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
| Observation | Capture delivery, engagement, conversion, and revenue outcomes. | Sent, delivered, bounced, opened, clicked, visited, signed up, purchased, upgraded, unsubscribed, spam complaint. |
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
  | "read_engagement_events"
  | "read_conversion_events"
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

## Observation Requirements

Lifecycle must observe what happened after a message was sent. This observation layer has three distinct event classes:

- Delivery status: accepted, sent, delivered, deferred, bounced, dropped, suppressed, failed, spam complaint, unsubscribe.
- Message engagement: open, click, landing-page visit, reply, form submit, preference update.
- Conversion and revenue: signup, activation, purchase, subscription start, upgrade, renewal, retained account, expansion event, refund, cancellation.

ESPs are usually strong for delivery status and basic engagement. They are not always the source of truth for conversion or revenue. Conversion/revenue events should usually come from first-party product instrumentation, billing systems, commerce systems, CRM opportunity updates, warehouse tables, or webhook/event-stream connectors. Every observed event should attach back to workspace id, candidate/message id when available, provider delivery id when available, holdout/control assignment, and attribution window.

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

The first implementation bridge is the change-event trigger planner: a detected lifecycle event is evaluated against identity/consent policy, scored against the current threshold, assigned to the current lifecycle agent role, and converted into a durable execution plan. Fresh eligible events queue message-strategy jobs first; already drafted and approved events can advance to delivery-operator jobs. Suppressed, stale, unresolved, duplicate, or holdout events stop before queueing execution work.

In the current product surface, simulated lifecycle deltas and imported CSV/Google Sheets change events use that bridge immediately: every new or imported entity delta fans out to the top interested users for that entity, evaluates their identity/consent and score gates, and persists idempotent lifecycle generation jobs when the durable agent queue tables are present. If those tables are absent in a compatibility environment, the simulation or import still succeeds and reports that agent queue persistence was skipped.

Worker execution starts as a run-once, fake-safe executor. A protected workspace API can claim one queued job, dispatch it by app/job type, record a simulated result for non-mutating lifecycle/acquisition work, or return the job to retry/dead-letter handling when no executor is registered. This avoids background-process requirements during the first worker milestone while preserving the durable queue contract that a future scheduler or external worker will use.

The scheduler bridge uses the same worker path in bounded batches. A protected batch endpoint rotates across configured lifecycle/acquisition queues, drains up to a caller-provided maximum, stops after an idle pass through every queue, and accepts either an authenticated workspace session or a bearer token from `AGENT_WORKER_SECRET`/`CRON_SECRET`. The current Vercel deployment wiring registers that endpoint as a daily production cron through `vercel.json` so it remains deployable on Hobby-tier cron limits; external workers or higher-tier Vercel cron can call the same endpoint more frequently if the workload outgrows daily serverless cron.

Scheduled batch execution is constrained by an explicit lifecycle/acquisition queue allowlist. Caller-provided queue names are deduplicated and filtered before execution; disallowed queue names are reported in the batch result rather than claimed. If a caller explicitly supplies only disallowed queues, the worker returns a skipped-only no-op result instead of falling back to the default queue set. Batch requests that include skipped queues also emit a warning log with requested queue count, allowed queue count, and skipped names. This keeps scheduler and external-worker access narrow while making queue misconfiguration visible.

The workspace operations surface exposes the scheduled worker contract directly: cron cadence, endpoint, max batch size, queue coverage, and whether a worker bearer secret is configured. If no `CRON_SECRET` or `AGENT_WORKER_SECRET` is present, the surface shows a visible warning that scheduled cron calls will be rejected. It also includes a protected Run batch now control that executes the same bounded batch worker path as cron, giving operators a quick deployment-readiness check before relying on scheduled execution.

Workspace operators can also execute a queued job directly from the agent operations view. The control runs the same run-once worker against the job's queue, then refreshes job status and result/error state in the operations surface.

Completed worker results are intentionally summarized in the operations surface instead of dumping raw payloads. Operators see the executor, action, provider mutation mode, and summary text; failures expose error code/message and retry/dead-letter status. Full payload/audit export can remain a later administrative surface.

## Lifecycle Agent Roles

The lifecycle system should not be treated as one generic "message sending agent." It is a set of coordinated agents with different risk profiles and automation limits.

| Role | Queue | Owns | Automation mode | Output |
|---|---|---|---|---|
| Event watcher | `lifecycle:ingestion` | Detect or ingest source events. | Observe | Normalized change events, provenance, idempotency key. |
| Identity and consent resolver | `lifecycle:audit` | Resolve identity, consent, eligibility, dedupe, and holdout state. | Observe | Contactability decision and suppression reasons. |
| Opportunity scorer | `lifecycle:scoring` | Rank eligible lifecycle moments. | Recommend | Priority score, breakdown, action class. |
| Message strategist | `lifecycle:generation` | Draft copy, offer framing, and rationale. | Recommend | Message draft and evidence. |
| Approval coordinator | `lifecycle:audit` | Route high-risk actions to human review. | Human-approved | Approval request, expiry, approver role. |
| Delivery operator | `lifecycle:provider_write` | Execute approved or policy-allowed sends. | Human-approved initially | Provider write request, delivery id, audit event. |
| Outcome observer | `lifecycle:observation` | Watch delivery, engagement, conversion, and suppression events. | Observe | Outcome events and provider feedback. |
| Revenue attributor | `lifecycle:measurement` | Tie outcomes to holdout/control and performance reporting. | Observe | Attribution record and billing-grade evidence. |

At launch, only observation and recommendation roles should operate freely. The delivery operator should require explicit approval or a customer-approved auto-send policy for a narrow action class. Over time, low-risk lifecycle programs can graduate from human-approved execution to agent-managed execution once consent, frequency caps, delivery health, holdout assignment, and measurement are reliable.

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
5. Add event-trigger planning that turns normalized change events into role-owned execution plans.
6. Add suppression and frequency-cap tables.
7. Add delivery job and audit event tables.
8. Add approval queue and customer-visible policy controls.
9. Add provider-specific connectors, starting with one ESP and one SMTP provider.
10. Add outcome ingestion and performance measurement.

## Open Decisions

- Whether first production ESP should be Customer.io, Klaviyo, HubSpot, or Braze.
- Whether SMTP should be available before suppression/bounce processing is complete.
- Whether journey/campaign triggers should be preferred over one-off transactional sends.
- How holdout/control assignment should persist across multiple lifecycle programs.
- Which consent fields belong in normalized tables versus provider metadata.
- Whether revenue attribution should live in Lifecycle first or in the cross-tool performance business layer.
