# Pricing Experimentation Control Tower — Demo App Spec

Working spec for demo app #4: an operator console for planning, running, monitoring, and deciding segmented pricing and packaging experiments. Mirrors the case study at `/projects/pricing-experimentation-control-tower`.

This is the source of truth for build scope. The demo should feel like a practical pricing operating system: hypothesis design, cohort assignment, exposure/holdout integrity, guardrail monitoring, and promotion/rollback decisions in one place.

## Identity

- **Name**: Pricing Control Tower
- **Route prefix**: `/pricing/*`
- **DemoSideNav app key**: `pricing`
- **Position in nav**: fourth demo app, alongside lifecycle, acquisition, and auction. Lives in the `(demo)` route group, wrapped by `DemoAppShell app="pricing"`.
- **Tag line**: "Segmented pricing experiments with guardrails for margin, churn, and decision quality."

## Goals

1. A visitor lands in `/pricing/overview` and immediately understands the operating loop: hypothesis → cohorts → exposure → guardrails → decision.
2. The demo demonstrates pricing rigor, not generic analytics: every experiment has an explicit hypothesis, target segment, variant, holdout, minimum sample, guardrails, and decision owner.
3. The engine can simulate pricing experiment outcomes with deterministic, testable business logic.
4. The UI makes risk visible: margin floor, churn ceiling, support-load cap, confidence threshold, and holdout health.
5. The case-study KPIs are first-class: ARPU lift, gross margin floor, and decision cycle time.
6. Visual + structural language matches the existing demo design system.

## Non-goals

- Real billing-provider integration.
- Real production price changes.
- Full statistical package. Use transparent demo-grade calculations for lift, confidence, and guardrail status.
- Multi-tenant account administration.

## Information Architecture

Primary pages:

| Route | Purpose |
|---|---|
| `/pricing/overview` | Architecture explainer + readiness counts: active experiments, segments, variants, guardrail alerts, pending decisions |
| `/pricing/inputs` | Configure segments, price/packaging variants, experiment hypothesis, holdout percentage, guardrail thresholds |
| `/pricing/simulations` | Run experiment simulations across segments; scenario controls for conversion, churn, margin, and support-load sensitivity |
| `/pricing/outputs` | Experiment results: ARPU lift, conversion delta, churn delta, margin impact, support burden, confidence, decision recommendation |
| `/pricing/decisions` | Operator decision queue: promote, extend, pause, or roll back experiments with rationale capture |

Operations pages:

| Route | Purpose |
|---|---|
| `/pricing/audit` | Audit feed of exposure changes, guardrail breaches, simulation runs, and operator decisions |
| `/pricing/segments` | Segment library: eligibility rules, baseline economics, risk profile, and active experiment exposure |

Detail pages:

| Route | Purpose |
|---|---|
| `/pricing/experiments/[id]` | Full experiment detail: hypothesis, cohorts, variants, guardrails, daily trend, decision history |

## Core Demo Story

The visitor should see that pricing is not a one-off spreadsheet exercise. It is an operating loop:

1. Define a commercial hypothesis.
2. Select eligible segments.
3. Assign control/treatment exposure while preserving holdout.
4. Track revenue lift against margin, churn, and customer-experience guardrails.
5. Decide whether to promote, extend, pause, or roll back.
6. Capture the rationale and retain the experiment history.

## Domain Model

### Experiment

```ts
type PricingExperiment = {
  id: string;
  name: string;
  hypothesis: string;
  owner: string;
  state: "DRAFT" | "RUNNING" | "PAUSED" | "DECISION_READY" | "PROMOTED" | "ROLLED_BACK";
  segmentIds: string[];
  controlVariantId: string;
  treatmentVariantIds: string[];
  holdoutPercent: number;
  minimumSampleSize: number;
  startedAt?: Date;
  decisionDueAt?: Date;
};
```

### Segment

```ts
type PricingSegment = {
  id: string;
  name: string;
  eligibilityRule: string;
  baselineConversionRate: number;
  baselineChurnRate: number;
  baselineArpuCents: number;
  grossMarginPercent: number;
  monthlyVolume: number;
  riskBand: "low" | "medium" | "high";
};
```

### Variant

```ts
type PricingVariant = {
  id: string;
  name: string;
  monthlyPriceCents: number;
  annualPriceCents?: number;
  packagingChange: string;
  marginImpactPercent: number;
  expectedSupportLoadDelta: number;
};
```

### Guardrail Policy

```ts
type PricingGuardrailPolicy = {
  minGrossMarginPercent: number;
  maxChurnDeltaPercent: number;
  maxSupportLoadDelta: number;
  minConfidence: number;
  minHoldoutPercent: number;
  ownerApprovalRequired: boolean;
};
```

