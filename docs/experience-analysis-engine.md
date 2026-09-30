# Experience analysis engine v1.1

Version 1.1 changes interpretation, not the experiment splits or scoring: learning summaries expose all curve increments and validation/final ranking reversals; reconstruction is marked blocked until an actual restricted-access challenger is evaluated. Economic-value coverage remains descriptive rather than proof of incremental benefit. Unknown rights and Power inputs remain unknown instead of matching negative substrings. Existing v1.0 snapshots remain downloadable but are not labeled current under v1.1.

The selected dataset is profiled and analyzed before debate interpretation. `analyzeExperience` is company-independent: it accepts normalized scorebook cases and produces a serializable report. Debate assessments, Power context, AI suggestion inputs, and the investment memo consume these findings. Cards are not redesigned in this phase.

## Protocol

- Profile linked decision/action/outcome/grade coverage, missing fields, duplicate external case IDs, chronology, groups, patterns and economic-value availability.
- Exclude all records with duplicate external case IDs from experiments, rather than allowing duplicates across splits. Resolve ingestion conflicts before rerunning.
- For predictive experiments, require resolved grades, case type, decision and outcome timestamps, with outcome at or after decision.
- Split chronologically 60/20/20; timestamp ties remain together. Fit using only feedback available strictly before the scored decision. Require 20 training, 10 validation, 20 final cases, and minimum available feedback before each evaluation phase.
- Compare base-rate, pooled-pattern, local-pattern and equal local/pooled blend models. Local models are enabled only with complete group identifiers. Prediction target is CORRECT versus other resolved grades. Smoothing is fixed, not tuned on the final set.
- Choose the lowest validation Brier; tie-break toward the earlier, simpler model. Refit on development data and report every candidate on the final set without retrospectively changing the selected model.
- Compare 25/50/75/100% of development history with one fixed pooled estimator on the same final cases. This curve is descriptive; it is not four independent confirmations.
- Report local-versus-pooled effects per group, early/late grade rates, and economic values by grade. Economic units must be consistent; no causal savings are inferred.
- Retain the existing independently specified 70/30 transfer probe as a separate report with its own method, not as another sample of the 60/20/20 test.

The one-number predictor is a compression baseline on identical data access. It does not model a competitor's actual cost or access. Action-policy, verified-customer transfer, and budgeted-challenger trials are explicit next experiments requiring additional inputs. No reward surface or causal assignment is silently invented.

## Run records

`createExperienceRun` combines a SHA-256 revision of canonical analytical input and dataset identity with the engine version. Row order, date representation and ORM bookkeeping do not alter the revision. Data edits or dataset identity changes do.

The Experience page computes current results. Saving recomputes server-side, validates the page's expected run ID, checks analysis access, and stores a complete typed snapshot using the existing `CompoundingEvidence` record store (`evidenceType=ANALYSIS_RUN`, `epistemicStatus=DERIVED`). These snapshots are excluded from evidence classification and evidence-coverage counts; they cannot become extra corroborating sources. No database migration is required.

Snapshots contain input cases, method, candidate validation/final scores, per-case predictions, group effects, learning curve, findings, and next-experiment requirements. Saved runs remain immutable; re-saving an identical run normally reuses it. Concurrent identical saves may create redundant records, but cannot overwrite another result. Saved/current comparisons use the full run ID. A scoped export endpoint downloads current or explicitly selected saved runs with private/no-store headers. Previous runs are never silently used as current results.

## Acceptance coverage

Tests use unfamiliar workflows with shared patterns, conflicting groups, random labels, sparse feedback, duplicate identifiers and invalid chronology. They check final-label isolation, source-flag parity, deterministic replay, dataset/content revision changes, and downstream learning-curve interpretation. A changed source label affects provenance/revision, not the numerical scoring rule.

## Remaining scope

Dataset-bound AI narrative persistence and saved simulator-run fingerprints remain separate follow-ups from the earlier audit. This phase supplies reusable analytical findings and versioned analysis runs; it does not claim every existing saved object has been migrated. Further model search should use a new engine version and a fresh evaluation period, rather than repeated tuning on the same final set.
