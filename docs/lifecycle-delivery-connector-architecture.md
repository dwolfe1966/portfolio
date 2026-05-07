# Lifecycle Delivery Connector Architecture

Last updated: 2026-05-07

This note defines L3: outbound delivery connectors for SMTP and ESP campaign/message APIs. It covers sandboxing, test sends, production sends, scheduling, suppressions, bounces, unsubscribes, complaints, delivery event ingestion, idempotency, and provider health.

It builds on:

- [`docs/lifecycle-production-integration-architecture.md`](./lifecycle-production-integration-architecture.md)
- [`docs/lifecycle-enterprise-ingestion-architecture.md`](./lifecycle-enterprise-ingestion-architecture.md)

L3 is delivery infrastructure. Identity, consent, and channel eligibility policy are expanded in L4. Agent orchestration is expanded in L5.

## Goal

Lifecycle delivery connectors should let David Wolfe agents deliver customer-approved lifecycle messages through the customer's existing email infrastructure while preserving safety, observability, and auditability.

The delivery layer should:

- support ESP APIs and lower-level SMTP;
- validate provider permissions before send;
- support sandbox, dry-run, and test-send modes;
- send or schedule idempotently;
- collect provider delivery ids and status;
- sync suppressions, bounces, unsubscribes, spam complaints, and delivery events;
- expose delivery health and failure reasons;
- make every send replay-safe and audit-ready.

Delivery connectors are not the default source of lifecycle truth. They may read provider profiles, suppressions, templates, campaign state, and delivery events, but users, entities, interest edges, and captured business/product events should usually come from direct data connectors defined in L2. Treat ESP data as delivery/enrichment data unless the customer explicitly designates that provider as the system of record for a specific object class.

## Provider Types

| Provider type | Examples | Strengths | Constraints |
|---|---|---|---|
| ESP API | Braze, Iterable, Klaviyo, Customer.io, HubSpot, Salesforce Marketing Cloud, Mailchimp | profile state, templates, journeys, suppressions, campaign events | provider-specific APIs, auth scopes, rate limits, naming differences |
| Marketing automation | HubSpot, Marketo, Salesforce Marketing Cloud | CRM/marketing alignment, lists, workflow triggers | often opinionated around campaign/journey structure |
| Transactional email API | SendGrid, Mailgun, Postmark, Amazon SES API | reliable one-off sends and event webhooks | may not own lifecycle profile/consent model |
| SMTP | customer SMTP relay, SES SMTP, Google Workspace relay | broad compatibility, simple send contract | weak profile/suppression visibility, bounce processing must be local |

Prefer ESP APIs when the customer already uses an ESP for lifecycle marketing. Use SMTP only when the customer wants raw message delivery and accepts the added responsibility for local suppression, bounce, and unsubscribe handling.

Do not use "can read ESP profiles" as a substitute for proper user/entity/event ingestion. ESP profile reads are valuable for provider ids, list/topic state, and delivery eligibility, but they rarely include the full entity graph or all business events needed by the Lifecycle scoring model.

## Connector Capabilities

```ts
type DeliveryProviderKind = "esp_api" | "marketing_automation" | "transactional_api" | "smtp";

type DeliveryCapability =
  | "test_send"
  | "send_message"
  | "schedule_message"
  | "trigger_journey"
  | "read_templates"
  | "render_template"
  | "upsert_profile"
  | "read_profile"
  | "read_suppressions"
  | "write_suppression"
  | "read_delivery_events"
  | "receive_delivery_webhooks";

type DeliveryHealth = {
  ok: boolean;
  provider: string;
  providerKind: DeliveryProviderKind;
  accountLabel: string;
  fromDomains: string[];
  capabilities: DeliveryCapability[];
  permissionWarnings: string[];
  rateLimit?: {
    limit: number;
    remaining: number;
    resetAt?: string;
  };
};
```

Each provider implementation should report capability gaps explicitly. A connector that can send but cannot read suppressions is usable only if the workspace has a local suppression source configured.

## Delivery Payload Contract

