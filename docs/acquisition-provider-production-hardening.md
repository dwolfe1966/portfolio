# Acquisition Provider Production Hardening

This note defines the S15 hardening path from provider dry-runs to production-safe acquisition writes. The current system can authenticate providers, browse Google Ads and Meta Ads objects, request approval from selected provider IDs, enqueue approved provider-write jobs, run provider-specific dry-run adapters, persist dry-run evidence, and create measurement handoffs without mutating ad accounts.

The next phase should keep mutation disabled by default and add the missing production controls in layers.

## Hardening Principles

- Real provider mutation remains opt-in by workspace, provider, account, and operation type.
- Dry-run evidence must exist before any mutation attempt.
- Provider writes must be idempotent, auditable, reversible when possible, and tied to an approval request.
- Operators need a clear preflight view of credentials, permissions, spend exposure, rollback support, and measurement readiness.
- Sandbox or test-account execution should prove one narrow write path before any live account write is allowed.

## S15 Work Items

| ID | Item | Acceptance criteria |
|---|---|---|
| L48 | Production provider hardening plan | Document the mutation-readiness sequence, enablement gates, rollback expectations, and sandbox-first rollout path. |
| L49 | Provider credential grant model | Persist workspace-scoped credential grants with provider, account scope, granted capabilities, token health, rotation metadata, test/live mode, and owner approval state. |
| L50 | Provider health and permission preflight | Add an operations preflight that checks credential availability, read permissions, mutate permissions, selected provider object existence, policy readiness, and measurement readiness before approval or execution. |
| L51 | Mutation enablement gates | Added a tested helper that blocks approved mutations unless workspace, provider, external account, operation type, credential mutation capability, dry-run status, approval status, rollback metadata, idempotency, measurement handoff, and emergency-stop state all pass. |
| L52 | Sandbox write adapter contract | Added an opt-in sandbox-only mutation adapter interface that can execute narrow reversible actions after mutation gates pass, returning provider operation ids, before/after evidence, and rollback metadata without live API mutation. |
| L53 | Rollback retention and review surface | Added durable rollback records with before-state, provider operation ids, retention window, reversal status, review decisions, and operator review visibility on provider dry-run detail pages. |
| L54 | Production write audit evidence | Extend audit export and activity views to include mutation enablement decisions, sandbox mutation attempts, provider operation ids, rollback records, and emergency-stop state. |

## Mutation Enablement Gates

Approved mutation should require all of the following:

- workspace execution mode is explicitly set to `sandbox_mutation` or `approved_mutation`;
- provider is enabled for the workspace;
- external account is enabled and matches the approval payload;
- operation type is enabled for that provider/account;
- credential grant is active, token health is valid, and mutation capability is present;
- approved mutation approval request exists and is not expired; dry-run-only approval is not enough;
- latest provider dry-run is ready, not blocked, and matches the approved payload;
- idempotency key is present and unused for a completed mutation;
- rollback support or an explicit no-rollback exception is recorded;
- emergency stop has been explicitly checked and is inactive;
- measurement handoff is configured for post-write observation.

## Sandbox-First Write Scope

The first write should be intentionally narrow:

- provider: simulated sandbox adapter first, then Google Ads or Meta Ads test/sandbox account only;
- operation: pause/resume or small budget update on a selected test campaign/ad set;
- precondition: approved request plus persisted ready dry-run;
- output: provider operation id, before/after state, rollback plan, measurement handoff, and activity/audit rows;
- failure behavior: no retries that could duplicate writes unless the idempotency key can prove provider-side no-op behavior.

## Open Decisions

- Whether production enablement should be controlled only in the database/admin console or through owner-facing workspace settings.
- Whether no-rollback exceptions are ever allowed for campaign creation or creative upload.
- Which provider and operation should be the first sandbox mutation target.
- Whether Microsoft Ads should be added before or after the first sandbox write.
