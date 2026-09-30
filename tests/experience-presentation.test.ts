import assert from "node:assert/strict";
import test from "node:test";
import { classifyLearningRights, deriveDebateAssessment, deriveDebateEvidenceRegistry, derivePowerMap, CASAP_PUBLIC_EVIDENCE_ANALYSIS, buildCasapPublicSimulationCases } from "../lib/compounding-expertise-lab";
import { analyzeExperience, EXPERIENCE_ENGINE_VERSION } from "../lib/experience-analysis";

const analysis = CASAP_PUBLIC_EVIDENCE_ANALYSIS.analysis;
test("unknown and negated permission text are not classified by substring", () => {
  for (const value of ["UNKNOWN", "UNKNOWN / DILIGENCE REQUIRED", "Not known", "Not restricted", "", null]) assert.equal(classifyLearningRights(value), "UNKNOWN");
  for (const value of ["NO", "NOT ALLOWED", "NOT PERMITTED", "DISALLOWED", "RESTRICTED — customer only"]) assert.equal(classifyLearningRights(value), "RESTRICTED");
  for (const value of ["YES", "ALLOWED", "PERMITTED — within contract scope"]) assert.equal(classifyLearningRights(value), "ALLOWED");
  const input = { analysis, rows: [], debates: [], learningArchitecture: { canTrainAcrossCustomers: "UNKNOWN" } };
  const result = deriveDebateAssessment(input, "LEARNING_RIGHTS");
  assert.equal(result.assessment, "UNKNOWN");
  assert.equal(result.evidenceAgainst.length, 0);
  assert.ok(result.missingEvidence.length);
  const restricted = deriveDebateEvidenceRegistry({ ...input, learningArchitecture: { canTrainAcrossCustomers: "NO" } }).LEARNING_RIGHTS;
  assert.equal(restricted.evidenceAgainst.length, 1);
  const power = derivePowerMap({ ...input, learningArchitecture: { usesOutcomeGradesForLearning: "UNKNOWN", deploymentCadence: "UNKNOWN" } });
  const process = power.powers.find(item => item.key === "process_power")!;
  assert.equal(process.subdimensions.find(item => item.label === "Update")!.state, "UNPROVEN");
  assert.equal(process.subdimensions.find(item => item.label === "Deploy")!.state, "UNPROVEN");
});

test("economic values measure stakes but cannot establish incremental policy benefit", () => {
  for (const rows of [buildCasapPublicSimulationCases(), buildCasapPublicSimulationCases().map(row => ({ ...row, isSynthetic: false })), []]) {
    const result = deriveDebateAssessment({ analysis, rows, debates: [] }, "ECONOMIC_MATERIALITY");
    assert.equal(result.assessment, "UNPROVEN");
    assert.ok(result.missingEvidence.some(item => item.value.includes("policy-value")));
    assert.equal(result.evidenceFor.some(item => item.direction === "SUPPORTS"), false);
  }
});

test("summaries expose reversal and never label a self-comparison a reconstruction test", () => {
  const report = analyzeExperience(buildCasapPublicSimulationCases());
  assert.equal(EXPERIENCE_ENGINE_VERSION, "experience-engine-1.1");
  assert.match(report.findings.find(item => item.id === "predictability")!.summary, /ranking changed across windows/);
  const curve = report.findings.find(item => item.id === "learning-curve")!;
  assert.match(curve.summary, /0.224 → 0.217 → 0.215 → 0.224/);
  assert.match(curve.summary, /reverses direction/);
  const reconstruction = report.findings.find(item => item.id === "reconstruction-proxy")!;
  assert.equal(reconstruction.status, "BLOCKED");
  assert.equal(reconstruction.sample, 0);
  assert.match(reconstruction.summary, /Reconstruction has not been tested/);
});
