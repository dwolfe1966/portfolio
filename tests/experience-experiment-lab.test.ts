import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { CASAP_PUBLIC_EVIDENCE_ANALYSIS, buildCasapPublicSimulationCases, deriveDebateAssessment, deriveDebateCandidates, deriveExperienceSnapshot, deriveInvestmentSynthesis, derivePowerMap } from "../lib/compounding-expertise-lab";
import { normalizeSyntheticWorld, runSyntheticExperimentLab } from "../lib/experience-experiment-lab";
import { buildAutomatedExperimentPlan, runAutomatedExperimentProgram } from "../lib/experience-experiment-program";

const base = { customers: 5, casesPerCustomer: 200, patterns: 12, repetitions: 12, seed: 4107, outcomeNoise: 0.15, missingFeedback: 0.05 };

test("custom experiment form accepts dataset-calibrated decimal values", () => {
  const source = readFileSync("components/compounding-expertise/ExperimentLabPanel.tsx", "utf8");
  for (const name of ["worldShared", "worldDrift", "worldNoise", "worldMissing"]) {
    assert.match(source, new RegExp(`name="${name}"[^>]*step="any"`));
  }
});

test("synthetic experiment runs are deterministic and normalize unsafe inputs", () => {
  const config = normalizeSyntheticWorld({ customers: 999, repetitions: 1, sharedStructure: -2, missingFeedback: 9, seed: 0 });
  assert.deepEqual(config, { customers: 12, casesPerCustomer: 200, patterns: 12, sharedStructure: 0, drift: 0.15, outcomeNoise: 0.15, missingFeedback: 0.8, challengerCalibration: 25, repetitions: 3, seed: 1 });
  assert.deepEqual(runSyntheticExperimentLab(base), runSyntheticExperimentLab(base));
});

test("pooling is supported by shared worlds and challenged by customer-specific worlds", () => {
  const shared = runSyntheticExperimentLab({ ...base, sharedStructure: 0.9, drift: 0.1 });
  const specific = runSyntheticExperimentLab({ ...base, sharedStructure: 0.05, drift: 0.1 });
  assert.equal(shared.findings.find(item => item.id === "pooling")!.verdict, "SUPPORTS");
  assert.ok(shared.pooling.pooled.mean > shared.pooling.local.mean);
  assert.equal(specific.findings.find(item => item.id === "pooling")!.verdict, "CHALLENGES");
  assert.ok(specific.pooling.pooled.mean < specific.pooling.local.mean);
});

test("experience selection exposes drift and full-history boundaries", () => {
  const stable = runSyntheticExperimentLab({ ...base, sharedStructure: 0.8, drift: 0 });
  const drifting = runSyntheticExperimentLab({ ...base, sharedStructure: 0.8, drift: 1 });
  assert.equal(stable.findings.find(item => item.id === "selection")!.metrics.best, "full");
  assert.equal(drifting.findings.find(item => item.id === "selection")!.metrics.best, "recent");
  assert.ok(drifting.selection.recent.mean > drifting.selection.full.mean);
});

test("challenger calibration closes rather than fabricates a reconstruction gap", () => {
  const none = runSyntheticExperimentLab({ ...base, sharedStructure: 0.3, drift: 0.1, challengerCalibration: 0 });
  const broad = runSyntheticExperimentLab({ ...base, sharedStructure: 0.3, drift: 0.1, challengerCalibration: 500 });
  assert.ok(none.reconstruction.gap.mean > broad.reconstruction.gap.mean);
  assert.ok(broad.reconstruction.challenger.mean > none.reconstruction.challenger.mean);
});

