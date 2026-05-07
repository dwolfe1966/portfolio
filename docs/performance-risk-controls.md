# Performance Risk Controls

Last updated: 2026-05-07

This document defines cross-app risk controls for performance-based customer engagements. It covers spending limits, customer approvals, kill switches, compliance review, channel reputation limits, revenue-quality checks, and the conditions that should block execution or suppress performance billing.

## Control Principle

Performance operation should fail closed. When permission, source quality, policy state, or measurement evidence is incomplete, the system can observe, diagnose, and recommend, but it should not execute risky actions or trigger automatic performance billing.

Controls should protect four things:

- customer economics: spend, margin, revenue recognition, refunds, and fraud;
- customer trust: approvals, auditability, billing evidence, and dispute rights;
- customer channels: deliverability, ad-account health, brand safety, and platform policy;
- customer compliance: consent, geography, eligibility, contractual limits, and data processing.

## Control Categories

| Category | Primary risk | Default behavior when uncertain |
|---|---|---|
| Spend limits | Agent overspends or shifts budget too aggressively. | Block or require approval. |
| Customer approvals | Customer-facing or high-value action occurs without authorization. | Queue approval. |
| Kill switches | Execution continues during incident or customer pause. | Block all writes and freeze billing eligibility after stop time. |
| Compliance review | Action violates consent, geography, brand, contract, or platform policy. | Suppress action. |
| Channel reputation | Messaging or ads damage sender/domain/account health. | Pause auto-execution and require review. |
| Revenue quality | Fees claimed on weak, fraudulent, refunded, or unattributable revenue. | Report directional impact only. |
| Source health | Stale or incomplete data drives action. | Downgrade to recommendation-only. |
| Rollback safety | Provider mutation cannot be reversed or verified. | Require approval or block depending on action risk. |

## Spend And Budget Controls

Acquisition and other paid actions require explicit spend controls.

Required controls:

- workspace daily spend cap;
- provider account daily spend cap;
- campaign/cell daily spend cap;
- maximum daily budget shift percentage;
- maximum absolute budget increase per action;
- maximum total budget increase per measurement period;
- protected campaign/cell/account list;
- cooldown window after any budget or bid change;
- margin or ROAS floor before spend increases;
- emergency stop override that disables spend changes immediately.

Default actions:

- Block spend increases that exceed hard caps.
- Require approval for budget shifts above the auto-approval threshold.
- Allow pause/reduce actions to bypass some economics gates when the action reduces risk and does not violate protected-list policy.
- Treat missing spend, currency, time zone, attribution, or conversion-quality data as recommendation-only.

Spend controls should be evaluated before provider dry-run and again before provider write, because account state may change between recommendation and execution.

## Customer Approval Controls

Customer approval must be explicit, durable, and scoped.

Approval records should include:

- workspace id and customer account id;
- package/mode at approval time;
- action class and external target ids;
- proposed diff and dry-run result;
- expected impact and risk summary;
- policy version;
- approver id, role, timestamp, and approval source;
- expiration time or measurement window;
- whether approval allows one action or a class of future actions;
- revocation path.

Approval-required actions:

- first production send or first production provider write;
- new action class;
- new channel or provider;
- spend increase above auto-approval cap;
- campaign launch, broad bid-strategy change, or creative submission;
- customer-facing pricing, discount, or offer change;
- messages or ads in sensitive segments;
- actions with low confidence, low sample size, or missing revenue quality;
- any action after a policy, contract, or source-of-truth change.

Approvals should expire. An old approval should not authorize a materially different action after data, policy, creative, audience, price, or commercial scope changes.

## Kill Switches And Pauses

Every workspace needs a customer-visible kill switch.

Kill switch behavior:

- block new sends, provider writes, pricing changes, CRM/CS task creation, and other external mutations;
- allow read sync, observation, reporting, and audit export;
- mark all recommendations after the stop timestamp as non-executable;
- freeze performance-billing eligibility for actions after the stop timestamp;
- preserve already-running jobs but stop before external mutation if possible;
- record actor, reason, timestamp, affected apps, and affected action classes.

Pause types:

| Pause type | Scope | Typical owner |
|---|---|---|
| Workspace emergency stop | All execution across apps. | Workspace owner or operator approver. |
| App pause | Lifecycle, Acquisition, Pricing, Retention, or Expansion only. | App operator. |
| Action-class pause | Sends, budget increases, campaign launches, price changes, CRM tasks, etc. | Operator approver. |
| Provider pause | Specific ESP, ad account, CRM, billing system, or API. | Channel owner or data owner. |
| Billing hold | Execution may continue, but automatic fee trigger is suspended. | Finance owner. |

