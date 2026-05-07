# Performance Acquisition Measurement Model

Last updated: 2026-05-07

This document defines measurement for performance-based Acquisition engagements. It covers spend under management, CAC, LTV:CAC, ROAS, conversion quality, budget saved, action impact, and incremental profitable revenue.

## Measurement Principle

Acquisition measurement should distinguish platform activity from business impact.

Platform metrics explain what happened inside ad systems: spend, impressions, clicks, platform conversions, campaign state, and budget movement. Business metrics explain whether customer economics improved: qualified conversions, revenue, margin, refunds, fraud, LTV, and incremental profit.

Performance fees should not rely on platform-reported conversions alone. They should require first-party conversion quality or revenue evidence unless the customer explicitly accepts platform reporting as billing-grade.

## Measurement Objects

| Object | Meaning | Source of truth |
|---|---|---|
| Ad account | Provider account under observation or management. | Google Ads, Microsoft Ads, Meta Ads, or customer-approved provider. |
| Campaign | Provider campaign normalized across channels. | Provider read sync plus normalized snapshot. |
| Cell | Campaign x ad group/ad set x creative x audience/keyword dimension. | Provider read sync and local experiment model. |
| Performance point | Daily spend, impressions, clicks, conversions, revenue, and attribution window. | Provider reporting, normalized into workspace snapshots. |
| Conversion quality record | Lead quality, purchase status, pipeline, margin, LTV, refund, fraud, or cancellation signal. | CRM, product, billing, commerce, warehouse, or approved import. |
| Policy decision | Allowed, approval-required, or blocked action with reasons. | Acquisition policy gate. |
| Provider write | Applied budget edit, pause/resume, creative upload, audience sync, bid change, or rollback. | Provider mutation audit log. |
| Outcome window | Post-action measurement period used to evaluate effect. | Contract and acquisition policy. |
| Incremental profit | Eligible revenue minus spend, variable costs, baseline profit, and adjustments. | First-party revenue and cost sources plus baseline/control. |

## Spend Under Management

Spend under management is the paid-media spend that the system is allowed to observe, diagnose, recommend against, or operate.

Report these separately:

- observed spend: spend synced from connected accounts;
- eligible spend: spend inside covered campaigns/cells and covered date ranges;
- managed spend: eligible spend where the system may recommend or apply actions;
- agent-operated spend: managed spend touched by an approved provider write;
- protected spend: spend that policy prevented from being moved, increased, or paused;
- excluded spend: spend outside the contract, protected campaigns, unsupported providers, or low-quality source periods.

Suggested formulas:

```text
eligible_spend = sum(spend for covered campaigns/cells in period)
managed_spend = sum(spend where policy mode allows recommendations or writes)
agent_operated_spend = sum(spend for campaigns/cells touched by approved writes)
managed_spend_share = managed_spend / observed_spend
```

Spend reporting should always show currency, provider time zone, attribution window, and source freshness.

## Core Acquisition Metrics

Recommended formulas:

```text
ctr = clicks / impressions
cpc = spend / clicks
platform_cpa = spend / platform_conversions
qualified_cac = spend / qualified_conversions
roas = eligible_revenue / spend
margin_roas = eligible_margin / spend
ltv_cac = estimated_ltv / qualified_cac
conversion_quality_rate = qualified_conversions / platform_conversions
refund_rate = refunded_conversions / qualified_conversions
fraud_rate = fraud_flagged_conversions / platform_conversions
```

Denominators should be visible. For low-volume cells, the report should prefer ranges, confidence flags, or "insufficient sample" over precise-looking recommendations.

## Conversion Quality

Conversion quality is the bridge between ad-platform reporting and customer economics.

Quality dimensions:

- lead qualified by CRM stage, score, owner acceptance, or sales disposition;
- signup activated by product behavior;
- purchase completed and not refunded;
- subscription still active after the contracted window;
- pipeline opportunity created or advanced;
- revenue recognized or booked by finance-approved source;
- margin positive after discounts, COGS, fulfillment, service cost, or sales cost;
- fraud, duplicate, test, internal, or ineligible conversions removed.

Billing-grade conversion quality requires:

- deterministic join to click id, campaign/cell id, user/account id, order id, or CRM id;
- agreed source-of-truth order when provider, CRM, product, and billing systems disagree;
- explicit attribution window and timestamp semantics;
- dedupe across repeated conversions and multi-touch paths;
- refund, fraud, chargeback, and cancellation true-up.

If conversion quality is missing, the agent can recommend conservative action but should not auto-increase spend or trigger performance billing.

## Attribution Windows

Provider-reported attribution should be normalized but treated as a reporting input, not automatic proof.

Default reporting windows:

| Channel | Default platform view | Billing-grade requirement |
|---|---|---|
| Search | 30-day click, 1-day view where applicable | First-party conversion/revenue match preferred. |
| Paid social | 7-day click, 1-day view | First-party conversion/revenue match required for performance billing unless contracted otherwise. |
| Display | 7-day click, 1-day view | View-through conversions should be report-only unless approved. |
| Video | 7-day click, 1-day view | Engagement/view-through should not be billable without first-party conversion. |

Attribution windows should be frozen by provider, campaign objective, and measurement period before actions are evaluated.

