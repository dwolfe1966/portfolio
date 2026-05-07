import test from "node:test";
import assert from "node:assert/strict";
import {
  buildAcquisitionAgentRunbook,
  evaluateAdWritePolicyGate,
  type AdWritePolicyGateInput
} from "@/lib/acquisition";

const SAFE_POLICY_INPUT: AdWritePolicyGateInput = {
  operationType: "update_budget",
  workspaceExecutionEnabled: true,
  providerHealthOk: true,
  hasCredentialGrant: true,
  targetAccountAllowed: true,
  productionWritesEnabled: true,
  dryRunCompleted: true,
  idempotencyKey: "runbook-write-001",
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

test("buildAcquisitionAgentRunbook starts with performance observation", () => {
  const runbook = buildAcquisitionAgentRunbook({
    observedPerformance: false,
    diagnosedMovement: false,
    proposedAction: false,
    reversalWindowHours: 24
  });

  assert.equal(runbook.currentStep, "observe_performance");
  assert.equal(runbook.readyToApply, false);
  assert.equal(runbook.steps[0].auditEvent, "performance.synced");
  assert.equal(runbook.steps.find((step) => step.key === "diagnose_cell_movement")?.status, "blocked");
});

test("buildAcquisitionAgentRunbook marks write action ready after observation, diagnosis, proposal, and policy pass", () => {
  const policyDecision = evaluateAdWritePolicyGate(SAFE_POLICY_INPUT);
  const runbook = buildAcquisitionAgentRunbook({
    observedPerformance: true,
    diagnosedMovement: true,
    proposedAction: true,
    policyDecision,
    reversalWindowHours: 24
  });

  assert.equal(runbook.readyToApply, true);
  assert.equal(runbook.currentStep, "apply_approved_action");
  assert.equal(runbook.steps.find((step) => step.key === "check_policy")?.status, "completed");
  assert.equal(runbook.steps.find((step) => step.key === "apply_approved_action")?.auditEvent, "provider.dry_run");
});

test("buildAcquisitionAgentRunbook pauses at approval when policy requires operator approval", () => {
  const policyDecision = evaluateAdWritePolicyGate({
    ...SAFE_POLICY_INPUT,
    shiftAmountCents: 18000,
    approvalCompleted: false
  });
  const runbook = buildAcquisitionAgentRunbook({
    observedPerformance: true,
    diagnosedMovement: true,
    proposedAction: true,
    policyDecision,
    approvalCompleted: false,
    reversalWindowHours: 24
  });

  assert.equal(runbook.readyToApply, false);
  assert.equal(runbook.currentStep, "request_approval");
  assert.equal(runbook.steps.find((step) => step.key === "request_approval")?.status, "approval_required");
});

test("buildAcquisitionAgentRunbook monitors reversal after an applied action", () => {
  const policyDecision = evaluateAdWritePolicyGate(SAFE_POLICY_INPUT);
  const runbook = buildAcquisitionAgentRunbook({
    observedPerformance: true,
    diagnosedMovement: true,
    proposedAction: true,
    policyDecision,
    actionApplied: true,
    reversalConditionMet: true,
    reversalWindowHours: 24
  });

  assert.equal(runbook.shouldRollback, true);
  assert.equal(runbook.currentStep, "monitor_reversal");
  assert.equal(runbook.steps.find((step) => step.key === "monitor_reversal")?.auditEvent, "provider.rollback_applied");
});

test("buildAcquisitionAgentRunbook exposes revenue impact after outcome observation", () => {
  const policyDecision = evaluateAdWritePolicyGate(SAFE_POLICY_INPUT);
  const runbook = buildAcquisitionAgentRunbook({
    observedPerformance: true,
    diagnosedMovement: true,
    proposedAction: true,
    policyDecision,
    actionApplied: true,
    outcomeObserved: true,
    reversalWindowHours: 24,
    revenueImpactCents: 42000
  });

  assert.equal(runbook.revenueImpactCents, 42000);
  assert.equal(runbook.currentStep, "log_revenue_impact");
  assert.equal(runbook.steps.find((step) => step.key === "log_revenue_impact")?.auditEvent, "revenue.attributed");
  assert.equal(runbook.steps.find((step) => step.key === "log_revenue_impact")?.status, "ready");
});
