import test from "node:test";
import assert from "node:assert/strict";
import {
  evaluateAdWriteOperationSafety,
  type AdWriteOperationType,
  type AdWriteSafetyInput
} from "@/lib/acquisition";

const BASE_SAFE_WRITE: AdWriteSafetyInput = {
  operationType: "update_budget",
  workspaceExecutionEnabled: true,
  providerHealthOk: true,
  hasCredentialGrant: true,
  targetAccountAllowed: true,
  productionWritesEnabled: true,
  dryRunCompleted: true,
  idempotencyKey: "write-001",
  rollbackPlan: "Restore previous budget from provider diff."
};

test("evaluateAdWriteOperationSafety allows a reversible low-risk write with dry-run, idempotency, and rollback", () => {
  const decision = evaluateAdWriteOperationSafety(BASE_SAFE_WRITE);

  assert.equal(decision.allowed, true);
  assert.equal(decision.riskLevel, "low");
  assert.deepEqual(decision.reasons, []);
});

test("evaluateAdWriteOperationSafety blocks writes when execution prerequisites are missing", () => {
  const decision = evaluateAdWriteOperationSafety({
    ...BASE_SAFE_WRITE,
    workspaceExecutionEnabled: false,
    providerHealthOk: false,
    hasCredentialGrant: false,
    targetAccountAllowed: false,
    productionWritesEnabled: false
  });

  assert.equal(decision.allowed, false);
  assert.ok(decision.reasons.some((reason) => /Workspace execution/.test(reason)));
  assert.ok(decision.reasons.some((reason) => /Provider health/.test(reason)));
  assert.ok(decision.reasons.some((reason) => /credential grant/.test(reason)));
  assert.ok(decision.reasons.some((reason) => /ad account/.test(reason)));
  assert.ok(decision.reasons.some((reason) => /Production writes/.test(reason)));
});

test("evaluateAdWriteOperationSafety requires dry-run and idempotency for every mutation type", () => {
  const operationTypes: AdWriteOperationType[] = [
    "create_campaign",
    "update_budget",
    "pause_resume",
    "upload_creative",
    "sync_audience",
    "rollback_change"
  ];

  for (const operationType of operationTypes) {
    const decision = evaluateAdWriteOperationSafety({
      ...BASE_SAFE_WRITE,
      operationType,
      dryRunCompleted: false,
      idempotencyKey: " "
    });

    assert.equal(decision.allowed, false, operationType);
    assert.ok(decision.reasons.some((reason) => /dry-run/.test(reason)), operationType);
    assert.ok(decision.reasons.some((reason) => /Idempotency/.test(reason)), operationType);
  }
});

test("evaluateAdWriteOperationSafety requires rollback plans for reversible writes", () => {
  const reversibleOperationTypes: AdWriteOperationType[] = [
    "update_budget",
    "pause_resume",
    "upload_creative",
    "sync_audience",
    "rollback_change"
  ];

  for (const operationType of reversibleOperationTypes) {
    const decision = evaluateAdWriteOperationSafety({
      ...BASE_SAFE_WRITE,
      operationType,
      rollbackPlan: ""
    });

    assert.equal(decision.allowed, false, operationType);
    assert.ok(decision.reasons.some((reason) => /Rollback plan/.test(reason)), operationType);
  }
});

test("evaluateAdWriteOperationSafety requires approval for high-risk actions", () => {
  const createCampaign = evaluateAdWriteOperationSafety({
    ...BASE_SAFE_WRITE,
    operationType: "create_campaign",
    approvalCompleted: false
  });
  const uploadCreative = evaluateAdWriteOperationSafety({
    ...BASE_SAFE_WRITE,
    operationType: "upload_creative",
    approvalCompleted: false
  });
  const syncAudience = evaluateAdWriteOperationSafety({
    ...BASE_SAFE_WRITE,
    operationType: "sync_audience",
    approvalCompleted: false
  });

  assert.equal(createCampaign.riskLevel, "high");
  assert.equal(uploadCreative.riskLevel, "high");
  assert.equal(syncAudience.riskLevel, "high");
  assert.equal(createCampaign.allowed, false);
  assert.equal(uploadCreative.allowed, false);
  assert.equal(syncAudience.allowed, false);
  assert.ok(createCampaign.reasons.some((reason) => /Approval/.test(reason)));
});

test("evaluateAdWriteOperationSafety blocks protected campaigns and emergency stop", () => {
  const decision = evaluateAdWriteOperationSafety({
    ...BASE_SAFE_WRITE,
    protectedCampaign: true,
    emergencyStopActive: true
  });

  assert.equal(decision.allowed, false);
  assert.ok(decision.reasons.some((reason) => /protected/.test(reason)));
  assert.ok(decision.reasons.some((reason) => /Emergency stop/.test(reason)));
});
