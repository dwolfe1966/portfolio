# Performance Operating Packages

Last updated: 2026-05-07

This document defines operating packages for performance-based customer engagements. The packages give customers a clear path from analysis to controlled execution while tying agent autonomy to evidence quality, policy maturity, and customer approval.

## Package Principle

Operating mode should be earned, not assumed. A customer can start with measurement and recommendations, then graduate to execution only when onboarding, source quality, policy controls, and audit evidence are strong enough.

The package ladder is:

1. Audit-only.
2. Recommendation-only.
3. Human-approved execution.
4. Agent-managed execution.

The system should support moving forward or backward between packages. Data-quality degradation, emergency stops, policy breaches, or customer concern should automatically downgrade the operating mode until reviewed.

## Package Summary

| Package | Customer promise | Agent authority | Billing posture |
|---|---|---|---|
| Audit-only | Show opportunity size and measurement readiness. | Observe and report only. | Setup fee, audit fee, or no performance fee. |
| Recommendation-only | Diagnose and propose revenue actions. | Generate recommendations and expected impact. | Advisory fee or manually approved success fee. |
| Human-approved execution | Apply approved actions with audit and rollback. | Execute only after customer approval and policy pass. | Eligible for performance fee after evidence gates pass. |
| Agent-managed execution | Operate low-risk actions inside caps. | Execute approved action classes without per-action approval. | Eligible for performance fee with tighter audit, caps, and clawbacks. |

## Package 1: Audit-Only

Audit-only is the safest entry package. It answers whether the customer has enough data, access, and economic signal to justify deeper operation.

Allowed behavior:

- connect source systems with read permissions;
- ingest historical data and current performance;
- map objects, validate quality, and expose rejected rows;
- build baselines and opportunity sizing;
- report source health, measurement gaps, and commercial readiness;
- simulate policy outcomes without recommending live actions.

Not allowed:

- write to ESPs, ad platforms, CRM, pricing systems, or customer workflows;
- send production messages;
- change budgets, bids, campaigns, audiences, offers, or prices;
- trigger automatic performance billing.

Entry requirements:

- workspace owner exists;
- data owner approves read access;
- at least one relevant historical source is connected or imported;
- customer accepts that results are diagnostic until billing-grade evidence exists.

Exit criteria:

- source coverage and baseline quality are rated;
- measurement gaps are documented;
- covered action classes and excluded populations are proposed;
- customer chooses whether to continue.

Best fit:

- new customer diligence;
- data-readiness audit;
- board or operator opportunity sizing;
- early partnership before legal or channel approvals are complete.

## Package 2: Recommendation-Only

Recommendation-only adds agent diagnosis and proposed actions without external writes.

Allowed behavior:

- run lifecycle, acquisition, pricing, retention, or expansion diagnosis;
- generate action recommendations with rationale, expected impact, and risk flags;
- draft lifecycle messages or paid-media changes for review;
- produce dry-run payloads where provider validation is available;
- estimate policy outcomes and approval requirements;
- track accepted, rejected, stale, and superseded recommendations.

Not allowed:

- apply provider writes;
- send customer-facing messages;
- submit creative or audience changes;
- create CRM tasks/opportunities unless the customer explicitly treats that as a non-execution workflow;
- auto-trigger performance billing without a separate approval record.

Entry requirements:

- audit-only exit criteria are met;
- baseline or control approach is selected;
- relevant source health is acceptable;
- policy draft exists for action classes under recommendation;
- operator approver is assigned.

Exit criteria:

- recommendations have enough precision to be acted on;
- customer has reviewed at least one recommendation cycle;
- approval thresholds and write permissions are defined;
- dry-run output is understandable to customer operators.

Best fit:

- customers that want AI leverage but not automated operations;
- teams still validating consent, brand, ad-platform, or finance rules;
- accounts where measurement is useful but legal approval for execution is incomplete.

## Package 3: Human-Approved Execution

Human-approved execution allows external writes only after customer approval and policy gates pass.

Allowed behavior:

- queue approval requests for covered action classes;
- run provider dry-runs and show exact intended changes;
- send approved lifecycle messages or trigger approved ESP journeys;
- apply approved acquisition budget shifts, pauses/resumes, bid changes, creative drafts, or audience syncs;
- create approved CRM/CS tasks or opportunities;
- monitor outcome windows and reversal conditions;
- roll back approved reversible changes when policy requires it.

Not allowed:

- execute high-risk actions without approval;
- exceed spend, frequency, price, margin, geography, consent, or protected-list constraints;
- broaden action classes without a package or policy update;
- charge performance fees for actions missing billing-grade evidence.

