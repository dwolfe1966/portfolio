import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { actionPolicyEvidenceSnapshot, normalizeActionPolicyConfig, runActionPolicyExperiment } from "../lib/action-policy-experiment";
import { buildCasapPublicSimulationCases, CASAP_PUBLIC_EVIDENCE_ANALYSIS, deriveDebateCandidates, deriveInvestmentSynthesis, deriveExperienceSnapshot, derivePowerMap } from "../lib/compounding-expertise-lab";

test("action-policy configuration accepts decimals and clamps unsafe inputs", () => {
  const config = normalizeActionPolicyConfig({
    family: "CROSS_CUSTOMER_TRANSFER",
    cases: 9,
    customers: 99,
    sharedStructure: 0.625,
    outcomeNoise: 0.175,
    minimumEffect: 0
  });
  assert.equal(config.cases, 120);
  assert.equal(config.customers, 12);
  assert.equal(config.sharedStructure, 0.625);
  assert.equal(config.outcomeNoise, 0.175);
  assert.equal(config.minimumEffect, 0.001);

  const panel = readFileSync("components/compounding-expertise/ActionPolicyExperimentPanel.tsx", "utf8");
  for (const name of ["policyShared", "policyDrift", "policyEffect", "policyNoise", "policyCost", "policyMinimum"]) {
    assert.match(panel, new RegExp(`name="${name}"[^>]*step="any"`));
  }
});

test("action-policy runs are deterministic and generate inspectable synthetic trial cases", () => {
  const rows = buildCasapPublicSimulationCases();
  const config = { family: "CROSS_CUSTOMER_TRANSFER" as const, cases: 300, repetitions: 6, seed: 8123 };
  const first = runActionPolicyExperiment(config, rows);
  const second = runActionPolicyExperiment(config, rows);
  assert.deepEqual(first, second);
  assert.deepEqual(first.comparator, { candidate: "selective", comparison: "local", label: "selective pooling versus customer-local learning" });
  assert.equal(first.generatedCaseCount, 120);
  assert.ok(first.generatedRows.every(row => row.isSynthetic && row.notes?.includes("NOT OBSERVED COMPANY DATA")));
  assert.ok(first.generatedRows.every(row => row.sourceRecordType?.includes("action_policy_experiment")));
  assert.equal("generatedRows" in actionPolicyEvidenceSnapshot(first), false);
});

test("each supported debate selects the intended causal comparison", () => {
  const rows = buildCasapPublicSimulationCases();
  assert.equal(runActionPolicyExperiment({ family: "LEARNING_CAUSALITY", repetitions: 4 }, rows).comparator.comparison, "baseline");
  assert.equal(runActionPolicyExperiment({ family: "CROSS_CUSTOMER_TRANSFER", repetitions: 4 }, rows).comparator.comparison, "local");
  assert.equal(runActionPolicyExperiment({ family: "MARGINAL_INFORMATION_VALUE", repetitions: 4 }, rows).comparator.comparison, "limited");
  assert.equal(runActionPolicyExperiment({ family: "ECONOMIC_MATERIALITY", repetitions: 4 }, rows).comparator.comparison, "baseline");
});

test("applied action-policy results are dataset-scoped and flow into debates, Power, and Conclusion", () => {
  const rows = buildCasapPublicSimulationCases();
  const result = runActionPolicyExperiment({ family: "LEARNING_CAUSALITY", repetitions: 4 }, rows);
  const evidence = {
    evidenceType: "ACTION_POLICY_EXPERIMENT",
    epistemicStatus: "DERIVED",
    sourceCaseSetId: "casap-300",
    valueSnapshot: JSON.stringify(actionPolicyEvidenceSnapshot(result))
  };
  const input = {
    analysis: CASAP_PUBLIC_EVIDENCE_ANALYSIS.analysis,
    rows,
    debates: [],
    caseSetId: "casap-300",
    evidenceRecords: [evidence]
  };
  const debates = deriveDebateCandidates(input);
  const learning = debates.find(candidate => candidate.family === "LEARNING_CAUSALITY")!;
  assert.notEqual(learning.modeledAssessment, "NOT TESTED");
  assert.ok(learning.contextEvidence.some(item => item.source === "Experience → Action-Policy Experiment"));

  const powerMap = derivePowerMap(input);
  assert.ok(powerMap.powers.some(power => power.evidenceFor.some(item => item.source === "Experience → Action-Policy Experiment")));
  const synthesis = deriveInvestmentSynthesis({
    analysis: input.analysis,
    experience: deriveExperienceSnapshot(rows),
    debates,
    powerMap,
    stressTest: null
  });
  assert.match(synthesis.currentThesis, /Conditional experiment boundaries/);

  const foreign = deriveDebateCandidates({ ...input, evidenceRecords: [{ ...evidence, sourceCaseSetId: "another-dataset" }] });
  assert.equal(foreign.find(candidate => candidate.family === "LEARNING_CAUSALITY")!.modeledAssessment, "NOT TESTED");
});

test("action-policy workflow supports configure, run, review, apply, and child CaseSet persistence", () => {
  const panel = readFileSync("components/compounding-expertise/ActionPolicyExperimentPanel.tsx", "utf8");
  assert.match(panel, /1 · Configure experiment/);
  assert.match(panel, /ACTION-POLICY EXPERIMENT RUNNING/);
  assert.match(panel, /2 · RUN COMPLETE · REVIEW BEFORE APPLYING/);
  assert.match(panel, /3 · APPLY/);
  const actions = readFileSync("app/(demo)/compounding-expertise/actions.ts", "utf8");
  const apply = actions.slice(actions.indexOf("export async function applyActionPolicyExperimentAction"));
  assert.match(apply, /parentCaseSetId: parentCaseSet\?\.id/);
  assert.match(apply, /sourceCaseSetId: parentDatasetKey/);
  assert.match(apply, /ACTION_POLICY_EXPERIMENT/);
  const debates = readFileSync("app/(demo)/compounding-expertise/debates/page.tsx", "utf8");
  assert.match(debates, /Configure experiment/);
  assert.match(debates, /Action-policy result applied/);
});
