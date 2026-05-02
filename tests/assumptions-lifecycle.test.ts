import test from "node:test";
import assert from "node:assert/strict";
import {
  DEMO_ASSUMPTIONS_KEY,
  DEMO_ASSUMPTION_DEFAULTS,
  normalizeDemoAssumptions,
  type DemoAssumptions
} from "@/lib/demo-assumptions";

test("DEMO_ASSUMPTIONS_KEY is stable for client persistence", () => {
  assert.equal(DEMO_ASSUMPTIONS_KEY, "demo.assumptions.v1");
});

test("DEMO_ASSUMPTION_DEFAULTS exposes every assumption field as a finite number", () => {
  const expectedKeys: Array<keyof DemoAssumptions> = [
    "defaultTopN",
    "recencyScore",
    "minPriorityScore",
    "highPriorityThreshold",
    "revenuePerHighPriority",
    "openRate",
    "clickRate",
    "engageRate",
    "purchaseRate",
    "avgOrderValue"
  ];

  for (const key of expectedKeys) {
    const value = DEMO_ASSUMPTION_DEFAULTS[key];
    assert.equal(typeof value, "number", `${key} should be a number`);
    assert.ok(Number.isFinite(value), `${key} should be finite`);
  }

  assert.deepEqual(Object.keys(DEMO_ASSUMPTION_DEFAULTS).sort(), [...expectedKeys].sort());
});

test("normalizeDemoAssumptions returns defaults for empty input", () => {
  assert.deepEqual(normalizeDemoAssumptions({}), DEMO_ASSUMPTION_DEFAULTS);
});

test("normalizeDemoAssumptions returns defaults for null/undefined input", () => {
  assert.deepEqual(normalizeDemoAssumptions(null), DEMO_ASSUMPTION_DEFAULTS);
  assert.deepEqual(normalizeDemoAssumptions(undefined), DEMO_ASSUMPTION_DEFAULTS);
});

test("normalizeDemoAssumptions passes through a full valid payload", () => {
  const fullPayload: DemoAssumptions = {
    defaultTopN: 25,
    recencyScore: 0.55,
    minPriorityScore: 0.1,
    highPriorityThreshold: 0.75,
    revenuePerHighPriority: 22.5,
    openRate: 0.42,
    clickRate: 0.11,
    engageRate: 0.07,
    purchaseRate: 0.02,
    avgOrderValue: 120
  };

  assert.deepEqual(normalizeDemoAssumptions(fullPayload), fullPayload);
});

test("normalizeDemoAssumptions merges partial values with defaults", () => {
  const partial = { recencyScore: 0.4, openRate: 0.5 };
  const normalized = normalizeDemoAssumptions(partial);

  assert.equal(normalized.recencyScore, 0.4);
  assert.equal(normalized.openRate, 0.5);
  assert.equal(normalized.defaultTopN, DEMO_ASSUMPTION_DEFAULTS.defaultTopN);
  assert.equal(normalized.avgOrderValue, DEMO_ASSUMPTION_DEFAULTS.avgOrderValue);
  assert.equal(normalized.highPriorityThreshold, DEMO_ASSUMPTION_DEFAULTS.highPriorityThreshold);
});

test("normalizeDemoAssumptions falls back to defaults when fields are explicitly null", () => {
  const normalized = normalizeDemoAssumptions({
    recencyScore: null as unknown as number,
    avgOrderValue: null as unknown as number
  });

  assert.equal(normalized.recencyScore, DEMO_ASSUMPTION_DEFAULTS.recencyScore);
  assert.equal(normalized.avgOrderValue, DEMO_ASSUMPTION_DEFAULTS.avgOrderValue);
});

test("normalizeDemoAssumptions preserves zero overrides instead of falling back to defaults", () => {
  const normalized = normalizeDemoAssumptions({
    minPriorityScore: 0,
    openRate: 0,
    avgOrderValue: 0
  });

  assert.equal(normalized.minPriorityScore, 0);
  assert.equal(normalized.openRate, 0);
  assert.equal(normalized.avgOrderValue, 0);
  assert.equal(normalized.defaultTopN, DEMO_ASSUMPTION_DEFAULTS.defaultTopN);
});

test("normalizeDemoAssumptions does not mutate the input source", () => {
  const source = { recencyScore: 0.6 };
  const snapshot = { ...source };
  normalizeDemoAssumptions(source);
  assert.deepEqual(source, snapshot);
});
