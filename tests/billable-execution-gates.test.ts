import assert from "node:assert/strict";
import test from "node:test";
import { buildBillableExecutionGate, type BillableExecutionGateInput } from "@/lib/billable-execution-gates";

const READY: BillableExecutionGateInput = {
  requestedMode: "agent_managed_execution",
  onboarding: {
    status: "ready",
    requestedLaunchMode: "agent_managed_execution",
    maxAllowedLaunchMode: "agent_managed_execution",
    requestedLaunchAllowed: true,
    missingOwners: [],
    blockers: [],
    warnings: [],
    phases: [],
    nextRequiredAction: "Record launch readiness decision and schedule the next customer review."
  },
  dataQuality: {
    status: "ready",
    readyForRecommendation: true,
    readyForExecution: true,
    blockers: [],
    warnings: [],
    gates: [],
    nextRequiredAction: "Record data quality approval and attach evidence to the customer launch packet."
  },
  baseline: {
    status: "ready",
    frozen: true,
    billingReady: true,
    reportable: true,
    confidence: "high",
    method: "randomized_holdout",
    blockers: [],
    warnings: [],
    missingApprovals: [],
    nextRequiredAction: "Record baseline freeze decision and attach it to the customer launch packet."
  },
  policyApproved: true,
  credentialGrantsReady: true,
  rollbackReady: true,
  auditExportReady: true,
  emergencyStopReady: true,
  revenueProofReady: true,
  performanceBillingApproved: true
};

test("buildBillableExecutionGate enables agent-managed execution only when every gate is ready", () => {
  const gate = buildBillableExecutionGate(READY);

  assert.equal(gate.enabled, true);
  assert.equal(gate.status, "ready");
  assert.equal(gate.requestedMode, "agent_managed_execution");
  assert.deepEqual(gate.blockers, []);
  assert.equal(gate.nextRequiredAction, "Record billable execution gate approval and attach evidence to the customer launch packet.");
});

test("buildBillableExecutionGate blocks performance billing when core readiness reviews are missing", () => {
  const gate = buildBillableExecutionGate({});

  assert.equal(gate.enabled, false);
  assert.equal(gate.status, "blocked");
  assert.equal(gate.requestedMode, "performance_billing");
  assert.ok(gate.blockers.includes("Complete customer onboarding readiness review."));
  assert.ok(gate.blockers.includes("Complete data quality gate review."));
  assert.ok(gate.blockers.includes("Freeze and approve baseline snapshot."));
  assert.ok(gate.blockers.includes("Approve performance billing evidence and fee trigger."));
});

test("buildBillableExecutionGate carries blockers from onboarding, data quality, and baseline decisions", () => {
  const gate = buildBillableExecutionGate({
    ...READY,
    onboarding: {
      ...READY.onboarding!,
      status: "blocked",
      maxAllowedLaunchMode: "recommendation_only",
      requestedLaunchAllowed: false,
      blockers: ["Approve channel write grants before execution."]
    },
    dataQuality: {
      ...READY.dataQuality!,
      status: "blocked",
      readyForExecution: false,
      blockers: ["Refresh stale source billing."]
    },
    baseline: {
      ...READY.baseline!,
      status: "blocked",
      billingReady: false,
      blockers: ["Missing baseline approvals: finance_owner."]
    }
  });

  assert.equal(gate.enabled, false);
  assert.ok(gate.blockers.includes("Approve channel write grants before execution."));
  assert.ok(gate.blockers.includes("Lower launch mode to recommendation_only or complete onboarding gates."));
  assert.ok(gate.blockers.includes("Refresh stale source billing."));
  assert.ok(gate.blockers.includes("Missing baseline approvals: finance_owner."));
});

test("buildBillableExecutionGate blocks agent-managed execution when max launch mode is only human-approved", () => {
  const gate = buildBillableExecutionGate({
    ...READY,
    onboarding: {
      ...READY.onboarding!,
      maxAllowedLaunchMode: "human_approved_execution"
    }
  });

  assert.equal(gate.enabled, false);
  assert.ok(gate.blockers.includes("Complete agent-managed launch gates; current maximum is human_approved_execution."));
});

test("buildBillableExecutionGate treats warning evidence as not enabled for billing", () => {
  const gate = buildBillableExecutionGate({
    ...READY,
    dataQuality: {
      ...READY.dataQuality!,
      status: "warning",
      warnings: ["Identity match rate is below 97%."]
    }
  });

  assert.equal(gate.enabled, false);
  assert.equal(gate.status, "warning");
  assert.ok(gate.warnings.includes("Identity match rate is below 97%."));
});
