import assert from "node:assert/strict";
import test from "node:test";
import {
  detectCrossover,
  normalizeAssessment,
  simulateScenario,
  validateAssessment,
  validateProbability,
  type DimensionAssessmentInput
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
