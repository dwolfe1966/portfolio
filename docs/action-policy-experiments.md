# Action-policy experiments: robustness, enrichment, and Casap

The Experiment Lab now supports the remaining capabilities 4–6. These extend
the selected-dataset Configure → Run → Review → Apply workflow.

## 4. Statistical robustness

- Each independently seeded world is a bootstrap cluster. The 95% percentile
  bootstrap interval estimates the mean paired policy-value difference under
  the configured simulator, using 1,000 resamples. The 10th–90th repeat-world
  range is reported separately and is not labeled a confidence interval.
- The comparison, minimum effect, and five stress checks are fixed before
  evaluation: 45% and 75% training cutoffs, half the original training history,
  a worst-customer-heavy case mix, and leave-one-customer-out evaluation.
- Segment harm and unresolved safety are separate. Segment intervals are
  pointwise, not a family-wise guarantee. Fewer than 12 worlds triggers a warning.
- A SUPPORTS verdict requires the effect interval above the minimum effect,
  no materially harmed or unresolved-safety segments, and positive material
  mean effects in all stress conditions. CHALLENGES requires an upper interval
  at or below zero; other results identify their mixed/fragile boundaries.
- Economic verdicts additionally require net value after incremental cost to
  clear the minimum effect in the configured value units. Arm tables include
  action operating costs, and the comparison subtracts incremental cost once.
- Historical actions are randomized. Policies fit only logged action/reward
  histories; latent potential outcomes are used solely for simulation scoring.
  Local priors use only the customer's history. Limited-history and full-history
  policies use the same estimator so data volume is the comparison variable.

## 5. Experience-enrichment assistant

The assistant audits only active selected rows. It reports valid-field counts,
joint contract coverage, a prioritized collection plan, and related debates.
It distinguishes segment labels from customer IDs and rejects invalid dates,
invalid probabilities, malformed metadata, and inconsistent time ordering.
Multiple value units are surfaced before pooling economics.

The downloadable plan includes a null-valued template and a versioned extension
stored in the existing case `notes` field as JSON under `ceExperiment`. This
round-trips through the current Notes editor without a database migration.
The user supplies actual source values; the assistant does not backfill data.
Coverage does not validate experimental assignment or automatically enable a
causal estimator. Existing predictive analyses continue to operate unchanged.

Required extension fields: `customerId`, `policyVersion`, `experimentId`,
`trialArm`, `assignmentProbability`, `valueUnit`, `operatingCost`,
`preDecisionFeatures`, and `gradingMethod`. The probability is for assignment
to the trial arm, not for selection of an individual action. `outcomeValue`
is the net realized value, so cost must not be subtracted from it again.

## 6. Casap dispute-action workflow

The Casap preset compares Refund, Contest, and Manual review. Configurable
dispute amount and action costs turn action choices into net economics. All
five policies (baseline, local, pooled, selective, and limited history) see
identical held-out worlds. One run returns four related debate findings:
learning, transfer, marginal information, and economics. They are not counted
as four independent studies. The selected debate determines the detailed
robustness view and which two arms appear in the generated trial CaseSet.

Source row count, segment count, pattern count, and the median absolute
recorded outcome value inform defaults. The last is a scale proxy, not an
estimated dispute amount. Reward surfaces, costs, drift, sharing, and causal
effects remain visible assumptions. This is not a fitted model of Casap.

Saved rows are a randomized trial from the first repeated world, not the
entire multi-world study. Trial assignment uses a separate random stream so
it cannot be determined by customer parity. Grades measure optimal-action
quality; realized outcome success may differ. Trial metadata, policy versions,
assignment probabilities, cost, and audit-only potential outcomes are retained.

## Persistence and application

- Preview identity hashes normalized source content, dataset identity, engine
  version, configuration, and complete result. Apply recomputes and refuses a
  changed preview before writing.
- Stable primary keys and transactional upserts keep repeated/concurrent Apply
  calls from creating duplicate CaseSets, evidence records, or trial rows.
- The evidence record is scoped to the selected parent dataset. The child is
  separate, remains synthetic, and is inspectable from the saved-runs panel.
- All Casap findings enter the existing Debate → Power → Conclusion path.
  Evidence is loaded chronologically so latest-result selection does not depend
  on alphabetical field names. Investor belief is not overwritten.
- A virtual source dataset is recorded by its dataset key even if it has no
  persisted CaseSet parent foreign key.

Run regression tests with `node --import tsx --test tests/**/*.test.ts` and
verify the production build with `npm run build`.
