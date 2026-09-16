# Compounding Expertise Lab V0.1

## Product Purpose

Compounding Expertise Lab is an interactive research instrument for evaluating:

> Under what conditions does accumulated graded experience become durable competitive Power in an AI application?

The Lab is not designed to prove the thesis. It helps a user represent, measure, stress-test, and potentially falsify the claim.

Scores are structured assessments, not empirically validated measurements.

## Provenance

### HELMER

Hamilton Helmer's Seven Powers:

- Scale Economies
- Network Economies
- Counter-Positioning
- Switching Costs
- Branding
- Cornered Resource
- Process Power

### SUN

Ben Sun's Compounding Expertise thesis:

- Stores: model, playbook, plumbing, filing cabinet, scorebook
- Scorebook: case -> decision -> outcome -> grade
- Workflow/capture position
- Objective grading
- Feedback speed
- Freshness
- Diversity / edge-case coverage
- Cross-customer learning
- Contractual rights / consent
- Economic value of being right
- Scorebook as license to automate

### WOLFE EXTENSIONS

David Wolfe extensions:

- Cross-customer transferability
- Customer heterogeneity
- Marginal information gain
- Knowledge compressibility
- Causal quality
- Nonstationarity
- Learning efficiency / learning velocity
- Distinction between static historical data and the continuous process that generates new graded experience

These are not attributed to Ben Sun or Hamilton Helmer.

## V0.1 Workflow

The primary workflow has five stages:

1. Inputs: company, product, target customer, workflow, principal decisions, and current thesis.
2. Key Debates: 2-4 load-bearing debates with bull case, bear case, evidence needed, current probability, and belief-revision triggers.
3. Diagnostic: HELMER / SUN / WOLFE assessments with score, confidence, rationale, and evidence status.
4. Simulator: incumbent/challenger comparison with lagged feedback maturation.
5. Memo: concise synthesis preserving uncertainty and surfacing unresolved debates.

Overview and Docs are supporting routes, not numbered stages.

## Toy Simulator

The simulator uses monthly time steps over a 36-month horizon.

Feedback delay is implemented as a maturation lag:

- New cases enter a pending queue.
- They become effective graded experience only after `ceil(feedbackDelayDays / 30)` monthly steps.
- Accumulated effective experience decays by monthly staleness.

Effective experience:

```text
N_eff(t+1) =
  (1 - staleness_rate) * N_eff(t)
  + cases_whose_feedback_matures_at_t
```

Effective expertise:

```text
E(t) =
  base_capability
  + learning_efficiency
    * information_value
    * transferability
    * ln(1 + N_eff(t))
```

Inputs:

- Starting graded cases: existing effective scorebook volume.
- New cases per month: raw incoming cases.
- Feedback delay days: days before outcomes mature into graded cases.
- Transferability: 0-1 estimate of cross-context usefulness.
- Information value per case: 0-1 estimate of marginal informativeness.
- Learning efficiency: 0-1 estimate of how well the organization converts cases into product improvement.
- Staleness rate: monthly decay of accumulated effective experience.
- Base capability: starting capability from foundation models / non-scorebook sources.

This model is exploratory. It is not an empirical law or forecast.

## Evidence Statuses

- Observed: directly seen in product, customer, or operating data.
- Sourced: supported by cited materials or explicit external evidence.
- Assumed: a hypothesis used for structured reasoning.
- Unknown: not yet supported enough to score confidently.

AI-generated content is analysis/suggestion, not evidence. AI-generated assessments must default to Assumed or Unknown unless a user explicitly supplies evidence.

## Data Model

V0.1 adds:

- `CompoundingExpertiseAnalysis`
- `CompoundingExpertiseKeyDebate`
- `CompoundingExpertiseDimensionAssessment`
- `CompoundingExpertiseSimulationScenario`

Enums:

- `CompoundingFramework`: HELMER, SUN, WOLFE
- `CompoundingConfidence`: LOW, MEDIUM, HIGH
- `CompoundingEvidenceStatus`: OBSERVED, SOURCED, ASSUMED, UNKNOWN
- `CompoundingDebateSource`: SUN, WOLFE, USER, AI

The V0.1 schema does not implement the future production scorebook:

```text
Case -> Decision -> Outcome -> Grade
```

That belongs in V0.2+.

## Assumptions And Limitations

- Scores are structured judgments, not validated measurements.
- The simulator is intentionally transparent and incomplete.
- The synthetic claims/disputes example is fictional.
- No factual claims about real companies are bundled.
- AI debate generation is optional and degrades to manual/fallback content when unavailable.
- The memo preserves uncertainty and highlights unresolved debates rather than asserting a final moat.

## V0.2 Direction

Future versions should add:

- Production scorebook schema: Case -> Decision -> Outcome -> Grade.
- Empirical scorebooks with real outcome labels.
- Autonomy frontier measurement: where scorebook evidence permits automation.
- Information-theoretic metrics for marginal information gain and compressibility.
- Learning-loop measurement: feedback latency, label quality, update velocity, and cross-customer transfer tests.
- Evidence artifacts tied to Observed/Sourced statuses.
- More rigorous challenger simulation and benchmark support.
