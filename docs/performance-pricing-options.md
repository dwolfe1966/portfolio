# Performance Pricing Options

Last updated: 2026-05-07

This document defines pricing model options for performance-based customer engagements. It compares setup fees plus revenue share, managed-spend fees plus performance kickers, and success fees against agreed revenue lift, with guidance on when each model is appropriate.

## Pricing Principle

The commercial model should match operating authority and evidence quality. The more autonomy the customer grants and the stronger the measurement evidence, the more the engagement can lean into performance fees. When evidence is weaker or execution authority is limited, the model should rely more on setup, audit, advisory, or managed-service fees.

Pricing should never create an incentive to take actions that violate customer policy, channel health, or revenue-quality standards. Fee triggers must stay subordinate to the risk controls and billing-grade evidence rules.

## Pricing Building Blocks

| Component | What it pays for | Best fit |
|---|---|---|
| Setup fee | Onboarding, source mapping, baseline construction, policy setup, launch packet. | Any customer requiring real integration work. |
| Audit fee | Data-readiness assessment, opportunity sizing, measurement plan. | Audit-only package or early diligence. |
| Advisory fee | Ongoing diagnosis, recommendations, reporting, and operator review. | Recommendation-only package. |
| Managed-spend fee | Paid-media operations proportional to spend under management. | Acquisition programs where spend volume drives workload. |
| Managed-revenue fee | Lifecycle, pricing, retention, or expansion operations proportional to covered revenue base. | Non-media programs with large operating scope but delayed lift. |
| Revenue share | Percentage of billable incremental revenue. | Strong first-party revenue evidence and stable baseline/control. |
| Profit share | Percentage of billable incremental profit or margin-adjusted revenue. | Acquisition, pricing, or discount-heavy motions. |
| Performance kicker | Smaller success fee layered on top of base fee. | Human-approved or agent-managed execution with shared upside. |
| Success fee | Fee only when agreed lift is achieved. | Narrow scope, high confidence, strong audit evidence, and accepted risk. |
| Cap/floor | Minimum and maximum commercial exposure. | Any performance model where volatility must be controlled. |

## Model 1: Setup Fee Plus Revenue Share

Structure:

```text
total_fee = setup_fee + (billable_incremental_revenue * revenue_share_pct)
```

Use when:

- customer needs meaningful onboarding and integration work;
- Lifecycle, Retention, Expansion, or mixed-app revenue lift is the core value;
- eligible revenue source is reliable;
- baseline/control method is agreed before launch;
- customer wants the operator aligned to revenue upside.

Recommended package fit:

- audit-only: setup/audit fee only;
- recommendation-only: setup fee plus optional advisory fee;
- human-approved execution: setup fee plus manually approved revenue share;
- agent-managed execution: setup fee plus automated revenue share inside caps.

Required contract terms:

- setup scope and what counts as out-of-scope integration work;
- billable incremental revenue definition;
- revenue-share percentage;
- payout period;
- fee cap;
- clawback window;
- dispute process;
- whether performance fees begin before or after setup is fully paid.

Risks:

- weak baseline can over-credit external demand;
- gross revenue share can ignore margin, refunds, or discount cost;
- customer may resist fees when actions are advisory rather than executed.

Mitigations:

- use net or margin-adjusted revenue where economics matter;
- require billing-grade evidence for automatic fees;
- cap fees for pre/post-only measurement;
- separate setup acceptance from performance launch.

## Model 2: Managed-Spend Fee Plus Performance Kicker

Structure:

```text
base_fee = managed_spend * managed_spend_pct
performance_kicker = billable_incremental_profit * kicker_pct
total_fee = base_fee + performance_kicker
```

Use when:

- Acquisition is the main operating surface;
- workload scales with ad spend, number of accounts, number of campaigns, or frequency of optimization;
- customer expects ongoing paid-media operations;
- first-party conversion quality is good enough for a performance component but not enough to make the whole contract success-fee-only.

Recommended package fit:

- audit-only: audit fee or fixed diagnostic fee;
- recommendation-only: advisory fee plus optional managed-spend read/reporting fee;
- human-approved execution: managed-spend fee plus manually approved performance kicker;
- agent-managed execution: managed-spend fee plus automated performance kicker inside caps.

Required contract terms:

- spend under management definition;
- observed, eligible, managed, protected, and excluded spend rules;
- managed-spend percentage or monthly tier;
- whether media spend paid directly by customer is excluded from fees;
- kicker percentage and profit/revenue basis;
- budget-saved treatment;
- refund/fraud/replacement-spend adjustments;
- cap on fee during volatile spend periods.

Risks:

- managed-spend fees can reward spend volume instead of efficiency;
- platform-reported conversions can overstate quality;
- budget-saved claims can be projection-sensitive.

Mitigations:

- pair managed-spend fee with ROAS, CAC, LTV:CAC, and conversion-quality guardrails;
- use profit or margin-adjusted revenue for the kicker;
- report budget saved separately unless the contract explicitly makes savings eligible value;
- require approval for spend increases above caps.