## Action Impact

Every applied acquisition action should have a before/after measurement window.

Required action fields:

- provider, account, campaign, cell, and external ids;
- action type, proposed diff, applied diff, rollback data, and idempotency key;
- policy version, approval id, and actor/service-agent id;
- pre-action baseline window;
- post-action outcome window;
- expected effect and reversal condition;
- provider operation id and verification result.

Action impact metrics:

- spend shifted;
- spend paused;
- spend increased;
- budget protected by policy;
- budget saved from blocked actions;
- budget saved from paused losers;
- incremental qualified conversions;
- incremental eligible revenue;
- incremental profit;
- rollback rate;
- time to detect reversal condition.

## Budget Saved

Budget saved should be conservative. It should not claim every paused dollar as savings if the spend would have naturally stopped or been reallocated profitably.

Recommended formulas:

```text
blocked_budget_saved = min(projected_blocked_spend, policy_cap_excess)
paused_budget_saved = projected_counterfactual_spend - actual_post_pause_spend
waste_avoided = max(0, paused_budget_saved - replacement_spend_on_equivalent_or_worse_cells)
```

Budget saved can be reported as operational impact when:

- the action was approved or blocked by policy;
- the affected spend was inside managed scope;
- projection window and pacing assumptions are recorded;
- the cell was below customer guardrails or inside a policy breach;
- replacement spend is accounted for.

Budget saved should not automatically become billable revenue. It can support performance fees only when the contract defines cost savings as eligible value.

## Incremental Profitable Revenue

Acquisition performance should optimize profit, not gross platform conversions.

For treatment/control or holdout designs:

```text
treatment_profit = eligible_revenue - media_spend - variable_costs - refunds - fraud_adjustments
control_profit = control_eligible_revenue - control_media_spend - control_variable_costs - control_refunds - control_fraud_adjustments
incremental_profit = treatment_profit - normalized_control_profit
```

For pre/post baseline:

```text
observed_profit = eligible_revenue - media_spend - variable_costs - refunds - fraud_adjustments
expected_baseline_profit = baseline_profit_rate * treatment_exposure
incremental_profit = observed_profit - expected_baseline_profit
```

For budget reallocation:

```text
incremental_profit = profit_after_reallocation - expected_profit_without_reallocation
```

Billable acquisition impact should use:

```text
billable_incremental_profit = max(0, incremental_profit - approved_adjustments)
```

Gross revenue lift can be reported, but fee triggers should prefer profit or margin-adjusted revenue when spend changes are part of the action.

## Guardrails And Confidence

Acquisition measurement must show whether an action was allowed, approval-required, or blocked.

Required guardrail dimensions:

- daily spend cap;
- max daily budget shift;
- campaign protected-list status;
- CAC target and CAC auto-pause threshold;
- LTV:CAC floor;
- ROAS or margin ROAS floor;
- conversion-quality minimum;
- minimum sample size;
- confidence threshold;
- cooldown window;
- approval threshold;
- emergency stop state.

Actions with missing attribution, missing conversion quality, degraded connector health, or stale source data should be recommendation-only or blocked according to policy.

## Reporting Views

Customer reports should include:

- spend under management by provider, account, campaign, and cell;
- platform metrics: impressions, clicks, CTR, CPC, conversions, CPA, and provider attribution window;
- business metrics: qualified conversions, eligible revenue, margin, refunds, fraud, CAC, ROAS, and LTV:CAC;
- action ledger: recommendations, approvals, writes, rollbacks, blocked actions, and policy reasons;
- budget movement: shifted, paused, increased, protected, and saved;
- treatment/control or before/after lift with confidence and sample-size flags;
- incremental profitable revenue and billable impact;
- non-billable directional impact where evidence is incomplete.

Internal reports should additionally show:

- provider sync health and freshness;
- conversion-quality join gaps;
- platform/customer conversion discrepancies;
- campaigns with spend but missing first-party quality;
- actions that would have been profitable but were blocked by policy;
- cells where budget saved claims are weak or projection-sensitive.

## Billing-Grade Evidence

Acquisition impact is billing-grade only when:

- the provider account, campaign, and action class are inside the active contract;
- source sync, normalization, attribution window, and policy version are recorded;
- first-party conversion quality or revenue source passes the launch threshold;
- action proposal, policy decision, approval, provider write, and verification audit events exist when an action was applied;
- baseline/control method and outcome window are frozen before evaluation;
- refunds, fraud, cancellations, replacement spend, and variable costs are applied;
- incremental profit is positive after approved adjustments;
- the payout-period report can be reproduced from stored snapshots.

If any condition fails, the product should report the result as operational or directional impact rather than automatic performance billing.

## Implementation Implications

The product should eventually persist:

- managed-spend scope definitions;
- normalized provider performance snapshots;
- conversion-quality enrichment records;
- action impact windows;
- budget-saved calculation inputs;
- baseline/control assignments for acquisition experiments;
- incremental profit calculation inputs and outputs;
- billing eligibility state by action and period;
- payout-period acquisition measurement snapshots.

This lets Acquisition prove paid-media value in customer economics while keeping platform telemetry, policy controls, and performance billing separate.
