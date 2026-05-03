# Expansion Revenue Intelligence Demo Spec

## Purpose

The Expansion Revenue Intelligence Command Center is the sixth runnable AI revenue demo. It turns installed-base account signals into expansion readiness scores, recommended monetization motions, and expected ARR economics.

## Routes

- `/expansion/overview` — operating loop, readiness, and reset.
- `/expansion/inputs` — policy thresholds and offer library.
- `/expansion/accounts` — account-base signal table with readiness scores.
- `/expansion/simulations` — run the expansion revenue model.
- `/expansion/outputs` — portfolio ARR economics and account recommendations.
- `/expansion/audit` — model run audit feed.

## Data Model

- `ExpansionAccount` stores seats, usage growth, product qualification, support health, renewal timing, sponsor status, and trend.
- `ExpansionOffer` maps expansion motions to lift, cost, margin, target segment, and SLA.
- `ExpansionPolicy` controls readiness thresholds, margin floor, payback floor, and SLA ceiling.
- `ExpansionRun` and `ExpansionRunRow` persist portfolio and account-level output.
- `ExpansionAuditLog` records model runs and operator-visible events.

## Engine

`lib/expansion-engine.ts` provides pure functions for:

- scoring expansion readiness,
- inferring the best expansion motion,
- recommending an offer,
- computing expected expansion ARR, margin, pursuit cost, and payback,
- aggregating portfolio-level pipeline and recommendation.