## Experiment Engine

### Inputs

The pure engine accepts:

- Experiment definition.
- Segment baselines.
- Variant definitions.
- Guardrail policy.
- Scenario assumptions for conversion lift, churn sensitivity, support-load sensitivity, and demand elasticity.

### Simulation Logic

For each segment and variant:

1. Allocate volume into control, treatment, and holdout cohorts.
2. Estimate conversion rate using baseline conversion plus scenario lift/elasticity.
3. Estimate churn using baseline churn plus price-change sensitivity.
4. Estimate ARPU from price and conversion.
5. Estimate gross margin after variant margin impact.
6. Estimate support burden from packaging complexity and scenario sensitivity.
7. Compute net revenue impact vs control.
8. Classify each guardrail as healthy, watch, or unhealthy.
9. Produce a decision recommendation.

### Decision Recommendation

```ts
type PricingDecisionRecommendation =
  | "promote"
  | "extend"
  | "pause"
  | "rollback";
```

Rules:

- `rollback`: any critical guardrail is unhealthy: gross margin below floor, churn delta above cap, or holdout broken.
- `pause`: support load is unhealthy or sample integrity is compromised.
- `extend`: sample size or confidence is insufficient, but guardrails remain healthy/watch.
- `promote`: confidence passes threshold and all guardrails are healthy.

### Output KPIs

```ts
type PricingExperimentResult = {
  experimentId: string;
  arpuLiftPercent: number;
  conversionDeltaPercent: number;
  churnDeltaPercent: number;
  grossMarginPercent: number;
  netRevenueLiftCents: number;
  supportLoadDelta: number;
  confidence: number;
  holdoutHealth: "healthy" | "watch" | "unhealthy";
  recommendation: PricingDecisionRecommendation;
};
```

## Schema

Proposed Prisma models:

```prisma
model PricingSegment {
  id                      String   @id @default(cuid())
  name                    String
  eligibilityRule          String
  baselineConversionRate   Float
  baselineChurnRate        Float
  baselineArpuCents        Int
  grossMarginPercent       Float
  monthlyVolume            Int
  riskBand                 String
  createdAt                DateTime @default(now())
  experimentSegments       PricingExperimentSegment[]
}

model PricingVariant {
  id                      String   @id @default(cuid())
  name                    String
  monthlyPriceCents        Int
  annualPriceCents         Int?
  packagingChange          String
  marginImpactPercent      Float
  expectedSupportLoadDelta Float
  createdAt                DateTime @default(now())
  experimentVariants       PricingExperimentVariant[]
}

model PricingExperiment {
  id                      String   @id @default(cuid())
  name                    String
  hypothesis              String
  owner                   String
  state                   String   @default("DRAFT")
  holdoutPercent           Float
  minimumSampleSize        Int
  minGrossMarginPercent    Float
  maxChurnDeltaPercent     Float
  maxSupportLoadDelta      Float
  minConfidence            Float
  startedAt                DateTime?
  decisionDueAt            DateTime?
  createdAt                DateTime @default(now())
  segments                 PricingExperimentSegment[]
  variants                 PricingExperimentVariant[]
  runs                     PricingExperimentRun[]
  decisions                PricingDecision[]
  auditLogs                PricingAuditLog[]
}

model PricingExperimentSegment {
  id            String @id @default(cuid())
  experimentId  String
  segmentId     String
  experiment    PricingExperiment @relation(fields: [experimentId], references: [id])
  segment       PricingSegment @relation(fields: [segmentId], references: [id])

  @@unique([experimentId, segmentId])
}

model PricingExperimentVariant {
  id            String @id @default(cuid())
  experimentId  String
  variantId     String
  role          String // "control" | "treatment"
  experiment    PricingExperiment @relation(fields: [experimentId], references: [id])
  variant       PricingVariant @relation(fields: [variantId], references: [id])

  @@unique([experimentId, variantId])
}

model PricingExperimentRun {
  id                     String   @id @default(cuid())
  experimentId            String
  arpuLiftPercent         Float
  conversionDeltaPercent  Float
  churnDeltaPercent       Float
  grossMarginPercent      Float
  netRevenueLiftCents     Int
  supportLoadDelta        Float
  confidence              Float
  holdoutHealth           String
  recommendation          String
  createdAt               DateTime @default(now())
  experiment              PricingExperiment @relation(fields: [experimentId], references: [id])
  segmentResults          PricingSegmentResult[]
}

model PricingSegmentResult {
  id                     String @id @default(cuid())
  runId                  String
  segmentId              String
  variantId              String
  sampleSize             Int
  conversionRate          Float
  churnRate               Float
  arpuCents              Int
  grossMarginPercent      Float
  netRevenueLiftCents     Int
  guardrailBand           String
  run                    PricingExperimentRun @relation(fields: [runId], references: [id])
}

model PricingDecision {
  id             String   @id @default(cuid())
  experimentId   String
  decision        String // "promote" | "extend" | "pause" | "rollback"
  rationale       String
  actor           String
  createdAt       DateTime @default(now())
  experiment      PricingExperiment @relation(fields: [experimentId], references: [id])
}

model PricingAuditLog {
  id             String   @id @default(cuid())
  experimentId   String?
  action         String
  actor          String
  detail         String
  createdAt      DateTime @default(now())
  experiment      PricingExperiment? @relation(fields: [experimentId], references: [id])
}
```