Restarting after a pause should require a recorded review, especially when the pause involved compliance, billing, customer complaint, or failed rollback.

## Compliance Review

Compliance controls should run before customer-facing action and before performance billing.

Required checks:

- valid consent basis for channel and geography;
- opt-out, unsubscribe, suppression, bounce, complaint, and do-not-contact state;
- regional eligibility and restricted jurisdiction handling;
- customer-contract constraints;
- sensitive category and protected-class exclusions where applicable;
- brand-safety and content policy checks;
- platform policy constraints for ads, custom audiences, and creative review;
- data-processing requirements for audience sync and identity matching;
- finance-approved eligible revenue definition;
- privacy-safe audit export and raw payload retention.

Default actions:

- Suppress lifecycle delivery when consent or identity is ambiguous.
- Block audience sync when data-processing approval is missing.
- Require approval for new content families, sensitive segments, or provider policy edge cases.
- Exclude revenue from cohorts or actions that violate compliance policy.

## Channel Reputation Controls

Lifecycle and acquisition channels have health that can be damaged by aggressive automation.

Lifecycle reputation metrics:

- spam complaint rate;
- unsubscribe rate;
- hard bounce rate;
- soft bounce/defer rate;
- provider suppression/drop rate;
- domain or IP reputation alerts;
- engagement deterioration;
- frequency-cap pressure.

Acquisition reputation metrics:

- ad account policy warnings;
- creative review rejection rate;
- audience match quality;
- learning-phase disruption;
- disapproval or limited-delivery status;
- landing-page quality warnings;
- abnormal refund, fraud, or low-quality lead rate.

Default actions:

- Pause auto-execution when reputation metrics exceed customer thresholds.
- Require approval before expanding sends, spend, audiences, or creative when reputation is degraded.
- Prefer risk-reducing actions, such as pause, suppress, reduce budget, or rollback.
- Mark affected revenue as non-billable when policy says channel risk invalidates the cohort.

## Revenue-Quality Controls

Revenue quality determines whether reported impact can become billable.

Required checks:

- conversion or revenue comes from agreed source of truth;
- identity or account match is deterministic enough for the contracted attribution rule;
- conversion timestamp is inside the frozen attribution window;
- eligible revenue excludes refunds, chargebacks, fraud, test transactions, internal accounts, taxes, pass-through fees, and ineligible geographies;
- margin or variable-cost adjustment is applied where required;
- duplicate and multi-touch outcomes are deduped;
- clawback window has passed or exposure is shown;
- source freshness and mapping version are acceptable;
- payout-period report is reproducible.

Default actions:

- Report platform conversions and weak matches as directional.
- Exclude low-quality, refunded, fraudulent, or disputed revenue from automatic fee triggers.
- Require finance approval when source systems disagree materially.
- Freeze billing when source freshness, mapping, or eligible revenue definitions are degraded.

## Rollback And Reversal Controls

External mutations should have a reversal plan before execution.

Required for provider writes:

- dry-run output;
- before/after diff;
- idempotency key;
- provider operation id where available;
- rollback support status;
- reversal condition;
- monitoring window;
- owner for manual rollback if automated rollback is unavailable.

Action rules:

- Reversible low-risk actions can be agent-managed inside caps.
- Partially reversible actions require approval.
- Irreversible or customer-facing high-risk actions require approval and stronger evidence.
- Failed rollback should downgrade the affected package and pause broader automation until reviewed.

## Control States

Each risk check should return a structured state:

| State | Meaning | Execution behavior | Billing behavior |
|---|---|---|---|
| Pass | Evidence and policy are sufficient. | Can proceed if other checks pass. | Can be billing-grade if measurement gates pass. |
| Approval required | Action may proceed only with recorded approval. | Queue approval. | Billable only after approval and evidence pass. |
| Block | Action violates hard policy or lacks critical evidence. | Do not execute. | Not billable. |
| Suppress | Recipient/account/action is ineligible. | Do not execute for target. | Exclude from treatment billing. |
| Degraded | Source, channel, or evidence quality is weak. | Recommendation-only or reduced mode. | Directional impact only. |
| Paused | Customer or system pause is active. | Observation only. | Freeze automatic fee triggers. |

Control outcomes should be visible to customers so blocked upside and risk-reducing decisions are not hidden.

## Implementation Implications

The product should eventually persist:

- workspace, app, provider, action-class, and target-level policy records;
- approval records and expiration;
- emergency stop and pause records;
- spend cap and budget-shift evaluations;
- compliance check results;
- channel reputation snapshots;
- revenue-quality check results;
- rollback plans and rollback outcomes;
- control-state history for execution and billing.

This creates a single control surface for customer trust, agent autonomy, and performance-fee defensibility.
