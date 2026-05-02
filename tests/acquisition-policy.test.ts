import test from "node:test";
import assert from "node:assert/strict";
import {
  POLICY_DEFAULTS,
  classifyLtvCacRatio,
  evaluateBudgetShift,
  evaluateCampaignPolicy,
  validateCreateCampaignInput
} from "@/lib/acquisition";

test("POLICY_DEFAULTS exposes the expected policy thresholds", () => {
  assert.equal(POLICY_DEFAULTS.cacAutoPausePctOfTarget, 1.25);
  assert.equal(POLICY_DEFAULTS.minLtvCacRatio, 2.5);
  assert.equal(POLICY_DEFAULTS.approvalCapPct, 0.15);
});

test("classifyLtvCacRatio returns unhealthy below the floor", () => {
  assert.equal(classifyLtvCacRatio(2.4, 2.5), "unhealthy");
  assert.equal(classifyLtvCacRatio(0, 2.5), "unhealthy");
  assert.equal(classifyLtvCacRatio(Number.NaN, 2.5), "unhealthy");
});

test("classifyLtvCacRatio returns watch within one ratio point of floor", () => {
  assert.equal(classifyLtvCacRatio(2.5, 2.5), "watch");
  assert.equal(classifyLtvCacRatio(3.4, 2.5), "watch");
});

test("classifyLtvCacRatio returns healthy beyond the watch band", () => {
  assert.equal(classifyLtvCacRatio(3.5, 2.5), "healthy");
  assert.equal(classifyLtvCacRatio(8, 2.5), "healthy");
});

test("evaluateCampaignPolicy auto-pauses when CAC exceeds the auto-pause multiple", () => {
  const result = evaluateCampaignPolicy({
    observedCacCents: 20000,
    observedRevenueCents: 50000,
    conversions: 1,
    targetCacCents: 14500,
    targetLtvCents: 72000,
    cacAutoPausePctOfTarget: 1.25,
    minLtvCacRatio: 2.5
  });

  assert.equal(result.shouldPause, true);
  assert.ok(result.reasons.some((reason) => /CAC/i.test(reason)));
  assert.ok(result.cacOverrunPct > 1.25);
});

test("evaluateCampaignPolicy auto-pauses when LTV:CAC ratio drops below the floor", () => {
  const result = evaluateCampaignPolicy({
    observedCacCents: 14500,
    observedRevenueCents: 20000,
    conversions: 1,
    targetCacCents: 14500,
    targetLtvCents: 72000,
    cacAutoPausePctOfTarget: 1.25,
    minLtvCacRatio: 2.5
  });

  assert.equal(result.shouldPause, true);
  assert.equal(result.band, "unhealthy");
  assert.ok(result.reasons.some((reason) => /LTV:CAC/i.test(reason)));
});

test("evaluateCampaignPolicy stays healthy with strong observed economics", () => {
  const result = evaluateCampaignPolicy({
    observedCacCents: 12000,
    observedRevenueCents: 90000,
    conversions: 1,
    targetCacCents: 14500,
    targetLtvCents: 72000,
    cacAutoPausePctOfTarget: 1.25,
    minLtvCacRatio: 2.5
  });

  assert.equal(result.shouldPause, false);
  assert.equal(result.band, "healthy");
  assert.deepEqual(result.reasons, []);
});

test("evaluateCampaignPolicy falls back to target LTV when no conversions are observed", () => {
  const result = evaluateCampaignPolicy({
    observedCacCents: 14500,
    observedRevenueCents: 0,
    conversions: 0,
    targetCacCents: 14500,
    targetLtvCents: 72000,
    cacAutoPausePctOfTarget: 1.25,
    minLtvCacRatio: 2.5
  });

  // Target ratio 72000/14500 = 4.97x — healthy band, no auto-pause
  assert.equal(result.shouldPause, false);
  assert.equal(result.band, "healthy");
});

test("evaluateBudgetShift approves shifts at or below the cap", () => {
  const decision = evaluateBudgetShift({
    amountCents: 1000,
    fromBudgetCents: 10000,
    approvalCapPct: 0.15
  });

  assert.equal(decision.approved, true);
  assert.equal(decision.shiftPct, 0.1);
});

test("evaluateBudgetShift requires approval above the cap", () => {
  const decision = evaluateBudgetShift({
    amountCents: 3000,
    fromBudgetCents: 10000,
    approvalCapPct: 0.15
  });

  assert.equal(decision.approved, false);
  assert.equal(decision.shiftPct, 0.3);
});

test("validateCreateCampaignInput rejects out-of-range policy fields", () => {
  const result = validateCreateCampaignInput({
    name: "Test",
    objective: "Test",
    budgetCents: 10000,
    startAt: new Date().toISOString(),
    endAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    channels: ["SEARCH"],
    targetCacCents: 14500,
    targetLtvCents: 72000,
    cacAutoPausePctOfTarget: 0.5,
    minLtvCacRatio: 0.5,
    approvalCapPct: 0.7
  });

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.errors.some((e) => /cacAutoPausePctOfTarget/.test(e)));
    assert.ok(result.errors.some((e) => /minLtvCacRatio/.test(e)));
    assert.ok(result.errors.some((e) => /approvalCapPct/.test(e)));
  }
});

test("validateCreateCampaignInput accepts defaults when policy fields are omitted", () => {
  const result = validateCreateCampaignInput({
    name: "Test",
    objective: "Test",
    budgetCents: 10000,
    startAt: new Date().toISOString(),
    endAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    channels: ["SEARCH"],
    targetCacCents: 14500,
    targetLtvCents: 72000
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.cacAutoPausePctOfTarget, POLICY_DEFAULTS.cacAutoPausePctOfTarget);
    assert.equal(result.value.minLtvCacRatio, POLICY_DEFAULTS.minLtvCacRatio);
    assert.equal(result.value.approvalCapPct, POLICY_DEFAULTS.approvalCapPct);
  }
});
