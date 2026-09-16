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

The primary workflow has six stages as of V0.1.1:

1. Inputs: company, product, target customer, workflow, principal decisions, and current thesis.
2. Key Debates: 2-4 load-bearing debates with bull case, bear case, evidence needed, current probability, and belief-revision triggers.
3. Diagnostic: HELMER / SUN / WOLFE assessments with score, confidence, rationale, and evidence status.
4. Scorebook: inspect and edit case-level rows behind the scorebook claim.
5. Simulator: incumbent/challenger comparison with lagged feedback maturation.
6. Memo: concise synthesis preserving uncertainty, scorebook evidence, and unresolved debates.

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

V0.1.1 adds:

- `CompoundingExpertiseCase`

Enums:

- `CompoundingFramework`: HELMER, SUN, WOLFE
- `CompoundingConfidence`: LOW, MEDIUM, HIGH
- `CompoundingEvidenceStatus`: OBSERVED, SOURCED, ASSUMED, UNKNOWN
- `CompoundingDebateSource`: SUN, WOLFE, USER, AI
- `CompoundingCaseGrade`: CORRECT, PARTIALLY_CORRECT, INCORRECT, UNRESOLVED

The V0.1.1 case table is intentionally minimal and inspection-oriented. Fields that can legitimately be missing before resolution are nullable, including human final decision, action taken, outcome, economic outcome value, outcome timestamp, and notes. A row with no observed outcome should normally remain `UNRESOLVED`.

The V0.1.1 schema is still not a full production scorebook system:

```text
Case -> Decision -> Outcome -> Grade
```

It is a first inspectable representation for theory testing. A richer empirical scorebook belongs in V0.2+.

## V0.1.1 Scorebook Inspection

The scorebook is a central object in the Compounding Expertise thesis. A Lab that assesses scorebook quality without showing the underlying graded cases would hide the most important evidence.

The Scorebook page adds:

- A spreadsheet-like editable case table.
- Filters for segment, case type, grade, human override, edge case, resolution state, and source/synthetic status.
- Derived metrics from current rows:
  - total cases
  - outcome completion
  - grade coverage
  - agent correctness rate
  - human override rate
  - median feedback latency
  - edge-case share
  - total and average economic outcome where available
- Human Override Value diagnostics for cases where the human final decision differs from the agent decision.

These metrics remain descriptive. They do not prove causality or durable Power.

### Example Archetypes

V0.1.1 includes five theory-testing examples:

- Casap: strong Compounding Expertise candidate.
- Listen Labs: ambiguous case where accumulated research may not equal a graded decision scorebook.
- Aaru / model-first research: challenge case where model capability may substitute for proprietary experience.
- Maybern: alternative Power case where deterministic rails/schema may matter more.
- Creative Marketing Agent: negative control with high volume but subjective/noisy grading.

### Synthetic-Data Policy

Bundled case-level rows are never company data.

Casap, Listen Labs, Aaru, and Maybern may appear as company-analysis archetypes, but their case rows are explicitly labeled as synthetic illustrative fixtures, for example:

```text
SYNTHETIC ILLUSTRATIVE DATA - Synthetic disputes scorebook, not Casap data
```

Creative Marketing Agent is entirely synthetic. The examples are test fixtures designed to stress the theory, not to make the thesis succeed.

### Simulator Bridge

The scorebook can populate only defensible simulator inputs in V0.1.1:

- starting graded cases
- median feedback delay

The following remain theoretical assumptions and are not inferred automatically:

- information value per case
- transferability
- learning efficiency
- staleness
- base model capability

### Future Information-Theoretic Work

Case data is structured so future versions can investigate:

- marginal information gain
- redundancy
- cross-customer transfer
- knowledge compressibility
- causal quality
- autonomy thresholds

V0.1.1 does not implement mathematically rigorous versions of those metrics.

## Assumptions And Limitations

- Scores are structured judgments, not validated measurements.
- The simulator is intentionally transparent and incomplete.
- Bundled case-level records are synthetic illustrative fixtures, not actual company data.
- Real-company archetype labels do not imply factual company metrics or proprietary operational data.
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

## V0.2 UX / Epistemic Model

V0.2 reorganizes the Lab around the user journey:

```text
UNDERSTAND -> OBSERVE -> HYPOTHESIZE -> TEST -> DECIDE
```

The primary workflow is now:

1. Overview
2. System & Environment
3. Scorebook
4. Key Debates
5. Diagnostic
6. Simulator
7. Conclusion

