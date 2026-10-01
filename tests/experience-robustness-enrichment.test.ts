import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { bootstrapWorldMeans, repeatRange } from "../lib/experiment-statistics";
import { ACTION_POLICY_FAMILIES, runActionPolicyExperiment, normalizeActionPolicyConfig, actionPolicyEvidenceSnapshot } from "../lib/action-policy-experiment";
import { actionPolicyReviewToken, assertActionPolicyReview } from "../lib/action-policy-review";
import { buildExperienceEnrichmentPlan, readExperimentMetadata } from "../lib/experience-enrichment";
import { CASAP_PUBLIC_EVIDENCE_ANALYSIS, buildCasapPublicSimulationCases, deriveDebateCandidates, deriveExperienceSnapshot, deriveInvestmentSynthesis, derivePowerMap } from "../lib/compounding-expertise-lab";

test("world bootstrap is deterministic and distinguishes CI from repeat-run variation", () => {
  const values = Array.from({ length: 20 }, (_, i) => i / 100);
  const ci = bootstrapWorldMeans(values, 1931), range = repeatRange(values);
  assert.deepEqual(ci, bootstrapWorldMeans(values, 1931));
  assert.ok(ci.low > range.low && ci.high < range.high);
  assert.equal(ci.clusters, 20);
  assert.equal(ci.level, 0.95);
  const constant = bootstrapWorldMeans([0.1, 0.1, 0.1], 12);
  assert.equal(constant.low, 0.1);
  assert.equal(constant.high, 0.1);
  assert.throws(() => bootstrapWorldMeans([], 12));
  assert.throws(() => bootstrapWorldMeans([0.1, NaN], 12));
});

test("empty config values use defaults, while valid zero costs remain zero", () => {
  const config = normalizeActionPolicyConfig({ interventionCost: 0, repetitions: "", valuePerOutcome: null });
  assert.equal(config.interventionCost, 0);
  assert.equal(config.repetitions, 12);
  assert.equal(config.valuePerOutcome, 100);
  assert.equal(normalizeActionPolicyConfig({ valuePerOutcome: Infinity, reviewCost: -1 }).reviewCost, 0);
});

test("high incremental cost challenges the economic thesis even with positive decision gain", () => {
  const config = { family: "ECONOMIC_MATERIALITY", cases: 600, patterns: 6, sharedStructure: 0.9, effectStrength: 0.4, outcomeNoise: 0, repetitions: 8 };
  const lowCost = runActionPolicyExperiment({ ...config, interventionCost: 0 });
  const highCost = runActionPolicyExperiment({ ...config, interventionCost: 100000 });
  assert.deepEqual(lowCost.gain, highCost.gain);
  assert.ok(highCost.robustness.netInterval.high < 0);
  assert.equal(highCost.finding.verdict, "CHALLENGES");
  assert.equal(highCost.robustness.netInterval.mean, Number((highCost.gain.mean * highCost.config.valuePerOutcome - 100000).toFixed(2)));
});

test("robustness reports predeclared time, sample, case-mix and unseen-customer checks", () => {
  const result = runActionPolicyExperiment({ repetitions: 4 });
  assert.equal(result.robustness.sensitivities.length, 5);
  assert.ok(result.robustness.smallReplicationWarning);
  assert.match(result.robustness.sensitivities.map(item => item.label).join(" "), /Earlier.*Later.*Half.*case mix.*Unseen/);
  assert.ok(result.segmentGains.every(segment => segment.ci.clusters === 4));
});

test("clear shared structure can support transfer rather than defaulting every scenario to inconclusive", () => {
  const result = runActionPolicyExperiment({ family: "CROSS_CUSTOMER_TRANSFER", cases: 1200, customers: 12, patterns: 6, sharedStructure: 1, drift: 0, effectStrength: 0.45, outcomeNoise: 0, minimumEffect: 0.001, interventionCost: 0, repetitions: 20 });
  assert.equal(result.finding.verdict, "SUPPORTS");
  assert.ok(result.robustness.ci.low >= result.config.minimumEffect);
  assert.equal(result.harmedSegments, 0);
  assert.ok(result.robustness.allStressPass);
});

