# Performance Customer Onboarding Runbook

Last updated: 2026-05-07

This runbook defines the customer onboarding path for performance-based engagements. It is the operational companion to the performance business operating model and should be used before any customer workspace moves from demo data or recommendation-only use into billable revenue operations.

## Onboarding Principle

A customer is not onboarded when they connect an ad account, ESP, warehouse, or billing system. They are onboarded when the workspace can prove that it has permission to operate, permission to measure, a frozen baseline, an approved policy, and a named owner for every unresolved risk.

The default launch posture is recommendation-only. Execution and performance billing are unlocked only after the relevant gates pass.

## Required Owners

Each customer should name owners before setup begins:

| Owner | Required for | Responsibilities |
|---|---|---|
| Executive sponsor | commercial scope | Approves performance model, risk tolerance, and escalation path. |
| Workspace owner | account setup | Owns workspace identity, members, visibility, and customer-side admin decisions. |
| Data owner | source access | Approves warehouse, CRM, product, billing, and analytics access. |
| Channel owner | execution access | Approves ESP, ad platform, pricing, CRM, or CS workflow permissions. |
| Consent/compliance owner | eligibility review | Approves consent, suppression, region, brand, legal, and policy constraints. |
| Finance owner | billing evidence | Approves eligible revenue, source of truth, payout cadence, and dispute process. |
| Operator approver | daily execution | Approves high-risk actions and emergency stops. |

If any owner is missing, the workspace can continue setup but should not enter billable execution.

## Phase 1: Commercial Scope

Commercial scope defines what the customer is buying and what the operator is allowed to influence.

Artifacts:

- legal customer entity, workspace, billing contact, and finance contact;
- covered products/apps, such as Lifecycle, Acquisition, Pricing, Retention, Expansion, or a combined program;
- covered action classes, such as lifecycle send, ESP journey trigger, budget edit, campaign launch, pricing recommendation, retention task, or expansion opportunity;
- excluded channels, populations, geographies, products, accounts, or revenue classes;
- operating mode at launch: audit-only, recommendation-only, human-approved execution, or agent-managed execution;
- performance fee schedule, payout cadence, fee cap, and clawback window;
- escalation path for approvals, disputes, policy changes, and emergency stops.

Gate to pass:

- commercial scope is signed off by executive sponsor, workspace owner, and finance owner.

## Phase 2: Workspace And Access Setup

Workspace setup should establish least-privilege access before any production system is touched.

Artifacts:

- workspace id, customer account id, environment, and owner;
- invited members and roles: owner, admin, operator, finance viewer, client viewer, or service account;
- credential grants for each connected system, including permission scope, expiration, rotation owner, and revocation path;
- allowed source objects and action objects for each grant;
- audit export recipient and retention expectation;
- list of systems intentionally not connected.

System access checklist:

- Data warehouse or database for historical customer, event, cost, and revenue data.
- CRM for contacts, accounts, opportunities, lifecycle stage, owner, and pipeline state.
- Billing or commerce system for invoices, subscriptions, orders, refunds, chargebacks, and recognized revenue.
- Product analytics or event stream for activation, usage, conversion, retention, and expansion signals.
- ESP, SMTP, or marketing automation platform for lifecycle execution and delivery events.
- Ad platforms for acquisition account, campaign, budget, creative, audience, spend, and conversion data.
- Web analytics or landing-page tracking for campaign and conversion diagnostics.

Gate to pass:

- required source and channel grants exist with sufficient read permissions for measurement and only approved write permissions for execution.

## Phase 3: Data Mapping And Quality

Data mapping turns customer systems into normalized product objects.

Required mappings:

- identity keys: user id, account id, email hash, CRM contact id, CRM account id, click id, order id, subscription id;
- lifecycle objects: users, entities, interest edges, trigger events, consent state, suppression state, engagement events, conversion events, revenue events;
- acquisition objects: ad accounts, campaigns, ad groups/ad sets, ads, creatives, audiences, spend, clicks, impressions, conversions, revenue, refunds, quality signals;
- commercial objects: eligible revenue, variable costs, discounts, refunds, chargebacks, churn, retained ARR, expansion ARR;
- policy objects: region, channel eligibility, consent basis, account status, brand-safety constraints, excluded populations.

Quality checks:

- required fields are present and typed correctly;
- row counts and event counts match customer expectations;
- timestamp semantics and time zones are explicit;
- currency and revenue basis are explicit;
- identity match rate is above the launch threshold;
- duplicate, stale, and rejected rows are visible;
- source freshness and sync status are customer-visible;
- sample records can be traced from source row to normalized object.

Gate to pass:

- data owner approves mapping version, rejected-row handling, freshness threshold, and source-of-truth order.

