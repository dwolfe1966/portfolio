import type { ScorebookCaseInput } from "./compounding-expertise-lab";

const time = (value: Date | string | null | undefined) => value ? new Date(value).getTime() : NaN;
const pattern = (row: ScorebookCaseInput) => JSON.stringify([row.decisionClassId ?? row.sourceRecordType ?? "", row.caseType]);
const resolved = (row: ScorebookCaseInput) => ["CORRECT", "PARTIALLY_CORRECT", "INCORRECT"].includes(row.grade);
const target = (row: ScorebookCaseInput) => row.grade === "CORRECT" ? 1 : 0;
const mean = (values: number[]) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;

/** Fixed protocol: final 30% in time, labels available before each prediction,
 * identical smoothed pattern estimators for local, pooled and other-segment data.
 * Predicts recorded grade, not the counterfactual value of a different action. */
export function runExperienceTransferExperiment(rows: ScorebookCaseInput[]) {
  const eligible = rows.filter(row => row.customerSegment && row.caseType && resolved(row) && Number.isFinite(time(row.decisionAt)) && Number.isFinite(time(row.outcomeAt)) && time(row.outcomeAt) >= time(row.decisionAt));
  const ordered = [...eligible].sort((a, b) => time(a.decisionAt) - time(b.decisionAt));
  const segments = [...new Set(ordered.map(row => row.customerSegment))].sort();
  const cutoff = ordered.length ? time(ordered[Math.floor(ordered.length * 0.7)].decisionAt) : NaN;
  const training = ordered.filter(row => time(row.decisionAt) < cutoff);
  const testing = ordered.filter(row => time(row.decisionAt) >= cutoff);
  const patterns = new Map<string, Set<string>>();
  for (const row of eligible) {
    const owners = patterns.get(pattern(row)) ?? new Set<string>();
    owners.add(row.customerSegment);
    patterns.set(pattern(row), owners);
  }
  const sharedPatterns = [...patterns.values()].filter(owners => owners.size > 1).length;
  const sharedCases = eligible.filter(row => patterns.get(pattern(row))!.size > 1).length;
  const predict = (train: ScorebookCaseInput[], row: ScorebookCaseInput) => {
    // Beta(1,1) prior, with a fixed four-observation shrinkage toward the
    // training pool's base rate. Hyperparameters never use held-out labels.
    const base = (train.reduce((n, item) => n + target(item), 0) + 1) / (train.length + 2);
    const matching = train.filter(item => pattern(item) === pattern(row));
    return (matching.reduce((n, item) => n + target(item), 0) + 4 * base) / (matching.length + 4);
  };
  const scored = testing.flatMap(row => {
    const available = training.filter(item => time(item.outcomeAt) < time(row.decisionAt));
    const local = available.filter(item => item.customerSegment === row.customerSegment);
    const others = available.filter(item => item.customerSegment !== row.customerSegment);
    if (local.length < 5 || others.length < 5) return [];
    const y = target(row);
    return [{ segment: row.customerSegment, local: (predict(local, row) - y) ** 2, pooled: (predict(available, row) - y) ** 2, others: (predict(others, row) - y) ** 2 }];
  });
  const bySegment = segments.map(segment => {
    const items = scored.filter(item => item.segment === segment);
    const local = mean(items.map(item => item.local));
    const pooled = mean(items.map(item => item.pooled));
    return { segment, count: items.length, local, pooled, delta: local === null || pooled === null ? null : local - pooled, others: mean(items.map(item => item.others)) };
  });
  const deltas = scored.map(item => item.local - item.pooled);
  const delta = mean(deltas);
  const local = mean(scored.map(item => item.local));
  const pooled = mean(scored.map(item => item.pooled));
  const enough = scored.length >= 20 && bySegment.filter(item => item.count >= 5).length >= 2;
  return { eligible: eligible.length, excluded: rows.length - eligible.length, segments: segments.length, patternCount: patterns.size, sharedPatterns, sharedCases, training: training.length, heldOut: testing.length, scored: scored.length, local, pooled, delta, bySegment, enough,
    finding: !enough ? "Insufficient held-out coverage" : delta! > 0.005 ? "Pooling improves grade prediction" : delta! < -0.005 ? "Pooling worsens grade prediction" : "No material pooling advantage",
    method: "Segment transfer probe v1: earliest 70% train, latest 30% test; only feedback available before each test decision is used. Predict CORRECT versus other resolved grades from decision class and case type. Same fixed smoothing in each arm; lower Brier score is better. A 0.005 Brier difference defines the descriptive effect band, not statistical significance.",
    scope: "Groups are customer segments, not identified customers. This tests transfer of grade prediction; improving chosen actions requires an action-policy experiment." };
}

export type ExperienceTransferExperiment = ReturnType<typeof runExperienceTransferExperiment>;
