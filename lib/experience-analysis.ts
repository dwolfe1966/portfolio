import type { DebateFamily, ScorebookCaseInput } from "./compounding-expertise-lab";
import { runExperienceTransferExperiment } from "./experience-transfer-experiment";

export const EXPERIENCE_ENGINE_VERSION = "experience-engine-1.0";
type Model = "base-rate" | "pooled" | "local" | "blended";
export type ExperienceFinding = {
  id: string; family: DebateFamily; status: "MEASURED" | "TESTED" | "BLOCKED";
  summary: string; interpretation: string; nextTest: string; sample: number;
  metrics: Record<string, number | string | null>;
};
const timestamp = (value: Date | string | null | undefined) => value ? new Date(value).getTime() : NaN;
const resolved = (row: ScorebookCaseInput) => ["CORRECT", "INCORRECT", "PARTIALLY_CORRECT"].includes(row.grade);
const y = (row: ScorebookCaseInput) => row.grade === "CORRECT" ? 1 : 0;
const key = (row: ScorebookCaseInput) => JSON.stringify([row.decisionClassId ?? row.sourceRecordType ?? "", row.caseType]);
const average = (values: number[]) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
const fmt = (value: number | null) => value === null ? "unavailable" : value.toFixed(3);

// Normalize analytical fields at the boundary: database bookkeeping and join
// objects must not change the revision between page rendering and save/export.
export function canonicalExperienceInput(rows: ScorebookCaseInput[]) {
  const fields: (keyof ScorebookCaseInput)[] = ["externalCaseId", "caseSetId", "decisionClassId", "agentDecisionActionId", "humanDecisionActionId", "actionTakenActionId", "customerSegment", "caseType", "context", "agentDecision", "agentConfidence", "humanDecision", "humanOverride", "actionTaken", "outcome", "outcomeValue", "grade", "gradeConfidence", "decisionAt", "actionAt", "outcomeAt", "isEdgeCase", "isSynthetic", "sourceLabel", "sourceRecordId", "sourceRecordType", "sourceRecordRoute", "notes"];
  return JSON.stringify(rows.map(row => JSON.stringify(Object.fromEntries(fields.map(name => {
    const value = row[name];
    return [name, ["decisionAt", "actionAt", "outcomeAt"].includes(name) && value ? Number.isFinite(timestamp(value as string | Date)) ? new Date(value as string | Date).toISOString() : String(value) : value ?? null];
  })))).sort());
}

function evaluate(train: ScorebookCaseInput[], testRows: ScorebookCaseInput[], model: Model) {
  const ordered = [...train].sort((a, b) => timestamp(a.outcomeAt) - timestamp(b.outcomeAt));
  type Pool = { count: number; correct: number; patterns: Map<string, { count: number; correct: number }> };
  const empty = (): Pool => ({ count: 0, correct: 0, patterns: new Map() });
  const all = empty();
  const groups = new Map<string, Pool>();
  let cursor = 0;
  const add = (pool: Pool, row: ScorebookCaseInput) => {
    pool.count++; pool.correct += y(row);
    const value = pool.patterns.get(key(row)) ?? { count: 0, correct: 0 };
    value.count++; value.correct += y(row); pool.patterns.set(key(row), value);
  };
  const predict = (pool: Pool, row: ScorebookCaseInput, baseOnly = false) => {
    const base = (pool.correct + 1) / (pool.count + 2);
    const match = pool.patterns.get(key(row));
    return baseOnly ? base : ((match?.correct ?? 0) + 4 * base) / ((match?.count ?? 0) + 4);
  };
  return testRows.map(row => {
    while (cursor < ordered.length && timestamp(ordered[cursor].outcomeAt) < timestamp(row.decisionAt)) {
      const item = ordered[cursor++];
      add(all, item);
      const pool = groups.get(item.customerSegment) ?? empty();
      add(pool, item); groups.set(item.customerSegment, pool);
    }
    const local = groups.get(row.customerSegment) ?? empty();
    const prediction = model === "base-rate" ? predict(all, row, true) : model === "local" ? predict(local, row) : model === "blended" ? (predict(local, row) + predict(all, row)) / 2 : predict(all, row);
    return { caseId: row.externalCaseId, segment: row.customerSegment, prediction, loss: (prediction - y(row)) ** 2, available: all.count };
  });
}