```ts
type LifecycleDeliveryPayload = {
  workspaceId: string;
  candidateId: string;
  messageId: string;
  policyId: string;
  policyVersion: string;
  idempotencyKey: string;
  mode: "dry_run" | "test_send" | "sandbox" | "production";
  recipient: {
    email: string;
    externalUserId?: string;
    customerId?: string;
  };
  message: {
    subject: string;
    previewText?: string;
    htmlBody: string;
    textBody: string;
    landingUrl?: string;
  };
  sender: {
    fromEmail: string;
    fromName?: string;
    replyTo?: string;
  };
  providerOptions?: {
    templateId?: string;
    campaignId?: string;
    journeyId?: string;
    listId?: string;
    tags?: string[];
    scheduledAt?: string;
  };
  auditContext: {
    sourceDatasetId?: string;
    sourceConfigId?: string;
    approvalId?: string;
    holdoutAssignmentId?: string;
  };
};
```

The payload should be provider-neutral. Provider adapters translate it into a Braze campaign trigger, Customer.io transactional send, Klaviyo event/profile update, SendGrid send, or SMTP message.

## Send Modes

### Dry Run

Validates payload, policy prerequisites, provider permissions, sender identity, and template references without contacting recipients. Dry run can call provider validation endpoints where available but must not enqueue a message.

### Test Send

Sends the rendered message to internal seed recipients only. The original recipient should be visible in metadata but not used as the envelope recipient. Test sends should be available before production is enabled.

### Sandbox

Uses provider sandbox/test account behavior when available. Sandbox sends can exercise provider API paths but should not count as customer-facing sends or performance events.

### Production

Sends or schedules to the real recipient after L4 consent/policy gates and any required approval are complete.

## Sending Patterns

### One-Off Transactional Send

The agent sends a fully rendered subject/body payload through ESP API, transactional API, or SMTP. This is simplest for agent-generated personalized copy. It requires local content/audit storage.

### Template-Based Send

The agent supplies provider template variables and triggers an existing provider template. This works well when customers require brand-controlled templates. The connector must capture template id, variable payload, and rendered preview where available.

### Journey Or Campaign Trigger

The agent writes profile attributes/events or triggers a campaign/journey in the provider. The ESP owns final send timing and template logic. This gives the customer more ESP-native control but makes attribution and audit more dependent on provider event reads.

The architecture should support all three, but initial implementation should start with one-off test/prod sends plus provider event webhooks.

## Suppression, Bounce, And Unsubscribe Handling

Delivery connectors must never rely only on local state when the provider has stronger suppression knowledge.

Required suppression sources:

- local workspace suppression table;
- provider global suppressions;
- provider list-level unsubscribes where applicable;
- bounce and complaint events;
- customer-provided do-not-contact fields from L2 ingestion;
- manual operator suppressions.

Handling rules:

- Hard bounces add a channel-level suppression.
- Spam complaints add a channel-level suppression and mark sender/domain risk.
- Unsubscribes add list, topic, or global suppression depending on provider event semantics.
- Soft bounces update delivery health and retry policy but do not immediately suppress unless threshold is exceeded.
- Provider suppression state wins when it is stricter than local state.

SMTP requires local unsubscribe links, local suppression storage, and bounce mailbox/webhook processing before production sends should be enabled.

## Delivery Event Ingestion

Providers should emit or expose:

- accepted/queued;
- sent;
- delivered;
- deferred;
- bounced;
- opened;
- clicked;
- unsubscribed;
- spam complaint;
- dropped/suppressed;
- failed;
- converted/revenue event when provider supports it.

Each event should store:

- provider event id;
- provider delivery id;
- provider campaign/message/template id;
- normalized event type;
- event timestamp;
- raw provider payload with privacy redaction;
- workspace id;
- connector id;
- candidate/message id when resolvable;
- idempotency key.

Webhook handlers must verify signatures, reject stale timestamps, dedupe provider event ids, and route unknown payloads to dead-letter review.

## Idempotency And Retry

Every delivery attempt needs a stable idempotency key:

`workspaceId + candidateId + messageId + providerId + sendMode + approvedVersion`