## Seed Data

Default segments:

- SMB monthly subscribers
- Mid-market annual subscribers
- High-usage power users
- Discount-sensitive lapsed accounts
- Enterprise expansion candidates

Default variants:

- Control: current monthly plan
- Treatment A: 8% price increase with no packaging change
- Treatment B: 12% increase with premium support bundle
- Treatment C: annual discount repositioning

Default experiments:

- "Premium support bundle for high-usage accounts"
- "Annual-plan repositioning for mid-market accounts"
- "Lapsed-account reactivation price test"

## UI Components

Likely components:

- `PricingExperimentBuilder`
- `PricingSegmentLibrary`
- `PricingVariantEditor`
- `PricingGuardrailPanel`
- `PricingSimulationPanel`
- `PricingResultTable`
- `PricingDecisionQueue`
- `PricingAuditFeed`
- `PricingExperimentStateControls`
- `PricingImpactTrendBars`

## API Routes

```txt
GET    /api/pricing/segments
POST   /api/pricing/segments
GET    /api/pricing/variants
POST   /api/pricing/variants
GET    /api/pricing/experiments
POST   /api/pricing/experiments
GET    /api/pricing/experiments/[id]
PATCH  /api/pricing/experiments/[id]
POST   /api/pricing/experiments/[id]/simulate
POST   /api/pricing/experiments/[id]/decisions
GET    /api/pricing/audit
GET    /api/pricing/health/demo-db
```

All API errors should use the existing structured API error contract.

## Phased Rollout

### Phase A — Engine + Schema

- Add pure pricing experiment engine in `lib/pricing-engine.ts`.
- Add validation helpers for segment, variant, experiment, policy, and decision payloads.
- Add Prisma migration for pricing models.
- Add unit tests for simulation math, guardrail classification, recommendation rules, and state transitions.

### Phase B — Inputs + CRUD

- Add `/pricing/inputs`, `/pricing/segments`, and experiment creation/editing surfaces.
- Add API routes for segments, variants, experiments.
- Seed default pricing segments, variants, and experiments.
- Add side-nav support for `pricing`.

### Phase C — Simulations + Outputs

- Add `/pricing/simulations`, `/pricing/outputs`, and `/pricing/experiments/[id]`.
- Implement simulation run persistence.
- Surface KPI cards, segment-level result table, guardrail bands, and trend bars.

### Phase D — Decisions + Audit

- Add `/pricing/decisions` and `/pricing/audit`.
- Implement promote/extend/pause/rollback controls with rationale capture.
- Persist decision records and audit logs.
- Add state-machine enforcement for experiment transitions.

### Phase E — Portfolio Integration + Polish

- Add `appHref: "/pricing/overview"` to the pricing project.
- Add Pricing Control Tower to home page featured/demo surfaces if desired.
- Add demo launch card support for `pricing`.
- Polish visual hierarchy and empty/schema-fallback states.
- Update backlog status.

## Acceptance Criteria

- All primary pricing routes render under the demo shell.
- A visitor can create or inspect a seeded pricing experiment.
- A visitor can run a simulation and see ARPU lift, churn delta, gross margin, support-load impact, confidence, and recommendation.
- Guardrail status is visible and mapped to healthy/watch/unhealthy bands.
- Decision queue supports promote, extend, pause, and rollback with rationale capture.
- Audit feed records simulations, guardrail breaches, state transitions, and decisions.
- Unit tests cover engine math, guardrail rules, recommendation logic, input validation, and state transitions.

## Open Decisions

1. Should Pricing Control Tower become the fourth featured project on Home, or should Home continue showing only the three live apps until implementation is complete?
2. Should pricing simulations model B2B subscription pricing, consumer subscription pricing, or both? Default: both through segment presets, but keep the first implementation subscription-oriented.
3. Should decision confidence be a transparent heuristic or a simplified statistical confidence calculation? Default: transparent heuristic for demo clarity.
4. Should operator decisions require a second approval for high-risk segments? Default: yes for `riskBand = "high"`.
