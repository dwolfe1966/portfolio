# Performance Lifecycle Measurement Model

Last updated: 2026-05-07

This document defines measurement for performance-based Lifecycle engagements. It covers triggered users, messages sent, delivery and engagement, conversions, incremental revenue, unsubscribe/spam risk, holdout methodology, and the conditions under which Lifecycle impact can become billable.

## Measurement Principle

Lifecycle measurement should prove three things separately:

- eligibility: the user or account could legally and safely receive the action;
- execution: the system generated, approved, and delivered or suppressed the action as recorded;
- incrementality: the downstream conversion or revenue movement exceeded the agreed baseline or control.

Message activity alone is not performance. Opens, clicks, and replies are useful diagnostics, but performance fees should rely on eligible conversions or revenue from the agreed source of truth.

## Measurement Objects

| Object | Meaning | Source of truth |
|---|---|---|
| Trigger event | Product, entity, account, billing, CRM, or behavior change that can start a lifecycle opportunity. | Warehouse, CRM, product analytics, webhook, event stream, or approved import. |
| Eligible user | Resolved identity with valid channel address, consent, suppression clearance, geography eligibility, and current user/entity relationship. | Identity/consent gate plus customer source systems. |
| Candidate | Scored lifecycle opportunity before message generation or suppression. | Lifecycle decision engine. |
| Holdout assignment | Deterministic treatment/control assignment for eligible candidates. | Lifecycle policy layer. |
| Message | Generated or template-based communication with versioned subject/body/rationale. | Lifecycle generation/audit tables. |
| Delivery attempt | Dry run, test send, sandbox send, production send, suppression, or failed send. | Delivery connector and audit log. |
| Engagement event | Open, click, reply, landing-page visit, form submit, preference update. | ESP, web analytics, product analytics, or webhook. |
| Conversion event | Signup, activation, purchase, upgrade, renewal, retained account, expansion, or customer-defined value event. | First-party product, billing, CRM, commerce, or warehouse source. |
| Revenue event | Eligible conversion value, refund, cancellation, chargeback, expansion ARR, retained ARR, or other contracted value movement. | Billing, commerce, CRM, warehouse, or finance-approved source. |

## Funnel Metrics

Lifecycle reporting should show a complete funnel for each program, event type, segment, and measurement period.

Required counts:

- trigger events observed;
- trigger events deduped;
- identities resolved;
- identities unresolved;
- consent eligible;
- suppressed by opt-out, bounce, spam complaint, geography, channel, policy, stale event, frequency cap, or holdout;
- candidates scored;
- candidates above action threshold;
- messages generated;
- approvals requested;
- approvals completed;
- messages sent;
- messages delivered;
- delivery failures and bounces;
- opens, clicks, replies, visits, and form submits;
- conversions;
- eligible revenue events;
- refunds, cancellations, chargebacks, and clawbacks.

Every count should be explainable from audit events and source snapshots. Suppressed and blocked populations should be visible because they explain why opportunity volume did or did not translate into revenue.

## Core Rates

Recommended formulas:

```text
identity_resolution_rate = resolved_identities / trigger_events_deduped
consent_eligibility_rate = consent_eligible / resolved_identities
action_eligibility_rate = candidates_above_threshold / consent_eligible
approval_rate = approvals_completed / approvals_requested
send_rate = messages_sent / candidates_above_threshold
delivery_rate = messages_delivered / messages_sent
click_rate = clicks / messages_delivered
conversion_rate = conversions / messages_delivered
eligible_revenue_per_sent = eligible_revenue / messages_sent
eligible_revenue_per_trigger = eligible_revenue / trigger_events_deduped
```

Rates should be reported with denominator labels. A high conversion rate against a tiny, heavily filtered population is not equivalent to high program impact.

## Holdout And Control Methodology

Lifecycle programs should prefer deterministic holdout assignment before delivery.

Default holdout rules:

- Assign holdout after identity/consent eligibility and before message generation or delivery.
- Use a stable key such as `workspaceId + programId + canonicalUserId + entityId`.
- Store assignment id, policy version, assigned bucket, timestamp, and reason.
- Keep the same user/entity/program pair in the same bucket for the configured experiment period.
- Do not send to holdout users for the covered event/action class during the measurement window.
- Exclude users who are already suppressed or ineligible before assignment from treatment/control lift calculations.

Recommended holdout sizes:

- 5% to 10% for high-volume low-risk programs;
- 10% to 20% for new programs where confidence matters more than short-term revenue;
- larger holdouts for low-confidence baselines or high variance segments.

When holdout is not possible, use a matched cohort or pre/post baseline and mark the confidence level lower. Pre/post-only measurement should not auto-trigger performance fees unless the contract explicitly allows it.

## Conversion Attribution

Attribution should connect conversions to lifecycle actions without overstating incrementality.

