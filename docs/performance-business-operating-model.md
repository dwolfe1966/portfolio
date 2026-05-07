# Performance Business Operating Model

Last updated: 2026-05-07

This document defines the commercial and measurement model for performance-based customer engagements. It turns the revenue-proof requirements from the enterprise operating model into a contract shape that can be implemented, audited, reported, and disputed without relying on informal judgment.

## Operating Principle

Performance fees should be earned only from revenue that is measurable, attributable, incremental, and allowed under the customer's approved operating policy.

The system should therefore separate four concerns:

- operational action: what the agent or operator did;
- measurement evidence: what downstream revenue or cost movement was observed;
- incrementality method: why the outcome is judged to be above the agreed baseline;
- commercial trigger: when the customer owes a fee, refund, credit, clawback, or no charge.

If evidence quality is incomplete, the product can still show directional impact, but it should not automatically trigger revenue-share billing.

## Contract Objects

A performance engagement should define these objects before agent-managed execution begins:

| Object | Required fields | Purpose |
|---|---|---|
| Customer account | legal entity, workspace, billing owner, decision owner, finance approver | Establishes who can approve scope, payouts, disputes, and policy changes. |
| Covered product/app | Lifecycle, Acquisition, Pricing, Retention, Expansion, or custom bundle | Defines which operating surface can generate eligible lift. |
| Covered action classes | message send, ESP journey trigger, budget edit, campaign creation, price quote, CS task, sales opportunity | Limits performance fees to approved operational motions. |
| Baseline definition | period, cohort, segment, metric, exclusions, source system, freeze date | Provides the counterfactual reference. |
| Treatment definition | users, accounts, campaigns, cells, segments, or opportunities touched by the system | Defines what can claim revenue impact. |
| Control or holdout definition | random holdout, matched cohort, geographic split, campaign split, pre/post only | Sets incrementality quality and confidence level. |
| Eligible revenue definition | event type, gross/net basis, currency, refund policy, margin policy, recognition timing | Prevents ambiguity in payout calculations. |
| Attribution rule | event join key, attribution window, priority, dedupe rule, source of truth | Ties observed revenue back to covered actions. |
| Fee schedule | share percentage, minimum fee, cap, payout cadence, invoice timing | Converts approved lift into commercial billing. |
| Risk policy | spend caps, approvals, channel limits, consent rules, kill switch, dispute process | Protects the customer and the operator. |

## Customer Onboarding

Onboarding is complete only when the customer has approved both operational access and measurement access.

Required onboarding artifacts:

- workspace owner, finance owner, legal/contact owner, and day-to-day operator contacts;
- covered systems and connection type for each: warehouse, CRM, billing, product analytics, ESP, ad platforms, web analytics, support system, or spreadsheet import;
- credential grants, permission scopes, expiration/rotation owner, and revocation path;
- historical revenue, conversion, cost, spend, margin, refund, churn, and eligibility data needed for baseline construction;
- consent, suppression, regional, contractual, and brand-safety constraints;
- initial action policy: recommendation-only, human-approved execution, or agent-managed execution;
- reporting recipients, invoice recipients, dispute recipients, and cadence.

Access to execution systems should not be treated as enough. Billing data and revenue-event quality must be validated before performance billing can start.

## Baseline Measurement

The baseline is the default counterfactual used when a stronger control group is not available.

Baseline rules:

- Use a fixed baseline period agreed before launch, usually 28 to 90 days depending on sales cycle and event volume.
- Freeze the baseline dataset, mapping version, exclusions, and source-system snapshot before the first billable action.
- Use the same eligible revenue definition for baseline and treatment.
- Segment baselines by channel, product, geography, customer tier, campaign objective, or lifecycle moment when pooled averages would hide material differences.
- Exclude abnormal periods such as outages, one-time launches, known tracking failures, unusual discounts, fraud spikes, or customer-requested blackout windows.
- Recompute a baseline only by explicit change order or renewal, not silently during a live billing period.

Preferred counterfactual order:

1. Randomized holdout or control group.
2. Matched cohort with pre-period equivalence checks.
3. Platform or geographic split where spillover risk is low.
4. Pre/post baseline with explicit confidence discount and stricter fee approval.

Pre/post-only measurement can be useful for early engagements, but it should require a lower fee cap, manual payout approval, or both.

## Eligible Revenue

Eligible revenue should be defined in contract language and represented in the product as structured policy.

Recommended default:

- Recognize net revenue after refunds, chargebacks, known fraud, test transactions, internal accounts, duplicate purchases, taxes, and pass-through fees are removed.
- Use margin-adjusted revenue where spend, discounts, fulfillment cost, or service cost materially affect economics.
- Use customer-owned first-party systems as the source of truth for billing or conversion value.
- Treat ad-platform conversions, ESP conversions, and web analytics conversions as supporting evidence unless the customer explicitly accepts them as billing-grade.
- Apply currency conversion using a named source and timestamp rule when multiple currencies are involved.

Exclusions should include:

- pre-existing pipeline or already-scheduled renewal revenue;
- customers/accounts already under active sales or CS motion unless the action is explicitly part of the covered treatment;
- revenue caused by unrelated pricing changes, seasonal promotions, product launches, or customer-led campaigns;
- revenue from ineligible jurisdictions, suppressed contacts, or unapproved channels;
- revenue later reversed by refund, chargeback, cancellation, clawback, or fraud review.

## Attribution

Attribution connects an approved action to a downstream outcome. It is not the same as incrementality.

