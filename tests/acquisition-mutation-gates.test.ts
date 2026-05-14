import assert from "node:assert/strict";
import test from "node:test";
import { buildAcquisitionMutationEnablementGate } from "@/lib/acquisition-mutation-gates";
import type { AcquisitionMutationEnablementInput } from "@/lib/acquisition-mutation-gates";

const BASE_INPUT: AcquisitionMutationEnablementInput = {
  workspaceId: "workspace_1",
  workspaceExecutionEnabled: true,
  provider: "google_ads",
  externalAccountId: "1234567890",
  externalCampaignId: "customers/1234567890/campaigns/987654321",
  operationType: "update_budget",
  targetAccountAllowed: true,
  operationAllowed: true,
  credentialGrant: {
    id: "grant_1",
    provider: "google_ads",
    externalAccountId: "1234567890",
    status: "active",
    environment: "sandbox",
    tokenHealthStatus: "valid",
    capabilities: [
      "google_ads.customer.read",
      "google_ads.campaign.read",
      "provider_write.dry_run",
      "provider_write.mutate"
    ]
  },
  dryRun: {
    id: "dry_1",
    workspaceId: "workspace_1",
    app: "acquisition",
    provider: "google_ads",
    operationType: "update_budget",
    mode: "dry_run",
    status: "ready",
    idempotencyKey: "approval:approval_1:provider_write",
    externalAccountId: "1234567890",
    externalCampaignId: "customers/1234567890/campaigns/987654321",
    rollbackSupported: true,
    rollbackPlan: "Restore previous campaign budget from the persisted dry-run diff.",
    blockers: []
  },
  approval: {
    id: "approval_1",
    workspaceId: "workspace_1",
    app: "acquisition",
    actionType: "provider_write_mutation",
    status: "approved",
    riskLevel: "high",
    decidedAt: "2026-05-14T10:00:00.000Z"
  },
  measurement: {
    id: "handoff_1",
    workspaceId: "workspace_1",
    providerWriteDryRunId: "dry_1",
    status: "queued",
    observationJobId: "job_observe_1",
    measurementJobId: "job_measure_1",
    measurementOutputs: ["spend_moved", "revenue_impact_attribution"]
  },
  mutationIdempotencyKey: "mutation:dry_1:update_budget",
  emergencyStopActive: false
};

test("buildAcquisitionMutationEnablementGate allows mutation only when every production gate passes", () => {
  const decision = buildAcquisitionMutationEnablementGate(BASE_INPUT);

  assert.equal(decision.enabled, true);
  assert.equal(decision.status, "ready");
  assert.deepEqual(decision.blockers, []);
  assert.equal(decision.checks.length, 11);
});

test("buildAcquisitionMutationEnablementGate fails closed with no evidence", () => {
  const decision = buildAcquisitionMutationEnablementGate({});

  assert.equal(decision.enabled, false);
  assert.equal(decision.status, "blocked");
  assert.deepEqual(decision.blockers, [
    "workspace",
    "provider",
    "account",
    "operation",
    "credential_grant",
    "dry_run",
    "approval",
    "rollback",
    "idempotency",
    "measurement",
    "emergency_stop"
  ]);
});

test("buildAcquisitionMutationEnablementGate rejects dry-run-only approvals and reused dry-run idempotency", () => {
  const decision = buildAcquisitionMutationEnablementGate({
    ...BASE_INPUT,
    approval: {
      ...BASE_INPUT.approval!,
      actionType: "provider_write_dry_run"
    },
    mutationIdempotencyKey: BASE_INPUT.dryRun!.idempotencyKey
  });

  assert.equal(decision.enabled, false);
  assert.ok(decision.blockers.includes("approval"));
  assert.ok(decision.blockers.includes("idempotency"));
});

test("buildAcquisitionMutationEnablementGate blocks mismatched provider targets and incomplete measurement handoff", () => {
  const decision = buildAcquisitionMutationEnablementGate({
    ...BASE_INPUT,
    externalAccountId: "9999999999",
    dryRun: {
      ...BASE_INPUT.dryRun!,
      externalCampaignId: "customers/1234567890/campaigns/other"
    },
    measurement: {
      ...BASE_INPUT.measurement!,
      observationJobId: null,
      measurementOutputs: []
    }
  });

  assert.equal(decision.enabled, false);
  assert.ok(decision.blockers.includes("account"));
  assert.ok(decision.blockers.includes("dry_run"));
  assert.ok(decision.blockers.includes("measurement"));
});

test("buildAcquisitionMutationEnablementGate requires valid mutation capability and clear emergency stop", () => {
  const decision = buildAcquisitionMutationEnablementGate({
    ...BASE_INPUT,
    credentialGrant: {
      ...BASE_INPUT.credentialGrant!,
      capabilities: ["provider_write.dry_run"]
    },
    emergencyStopActive: true
  });

  assert.equal(decision.enabled, false);
  assert.ok(decision.blockers.includes("credential_grant"));
  assert.ok(decision.blockers.includes("emergency_stop"));
});