test("Casap run compares three actions and produces four related debate conclusions", () => {
  const rows = buildCasapPublicSimulationCases();
  const config = { scenario: "CASAP_DISPUTES", cases: 300, repetitions: 4, seed: 14 };
  const result = runActionPolicyExperiment(config, rows);
  assert.deepEqual(result, runActionPolicyExperiment(config, rows));
  assert.equal(result.calibration.sourceCases, 300);
  assert.deepEqual(result.findings.map(item => item.family), [...ACTION_POLICY_FAMILIES]);
  for (const arm of Object.values(result.arms)) {
    assert.deepEqual(arm.actionShare.map(item => item.action), ["Refund", "Contest", "Manual review"]);
    assert.ok(Math.abs(arm.actionShare.reduce((total, item) => total + item.share, 0) - 1) < 0.001);
  }
  assert.equal(result.generatedCaseCount, 120);
  assert.ok(result.generatedRows.every(row => ["Refund", "Contest", "Manual review"].includes(row.actionTaken!)));
  const metadata = result.generatedRows.map(readExperimentMetadata);
  assert.ok(metadata.every(meta => meta.assignmentProbability === 0.5 && meta.schemaVersion === 1));
  for (const customer of new Set(result.generatedRows.map(row => row.customerSegment))) {
    const arms = new Set(result.generatedRows.filter(row => row.customerSegment === customer).map(row => readExperimentMetadata(row).trialArm));
    assert.equal(arms.size, 2, "Trial assignment must not be aliased with customer parity");
  }
  // No fabricated oracle confidence; grade is optimal-action quality, not outcome luck.
  assert.ok(result.generatedRows.every(row => row.agentConfidence === null));
  assert.ok(result.generatedRows.some(row => row.grade === "CORRECT" && row.outcome === "Simulated loss incurred"));
});

test("Casap trial economics reconcile exactly and never change source cases", () => {
  const rows = buildCasapPublicSimulationCases();
  const before = JSON.stringify(rows);
  const result = runActionPolicyExperiment({ scenario: "CASAP_DISPUTES", valuePerOutcome: 100, contestCost: 12, reviewCost: 24, interventionCost: 2, repetitions: 4 }, rows);
  for (const row of result.generatedRows) {
    const meta = readExperimentMetadata(row);
    const gross = row.outcome === "Avoided simulated loss" ? 0 : -100;
    assert.equal(row.outcomeValue, gross - Number(meta.operatingCost));
    assert.equal(row.isSynthetic, true);
  }
  assert.equal(JSON.stringify(rows), before);
});

test("enrichment identifies actual missing fields without assuming segments are customer IDs", () => {
  const rows = buildCasapPublicSimulationCases();
  const before = JSON.stringify(rows);
  const plan = buildExperienceEnrichmentPlan(rows, "casap-source", "Casap 300");
  assert.equal(plan.total, 300);
  assert.equal(plan.datasetKey, "casap-source");
  assert.equal(plan.checks.find(item => item.key === "customer")!.present, 0);
  assert.equal(plan.checks.find(item => item.key === "assignment")!.present, 0);
  assert.ok(plan.priorities.length > 0);
  assert.equal(JSON.stringify(rows), before);
  assert.equal(JSON.parse(plan.template.notes).ceExperiment.customerId, null);
});

test("generated trial metadata round trips through the existing Notes contract", () => {
  const result = runActionPolicyExperiment({ scenario: "CASAP_DISPUTES", repetitions: 4 });
  const plan = buildExperienceEnrichmentPlan(result.generatedRows, "child", "Trial");
  assert.equal(plan.jointTrialRows, result.generatedCaseCount);
  assert.ok(plan.checks.every(item => item.status === "COMPLETE"));
  assert.match(plan.caution, /not validation/);
});

test("enrichment rejects malformed metadata, invalid probabilities, and chronology", () => {
  const row = runActionPolicyExperiment({ repetitions: 4 }).generatedRows[0];
  assert.deepEqual(readExperimentMetadata({ ...row, notes: "not json" }), {});
  assert.deepEqual(readExperimentMetadata({ ...row, notes: "null" }), {});
  const meta = readExperimentMetadata(row);
  const changed = { ...row, outcomeAt: "invalid", notes: JSON.stringify({ ceExperiment: { ...meta, assignmentProbability: 1 } }) };
  const plan = buildExperienceEnrichmentPlan([changed], "x", "x");
  assert.equal(plan.checks.find(item => item.key === "assignment")!.present, 0);
  assert.equal(plan.checks.find(item => item.key === "chronology")!.present, 0);
  assert.equal(plan.jointTrialRows, 0);
  assert.equal(buildExperienceEnrichmentPlan([], "empty", "Empty").checks[0].status, "NO CASES");
});

