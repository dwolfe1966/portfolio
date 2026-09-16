import assert from "node:assert/strict";
import test from "node:test";
import {
  COMPOUNDING_EXAMPLES,
  calculateScorebookMetrics,
  detectCrossover,
  exampleById,
  normalizeAssessment,
  scorebookDerivedSimulatorValues,
  scorebookRowsAreSynthetic,
  simulateScenario,
  validateAssessment,
  validateProbability,
  type DimensionAssessmentInput,
  type ScorebookCaseInput
} from "@/lib/compounding-expertise-lab";
import { generateCompoundingExpertiseDebates } from "@/lib/compounding-expertise-ai";

const baseScenario = {
  name: "Base",
  startingCases: 100,
  casesPerMonth: 30,
  feedbackDelayDays: 30,
  transferability: 0.5,
  informationValue: 0.5,
  learningEfficiency: 0.5,
  stalenessRate: 0.01,
  baseCapability: 2
};

test("compounding simulator is deterministic", () => {
  const first = simulateScenario(baseScenario, 6);
  const second = simulateScenario(baseScenario, 6);
  assert.deepEqual(first.points, second.points);
  assert.equal(first.points[0].effectiveExperience, 100);
});

test("staleness decreases effective accumulated experience when no new cases mature", () => {
  const result = simulateScenario({
    ...baseScenario,
    casesPerMonth: 0,
    feedbackDelayDays: 0,
    stalenessRate: 0.1
  }, 2);

  assert.equal(result.points[0].effectiveExperience, 100);
  assert.ok(result.points[1].effectiveExperience < result.points[0].effectiveExperience);
  assert.ok(result.points[2].effectiveExperience < result.points[1].effectiveExperience);
});

test("higher transferability increases effective expertise all else equal", () => {
  const low = simulateScenario({ ...baseScenario, transferability: 0.2 }, 1);
  const high = simulateScenario({ ...baseScenario, transferability: 0.9 }, 1);

  assert.ok(high.points[0].expertise > low.points[0].expertise);
});

test("longer feedback delay slows new effective experience accumulation", () => {
  const fast = simulateScenario({ ...baseScenario, startingCases: 0, feedbackDelayDays: 0, stalenessRate: 0 }, 2);
  const slow = simulateScenario({ ...baseScenario, startingCases: 0, feedbackDelayDays: 90, stalenessRate: 0 }, 2);

  assert.ok(fast.points[1].effectiveExperience > slow.points[1].effectiveExperience);
  assert.ok(fast.points[2].effectiveExperience > slow.points[2].effectiveExperience);
});

test("crossover detection finds the approximate month when leader changes", () => {
  const incumbent = simulateScenario({
    ...baseScenario,
    name: "Incumbent A",
    startingCases: 10000,
    casesPerMonth: 0,
    transferability: 0.7,
    informationValue: 0.8,
    learningEfficiency: 0.6,
    stalenessRate: 0.1,
    baseCapability: 1.5
  }, 24);
  const challenger = simulateScenario({
    ...baseScenario,
    name: "Challenger B",
    startingCases: 0,
    casesPerMonth: 2000,
    feedbackDelayDays: 0,
    transferability: 0.95,
    informationValue: 0.8,
    learningEfficiency: 0.95,
    stalenessRate: 0,
    baseCapability: 1.5
  }, 24);

  const crossover = detectCrossover(incumbent, challenger);
  assert.ok(crossover);
  assert.equal(crossover?.to, "Challenger B");
  assert.ok(crossover!.month > 0);
});

test("score and probability validation rejects out-of-range inputs", () => {
  assert.equal(validateProbability(101).ok, false);
  assert.equal(validateProbability(50).ok, true);

  const invalid: DimensionAssessmentInput = {
    framework: "SUN",
    dimension: "feedback_speed",
    score: 7,
    confidence: "MEDIUM",
    rationale: "",
    evidenceStatus: "ASSUMED"
  };
  assert.equal(validateAssessment(invalid).ok, false);
  assert.equal(validateAssessment({ ...invalid, score: 5 }).ok, true);
});

test("AI-generated assessments cannot silently become observed or sourced evidence", () => {
  const normalized = normalizeAssessment({
    framework: "WOLFE",
    dimension: "causal_quality",
    score: 4,
    confidence: "HIGH",
    rationale: "Suggested by model.",
    evidenceStatus: "OBSERVED",
    source: "AI"
  });

  assert.equal(normalized.evidenceStatus, "ASSUMED");
  assert.equal(normalized.source, "AI");
});

test("debate generation degrades gracefully when OpenAI is unavailable", async () => {
  const original = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  try {
    const result = await generateCompoundingExpertiseDebates({
      companyName: "TestCo",
      productDescription: "Decision workflow",
      targetCustomer: "Operators",
      workflow: "Case to decision to grade",
      decisionDescription: "Approve or deny",
      thesis: "Maybe scorebook learning compounds."
    });

    assert.equal(result.ok, false);
    assert.ok(result.debates.length >= 2);
    assert.match(result.reason, /OPENAI_API_KEY/);
  } finally {
    if (original) process.env.OPENAI_API_KEY = original;
  }
});