test("saved experiments are isolated by dataset and flow into debates and Power as conditional context", () => {
  const result = runSyntheticExperimentLab({ ...base, sharedStructure: 0.9, drift: 0.1 });
  const evidence = {
    evidenceType: "SYNTHETIC_EXPERIMENT",
    epistemicStatus: "DERIVED",
    sourceCaseSetId: "selected",
    valueSnapshot: JSON.stringify(result)
  };
  const input = {
    analysis: CASAP_PUBLIC_EVIDENCE_ANALYSIS.analysis,
    rows: buildCasapPublicSimulationCases(),
    debates: [],
    caseSetId: "selected",
    evidenceRecords: [evidence]
  };
  const debate = deriveDebateAssessment(input, "CROSS_CUSTOMER_TRANSFER");
  assert.match(debate.assessmentReason, /Conditional simulation/);
  assert.ok(debate.evidenceFor.some(item => item.source === "Experience → Experiment Lab" && item.direction === "CONTEXT-DESCRIPTIVE"));
  const power = derivePowerMap(input).powers.find(item => item.key === "network_economies")!;
  assert.ok(power.evidenceFor.some(item => item.source === "Experience → Experiment Lab"));

  const foreign = deriveDebateAssessment({ ...input, evidenceRecords: [{ ...evidence, sourceCaseSetId: "other" }] }, "CROSS_CUSTOMER_TRANSFER");
  assert.doesNotMatch(foreign.assessmentReason, /Conditional simulation/);
  const unscoped = deriveDebateAssessment({ ...input, evidenceRecords: [{ ...evidence, sourceCaseSetId: null }] }, "CROSS_CUSTOMER_TRANSFER");
  assert.doesNotMatch(unscoped.assessmentReason, /Conditional simulation/);
});

test("automated planner calibrates to the selected dataset and returns mechanism boundaries", () => {
  const rows = buildCasapPublicSimulationCases();
  const plan = buildAutomatedExperimentPlan(rows);
  assert.equal(plan.profile.cases, 300);
  assert.equal(plan.profile.customers, 5);
  assert.equal(plan.tests.length, 3);
  assert.ok(plan.profile.sharedPatterns > 0);
  assert.ok(plan.calibrated.sharedStructure < 0.5);

  const result = runAutomatedExperimentProgram(rows);
  assert.equal(result.findings.length, 3);
  assert.ok(result.generatedCases > 10_000);
  assert.match(result.findings.find(item => item.id === "pooling")!.headline, /pooling threshold/);
  assert.match(result.findings.find(item => item.id === "selection")!.worksWhen, /history|drift/i);
  assert.match(result.findings.find(item => item.id === "reconstruction")!.headline, /challenger|gap/i);
  assert.deepEqual(result, runAutomatedExperimentProgram(rows));
});

test("automated suite conclusions remain dataset-scoped conditional context downstream", () => {
  const result = runAutomatedExperimentProgram(buildCasapPublicSimulationCases());
  const evidence = { evidenceType: "SYNTHETIC_EXPERIMENT_SUITE", epistemicStatus: "DERIVED", sourceCaseSetId: "selected", valueSnapshot: JSON.stringify(result) };
  const input = { analysis: CASAP_PUBLIC_EVIDENCE_ANALYSIS.analysis, rows: buildCasapPublicSimulationCases(), debates: [], caseSetId: "selected", evidenceRecords: [evidence] };
  const debate = deriveDebateAssessment(input, "REBUILDABILITY_COMPRESSION");
  assert.ok(debate.evidenceFor.some(item => item.source === "Experience → Automated Experiment Program" && item.value.includes("Works when:") && item.value.includes("Fails when:")));
  assert.ok(derivePowerMap(input).powers.find(item => item.key === "cornered_resource")!.evidenceFor.some(item => item.source === "Experience → Automated Experiment Program"));
  const debates = deriveDebateCandidates(input);
  const powerMap = derivePowerMap(input);
  const synthesis = deriveInvestmentSynthesis({ analysis: input.analysis, experience: deriveExperienceSnapshot(input.rows), debates, powerMap, stressTest: null });
  assert.match(synthesis.currentThesis, /Conditional experiment boundaries/);
  const foreign = deriveDebateAssessment({ ...input, evidenceRecords: [{ ...evidence, sourceCaseSetId: "other" }] }, "REBUILDABILITY_COMPRESSION");
  assert.equal(foreign.evidenceFor.some(item => item.source === "Experience → Automated Experiment Program"), false);
});
