import assert from "node:assert/strict";
import test from "node:test";
import { buildAgentExecutionPlan, buildApprovedApprovalContinuationPlan } from "@/lib/agent-execution-plan";
import { buildLifecycleAgentRunbook } from "@/lib/lifecycle-runbook";
import {
  buildAcquisitionAgentRunbook,
  evaluateAdWritePolicyGate,
  type AdWritePolicyGateInput
} from "@/lib/acquisition";

const IDENTITY_ALLOWED = {
  outcome: "eligible" as const,
  allowed: true,
  reasons: [],
  auditEvents: ["consent.checked" as const],
  channelAddress: "jordan@example.com",
  canonicalIdentityKey: "user_1"
};

const SAFE_POLICY_INPUT: AdWritePolicyGateInput = {
  operationType: "update_budget",
  workspaceExecutionEnabled: true,
  providerHealthOk: true,
  hasCredentialGrant: true,
  targetAccountAllowed: true,
  productionWritesEnabled: true,
  dryRunCompleted: true,
  idempotencyKey: "plan-write-001",
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

test("buildAgentExecutionPlan queues lifecycle delivery when runbook is ready", () => {
  const now = new Date("2026-05-07T12:00:00.000Z");
  const runbook = buildLifecycleAgentRunbook({
    eventDetected: true,
    identityDecision: IDENTITY_ALLOWED,
    opportunityScored: true,
    priorityScore: 88,
    minPriorityScore: 70,
    messageDrafted: true,
    approvalRequired: false,
    deliveryHealthy: true
  });

  const plan = buildAgentExecutionPlan({
    workspaceId: "workspace_1",
    accountUserId: "acct_1",
    app: "lifecycle",
    runbookId: "run_1",
    currentStep: runbook.currentStep,
    steps: runbook.steps,
    payload: { candidateId: "candidate_1" },
    now
  });

  assert.equal(plan.status, "queued");
  assert.equal(plan.jobs.length, 1);
  assert.equal(plan.jobs[0].jobType, "provider_write");
  assert.equal(plan.jobs[0].queueName, "lifecycle:provider_write");
  assert.equal(plan.jobs[0].priority, 20);
  assert.equal(plan.jobs[0].idempotencyKey, "run_1:trigger_delivery:delivery.test_sent");
  assert.equal(plan.jobs[0].runAfter.toISOString(), now.toISOString());
});

test("buildAgentExecutionPlan creates approval request for acquisition approval pauses", () => {
  const now = new Date("2026-05-07T12:00:00.000Z");
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

  const plan = buildAgentExecutionPlan({
    workspaceId: "workspace_1",
    accountUserId: "acct_1",
    app: "acquisition",
    runbookId: "run_2",
    currentStep: runbook.currentStep,
    steps: runbook.steps,
    proposedAction: { campaignId: "camp_1", shiftAmountCents: 18000 },
    approvalPolicy: { reasons: policyDecision.approvalReasons },
    now
  });

  assert.equal(plan.status, "approval_required");
  assert.equal(plan.jobs.length, 0);
  assert.equal(plan.approvals.length, 1);
  assert.equal(plan.approvals[0].actionType, "request_approval");
  assert.equal(plan.approvals[0].riskLevel, "high");
  assert.equal(plan.approvals[0].dueAt.toISOString(), "2026-05-08T12:00:00.000Z");
  assert.equal(plan.approvals[0].expiresAt.toISOString(), "2026-05-14T12:00:00.000Z");
});

test("buildAgentExecutionPlan does not queue blocked or waiting steps", () => {
  const blocked = buildAgentExecutionPlan({
    workspaceId: "workspace_1",
    app: "lifecycle",
    runbookId: "run_3",
    currentStep: "draft_message",
    steps: [
      {
        key: "draft_message",
        status: "blocked",
        auditEvent: "message.generated",
        summary: "Draft message.",
        reasons: ["Opportunity must meet score threshold before drafting."]
      }
    ]
  });

  assert.equal(blocked.status, "blocked");
  assert.deepEqual(blocked.blockedReasons, ["Opportunity must meet score threshold before drafting."]);
  assert.equal(blocked.jobs.length, 0);

  const waiting = buildAgentExecutionPlan({
    workspaceId: "workspace_1",
    app: "acquisition",
    runbookId: "run_4",
    currentStep: "monitor_reversal",
    steps: [
      {
        key: "monitor_reversal",
        status: "waiting",
        auditEvent: "outcome.observed",
        summary: "Monitor reversal.",
        reasons: []
      }
    ]
  });

  assert.equal(waiting.status, "waiting");
  assert.equal(waiting.jobs.length, 0);
});

test("buildApprovedApprovalContinuationPlan queues provider write from approved payload", () => {
  const now = new Date("2026-05-07T12:00:00.000Z");
  const plan = buildApprovedApprovalContinuationPlan({
    workspaceId: "workspace_1",
    accountUserId: "acct_1",
    app: "acquisition",
    approvalRequestId: "approval_1",
    actionType: "request_approval",
    proposedAction: { campaignId: "camp_1", amountCents: 18000 },
    now
  });

  assert.equal(plan.status, "queued");
  assert.equal(plan.jobs.length, 1);
  assert.equal(plan.jobs[0].queueName, "acquisition:provider_write");
  assert.equal(plan.jobs[0].jobType, "provider_write");
  assert.equal(plan.jobs[0].priority, 20);
  assert.equal(plan.jobs[0].idempotencyKey, "approval:approval_1:provider_write");
  assert.deepEqual(plan.jobs[0].payload, {
    approvalRequestId: "approval_1",
    actionType: "request_approval",
    idempotencyKey: "approval:approval_1:provider_write",
    proposedAction: { campaignId: "camp_1", amountCents: 18000 }
  });
});