Rules:

- Retry after network failure should not create a second send if the provider accepted the first request.
- Store provider request id and delivery id as soon as they are available.
- If provider does not support idempotency keys, the local delivery job must check for an accepted provider response before retrying.
- Production replay must require an explicit new approval or new message version.
- Test sends can be repeated but should be clearly marked as test events.

## Rate Limits And Backpressure

Delivery jobs should be queued with provider-aware backpressure:

- global workspace send cap;
- provider rate limit;
- per-domain send cap;
- campaign/program send cap;
- recipient frequency cap;
- retry-after support;
- dead-letter after bounded retry attempts.

Provider throttling should degrade the connector health state and pause auto-send when repeated.

## Required Audit Events

L3 should produce:

- `delivery.dry_run_completed`
- `delivery.test_sent`
- `delivery.sandbox_sent`
- `delivery.send_requested`
- `delivery.accepted`
- `delivery.scheduled`
- `delivery.suppressed`
- `delivery.failed`
- `delivery.event_received`
- `delivery.bounced`
- `delivery.unsubscribed`
- `delivery.complained`
- `delivery.retry_scheduled`
- `delivery.dead_lettered`

Audit events should include workspace id, actor/service-agent id, connector id, credential grant id, provider account label, delivery mode, idempotency key, candidate id, message id, policy id/version, approval id when present, and provider delivery id when available.

## Health And Diagnostics

Customer-visible delivery health should show:

- credential status and required scopes;
- sender/from-domain verification;
- template/campaign availability;
- provider rate-limit status;
- last successful test send;
- last production send;
- suppression sync status;
- bounce/unsubscribe webhook status;
- recent failure reasons;
- whether production sending is enabled, paused, or blocked.

Suggested states:

- `ready`: test send works, production prerequisites complete.
- `sandbox_only`: connector works but production send is disabled.
- `degraded`: sends work but event ingestion, suppressions, or rate limits need attention.
- `blocked`: credentials, sender verification, permission, or suppression sync prevents send.
- `paused`: customer/operator kill switch is active.

## Security And Compliance

Minimum controls:

- encrypted credentials;
- credential grants scoped by workspace and provider capability;
- provider webhook signature verification;
- raw payload redaction;
- sender domain allowlist;
- production kill switch;
- required unsubscribe link or provider-managed unsubscribe mechanism;
- audit export for delivery events;
- no production send from unapproved domains;
- no send if suppression sync is stale beyond policy.

## Implementation Sequence

1. Add delivery connector interfaces and fake ESP/SMTP providers.
2. Add delivery health check and sender-domain verification surfaces.
3. Add delivery job table with idempotency key, mode, status, provider request id, provider delivery id, retry metadata, and audit ids.
4. Add dry-run and test-send API paths.
5. Add local suppression table and suppression check helper.
6. Add provider webhook receiver contract with signature verification and dead-letter handling.
7. Add production send path behind explicit workspace kill switch and approval gate.
8. Add one transactional API provider before generic SMTP production send.
9. Add SMTP only after local unsubscribe and bounce handling are complete.

## First Provider Recommendation

Start with a transactional API provider or ESP API that has strong sandbox/test-send behavior and clear webhooks. Good first candidates:

- Customer.io transactional API if lifecycle/journey integration is the target.
- SendGrid or Postmark if one-off delivery and event webhook clarity are more important.
- HubSpot only if CRM/marketing automation alignment is the first customer requirement.

Do not start production sends with raw SMTP. SMTP is useful, but it pushes too much suppression and bounce responsibility into our app before those controls exist.

## Open Decisions

- First provider: Customer.io, SendGrid, Postmark, HubSpot, or Klaviyo.
- Whether template-based sends or fully rendered agent-generated sends should be the first production path.
- Whether customers must use provider-managed unsubscribe pages or our local preference center.
- Whether production sends require approval for every message at launch or only for high-risk categories.
- How long raw rendered message payloads should be retained.
- Whether delivery events should be visible on the existing lifecycle audit page or a new workspace delivery diagnostics page.
