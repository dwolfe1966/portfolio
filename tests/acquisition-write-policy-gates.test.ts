import test from "node:test";
import assert from "node:assert/strict";
import {
  evaluateAdWritePolicyGate,
  type AdWritePolicyGateInput
} from "@/lib/acquisition";

const BASE_POLICY_GATE: AdWritePolicyGateInput = {
  operationType: "update_budget",
  workspaceExecutionEnabled: true,
  providerHealthOk: true,
  hasCredentialGrant: true,
  targetAccountAllowed: true,
  productionWritesEnabled: true,
  dryRunCompleted: true,
  idempotencyKey: "policy-write-001",
  rollbackPlan: "Restore previous platform budget.",
  campaignBudgetCents: 100000,
  dailySpendCapCents: 25000,
  projectedDailySpendCents: 20000,
  shiftAmountCents: 10000,
  sourceBudgetCents: 100000,
  maxBudgetShiftPct: 0.2,
  approvalCapPct: 0.15,
  observedCacCents: 12000,
  observedRevenueCents: 90000,
  conversions: 1,
  targetCacCents: 14500,
  targetLtvCents: 72000,
  cacAutoPausePctOfTarget: 1.25,
  minLtvCacRatio: 2.5,
  confidence: 0.75,
  minConfidence: 0.65,
  lastActionAt: "2026-05-06T00:00:00.000Z",
  now: "2026-05-07T12:00:00.000Z",
  cooldownHours: 24
};

test("evaluateAdWritePolicyGate allows a healthy write below spend, shift, confidence, and cooldown gates", () => {
  const decision = evaluateAdWritePolicyGate(BASE_POLICY_GATE);

  assert.equal(decision.allowed, true);
  assert.equal(decision.requiresApproval, false);
  assert.equal(decision.policyBand, "healthy");
  assert.deepEqual(decision.reasons, []);
  assert.equal(decision.metrics.shiftPct, 0.1);
  assert.equal(decision.metrics.cooldownRemainingHours, 0);
});

test("evaluateAdWritePolicyGate blocks daily spend cap breaches", () => {
  const decision = evaluateAdWritePolicyGate({
    ...BASE_POLICY_GATE,
    projectedDailySpendCents: 26000
  });

  assert.equal(decision.allowed, false);
  assert.equal(decision.policyBand, "unhealthy");
  assert.ok(decision.blockReasons.some((reason) => /daily spend/i.test(reason)));
});

test("evaluateAdWritePolicyGate requires approval above approval cap but below max shift", () => {
  const decision = evaluateAdWritePolicyGate({
    ...BASE_POLICY_GATE,
    shiftAmountCents: 18000,
    approvalCompleted: false
  });

  assert.equal(decision.allowed, false);
  assert.equal(decision.requiresApproval, true);
  assert.equal(decision.policyBand, "watch");
  assert.ok(decision.approvalReasons.some((reason) => /auto-approval cap/.test(reason)));
  assert.ok(decision.reasons.some((reason) => /Approval/.test(reason)));
});

test("evaluateAdWritePolicyGate allows above-cap shift after approval", () => {
  const decision = evaluateAdWritePolicyGate({
    ...BASE_POLICY_GATE,
    shiftAmountCents: 18000,
    approvalCompleted: true
  });

  assert.equal(decision.allowed, true);
  assert.equal(decision.requiresApproval, true);
  assert.equal(decision.policyBand, "watch");
});

test("evaluateAdWritePolicyGate blocks max shift breaches", () => {
  const decision = evaluateAdWritePolicyGate({
    ...BASE_POLICY_GATE,
    shiftAmountCents: 25000,
    approvalCompleted: true
  });

  assert.equal(decision.allowed, false);
  assert.ok(decision.blockReasons.some((reason) => /exceeds max shift/.test(reason)));
});

test("evaluateAdWritePolicyGate blocks low confidence", () => {
  const decision = evaluateAdWritePolicyGate({
    ...BASE_POLICY_GATE,
    confidence: 0.55
  });

  assert.equal(decision.allowed, false);
  assert.ok(decision.blockReasons.some((reason) => /Confidence/.test(reason)));
});

test("evaluateAdWritePolicyGate blocks active cooldown windows", () => {
  const decision = evaluateAdWritePolicyGate({
    ...BASE_POLICY_GATE,
    lastActionAt: "2026-05-07T00:00:00.000Z",
    now: "2026-05-07T12:00:00.000Z"
  });

  assert.equal(decision.allowed, false);
  assert.equal(decision.metrics.cooldownRemainingHours, 12);
  assert.ok(decision.blockReasons.some((reason) => /Cooldown/.test(reason)));
});

test("evaluateAdWritePolicyGate blocks unhealthy CAC/LTV economics for non-pause writes", () => {
  const decision = evaluateAdWritePolicyGate({
    ...BASE_POLICY_GATE,
    observedCacCents: 20000,
    observedRevenueCents: 30000,
    conversions: 1
  });

  assert.equal(decision.allowed, false);
  assert.equal(decision.policyBand, "unhealthy");
  assert.ok(decision.blockReasons.some((reason) => /CAC|LTV:CAC/.test(reason)));
});

test("evaluateAdWritePolicyGate lets pause writes proceed when economics indicate pause", () => {
  const decision = evaluateAdWritePolicyGate({
    ...BASE_POLICY_GATE,
    operationType: "pause_resume",
    observedCacCents: 20000,
    observedRevenueCents: 30000,
    conversions: 1
  });

  assert.equal(decision.allowed, true);
  assert.equal(decision.policyBand, "unhealthy");
});

test("evaluateAdWritePolicyGate inherits emergency-stop blocking from base write safety", () => {
  const decision = evaluateAdWritePolicyGate({
    ...BASE_POLICY_GATE,
    emergencyStopActive: true
  });

  assert.equal(decision.allowed, false);
  assert.ok(decision.blockReasons.some((reason) => /Emergency stop/.test(reason)));
});