export function analyzeExperience(rows: ScorebookCaseInput[]) {
  const identities = new Map<string, number>();
  for (const row of rows) if (row.externalCaseId) identities.set(row.externalCaseId, (identities.get(row.externalCaseId) ?? 0) + 1);
  const duplicates = rows.filter(row => row.externalCaseId && identities.get(row.externalCaseId)! > 1).length;
  const eligible = rows.filter(row => !(row.externalCaseId && identities.get(row.externalCaseId)! > 1) && resolved(row) && row.caseType && Number.isFinite(timestamp(row.decisionAt)) && Number.isFinite(timestamp(row.outcomeAt)) && timestamp(row.outcomeAt) >= timestamp(row.decisionAt))
    .sort((a, b) => timestamp(a.decisionAt) - timestamp(b.decisionAt) || a.externalCaseId.localeCompare(b.externalCaseId));
  const cut = (fraction: number) => eligible.length ? timestamp(eligible[Math.min(eligible.length - 1, Math.floor(eligible.length * fraction))].decisionAt) : NaN;
  const validationStart = cut(0.6), testStart = cut(0.8);
  const train = eligible.filter(row => timestamp(row.decisionAt) < validationStart);
  const validation = eligible.filter(row => timestamp(row.decisionAt) >= validationStart && timestamp(row.decisionAt) < testStart);
  const development = eligible.filter(row => timestamp(row.decisionAt) < testStart);
  const testRows = eligible.filter(row => timestamp(row.decisionAt) >= testStart);
  const grouped = eligible.filter(row => row.customerSegment).length === eligible.length;
  const models: Model[] = grouped ? ["base-rate", "pooled", "local", "blended"] : ["base-rate", "pooled"];
  const ready = train.length >= 20 && validation.length >= 10 && testRows.length >= 20 && train.filter(row => timestamp(row.outcomeAt) < validationStart).length >= 10 && development.filter(row => timestamp(row.outcomeAt) < testStart).length >= 20;
  const validationScores = ready ? models.map(model => ({ model, brier: average(evaluate(train, validation, model).map(item => item.loss))! })).sort((a, b) => a.brier - b.brier || models.indexOf(a.model) - models.indexOf(b.model)) : [];
  const selected = validationScores[0]?.model ?? null;
  const evaluations = ready ? models.map(model => ({ model, cases: evaluate(development, testRows, model) })) : [];
  const scores = evaluations.map(item => ({ model: item.model, brier: average(item.cases.map(row => row.loss))!, count: item.cases.length }));
  const selectedScore = scores.find(item => item.model === selected)?.brier ?? null;
  const baselineScore = scores.find(item => item.model === "base-rate")?.brier ?? null;
  const curve = ready ? [0.25, 0.5, 0.75, 1].map(fraction => {
    // Keep the same held-out cases and estimator at every training size.
    const end = Math.max(1, Math.floor(development.length * fraction));
    const boundary = timestamp(development[Math.min(end, development.length - 1)].decisionAt);
    const cohort = fraction === 1 ? development : development.filter(row => timestamp(row.decisionAt) < boundary);
    return { fraction, trainingCases: cohort.length, brier: average(evaluate(cohort, testRows, "pooled").map(item => item.loss))! };
  }) : [];
  const segmentResults = [...new Set(testRows.map(row => row.customerSegment))].sort().map(segment => {
    const local = evaluations.find(item => item.model === "local")?.cases.filter(item => item.segment === segment) ?? [];
    const pooled = evaluations.find(item => item.model === "pooled")?.cases.filter(item => item.segment === segment) ?? [];
    return { segment: segment || "Unspecified", count: pooled.length, local: average(local.map(item => item.loss)), pooled: average(pooled.map(item => item.loss)), delta: local.length && pooled.length ? average(local.map((item, i) => item.loss - pooled[i].loss)) : null };
  });
  const complete = rows.filter(row => row.agentDecision && row.actionTaken && row.outcome && resolved(row)).length;
  const values = rows.filter(row => typeof row.outcomeValue === "number" && Number.isFinite(row.outcomeValue));
  const economicByGrade = ["CORRECT", "PARTIALLY_CORRECT", "INCORRECT"].map(grade => {
    const subset = values.filter(row => row.grade === grade);
    return { grade, count: subset.length, mean: average(subset.map(row => row.outcomeValue!)) };
  });
  const firstRate = average(train.map(y)), lastRate = average(testRows.map(y));
  const reason = ready ? "" : `Need at least 20 training, 10 validation and 20 final-test cases with chronologically available grades; found ${train.length}/${validation.length}/${testRows.length}. At least 10 grades must be available before validation and 20 before final evaluation.`;
  const findings: ExperienceFinding[] = [
    { id: "capture", family: "EXPERIENCE_CAPTURE", status: rows.length ? "MEASURED" : "BLOCKED", summary: `${complete}/${rows.length} cases contain linked decisions, actions, outcomes and resolved grades.`, interpretation: "Measures usable feedback coverage; grade reliability requires independent regrading.", nextTest: "Audit incomplete rows and independently regrade a sample.", sample: rows.length, metrics: { complete, missing: rows.length - complete, duplicateIdentityRows: duplicates } },
    { id: "predictability", family: "LEARNING_CAUSALITY", status: ready ? "TESTED" : "BLOCKED", summary: ready ? `Validation selected ${selected}; final-test Brier ${fmt(selectedScore)} versus base-rate ${fmt(baselineScore)} on ${testRows.length} cases.` : reason, interpretation: "Tests whether past experience predicts grades on later cases. It does not measure improvement from choosing different actions.", nextTest: "Compare decisions made with and without the selected learner on a new evaluation batch.", sample: ready ? testRows.length : 0, metrics: { selected, selectedBrier: selectedScore, baselineBrier: baselineScore, gain: selectedScore === null || baselineScore === null ? null : baselineScore - selectedScore } },
    { id: "learning-curve", family: "MARGINAL_INFORMATION_VALUE", status: ready ? "TESTED" : "BLOCKED", summary: ready ? `With a fixed pooled estimator and evaluation set, Brier changes from ${fmt(curve[0].brier)} to ${fmt(curve[3].brier)} as training grows from ${curve[0].trainingCases} to ${curve[3].trainingCases} cases.` : reason, interpretation: "A fixed-test learning curve measures whether additional historical cases help this estimator; results may be non-monotonic.", nextTest: "Repeat on a fresh time window and examine changing case mix.", sample: ready ? testRows.length : 0, metrics: { firstBrier: curve[0]?.brier ?? null, lastBrier: curve[3]?.brier ?? null } },
    { id: "reconstruction-proxy", family: "REBUILDABILITY_COMPRESSION", status: ready ? "TESTED" : "BLOCKED", summary: ready ? `A one-number base-rate predictor scores ${fmt(baselineScore)}; the validation-selected learner scores ${fmt(selectedScore)}.` : reason, interpretation: "Measures how much this prediction task gains beyond a compact baseline. Both use the same historical data; this is not a competitor-access benchmark.", nextTest: "Compare against a challenger restricted to public features, rules and a fixed calibration budget.", sample: ready ? testRows.length : 0, metrics: { baseRateBrier: baselineScore, selectedBrier: selectedScore } },
    { id: "economics", family: "ECONOMIC_MATERIALITY", status: values.length ? "MEASURED" : "BLOCKED", summary: `${values.length}/${rows.length} cases carry finite economic values; mean recorded value ${fmt(average(values.map(row => row.outcomeValue!)))}.`, interpretation: "Grade-stratified values describe recorded stakes. Units and currency must be consistent before aggregation; these are not causal savings estimates.", nextTest: "Specify the value unit and compare policy outcomes under matched evaluation conditions.", sample: values.length, metrics: Object.fromEntries(economicByGrade.map(item => [item.grade, item.mean])) },
    { id: "time-shift", family: "LEARNING_CAUSALITY", status: train.length && testRows.length ? "MEASURED" : "BLOCKED", summary: `Correct-grade rate: early ${fmt(firstRate)}, late ${fmt(lastRate)}.`, interpretation: "Descriptive time shift may reflect case mix, policy or grading changes; it is not attributed to learning.", nextTest: "Compare matched decision types across time and identify policy/model versions.", sample: eligible.length, metrics: { firstRate, lastRate } }
  ];
  return {
    engineVersion: EXPERIENCE_ENGINE_VERSION,
    profile: { total: rows.length, eligible: eligible.length, excluded: rows.length - eligible.length, duplicateIdentityRows: duplicates, groups: new Set(rows.map(row => row.customerSegment).filter(Boolean)).size, decisionTypes: new Set(rows.map(key)).size, linked: complete, economicValueRows: values.length,
      missing: { group: rows.filter(row => !row.customerSegment).length, caseType: rows.filter(row => !row.caseType).length, decision: rows.filter(row => !row.agentDecision).length, action: rows.filter(row => !row.actionTaken).length, outcome: rows.filter(row => !row.outcome).length, grade: rows.filter(row => !resolved(row)).length, decisionTime: rows.filter(row => !Number.isFinite(timestamp(row.decisionAt))).length, outcomeTime: rows.filter(row => !Number.isFinite(timestamp(row.outcomeAt))).length },
      invalidChronology: rows.filter(row => timestamp(row.outcomeAt) < timestamp(row.decisionAt)).length },
    protocol: { task: "Predict CORRECT versus other resolved grades", features: ["decisionClassId/sourceRecordType", "caseType", "customerSegment (local/blended only)"], training: train.length, validation: validation.length, finalTest: testRows.length, split: "Chronological 60/20/20; tied timestamps stay together; feedback must precede prediction; final-test labels never select a model.", selection: "Lowest validation Brier; ties prefer the simpler model. Fixed Beta(1,1) base prior and four-case pattern shrinkage.", inference: "Descriptive estimator comparisons; no significance or causal claim. Final-test comparisons and learning curves are reported together, not cherry-picked." },
    ready, blockedReason: reason, validationScores, selected, scores, curve, segmentResults, economicByGrade, findings,
    transfer: runExperienceTransferExperiment(rows.filter(row => !(row.externalCaseId && identities.get(row.externalCaseId)! > 1))),
    predictions: evaluations,
    nextExperiments: [
      { name: "Action-policy trial", required: "Identified available actions plus randomized assignment, logged propensities, or an explicit reward simulator", status: "REQUIRES_DESIGN" },
      { name: "Customer-level transfer", required: "Verified customer IDs, permitted pooling scope and a held-out customer protocol", status: "REQUIRES_DESIGN" },
      { name: "Budgeted challenger", required: "Competitor-access feature set and calibration budget", status: "REQUIRES_DESIGN" }
    ]
  };
}
export type ExperienceAnalysis = ReturnType<typeof analyzeExperience>;