Scorebook now precedes Key Debates and Diagnostic because users should inspect the available experience before making abstract framework judgments. The scorebook is the object under test: cases, decisions, human overrides, outcomes, and grades.

### Endogenous vs Exogenous

System & Environment separates:

- Compounding Opportunity: exogenous market/problem properties such as cost of wrong decisions, outcome objectivity, feedback time, heterogeneity, nonstationarity, and foundation-model improvement.
- Compounding Capability: endogenous company/product properties such as owning the decision point, observing outcomes, capturing overrides and grades, learning across customers, contractual rights, experimentation, model/policy update cadence, and deployment speed.

The Lab does not collapse these into one overall score. Opportunity and capability can diverge.

### Evidence And Assumptions

The UX distinguishes:

- Observed / derived: directly calculated from rows or observed in operating evidence.
- Sourced: supported by external evidence.
- Endogenous assumption: company-controlled variable currently assumed.
- Exogenous assumption: market or environment variable currently assumed.
- Unknown: insufficient evidence.

This keeps visible the difference between what is known, what is assumed, and what management can change.

### Diagnostic Structure

The diagnostic is grouped around three questions:

- Is valuable expertise being created?
- Does the expertise compound?
- Is the expertise defensible?

HELMER is presented as a strategic interpretation layer: Compounding Expertise may reinforce Scale Economies, Network Economies, Counter-Positioning, Switching Costs, Branding, Cornered Resource, or Process Power, but the Lab does not assume Compounding Expertise is automatically a distinct eighth Power.

### Simulator Input Grouping

The simulator keeps the V0.1.1 mathematics unchanged. Inputs are grouped as:

- Observed / derived from scorebook: starting graded cases and feedback latency.
- Company levers / endogenous assumptions: learning efficiency, case generation, and related operating choices.
- Market conditions / exogenous assumptions: transferability, staleness/nonstationarity, and base/foundation-model capability.

Some variables are mixed in reality. Transferability and base capability can be influenced by both market structure and company architecture, so the UI labels them as scenario assumptions rather than empirical facts.

### Conclusion Philosophy

Conclusion replaces Memo as the visible endpoint. It answers:

- What do we currently believe about Compounding Opportunity?
- What do we currently believe about Company Compounding Capability?
- How strong is the evidence?
- Where might Power actually reside?
- What is the biggest unresolved debate?
- What is the best next experiment or evidence request?

It preserves uncertainty and avoids a fake moat score.

### Next Analytical Layers - Do Not Implement In This Pass

1. Information Theory / Shannon Layer
   - entropy
   - redundancy
   - marginal information gain
   - cross-customer mutual information / transfer
   - knowledge compressibility
   - decision-relevant value of information

2. Autonomy Frontier
   - empirical decision classes
   - success/error distributions
   - downside/risk
   - human override value
   - evidence thresholds for autonomous action
   - migration of case classes from expert-only -> review -> autonomous

These are intentionally deferred until the UX and epistemic flow are validated.

## V0.2.1 Canonical Tests And CaseSets

V0.2.1 turns the five examples into a canonical test suite. These are not demos optimized to make Compounding Expertise look correct. Each one isolates a different theoretical claim:

- Positive test: Casap, where objectively graded, economically consequential repeated decisions should be a favorable CE environment.
- Boundary test: Listen Labs, where proprietary knowledge may be valuable without becoming a decision -> outcome -> grade scorebook.
- Substitution / compression test: Aaru, where model or simulation capability may compress the value of historical experience.
- Alternative Power test: Maybern, where durable Power may reside in deterministic rails, schema, Process Power, or Switching Costs rather than CE.
- Negative control: Creative Marketing Agent, where high volume and fast feedback can still fail because grading is noisy, confounded, subjective, or redundant.

The example metadata is theoretical fixture metadata, not empirical company measurement. Bundled case rows remain explicitly labeled:

```text
SYNTHETIC ILLUSTRATIVE DATA - NOT COMPANY DATA
```

### CaseSet Architecture

Compounding Expertise Lab should not fundamentally own every case. It is an analytical layer over experience generated by operating systems.

The intended long-term flow is:

```text
SOURCE SYSTEM -> RUN / EXPERIMENT -> CASE SET -> CE ANALYSIS
```

And the reverse pivot is:

```text
CE ANALYSIS -> SOURCE SYSTEM -> MODIFY ASSUMPTIONS / POLICY -> RUN NEW EXPERIMENT -> NEW CASE SET -> CE ANALYSIS
```

