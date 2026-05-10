import assert from "node:assert/strict";
import test from "node:test";
import {
  buildProviderWriteApprovalContext,
  buildApprovalEscalationDecision,
  canApplyApprovalDecision,
  normalizeAgentApprovalInput
} from "@/lib/agent-approval-queue";

test("normalizeAgentApprovalInput clamps strings and defaults invalid risk", () => {
  const dueAt = new Date("2026-05-07T12:00:00.000Z");
  const input = normalizeAgentApprovalInput({
    workspaceId: "workspace_1",
    app: "acquisition",
    actionType: "  budget_increase  ",
    riskLevel: "unknown",
    title: "  Raise branded search budget  ",
    summary: "  Increase daily spend after CAC improves.  ",
    proposedAction: { campaignId: "camp_1", dailyBudgetCents: 25_000 },
    requiredApproverRole: "  owner  ",
    dueAt,
    expiresAt: new Date("2026-05-07T11:00:00.000Z")
  });

  assert.equal(input.actionType, "budget_increase");
  assert.equal(input.riskLevel, "medium");
  assert.equal(input.title, "Raise branded search budget");
  assert.equal(input.summary, "Increase daily spend after CAC improves.");
  assert.equal(input.requiredApproverRole, "owner");
  assert.equal(input.expiresAt?.toISOString(), dueAt.toISOString());
});

test("buildApprovalEscalationDecision leaves pending approvals alone before due date", () => {
  const decision = buildApprovalEscalationDecision({
    status: "pending",
    riskLevel: "critical",
    createdAt: new Date("2026-05-07T11:00:00.000Z"),
    dueAt: new Date("2026-05-07T12:00:00.000Z"),
    now: new Date("2026-05-07T11:30:00.000Z")
  });

  assert.equal(decision.status, "pending");
  assert.equal(decision.shouldEscalate, false);
  assert.equal(decision.escalationLevel, 0);
  assert.deepEqual(decision.reasons, ["critical_risk_action"]);
});

test("buildApprovalEscalationDecision escalates overdue high-risk approvals", () => {
  const now = new Date("2026-05-07T12:30:00.000Z");
  const decision = buildApprovalEscalationDecision({
    status: "pending",
    riskLevel: "high",
    createdAt: new Date("2026-05-07T10:00:00.000Z"),
    dueAt: new Date("2026-05-07T12:00:00.000Z"),
    escalationLevel: 1,
    now
  });

  assert.equal(decision.status, "escalated");
  assert.equal(decision.shouldEscalate, true);
  assert.equal(decision.escalationLevel, 2);
  assert.equal(decision.escalatedAt?.toISOString(), now.toISOString());
  assert.deepEqual(decision.reasons, ["approval_overdue", "high_risk_action"]);
});

test("buildApprovalEscalationDecision expires open approvals after expiry", () => {
  const decision = buildApprovalEscalationDecision({
    status: "escalated",
    riskLevel: "critical",
    createdAt: new Date("2026-05-07T10:00:00.000Z"),
    dueAt: new Date("2026-05-07T11:00:00.000Z"),
    expiresAt: new Date("2026-05-07T12:00:00.000Z"),
    now: new Date("2026-05-07T12:00:00.000Z")
  });

  assert.equal(decision.status, "expired");
  assert.equal(decision.shouldEscalate, false);
  assert.deepEqual(decision.reasons, ["approval_expired"]);
});

test("canApplyApprovalDecision only permits pending and escalated requests", () => {
  assert.equal(canApplyApprovalDecision("pending"), true);
  assert.equal(canApplyApprovalDecision("escalated"), true);
  assert.equal(canApplyApprovalDecision("approved"), false);
  assert.equal(canApplyApprovalDecision("rejected"), false);
  assert.equal(canApplyApprovalDecision("cancelled"), false);
});

test("buildProviderWriteApprovalContext preserves selected provider ids", () => {
  const context = buildProviderWriteApprovalContext({
    provider: "meta_ads",
    externalAccountId: "act_123",
    externalCampaignId: "23850000000000001",
    externalAdSetId: "23850000000000002",
    campaignName: "Prospecting",
    spendExposureCents: 12345
  });

  assert.equal(context.actionType, "provider_write_dry_run");
  assert.equal(context.riskLevel, "high");
  assert.equal(context.proposedAction.provider, "meta_ads");
  assert.equal(context.proposedAction.operationType, "update_ad_set_budget");
  assert.equal(context.proposedAction.externalAdSetId, "23850000000000002");
  assert.equal(context.proposedAction.spendExposureCents, 12345);
  assert.equal(context.approvalPolicy.noProviderMutation, true);
});
