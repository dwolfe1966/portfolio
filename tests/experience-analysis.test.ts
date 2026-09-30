import assert from "node:assert/strict";
import test from "node:test";
import { analyzeExperience } from "../lib/experience-analysis";
import { createExperienceRun } from "../lib/experience-run";
import { buildCasapPublicSimulationCases, deriveDebateCandidates, deriveDebateAssessment, summarizeEvidenceCoverage, CASAP_PUBLIC_EVIDENCE_ANALYSIS, type ScorebookCaseInput } from "../lib/compounding-expertise-lab";

function fixture(kind: "shared" | "conflicting" | "noise"): ScorebookCaseInput[] {
  let state = 91823;
  return Array.from({ length: 400 }, (_, i) => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const group = i % 4;
    const pattern = Math.floor(i / 4) % 2;
    const correct = kind === "shared" ? pattern === 0 : kind === "conflicting" ? group < 2 : state / 2 ** 32 > 0.5;
    return { externalCaseId: `case-${i}`, customerSegment: `group-${group}`, caseType: `pattern-${pattern}`, decisionClassId: "decision", context: "Unfamiliar workflow", agentDecision: "act", actionTaken: "act", outcome: "resolved", grade: correct ? "CORRECT" : "INCORRECT", humanOverride: false, isEdgeCase: false, isSynthetic: true, sourceLabel: "Acceptance fixture", decisionAt: new Date(Date.UTC(2020, 0, i + 1)), outcomeAt: new Date(Date.UTC(2020, 0, i + 2)) };
  });
}
const source = { analysisId: "test", datasetKey: "chosen", datasetName: "Unknown company", provenance: "Test" };

test("unfamiliar shared patterns yield predictive learning beyond the base rate", () => {
  const report = analyzeExperience(fixture("shared"));
  assert.equal(report.ready, true);
  const pooled = report.scores.find(item => item.model === "pooled")!.brier;
  assert.ok(pooled < 0.01);
  assert.ok(report.scores.find(item => item.model === "base-rate")!.brier > 0.2);
  assert.ok(report.curve.at(-1)!.brier < report.curve[0].brier);
});

test("conflicting groups select local learning and expose negative transfer", () => {
  const report = analyzeExperience(fixture("conflicting"));
  assert.equal(report.selected, "local");
  assert.ok(report.segmentResults.every(item => item.delta! < -0.1));
});

test("noise and sparse feedback do not receive a fabricated learning conclusion", () => {
  const report = analyzeExperience(fixture("noise"));
  const gains = report.scores.map(item => report.scores[0].brier - item.brier);
  assert.ok(Math.max(...gains) < 0.05);
  const sparse = analyzeExperience(fixture("shared").map(row => ({ ...row, outcomeAt: null })));
  assert.equal(sparse.ready, false);
  assert.equal(sparse.scores.length, 0);
  assert.equal(sparse.findings.find(item => item.id === "predictability")!.status, "BLOCKED");
});

test("final labels never influence selection or predictions", () => {
  const rows = fixture("shared");
  const before = analyzeExperience(rows);
  const after = analyzeExperience(rows.map((row, i) => i >= 320 ? { ...row, grade: row.grade === "CORRECT" ? "INCORRECT" : "CORRECT" } : row));
  assert.equal(before.selected, after.selected);
  assert.deepEqual(before.validationScores, after.validationScores);
  assert.deepEqual(before.predictions.map(item => item.cases.map(row => row.prediction)), after.predictions.map(item => item.cases.map(row => row.prediction)));
  assert.notDeepEqual(before.scores, after.scores);
});

test("run revisions ignore row ordering and ORM bookkeeping but change with content", () => {
  const rows = fixture("shared");
  const run = createExperienceRun(rows, source);
  assert.equal(run.runId, createExperienceRun([...rows].reverse(), source).runId);
  assert.equal(run.runId, createExperienceRun(rows.map(row => ({ ...row, updatedAt: new Date(), decisionAt: new Date(row.decisionAt!).toISOString() })), source).runId);
  assert.notEqual(run.runId, createExperienceRun(rows.map((row, i) => i ? row : { ...row, grade: "INCORRECT" }), source).runId);
  assert.notEqual(run.runId, createExperienceRun(rows, { ...source, datasetKey: "other" }).runId);
  assert.deepEqual(analyzeExperience(run.inputSnapshot), run.report);
});

test("duplicate identities and chronology errors are excluded; source flags do not change scoring", () => {
  const rows = fixture("shared");
  assert.equal(analyzeExperience([...rows, rows[0]]).profile.duplicateIdentityRows, 2);
  assert.equal(analyzeExperience(rows.map(row => ({ ...row, outcomeAt: new Date("1900-01-01") }))).profile.eligible, 0);
  assert.deepEqual(analyzeExperience(rows).scores, analyzeExperience(rows.map(row => ({ ...row, isSynthetic: false }))).scores);
});

test("Casap learning curves flow into debate reasoning", () => {
  const rows = buildCasapPublicSimulationCases();
  const debates = deriveDebateCandidates({ analysis: CASAP_PUBLIC_EVIDENCE_ANALYSIS.analysis, rows, debates: [] });
  const curve = debates.find(item => item.family === "MARGINAL_INFORMATION_VALUE")!;
  assert.match(curve.assessmentReason, /training grows/);
  assert.ok(curve.contextEvidence.some(item => item.value.includes("fixed pooled estimator")));
});

test("foreign dataset evidence and stored runs cannot become extra corroboration", () => {
  const input = { analysis: { ...CASAP_PUBLIC_EVIDENCE_ANALYSIS.analysis, contractualLearningRights: "YES" }, debates: [], rows: [], caseSetId: "selected", evidenceRecords: [{ epistemicStatus: "SOURCED", fieldKey: "contractualLearningRights", sourceCaseSetId: "other", valueSnapshot: "Cross-customer training is permitted" }] };
  assert.equal(deriveDebateAssessment(input, "LEARNING_RIGHTS").assessment, "UNPROVEN");
  assert.equal(deriveDebateAssessment({ ...input, evidenceRecords: input.evidenceRecords.map(record => ({ ...record, sourceCaseSetId: "selected" })) }, "LEARNING_RIGHTS").assessment, "LEANING SUPPORTED");
  assert.deepEqual(summarizeEvidenceCoverage([{ epistemicStatus: "DERIVED", evidenceType: "ANALYSIS_RUN" }]), { derived: 0, sourced: 0, assumed: 0, inferred: 0, unknown: 0 });
});