A CaseSet is a coherent collection of cases produced by a simulation run, experiment, model/policy version, operational time window, imported dataset, manual entry, or canonical synthetic fixture. V0.2.1 adds a lightweight CaseSet model with provenance, source-system metadata, run/version fields, parent/derivation support, and a nullable relation from cases to CaseSets.

Existing analyses and unassigned rows remain valid. Missing outcomes, grades, human decisions, and economic values remain valid because absence is itself evidence about scorebook quality.

### CaseSet Is Not Automatically A Scorebook

A CaseSet becomes scorebook-like only to the extent that it contains:

- decisions
- actions
- observed outcomes
- meaningful grades
- enough provenance to connect learning back to the generating process

This distinction matters for boundary cases. A research corpus, filing cabinet, or synthetic simulation output may be a CaseSet without being a strong scorebook.

### Source System Pivot

CaseSets may carry:

- `sourceSystemKey`
- `sourceSystemLabel`
- `sourceRunId`
- `sourceRoute`
- `sourceExternalUrl`

When a safe internal `sourceRoute` exists, the Scorebook page can show “Open source system.” For future closed-loop experiments, links should preserve a simple return context:

```text
?returnTo=compounding-expertise&analysisId=<analysisId>&caseSetId=<caseSetId>
```

This is intentionally lightweight. It establishes the interaction model without creating a global navigation-state framework.

### Adapter Boundary

V0.2.1 defines a small internal adapter contract:

```text
CECaseSetAdapter
  sourceSystemKey
  sourceSystemLabel
  listAvailableRuns(...)
  describeRun(runId)
  buildCaseSet(runId)
```

Adapters return normalized CE cases. They do not require every source system to populate every field. Outcomes, grades, human decisions, and economic values can be null or unresolved.

Pricing is the initial source-system candidate because it already has segments, variants, experiments, guardrails, simulations, and auditable decisions. V0.2.1 establishes the descriptor and route convention but does not yet implement a full Pricing export pipeline.

### Future Experiment Loop

The design supports a future loop:

1. CE identifies an unresolved debate.
2. The user opens a source app such as Pricing.
3. The source app modifies policy, assumptions, or experiment configuration.
4. The source app runs a new simulation or experiment.
5. The run exports a new CaseSet.
6. CE compares CaseSet A vs CaseSet B.
7. The user updates belief.

This will be required for later CaseSet comparisons such as model version A vs B, policy version A vs B, customer cohort A vs B, earlier vs later time windows, source-system simulation vs real outcomes, and synthetic vs observed evidence.

### Still Deferred

V0.2.1 does not implement:

- Shannon entropy
- redundancy analysis
- marginal information gain
- cross-customer mutual information
- knowledge compressibility metrics
- causal inference
- Autonomy Frontier
- production ingestion pipelines

Those remain future analytical layers after the CaseSet/source-system abstraction and UX are validated.

### V0.2.1 Structural Object Model

The Lab now makes the analytical hierarchy more explicit:

```text
COMPANY
-> ENVIRONMENT
-> LEARNING ARCHITECTURE
-> CASE SETS
-> CASE -> DECISION -> HUMAN INTERVENTION -> ACTION -> OUTCOME -> GRADE
-> COMPOUNDING EXPERTISE
-> DURABLE POWER
```

System & Environment is organized into four layers:

- Company identity: company name, URL, product category, product description, target customer, business model, workflow, principal decision, action space, and stage.
- Compounding Opportunity: exogenous properties such as cost of error, outcome objectivity, natural feedback time, case frequency, heterogeneity, nonstationarity, and foundation-model improvement.
- Compounding Capability: endogenous properties such as decision-point ownership, action control, outcome observation, override/grade capture, cross-customer learning, learning rights, experimentation, update cadence, and deployment speed.
- Competitive Architecture: assumptions about whether useful learning is defensible, including data exclusivity, workflow embeddedness, switching costs, rebuildability, foundation-model dependence, deterministic infrastructure, distribution, and regulatory/contractual barriers.

The key distinction is:

```text
valuable learning != defensible learning
```

### CaseSet And Case Refinements

CaseSets now support time windows and source/run metadata so future comparisons can distinguish Q1 vs Q2, model version A vs B, policy version A vs B, customer cohort A vs B, synthetic benchmark vs production, and control vs treatment.

Cases preserve:

- decision timestamp
- action timestamp
- outcome timestamp
- source record id
- source record type
- source record route

This supports future pivots from CE analysis back to the operational record that generated a case. The implementation remains deliberately lightweight; no production source-system adapters are built in this pass.