## Model 3: Success Fee Against Agreed Revenue Lift

Structure:

```text
total_fee = max(0, billable_incremental_revenue_or_profit * success_fee_pct)
```

Use when:

- customer wants low fixed cost and is willing to pay materially for proven upside;
- scope is narrow enough to measure cleanly;
- baseline/control method is strong;
- first-party revenue or profit evidence is reliable;
- action authority is sufficient to affect outcomes.

Recommended package fit:

- audit-only: not appropriate except as a no-fee diligence path;
- recommendation-only: only with manual customer approval of which recommendations count;
- human-approved execution: appropriate when approval trail and evidence are strong;
- agent-managed execution: appropriate for mature customers with strong caps and clawbacks.

Required contract terms:

- eligible revenue or profit definition;
- baseline/control method;
- minimum lift threshold;
- success-fee percentage;
- fee cap and fee floor if any;
- measurement period;
- customer review window;
- clawback and dispute rules;
- treatment of customer-caused delays or blocked actions.

Risks:

- operator absorbs too much onboarding and operating cost;
- customer can block execution and still expect success-fee economics;
- attribution disputes become more likely;
- low-volume programs can produce noisy payouts.

Mitigations:

- require minimum data quality and action authority before launch;
- add setup or minimum monthly fee for complex customers;
- use confidence discounts or manual approval for pre/post-only measurement;
- define blocked-upside reporting but exclude it from fees.

## Model 4: Advisory Retainer Plus Optional Success Fee

Structure:

```text
total_fee = monthly_advisory_fee + optional_success_fee
```

Use when:

- customer wants recommendations and strategy but not provider writes;
- legal, finance, or channel approval for execution is incomplete;
- measurement evidence is useful but not yet billing-grade;
- David Wolfe involvement is primarily operator review, strategy, and decision support.

Recommended package fit:

- audit-only;
- recommendation-only;
- early human-approved execution where the customer applies changes manually.

Required contract terms:

- advisory deliverables;
- cadence of recommendations and reporting;
- whether customer-applied actions can become eligible for success fee;
- evidence required to attribute customer-applied actions;
- explicit non-execution boundary.

Risks:

- recommendations may be acted on outside the audit path;
- revenue impact may be hard to attribute;
- customer may expect execution-level accountability from an advisory package.

Mitigations:

- require customer to mark accepted recommendations;
- require evidence ids for manually applied actions;
- price the package as advisory unless execution/audit requirements are met.

## Model Selection Matrix

| Situation | Recommended model |
|---|---|
| Early customer with unclear data quality | Audit fee or setup fee. |
| Good data, no execution permission | Advisory retainer plus optional manual success fee. |
| Lifecycle revenue program with strong first-party revenue events | Setup fee plus revenue share. |
| Acquisition program with meaningful ad spend | Managed-spend fee plus performance kicker. |
| Mature customer, narrow action class, strong holdout/control | Success fee against agreed lift. |
| High implementation burden and long sales cycle | Setup fee plus advisory/managed base fee before performance launch. |
| Low-margin or discount-heavy program | Profit share or margin-adjusted revenue share. |
| Weak baseline or pre/post-only measurement | Base fee plus manually approved performance component, capped. |

## Package And Billing Alignment

| Operating package | Preferred billing |
|---|---|
| Audit-only | Audit fee, setup fee, or no-fee diligence with defined scope. |
| Recommendation-only | Advisory retainer, setup fee, optional manually approved success fee. |
| Human-approved execution | Setup/managed fee plus revenue share or performance kicker. |
| Agent-managed execution | Revenue share, profit share, or managed-spend fee plus automated kicker inside caps. |

Billing should downgrade with operating mode. If a workspace moves from agent-managed execution to recommendation-only because of source health, emergency stop, or measurement defects, automatic performance billing should pause or require manual approval.

## Fee Caps, Floors, And Adjustments

Recommended controls:

- setup fee due on onboarding milestones;
- monthly minimum for ongoing operator work where success fees are uncertain;
- fee cap per payout period;
- action-risk cap for agent-managed execution;
- clawback window for refunds, chargebacks, cancellations, fraud, or data corrections;
- confidence discount for lower-quality measurement designs;
- customer review window before invoicing;
- billing hold state during disputes or degraded evidence.

Fee adjustments should be explicit and auditable:

```text
billable_value = max(0, measured_lift - exclusions - refunds - fraud - clawbacks - approved_adjustments)
performance_fee = min(fee_cap, billable_value * fee_pct)
total_invoice = base_fee + performance_fee - credits
```

## Implementation Implications

The product should eventually persist pricing terms as structured contract configuration:

- pricing model type;
- setup, audit, advisory, managed-spend, or managed-revenue base fees;
- revenue-share, profit-share, kicker, or success-fee percentages;
- eligible value basis;
- fee caps, floors, and clawback windows;
- package-specific billing eligibility;
- billing hold and dispute states;
- payout-period invoice-ready calculation.

This makes pricing auditable and keeps commercial incentives aligned with customer-controlled operating authority and evidence quality.