Default attribution rules:

- use deterministic user/account/entity ids before email or device-derived matches;
- use provider delivery id or message id when available;
- use first-party conversion/revenue events as billing-grade evidence;
- require conversion timestamp after send timestamp unless the contracted action is retention or renewal influence with a longer account-level window;
- dedupe repeated conversions within the same attribution window unless the revenue event is explicitly repeat-purchase eligible;
- prioritize the most recent eligible lifecycle action for single-touch reporting;
- keep multi-touch paths reportable but do not double-count billable revenue.

Suggested attribution windows:

| Lifecycle motion | Default window | Notes |
|---|---|---|
| Product activation prompt | 7 to 14 days | Use product event source of truth. |
| Purchase or upgrade prompt | 14 to 30 days | Use billing/commerce revenue source. |
| Renewal or retention intervention | 30 to 90 days | Use CRM/billing and account-level controls. |
| Expansion readiness message | 30 to 120 days | Use opportunity or ARR source with finance approval. |
| Time-sensitive inventory/event alert | 1 to 7 days | Short windows reduce false credit. |

The window must be set by program and frozen before launch.

## Incremental Revenue

For randomized holdout:

```text
treatment_conversion_rate = treatment_conversions / treatment_eligible_population
control_conversion_rate = control_conversions / control_eligible_population
incremental_conversions = (treatment_conversion_rate - control_conversion_rate) * treatment_eligible_population
incremental_revenue = incremental_conversions * eligible_value_per_conversion
```

For revenue-per-user measurement:

```text
treatment_revenue_per_user = treatment_eligible_revenue / treatment_eligible_population
control_revenue_per_user = control_eligible_revenue / control_eligible_population
incremental_revenue = (treatment_revenue_per_user - control_revenue_per_user) * treatment_eligible_population
```

For pre/post baseline:

```text
expected_baseline_revenue = baseline_revenue_rate * treatment_exposure
incremental_revenue = observed_eligible_revenue - expected_baseline_revenue
```

Billable incremental revenue should be capped at zero when lift is negative and should subtract approved adjustments, refunds, chargebacks, and clawbacks.

## Channel Risk Metrics

Lifecycle measurement must include downside risk because aggressive messaging can damage deliverability, brand trust, and consent posture.

Required risk metrics:

- unsubscribe rate by program and provider list;
- spam complaint rate by program and sending domain;
- hard bounce rate and soft bounce rate;
- provider suppression and drop rate;
- delivery failure rate;
- reply sentiment or manual complaint count where available;
- frequency-cap pressure;
- opt-out deltas after treatment;
- conversion refund/cancellation rate;
- revenue quality flags by segment and source.

Recommended guardrails:

- pause auto-send if spam complaint rate exceeds the customer policy threshold;
- require review when unsubscribe rate materially exceeds baseline;
- suppress or review segments with elevated bounce or complaint risk;
- exclude revenue from cohorts where risk metrics violate contracted policy;
- show net impact alongside channel risk, not only gross revenue.

## Billing-Grade Evidence

Lifecycle impact is billing-grade only when:

- the covered program and action class are in the active contract;
- source data, mapping version, and policy version are recorded;
- identity and consent gates passed or the action was explicitly suppressed;
- holdout/control assignment is recorded when the method requires it;
- message generation, approval, and delivery audit events are available;
- conversion or revenue event comes from the agreed source of truth;
- attribution window and dedupe rules are applied;
- exclusions, refunds, cancellations, and clawbacks are applied;
- the payout-period report is reproducible from stored evidence.

If any condition fails, the outcome can be shown as directional or operational impact but should not be included in automatic performance billing.

## Reporting Views

Customer reports should include:

- lifecycle program summary: triggers, eligible users, sends, conversions, revenue, lift, confidence, and risk;
- funnel breakdown by segment, lifecycle moment, channel, provider, geography, and source system;
- treatment/control comparison with population sizes and outcome rates;
- suppression and policy-block reasons;
- message-level audit trail for sampled or disputed actions;
- revenue reconciliation with refunds, cancellations, exclusions, and clawbacks;
- payout-ready impact and non-billable directional impact.

Internal reports should additionally show:

- identity match gaps;
- consent source conflicts;
- source freshness gaps;
- provider event ingestion gaps;
- suppressed upside by policy reason;
- segments with high revenue but unacceptable channel risk.

## Implementation Implications

The product should eventually persist:

- lifecycle program and measurement-period definitions;
- holdout assignment records;
- lifecycle funnel counters by period and segment;
- delivery/engagement/conversion/revenue event links;
- attribution calculation inputs and outputs;
- channel risk aggregates;
- billing eligibility state for each revenue event;
- payout-period lifecycle measurement snapshot.

This keeps Lifecycle measurement auditable enough for customer reporting and constrained enough for performance-based commercial use.