const scorebookRows: ScorebookCaseInput[] = [
  {
    externalCaseId: "case-1",
    customerSegment: "enterprise",
    caseType: "dispute",
    context: "Resolved correct row",
    agentDecision: "approve",
    agentConfidence: 0.8,
    humanDecision: "approve",
    humanOverride: false,
    actionTaken: "approve",
    outcome: "won",
    outcomeValue: 100,
    grade: "CORRECT",
    gradeConfidence: 0.9,
    decisionAt: new Date("2026-01-01T00:00:00Z"),
    outcomeAt: new Date("2026-01-04T00:00:00Z"),
    isEdgeCase: false,
    isSynthetic: true,
    sourceLabel: "SYNTHETIC ILLUSTRATIVE DATA - test fixture",
    notes: null
  },
  {
    externalCaseId: "case-2",
    customerSegment: "smb",
    caseType: "dispute",
    context: "Override row",
    agentDecision: "deny",
    agentConfidence: 0.72,
    humanDecision: "approve",
    humanOverride: true,
    actionTaken: "approve",
    outcome: "retained",
    outcomeValue: 200,
    grade: "PARTIALLY_CORRECT",
    gradeConfidence: 0.7,
    decisionAt: new Date("2026-01-02T00:00:00Z"),
    outcomeAt: new Date("2026-01-08T00:00:00Z"),
    isEdgeCase: true,
    isSynthetic: true,
    sourceLabel: "SYNTHETIC ILLUSTRATIVE DATA - test fixture",
    notes: "observational only"
  },
  {
    externalCaseId: "case-3",
    customerSegment: "smb",
    caseType: "appeal",
    context: "Unresolved row",
    agentDecision: "request evidence",
    agentConfidence: 0.52,
    humanDecision: null,
    humanOverride: false,
    actionTaken: null,
    outcome: null,
    outcomeValue: null,
    grade: "UNRESOLVED",
    gradeConfidence: null,
    decisionAt: new Date("2026-01-03T00:00:00Z"),
    outcomeAt: null,
    isEdgeCase: false,
    isSynthetic: true,
    sourceLabel: "SYNTHETIC ILLUSTRATIVE DATA - test fixture",
    notes: null
  }
];

test("case metric calculations preserve missing and unresolved outcomes", () => {
  const metrics = calculateScorebookMetrics(scorebookRows);

  assert.equal(metrics.totalCases, 3);
  assert.equal(metrics.resolvedCases, 2);
  assert.equal(metrics.gradedCases, 2);
  assert.equal(metrics.outcomeCompletionRate, 0.6667);
  assert.equal(metrics.gradeCoverage, 0.6667);
  assert.equal(metrics.agentCorrectnessRate, 1);
});

test("feedback latency and simulator-derived values use only observed graded rows", () => {
  const metrics = calculateScorebookMetrics(scorebookRows);
  const derived = scorebookDerivedSimulatorValues(scorebookRows);

  assert.equal(metrics.medianFeedbackLatencyDays, 4.5);
  assert.equal(metrics.feedbackLatencySampleSize, 2);
  assert.equal(derived.startingGradedCases, 2);
  assert.equal(derived.feedbackDelayDays, 4.5);
  assert.equal(derived.feedbackDelaySampleSize, 2);
});

test("human override calculations are descriptive and sample-sized", () => {
  const metrics = calculateScorebookMetrics(scorebookRows);

  assert.equal(metrics.humanOverrideValue.count, 1);
  assert.equal(metrics.humanOverrideValue.resolvableCount, 1);
  assert.equal(metrics.humanOverrideValue.correctRate, 1);
  assert.equal(metrics.humanOverrideValue.totalOutcomeValue, 200);
});

test("synthetic dataset labeling is explicit for bundled examples", () => {
  for (const example of COMPOUNDING_EXAMPLES) {
    assert.match(example.syntheticDatasetLabel, /SYNTHETIC ILLUSTRATIVE DATA/);
    assert.equal(scorebookRowsAreSynthetic(example.cases), true);
    for (const row of example.cases) {
      assert.equal(row.isSynthetic, true);
      assert.match(row.sourceLabel, /SYNTHETIC ILLUSTRATIVE DATA/);
      if (example.id === "casap") assert.match(row.sourceLabel, /not Casap data/);
      if (example.id === "listen-labs") assert.match(row.sourceLabel, /not Listen Labs data/);
      if (example.id === "aaru") assert.match(row.sourceLabel, /not Aaru data/);
      if (example.id === "maybern") assert.match(row.sourceLabel, /not Maybern data/);
    }
  }
});

test("example dataset loading resolves every archetype without actual company data claims", () => {
  for (const id of ["casap", "listen-labs", "aaru", "maybern", "creative-agent"]) {
    const example = exampleById(id);
    assert.equal(example.id, id);
    assert.ok(example.cases.length >= 20);
    assert.ok(example.cases.length <= 50);
    assert.ok(example.syntheticDatasetLabel.includes("SYNTHETIC ILLUSTRATIVE DATA"));
    assert.ok(!example.syntheticDatasetLabel.includes("actual"));
  }
});
