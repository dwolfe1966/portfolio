import type { DebateFamily, ScorebookCaseInput } from "./compounding-expertise-lab";

export const EXPERIENCE_ENRICHMENT_VERSION = "experience-enrichment-1.0";
const nonempty = (value: unknown) => typeof value === "string" && value.trim().length > 0;
const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const date = (value: unknown) => (value instanceof Date || typeof value === "string") && Number.isFinite(new Date(value).getTime());

// Versioned extension carried in the existing Notes field, avoiding silent
// schema loss when a case is saved or exported by the current scorebook editor.
export function readExperimentMetadata(row: ScorebookCaseInput): Record<string, unknown> {
  try {
    const metadata = JSON.parse(row.notes ?? "{}").ceExperiment;
    return metadata?.schemaVersion === 1 && typeof metadata === "object" && !Array.isArray(metadata) ? metadata : {};
  } catch { return {}; }
}

type Requirement = { key: string; label: string; fields: string; why: string; collect: string; families: DebateFamily[]; test: (row: ScorebookCaseInput, meta: Record<string, unknown>) => boolean };
const requirements: Requirement[] = [
  { key: "linkage", label: "Decision → action → outcome → grade", fields: "externalCaseId, agentDecision, actionTaken, outcome, grade", why: "Establishes reusable graded experience.", collect: "Join event logs on stable case IDs; resolve missing grades without inventing outcomes.", families: ["EXPERIENCE_CAPTURE"], test: row => [row.externalCaseId, row.agentDecision, row.actionTaken, row.outcome].every(nonempty) && ["CORRECT", "INCORRECT", "PARTIALLY_CORRECT"].includes(row.grade) },
  { key: "chronology", label: "Decision and feedback timing", fields: "decisionAt, actionAt, outcomeAt", why: "Enables time-safe learning and drift tests.", collect: "Use event timestamps, including when feedback became available; require decision ≤ action ≤ outcome.", families: ["LEARNING_CAUSALITY", "MARGINAL_INFORMATION_VALUE"], test: row => date(row.decisionAt) && date(row.actionAt) && date(row.outcomeAt) && new Date(row.decisionAt!).getTime() <= new Date(row.actionAt!).getTime() && new Date(row.actionAt!).getTime() <= new Date(row.outcomeAt!).getTime() },
  { key: "customer", label: "Stable customer identity", fields: "notes.ceExperiment.customerId", why: "Separates actual held-out customers from broad segment labels.", collect: "Use pseudonymous tenant/customer IDs. Do not turn a segment label into a customer identity.", families: ["CROSS_CUSTOMER_TRANSFER"], test: (_, meta) => nonempty(meta.customerId) },
  { key: "features", label: "Pre-decision feature snapshot", fields: "notes.ceExperiment.preDecisionFeatures", why: "Allows richer interpretation without leaking outcomes into predictors.", collect: "Capture only information available at the decision timestamp; exclude grades, outcomes, and simulator truth.", families: ["LEARNING_CAUSALITY", "CROSS_CUSTOMER_TRANSFER"], test: (_, meta) => Boolean(meta.preDecisionFeatures && typeof meta.preDecisionFeatures === "object" && !Array.isArray(meta.preDecisionFeatures) && Object.keys(meta.preDecisionFeatures).length) },
  { key: "policy", label: "Policy/version and trial arm", fields: "notes.ceExperiment.policyVersion, experimentId, trialArm", why: "Defines which policy made the decision and the comparison being tested.", collect: "Log model/policy version at execution and a stable experiment ID with the assigned treatment/control arm.", families: ["LEARNING_CAUSALITY", "ECONOMIC_MATERIALITY"], test: (_, meta) => [meta.policyVersion, meta.experimentId, meta.trialArm].every(nonempty) },
  { key: "assignment", label: "Randomized arm assignment probability", fields: "notes.ceExperiment.assignmentProbability", why: "Supports a trial design audit; arm probability is not action propensity.", collect: "Record the actual probability of assigned trial arm at assignment time. Do not reconstruct it from observed outcome rates.", families: ["LEARNING_CAUSALITY", "CROSS_CUSTOMER_TRANSFER"], test: (_, meta) => finite(meta.assignmentProbability) && meta.assignmentProbability > 0 && meta.assignmentProbability < 1 },
  { key: "economics", label: "Net economic outcome, units, and costs", fields: "outcomeValue; notes.ceExperiment.valueUnit, operatingCost", why: "Allows policy value to be compared in consistent units after operating cost.", collect: "Store net outcomeValue plus explicit unit/currency and recorded cost. Use one unit per comparison or convert explicitly.", families: ["ECONOMIC_MATERIALITY"], test: (row, meta) => finite(row.outcomeValue) && nonempty(meta.valueUnit) && finite(meta.operatingCost) && meta.operatingCost >= 0 },
  { key: "grading", label: "Grading method", fields: "notes.ceExperiment.gradingMethod", why: "Distinguishes action quality from noisy outcome success.", collect: "Document grade rubric, grader, and independent regrade procedure; simulated optimal-action grades remain simulator truth.", families: ["EXPERIENCE_CAPTURE", "LEARNING_CAUSALITY"], test: (_, meta) => nonempty(meta.gradingMethod) }
];

