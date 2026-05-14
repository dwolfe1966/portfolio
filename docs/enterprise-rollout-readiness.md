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
| L57 | Baseline snapshot contract | Durable baseline definitions and frozen snapshots with eligibility, period, exclusions, metrics, confidence, and owner approvals. |
| L58 | Revenue proof dashboard foundation | Customer-visible evidence layer for baseline, actions, outcomes, incremental lift, confidence flags, and exports. |
| L59 | Billable execution gate | A fail-closed gate before performance billing or agent-managed execution can be enabled. |
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

The next implementation target is L57: a baseline snapshot contract for eligible population, measurement period, exclusions, metrics, confidence, and owner approval before performance billing.
