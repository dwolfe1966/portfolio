import test from "node:test";
import assert from "node:assert/strict";
import { DEMO_ASSUMPTION_DEFAULTS, normalizeDemoAssumptions } from "@/lib/demo-assumptions";
import { calculatePriorityBreakdown, calculatePriorityScore } from "@/lib/scoring";

test("normalizeDemoAssumptions uses defaults for missing values", () => {
  const normalized = normalizeDemoAssumptions({ openRate: 0.5 });

  assert.equal(normalized.openRate, 0.5);
  assert.equal(normalized.defaultTopN, DEMO_ASSUMPTION_DEFAULTS.defaultTopN);
  assert.equal(normalized.avgOrderValue, DEMO_ASSUMPTION_DEFAULTS.avgOrderValue);
});

test("normalizeDemoAssumptions coerces numeric strings", () => {
  const normalized = normalizeDemoAssumptions({
    defaultTopN: "25" as unknown as number,
    recencyScore: "0.77" as unknown as number
  });

  assert.equal(normalized.defaultTopN, 25);
  assert.equal(normalized.recencyScore, 0.77);
});

test("calculatePriorityBreakdown contributions sum to total and match score helper", () => {
  const args = {
    interestScore: 0.84,
    segment: "TRIAL" as const,
    changeType: "PHONE_CHANGED" as const,
    recencyScore: 0.7
  };

  const breakdown = calculatePriorityBreakdown(args);
  const score = calculatePriorityScore(args);

  const summed =
    breakdown.interestContribution +
    breakdown.segmentContribution +
    breakdown.changeTypeContribution +
    breakdown.recencyContribution;

  assert.equal(Number(summed.toFixed(10)), Number(breakdown.totalScore.toFixed(10)));
  assert.equal(Number(score.toFixed(10)), Number(breakdown.totalScore.toFixed(10)));
});
