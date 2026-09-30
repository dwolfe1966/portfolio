import assert from "node:assert/strict";
import test from "node:test";
import { buildCasapPublicSimulationCases, CASAP_PUBLIC_EVIDENCE_ANALYSIS, deriveDebateCandidates, derivePowerMap, deriveInvestmentSynthesis, deriveExperienceSnapshot } from "../lib/compounding-expertise-lab";
import { runExperienceTransferExperiment } from "../lib/experience-transfer-experiment";

test("fixed chronological probe finds shared structure and evaluates all five segments", () => {
  const rows = buildCasapPublicSimulationCases();
  const result = runExperienceTransferExperiment(rows);
  assert.equal(result.sharedPatterns, 28);
  assert.equal(result.sharedCases, 225);
  assert.equal(result.scored, 88);
  assert.equal(result.bySegment.length, 5);
  assert.ok(result.local! > result.pooled!);
  assert.equal(result.finding, "No material pooling advantage");
  assert.deepEqual(runExperienceTransferExperiment([...rows].reverse()), result);
});

test("negative transfer is detected instead of forcing a positive thesis", () => {
  const source = buildCasapPublicSimulationCases()[0];
  const rows = Array.from({ length: 100 }, (_, i) => ({ ...source, customerSegment: i % 2 ? "A" : "B", decisionClassId: "same", caseType: "same", grade: i % 2 ? "CORRECT" as const : "INCORRECT" as const, decisionAt: new Date(Date.UTC(2020, 0, i + 1)), outcomeAt: new Date(Date.UTC(2020, 0, i + 2)) }));
  const result = runExperienceTransferExperiment(rows);
  assert.equal(result.finding, "Pooling worsens grade prediction");
  assert.ok(result.bySegment.every(item => item.delta! < 0));
});

test("unavailable feedback cannot leak into training", () => {
  const rows = buildCasapPublicSimulationCases();
  const delayed = rows.map((row, i) => i < 20 ? { ...row, outcomeAt: new Date("2030-01-01") } : row);
  const changed = delayed.map((row, i) => i < 20 && row.grade !== "UNRESOLVED" ? { ...row, grade: row.grade === "CORRECT" ? "INCORRECT" as const : "CORRECT" as const } : row);
  assert.deepEqual(runExperienceTransferExperiment(delayed), runExperienceTransferExperiment(changed));
  assert.equal(runExperienceTransferExperiment([]).enough, false);
  assert.equal(runExperienceTransferExperiment(rows.map(row => ({ ...row, outcomeAt: null }))).scored, 0);
});

test("experiment findings are attached to the debate, Power and conclusion", () => {
  const rows = buildCasapPublicSimulationCases();
  const analysis = CASAP_PUBLIC_EVIDENCE_ANALYSIS.analysis;
  const input = { analysis, rows, debates: [] };
  const debates = deriveDebateCandidates(input);
  assert.equal(debates.find(item => item.family === "CROSS_CUSTOMER_TRANSFER")!.transferExperiment!.scored, 88);
  const powerMap = derivePowerMap(input);
  assert.ok(powerMap.powers.find(item => item.key === "network_economies")!.evidenceFor.some(item => item.value.includes("88 held-out")));
  const summary = deriveInvestmentSynthesis({ analysis, experience: deriveExperienceSnapshot(rows), debates, powerMap, stressTest: null });
  assert.match(summary.currentThesis, /pooling advantage/);
});