## Phase 4: Consent And Policy Review

Consent and policy review is mandatory before customer-facing actions.

Review areas:

- consent source of truth and update cadence;
- opt-out, unsubscribe, bounce, spam complaint, suppression, and do-not-contact handling;
- region and jurisdiction rules;
- account/customer eligibility rules;
- sensitive category exclusions;
- channel frequency caps;
- deliverability and sender reputation thresholds;
- ad platform policy constraints and creative review requirements;
- spend caps, budget-shift limits, campaign launch limits, and emergency stop behavior;
- pricing, discount, offer, margin, and customer-contract constraints where applicable.

Gate to pass:

- compliance owner and operator approver sign off on the initial policy version and approval thresholds.

## Phase 5: Historical Baseline

The baseline must be built before the first billable action.

Required baseline inputs:

- baseline period and freeze date;
- eligible population and exclusion rules;
- historical revenue, conversion, spend, margin, refund, churn, and retention data;
- historical campaign, lifecycle, pricing, sales, or CS activity where relevant;
- known abnormal periods: outages, tracking breaks, launches, major promotions, pricing changes, fraud spikes, or customer blackout windows;
- segment dimensions used for baseline stratification.

Baseline checks:

- baseline uses the same eligible revenue definition as treatment;
- baseline source rows are immutable or reproducible;
- baseline population can be reconciled to customer reporting;
- baseline is segmented enough to avoid misleading pooled averages;
- pre-period performance is stable enough for the selected incrementality method;
- low-confidence baselines are explicitly marked and require stricter payout approval.

Gate to pass:

- finance owner and data owner approve the baseline snapshot, excluded periods, and launch confidence level.

## Phase 6: Initial Policy Constraints

Initial policy constraints keep early operation narrow while trust is built.

Recommended launch defaults:

- recommendation-only until source health, baseline, consent, and approval gates pass;
- human approval for every external write during the first measurement period;
- no automated sends to suppressed, ambiguous, stale, or low-confidence identities;
- no acquisition budget increase above the smaller of the contract cap or customer-approved daily shift;
- no campaign launches without dry-run output and rollback plan;
- no billing-grade attribution from platform-reported conversions alone unless explicitly approved;
- no fee trigger while source freshness, credential health, or audit evidence is degraded;
- emergency stop suppresses new execution and freezes billing eligibility after the stop timestamp.

Gate to pass:

- workspace owner and operator approver accept the launch constraints and escalation process.

## Phase 7: Launch Readiness Review

Launch readiness should be a recorded decision, not a casual handoff.

Launch packet:

- signed commercial scope;
- workspace members and roles;
- credential grant inventory;
- source mapping version and rejected-row summary;
- consent and policy version;
- baseline snapshot id and confidence rating;
- covered action list and current operating mode;
- approval queue owner and response SLA;
- reporting cadence and recipients;
- dispute path and audit export location.

Launch states:

| State | Meaning | Allowed behavior |
|---|---|---|
| Setup | Access and mapping are incomplete. | Data discovery, previews, and internal analysis only. |
| Audit-only | Measurement is available but actions are not approved. | Dashboards, reports, and opportunity sizing. |
| Recommendation-only | Actions can be proposed but not applied. | Agent recommendations and human review. |
| Human-approved execution | Approved writes can be applied. | External writes after approval and policy pass. |
| Agent-managed execution | Low-risk writes can be applied without per-action approval. | Automated action within explicit caps and rollback policy. |
| Paused | Customer or operator has stopped execution. | Observation and reporting only; no new billable actions after pause. |

Gate to pass:

- launch state is recorded with owner approvals, evidence ids, and a next review date.

## Post-Launch Review

The first measurement period should remain conservative.

Review checklist:

- confirm source sync health and credential health;
- reconcile operational actions to provider or customer system ids;
- inspect blocked actions and policy reasons;
- compare observed results against baseline and control/holdout where available;
- review unsubscribes, spam complaints, refunds, fraud, low-quality conversions, and budget waste;
- confirm that eligible revenue and exclusions match finance expectations;
- decide whether to stay in current mode, expand scope, tighten policy, or pause.

No customer should move from human-approved execution to agent-managed execution until at least one measurement period has been reviewed without material data-quality, consent, billing, or policy defects.

## Implementation Implications

The product should eventually store onboarding as structured workspace state:

- owner roster and approval records;
- credential grants and permission health;
- source mapping versions and source-quality checks;
- consent/policy version and launch constraints;
- baseline snapshot and confidence rating;
- launch state and operating mode history;
- launch packet export;
- post-launch review notes and mode-change approvals.

This structure lets the workspace explain why a customer is or is not eligible for execution, performance billing, or agent-managed operation.
