import assert from "node:assert/strict";
import test from "node:test";
import {
  buildProviderWriteRollbackRecord,
  buildProviderWriteRollbackReviewUpdate,
  rollbackStatusForMutationResult
} from "@/lib/agent-provider-write-rollbacks";
import type { AdProviderSandboxWriteResult } from "@/lib/ad-connectors/sandbox-write";

const APPLIED_RESULT: AdProviderSandboxWriteResult = {
  mode: "sandbox_mutation",
  provider: "google_ads",
  operationType: "update_budget",
  status: "applied",
  idempotencyKey: "mutation:dry_1:update_budget",
  providerOperationId: "sandbox_google_ads_abc123",
  externalAccountId: "1234567890",
  externalCampaignId: "customers/1234567890/campaigns/987",
  appliedAt: "2026-05-14T10:00:00.000Z",
  providerObjects: [
    {
      resourceType: "campaign",
      resourceId: "customers/1234567890/campaigns/987",
      before: { status: "ENABLED", dailyBudgetCents: 10000 },
      after: { status: "ENABLED", dailyBudgetCents: 12000 }
    }
  ],
  rollback: {
    supported: true,
    plan: "Restore the previous campaign budget.",
    providerOperationId: "rollback_sandbox_google_ads_abc123",
    instructions: ["Use before-state.", "Apply via mutation gate."]
  },
  blockers: [],
  warnings: ["Sandbox adapter only."]
};

test("buildProviderWriteRollbackRecord captures before and after state with retention", () => {
  const record = buildProviderWriteRollbackRecord({
    workspaceId: "workspace_1",
    accountUserId: "acct_1",
    providerWriteDryRunId: "dry_1",
    mutationResult: APPLIED_RESULT,
    retentionDays: 90,
    now: new Date("2026-05-14T00:00:00.000Z")
  });

  assert.ok(record);
  assert.equal(record.status, "pending_review");
  assert.equal(record.reversalStatus, "not_started");
  assert.equal(record.providerOperationId, "sandbox_google_ads_abc123");
  assert.equal(record.rollbackProviderOperationId, "rollback_sandbox_google_ads_abc123");
  assert.equal(record.retentionExpiresAt.toISOString(), "2026-08-12T00:00:00.000Z");
  assert.deepEqual(record.beforeState, [
    {
      resourceType: "campaign",
      resourceId: "customers/1234567890/campaigns/987",
      state: { status: "ENABLED", dailyBudgetCents: 10000 }
    }
  ]);
  assert.deepEqual(record.afterState, [
    {
      resourceType: "campaign",
      resourceId: "customers/1234567890/campaigns/987",
      state: { status: "ENABLED", dailyBudgetCents: 12000 }
    }
  ]);
});

test("buildProviderWriteRollbackRecord classifies blocked and non-reversible results", () => {
  assert.equal(rollbackStatusForMutationResult({ ...APPLIED_RESULT, status: "blocked" }), "blocked");
  assert.equal(rollbackStatusForMutationResult({
    ...APPLIED_RESULT,
    rollback: { ...APPLIED_RESULT.rollback, supported: false }
  }), "not_reversible");

  const blocked = buildProviderWriteRollbackRecord({
    workspaceId: "workspace_1",
    providerWriteDryRunId: "dry_1",
    mutationResult: { ...APPLIED_RESULT, status: "blocked", providerOperationId: null },
    now: new Date("2026-05-14T00:00:00.000Z")
  });

  assert.equal(blocked, null);
});

test("buildProviderWriteRollbackRecord clamps retention windows", () => {
  const shortRetention = buildProviderWriteRollbackRecord({
    workspaceId: "workspace_1",
    providerWriteDryRunId: "dry_1",
    mutationResult: APPLIED_RESULT,
    retentionDays: 1,
    now: new Date("2026-05-14T00:00:00.000Z")
  });
  const longRetention = buildProviderWriteRollbackRecord({
    workspaceId: "workspace_1",
    providerWriteDryRunId: "dry_1",
    mutationResult: APPLIED_RESULT,
    retentionDays: 9999,
    now: new Date("2026-05-14T00:00:00.000Z")
  });

  assert.equal(shortRetention?.retentionExpiresAt.toISOString(), "2026-06-13T00:00:00.000Z");
  assert.equal(longRetention?.retentionExpiresAt.toISOString(), "2028-05-13T00:00:00.000Z");
});

test("buildProviderWriteRollbackReviewUpdate maps operator decisions to reversal states", () => {
  const reviewedAt = new Date("2026-05-14T12:00:00.000Z");

  assert.deepEqual(buildProviderWriteRollbackReviewUpdate({
    decision: "approve_reversal",
    reviewedByAccountUserId: "acct_1",
    now: reviewedAt
  }), {
    status: "reviewed",
    reversalStatus: "approved",
    reviewedByAccountUserId: "acct_1",
    reviewedAt,
    reviewDecision: "approve_reversal",
    reversalProviderOperationId: null,
    reversedAt: null
  });

  assert.deepEqual(buildProviderWriteRollbackReviewUpdate({
    decision: "mark_reversed",
    reviewedByAccountUserId: "acct_1",
    reversalProviderOperationId: "rollback_op_1",
    now: reviewedAt
  }), {
    status: "reviewed",
    reversalStatus: "applied",
    reviewedByAccountUserId: "acct_1",
    reviewedAt,
    reviewDecision: "mark_reversed",
    reversalProviderOperationId: "rollback_op_1",
    reversedAt: reviewedAt
  });
});
