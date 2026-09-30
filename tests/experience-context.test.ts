import assert from "node:assert/strict";
import test from "node:test";
import { resolveExperienceContext } from "../lib/experience-context";
import { CASAP_PUBLIC_EVIDENCE_ANALYSIS, CASAP_PUBLIC_SIMULATION_CASESET_KEY, DEFAULT_SCENARIOS, buildCasapPublicSimulationCases, calculateScorebookMetrics, deriveDebateCandidates, deriveExperienceSnapshot, deriveInvestmentSynthesis, derivePowerMap, scorebookDerivedSimulatorValues, stressTestRunSearchParams } from "../lib/compounding-expertise-lab";
import { buildDebateGenerationPrompt } from "../lib/compounding-expertise-ai";

const analysis = { ...CASAP_PUBLIC_EVIDENCE_ANALYSIS.analysis, caseSets: [] };

test("virtual Experience selection survives workflow and stress-test round trips", () => {
  const context = resolveExperienceContext(analysis, []);
  assert.equal(context.activeRows.length, 300);
  assert.equal(context.dataset, CASAP_PUBLIC_SIMULATION_CASESET_KEY);
  const selection = Object.fromEntries(new URLSearchParams(context.datasetSuffix.slice(1)));
  assert.deepEqual(resolveExperienceContext(analysis, [], selection).activeRows, context.activeRows);
  const run = stressTestRunSearchParams({ analysisId: "a", dataset: context.dataset, templateId: "baseline", scenarios: DEFAULT_SCENARIOS });
  assert.equal(run.get("dataset"), context.dataset);
  assert.equal(resolveExperienceContext(analysis, [], Object.fromEntries(run)).activeRows.length, 300);
});

test("explicit persisted selections never mix cases; none stays empty; foreign selections fail", () => {
  const sets = [{ id: "one", name: "One", sourceType: "PRODUCTION", isSynthetic: false }, { id: "two", name: "Two", sourceType: "SYNTHETIC_SIMULATION", isSynthetic: true }];
  const rows = buildCasapPublicSimulationCases().slice(0, 3).map((row, i) => ({ ...row, caseSetId: i ? "two" : "one" }));
  const company = { ...analysis, caseSets: sets };
  assert.equal(resolveExperienceContext(company, rows, { caseSetId: "one" }).activeRows.length, 1);
  assert.equal(resolveExperienceContext(company, rows, { caseSetId: "two" }).activeRows.length, 2);
  assert.equal(resolveExperienceContext(company, rows, { dataset: "public-evidence-only" }).activeRows.length, 0);
  assert.throws(() => resolveExperienceContext(company, rows, { caseSetId: "foreign" }), /unavailable/);
});

test("300-case findings flow into debates, Power, conclusion, simulator and AI", () => {
  const context = resolveExperienceContext(analysis, []);
  const input = { analysis, rows: context.activeRows, debates: [], analysisId: "a", dataset: context.dataset };
  const debates = deriveDebateCandidates(input, 8);
  const capture = debates.find(item => item.family === "EXPERIENCE_CAPTURE")!;
  assert.equal(capture.assessment, "LEANING SUPPORTED");
  assert.match(capture.evidenceFor[0].value, /291\/300/);
  assert.equal(new URL(capture.evidenceFor[0].href!, "https://example.test").searchParams.get("dataset"), context.dataset);
  assert.equal(debates.find(item => item.family === "LEARNING_CAUSALITY")!.assessment, "UNPROVEN");
  const powerMap = derivePowerMap(input);
  assert.ok(powerMap.powers.find(item => item.key === "process_power")!.evidenceFor.some(item => /291\/300/.test(item.value)));
  const synthesis = deriveInvestmentSynthesis({ analysis, experience: deriveExperienceSnapshot(input.rows), debates, powerMap, stressTest: null });
  assert.match(synthesis.currentThesis, /300 selected cases, 291 graded/);
  assert.ok(synthesis.evidenceBuckets.supports.some(item => /291\/300/.test(item.value)));
  assert.notEqual(synthesis.ceThesis, "SUPPORTED");
  assert.deepEqual(scorebookDerivedSimulatorValues(input.rows), { startingGradedCases: 291, feedbackDelayDays: 23, feedbackDelaySampleSize: 291 });
  const prompt = buildDebateGenerationPrompt(analysis, { scorebookSummary: calculateScorebookMetrics(input.rows), experienceFindings: debates.map(item => item.assessmentReason) });
  assert.match(prompt, /totalCases=300; gradedCases=291/);
  assert.match(prompt, /Graded experience capture is supported/);
});

test("same cases get the same analytical verdict regardless of synthetic flag", () => {
  const rows = buildCasapPublicSimulationCases();
  const assess = (synthetic: boolean) => deriveDebateCandidates({ analysis, debates: [], rows: rows.map(row => ({ ...row, isSynthetic: synthetic })) }, 8).map(item => ({ family: item.family, assessment: item.assessment, confidence: item.confidence, reason: item.assessmentReason }));
  assert.deepEqual(assess(true), assess(false));
  const empty = deriveDebateCandidates({ analysis, debates: [], rows: [] }, 8).find(item => item.family === "EXPERIENCE_CAPTURE")!;
  assert.equal(empty.assessment, "UNPROVEN");
  assert.equal(empty.evidenceFor.length, 0);
  const incomplete = deriveDebateCandidates({ analysis, debates: [], rows: rows.map(row => ({ ...row, grade: "UNRESOLVED" as const, outcome: null })) }, 8).find(item => item.family === "EXPERIENCE_CAPTURE")!;
  assert.equal(incomplete.assessment, "UNPROVEN");
  assert.ok(incomplete.missingEvidence.length);
});
