# Retention Risk Command Center Demo Spec

## Purpose

The Retention Risk Command Center is the fifth runnable AI revenue demo. It turns account-health signals into prioritized churn-risk decisions, recommended save motions, intervention ownership, and save-rate economics.

## Routes

- `/retention/overview` — operating loop, readiness, and demo reset.
- `/retention/inputs` — policy thresholds and driver-specific playbooks.
- `/retention/accounts` — seeded account signal table with interpretable risk drivers.
- `/retention/simulations` — run the retention portfolio risk model.
- `/retention/outputs` — latest run economics and account-level recommendations.
- `/retention/interventions` — queue accountable save motions.
- `/retention/audit` — risk run and intervention audit feed.

## Data Model

- `RetentionAccount` stores usage, support, NPS, renewal, billing, relationship, and trend signals.
- `RetentionPlaybook` maps risk drivers to save-rate lift, cost, discount ceiling, and SLA.
- `RetentionPolicy` controls risk thresholds, discount discipline, payback floor, and high-risk SLA.
- `RetentionRiskRun` and `RetentionRiskRunRow` persist portfolio and account-level simulation output.
- `RetentionIntervention` and `RetentionAuditLog` capture operator action and auditability.

## Engine

`lib/retention-engine.ts` provides pure functions for:

- scoring account churn risk,
- selecting the primary risk driver,
- recommending a playbook,
- computing expected saved revenue, intervention cost, payback, and SLA,
- aggregating portfolio-level preventable churn, save-rate, and payback.

## UX Standard

The app uses the shared `DemoAppShell`, mobile hamburger side nav, demo breadcrumbs, reset card, and portfolio launch card treatment used by the other demo apps.