test("review identity detects changed dataset, content, or configuration and tolerates row reorder", () => {
  const rows = buildCasapPublicSimulationCases();
  const result = runActionPolicyExperiment({ repetitions: 4 }, rows);
  const token = actionPolicyReviewToken(result, rows, "selected");
  assert.equal(assertActionPolicyReview(token, result, [...rows].reverse(), "selected"), token);
  assert.throws(() => assertActionPolicyReview(token, result, rows, "other"), /changed/);
  assert.throws(() => assertActionPolicyReview("", result, rows, "selected"), /changed/);
  assert.throws(() => assertActionPolicyReview(token, result, rows.map((row, i) => i ? row : { ...row, outcomeValue: 99 }), "selected"), /changed/);
  assert.throws(() => assertActionPolicyReview(token, { ...result, config: { ...result.config, seed: 55 } }, rows, "selected"), /changed/);
});

test("all four Casap findings propagate only to the selected parent dataset", () => {
  const rows = buildCasapPublicSimulationCases();
  const result = runActionPolicyExperiment({ scenario: "CASAP_DISPUTES", repetitions: 4 }, rows);
  const evidence = { evidenceType: "ACTION_POLICY_EXPERIMENT", epistemicStatus: "DERIVED", sourceCaseSetId: "parent", valueSnapshot: JSON.stringify(actionPolicyEvidenceSnapshot(result)) };
  const input = { analysis: CASAP_PUBLIC_EVIDENCE_ANALYSIS.analysis, rows, debates: [], caseSetId: "parent", evidenceRecords: [evidence] };
  const debates = deriveDebateCandidates(input, 8);
  for (const family of ACTION_POLICY_FAMILIES) {
    const debate = debates.find(item => item.family === family)!;
    assert.notEqual(debate.modeledAssessment, "NOT TESTED");
    assert.ok(debate.contextEvidence.some(item => item.source === "Experience → Action-Policy Experiment"));
    if (family === "LEARNING_CAUSALITY" || family === "ECONOMIC_MATERIALITY") {
      assert.match(debate.subclaimAssessments[1].reason, /policy/i);
      assert.doesNotMatch(debate.subclaimAssessments[1].reason, /matched policy comparison is needed/);
    }
  }
  const powerMap = derivePowerMap(input);
  assert.ok(powerMap.powers.some(item => item.evidenceFor.some(evidence => evidence.source === "Experience → Action-Policy Experiment")));
  const thesis = deriveInvestmentSynthesis({ analysis: input.analysis, experience: deriveExperienceSnapshot(rows), debates, powerMap, stressTest: null }).currentThesis;
  assert.match(thesis, /Conditional experiment boundaries/);
  assert.match(thesis, /Economic implication/);
  const foreign = deriveDebateCandidates({ ...input, caseSetId: "other" }, 8);
  assert.ok(foreign.filter(item => ACTION_POLICY_FAMILIES.some(family => family === item.family)).every(item => item.modeledAssessment === "NOT TESTED"));
});

test("UI exposes robustness, enrichment, saved child cases and stale-review validation", () => {
  const panel = readFileSync("components/compounding-expertise/ActionPolicyExperimentPanel.tsx", "utf8");
  assert.match(panel, /95% world-bootstrap CI/);
  assert.match(panel, /Download trial cases/);
  assert.match(panel, /name="reviewToken"/);
  for (const field of ["policyValue", "policyContestCost", "policyReviewCost"]) assert.match(panel, new RegExp(`name="${field}"[^>]*step="any"`));
  const page = readFileSync("app/(demo)/compounding-expertise/scorebook/page.tsx", "utf8");
  assert.match(page, /buildExperienceEnrichmentPlan\(activeRows/);
  assert.match(page, /Inspect \{child.caseCount\} trial cases/);
  const actions = readFileSync("app/(demo)/compounding-expertise/actions.ts", "utf8");
  assert.ok(actions.indexOf("assertActionPolicyReview(text(") < actions.indexOf("const sourceRecordId = `${result.version}:${reviewToken}`"));
});