The attribution rule must specify:

- identity join key: user id, account id, email hash, CRM contact id, click id, order id, campaign id, or another agreed identifier;
- action timestamp and event timestamp semantics;
- attribution window by action class, such as 7-day click, 14-day message, 30-day purchase, or sales-cycle-length opportunity window;
- priority rule when multiple actions touch the same user/account;
- dedupe rule for repeated conversions or multi-touch paths;
- source-of-truth order when systems disagree;
- minimum evidence required for billing-grade attribution.

Default priority:

1. Direct deterministic match to a covered action and eligible conversion event.
2. Deterministic account-level match where user-level identity is unavailable.
3. Approved platform click/view id matched to first-party revenue.
4. Modeled or probabilistic match, reportable but not billable unless explicitly contracted.

## Incrementality And Lift

Lift should be calculated separately from attribution so the customer can see both attributed revenue and incremental revenue.

Core formula:

```text
observed_eligible_revenue = revenue from treatment population during measurement window
expected_baseline_revenue = baseline rate * eligible treatment exposure
incremental_revenue = observed_eligible_revenue - expected_baseline_revenue
billable_incremental_revenue = max(0, incremental_revenue - approved_adjustments)
performance_fee = billable_incremental_revenue * fee_share
```

For holdout/control designs:

```text
treatment_lift_rate = treatment_outcome_rate - control_outcome_rate
incremental_revenue = treatment_lift_rate * treatment_population * eligible_value_per_outcome
```

For acquisition:

```text
incremental_profit = eligible_revenue - media_spend - variable_costs - baseline_profit
```

For retention:

```text
saved_arr = eligible_retained_arr - expected_baseline_retained_arr
```

Negative or statistically weak lift should not trigger a success fee. It can trigger an operating review, rollback, budget reduction, or a move back to recommendation-only mode.

## Fee Triggers And Payout

A performance fee should trigger only when all gates pass:

- covered action was approved under the workspace policy active at action time;
- action and measurement records have immutable audit ids;
- eligible revenue is observed from the agreed source of truth;
- attribution rule links outcome to the treatment population;
- incrementality method produces positive lift above threshold;
- exclusion and clawback windows have been applied;
- customer-visible report is generated for the payout period;
- approval is recorded when the contract requires finance or operator signoff.

Recommended payout schedule:

- weekly operational reporting;
- monthly measurement close;
- 7 to 14 day customer review/dispute window;
- invoice after review window expires or approval is recorded;
- clawback true-up in the next period for refunds, chargebacks, cancellations, or data corrections.

Contracts should define a fee cap per period and an action-risk cap. Fee caps prevent the operator from being rewarded for uncontrolled external shocks, while action-risk caps prevent agent behavior from exceeding customer tolerance.

## Risk Controls

Performance-based operation should fail closed.

Required controls:

- recommendation-only mode until onboarding and measurement evidence pass;
- human approval for high-risk sends, budget shifts, campaign launches, pricing changes, or customer-facing offers;
- emergency stop that disables all execution and suppresses billing triggers after the stop time;
- spend caps and maximum daily budget shift for acquisition;
- suppression, consent, geography, deliverability, and frequency caps for lifecycle;
- margin, discount, and customer-eligibility constraints for pricing and offer motions;
- audit export for action, approval, policy version, data version, and payout calculation;
- customer dispute workflow with frozen evidence snapshots.

If a control blocks execution, the product should record the lost opportunity separately from billable impact. This keeps the commercial record honest while still showing where customer policies constrained upside.

## Reporting Cadence

Customer-facing reports should include:

- actions taken, pending approvals, blocked actions, and rollbacks;
- baseline population, treatment population, holdout/control population, and exclusions;
- eligible revenue, attributed revenue, incremental revenue, and billable incremental revenue;
- confidence level, data-quality flags, source freshness, and mapping version;
- fee calculation, cap application, adjustments, clawbacks, and invoice-ready amount;
- plain-language explanation of material changes since the prior period.

Internal reports should additionally show:

- unresolved connector health issues;
- policy blocks by category;
- revenue that is attributable but not billable;
- revenue that is billable but inside dispute window;
- lift by app, customer, action class, and operator mode.

## Audit Trail

Every billable period should be reproducible from stored evidence:

- workspace id, customer id, contract version, and payout period;
- policy version and approval records;
- source config, mapping version, sync snapshot, and rejected-row summary;
- action log with idempotency keys and provider ids when applicable;
- treatment/control assignment and eligibility state;
- revenue-event source rows or immutable references;
- attribution and incrementality calculation inputs;
- adjustments, exclusions, clawbacks, and final fee calculation.

The audit trail is also the basis for customer trust. The product should make the calculation inspectable without exposing unnecessary implementation detail.

## Implementation Sequence

1. Represent contract terms as structured workspace configuration.
2. Add source-quality checks for billing-grade revenue events.
3. Add baseline snapshot creation and freeze semantics.
4. Add attribution calculation per action class.
5. Add incrementality calculation and confidence flags.
6. Add payout-period close, customer review, and dispute states.
7. Add invoice-ready export and clawback true-up.
8. Add dashboards for reportable impact, billable impact, blocked upside, and risk controls.

## Open Decisions

- Whether early customers should use a single global revenue-share percentage or app-specific fee schedules.
- Whether pre/post-only engagements should be allowed to auto-invoice or require manual approval forever.
- Whether invoice generation should live in this product or export to the customer's finance system.
- How long audit snapshots must be retained for customer disputes and partner diligence.
