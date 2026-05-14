# Enterprise Rollout Readiness

Last updated: 2026-05-14

This note defines Sprint S16: the bridge from strong provider/action controls into a customer workspace that can safely launch in an enterprise setting.

## Launch Standard

A workspace is launch-ready only when it can prove:

- required customer owners are named;
- commercial scope and launch mode are approved;
- source and channel grants have sufficient permissions;
- mappings are approved by the data owner;
- policy and consent constraints are signed off;
- historical baseline is frozen and approved;
- audit evidence is exportable;
- unresolved risks have owners and due dates.

Recommendation-only mode can start before all gates pass. Human-approved execution, agent-managed execution, and performance billing should remain blocked until the relevant gates pass.

## S16 Work Sequence

| ID | Item | Outcome |
|---|---|---|
| L55 | Customer onboarding readiness model | Completed: tested helper produces launch readiness, blockers, warnings, missing-owner lists, maximum allowed launch mode, and next required action from workspace/customer setup evidence. |
| L56 | Data quality gate model | Completed: tested helper produces recommendation/execution readiness from field coverage, row reconciliation, timestamp/currency semantics, identity match, freshness, duplicates, rejected rows, and source-of-truth order. |
| L57 | Baseline snapshot contract | Completed: tested helper produces frozen/reportable/billing-ready decisions from eligibility, period, exclusions, source snapshots, metrics, confidence, control method, and owner approvals. |
| L58 | Revenue proof dashboard foundation | Completed: shared model and overview panels show baseline, treatment/control, actions, outcomes, incremental lift/profit, confidence flags, and export links for Lifecycle and Acquisition. |
| L59 | Billable execution gate | Completed: tested helper blocks performance billing and agent-managed execution unless onboarding, data quality, baseline, policy, credentials, rollback, audit, emergency stop, revenue proof, and fee-trigger approvals pass. |
| L60 | Customer launch packet export | Exportable packet showing owners, grants, mappings, policy, baseline, evidence, unresolved risks, and launch decision. |

## First Implementation Target

L55 now exists as a pure code-facing contract in `lib/customer-onboarding-readiness.ts`. It does not depend on a new database table yet. The helper accepts structured onboarding evidence and returns:

- overall status: `ready`, `warning`, or `blocked`;
- launch mode allowed: audit-only, recommendation-only, human-approved execution, or agent-managed execution;
- blockers by phase;
- warnings by phase;
- missing owners;
- next required action.

L56 now exists as a pure code-facing contract in `lib/customer-data-quality-gates.ts`. It evaluates:

- required field presence and coverage;
- source/import/rejected row reconciliation;
- timestamp and currency semantics;
- identity match rate;
- source freshness;
- duplicate and rejected rows;
- source-of-truth precedence.

L57 now exists as a pure code-facing contract in `lib/customer-baseline-snapshots.ts`. It evaluates:

- covered workspace/app and baseline method;
- baseline period and freeze timestamp;
- eligible population and revenue basis;
- frozen source snapshots and mapping versions;
- baseline metrics and units;
- approved exclusions;
- control/holdout requirements;
- confidence level and rationale;
- data-owner and finance-owner approvals.

L58 now exists as a shared model in `lib/revenue-proof-dashboard.ts` and a reusable panel in `components/demo/RevenueProofPanel.tsx`. Lifecycle and Acquisition overview pages now expose the first customer-visible proof surface with:

- baseline and observed revenue;
- treatment and control counts;
- action evidence links;
- outcome and lift calculations;
- confidence flags;
- audit/export links.

L59 now exists as a shared gate in `lib/billable-execution-gates.ts`. It combines:

- onboarding launch readiness;
- data quality execution readiness;
- baseline billing readiness;
- policy approval;
- credential grant readiness;
- rollback evidence;
- audit export readiness;
- emergency-stop readiness;
- revenue proof readiness;
- performance billing approval.

The next implementation target is L60: a customer launch packet export with owners, connected systems, approved mappings, policy constraints, baseline snapshot, evidence exports, unresolved risks, and launch decision.