Entry requirements:

- onboarding launch readiness is complete;
- relevant credential grants include approved write scopes;
- policy version and approval thresholds are active;
- baseline/control method is frozen;
- audit events and idempotency are available for the action class;
- customer has named approval owners and response SLAs.

Exit criteria:

- at least one measurement period completes without material source, consent, policy, or billing defects;
- rollback and emergency stop are tested or manually verified;
- customer accepts automated action caps for specific low-risk actions;
- finance owner accepts payout-period evidence quality.

Best fit:

- first production performance engagement;
- regulated or brand-sensitive customer;
- high-spend acquisition account;
- lifecycle programs with deliverability or consent sensitivity.

## Package 4: Agent-Managed Execution

Agent-managed execution allows the system to apply low-risk covered actions inside explicit caps without per-action approval.

Allowed behavior:

- auto-apply covered low-risk actions that pass policy gates;
- pause or reduce wasteful acquisition spend inside caps;
- shift bounded budgets between approved cells;
- send or trigger approved lifecycle programs for eligible users;
- execute predefined CRM/CS workflow updates;
- monitor reversal conditions and apply approved rollback actions;
- continue reporting every action, reason, policy decision, and revenue outcome.

Still approval-required:

- new action classes;
- new providers or source systems;
- new customer-facing templates or creative families when policy requires review;
- spend increases above threshold;
- protected campaign/account changes;
- price, offer, or discount changes above approved bands;
- low-confidence, low-sample, or missing-quality actions;
- any action during degraded connector health or emergency stop.

Entry requirements:

- human-approved execution exit criteria are met;
- low-risk action classes are explicitly listed;
- caps are configured for spend, send volume, frequency, margin, and rollback;
- emergency stop is tested and owner-visible;
- customer accepts clawback and dispute process;
- source health and measurement evidence meet contract thresholds.

Downgrade triggers:

- emergency stop;
- degraded source freshness or credential health;
- missing conversion quality or billing evidence;
- policy breach or repeated near-breach;
- elevated spam complaints, unsubscribes, fraud, refunds, or budget waste;
- rollback failure;
- customer dispute or finance hold;
- material contract or scope change.

Best fit:

- mature customer with stable data and policy;
- narrow reversible action class;
- clear economics and first-party conversion quality;
- customer comfortable trading approval friction for faster revenue operations.

## Package Transitions

Forward transitions require explicit evidence:

| From | To | Minimum evidence |
|---|---|---|
| Audit-only | Recommendation-only | Baseline/readiness report, mapped sources, known gaps, and action classes proposed. |
| Recommendation-only | Human-approved execution | Policy version, write credential grants, approval owners, dry-run output, and frozen measurement method. |
| Human-approved execution | Agent-managed execution | Clean measurement period, tested emergency stop, acceptable risk metrics, and customer approval of auto-action caps. |

Backward transitions can be automatic:

| Trigger | Downgrade to |
|---|---|
| Source freshness degraded | Recommendation-only or audit-only depending on write risk. |
| Credential write permission revoked | Recommendation-only. |
| Emergency stop active | Audit-only observation plus paused execution. |
| Measurement evidence incomplete | Recommendation-only for affected action classes. |
| Policy breach or rollback failure | Human-approved execution or paused. |
| Customer dispute | Human-approved execution or audit-only until resolved. |

Package transitions should be recorded with owner approvals, timestamp, reason, previous mode, next mode, and affected action classes.

## Package-Specific Reporting

Audit-only reports:

- data coverage;
- source freshness;
- baseline quality;
- measurement gaps;
- opportunity sizing;
- readiness checklist.

Recommendation-only reports:

- recommendations generated;
- expected impact;
- policy reasons;
- customer accept/reject decisions;
- dry-run evidence;
- blocked upside.

Human-approved execution reports:

- approvals requested and completed;
- writes applied;
- provider verification;
- rollback readiness;
- measured outcomes;
- payout-ready impact.

Agent-managed execution reports:

- automated actions applied;
- policy pass/fail reasons;
- cap utilization;
- reversals and rollbacks;
- blocked unsafe actions;
- billable impact and clawback exposure.

## Implementation Implications

The product should store operating package as structured workspace policy:

- current package by app and action class;
- allowed action classes and required approvals;
- transition history and owner approvals;
- package-specific caps and evidence thresholds;
- downgrade triggers;
- customer-visible mode indicator;
- billing eligibility by package and action class.

This makes agent autonomy inspectable and lets customers understand exactly when the product is observing, recommending, waiting for approval, or operating.