export function buildExperienceEnrichmentPlan(rows: ScorebookCaseInput[], datasetKey: string, datasetName: string) {
  const metadata = rows.map(readExperimentMetadata);
  const checks = requirements.map(({ test, ...requirement }) => {
    const present = rows.filter((row, index) => test(row, metadata[index])).length;
    return { ...requirement, present, missing: rows.length - present, coverage: rows.length ? present / rows.length : 0,
      status: !rows.length ? "NO CASES" : present === rows.length ? "COMPLETE" : present ? "PARTIAL" : "MISSING" };
  });
  const units = [...new Set(metadata.map(meta => meta.valueUnit).filter(nonempty))];
  const jointTrialRows = rows.filter((row, index) => requirements.every(check => check.test(row, metadata[index]))).length;
  const priorities = [...checks].filter(check => check.status !== "COMPLETE").sort((a, b) => a.coverage - b.coverage || b.families.length - a.families.length).slice(0, 3);
  return {
    version: EXPERIENCE_ENRICHMENT_VERSION, datasetKey, datasetName, total: rows.length, checks, priorities, jointTrialRows, units,
    summary: rows.length ? `${jointTrialRows}/${rows.length} cases have the full proposed trial-data contract. ${checks.filter(check => check.status === "COMPLETE").length}/${checks.length} field groups are complete.` : "Choose or add a CaseSet to build a dataset-specific enrichment plan.",
    caution: units.length > 1 ? "Multiple value units detected. Normalize units before pooling economic outcomes." : "Field coverage is not validation of randomization, overlap, or causal identification. Existing descriptive and predictive analyses remain available.",
    template: { externalCaseId: "REPLACE_WITH_EXISTING_CASE_ID", notes: JSON.stringify({ ceExperiment: {
      schemaVersion: 1, customerId: null, policyVersion: null, experimentId: null, trialArm: null,
      assignmentProbability: null, valueUnit: null, operatingCost: null, preDecisionFeatures: {}, gradingMethod: null
    } }, null, 2) },
    schema: { storage: "JSON in the existing case Notes field under ceExperiment; preserve unrelated notes in a separate text property.",
      schemaVersion: 1, requiredFields: requirements.map(({ key, fields, why }) => ({ key, fields, why })),
      instruction: "Fill from source logs and paste into each corresponding case's Notes editor. Null placeholders are missing, not facts. This plan does not automatically backfill any case or enable a causal estimator." }
  };
}

export type ExperienceEnrichmentPlan = ReturnType<typeof buildExperienceEnrichmentPlan>;
