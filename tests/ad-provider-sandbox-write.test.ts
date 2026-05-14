import assert from "node:assert/strict";
import test from "node:test";
import {
  getAdProviderSandboxWriteAdapter,
  hasAdProviderSandboxWriteAdapter,
  SimulatedAdProviderSandboxWriteAdapter
} from "@/lib/ad-connectors/sandbox-write";
import { buildAcquisitionMutationEnablementGate } from "@/lib/acquisition-mutation-gates";
import type {
  AcquisitionMutationDryRunEvidence,
  AcquisitionMutationEnablementInput
} from "@/lib/acquisition-mutation-gates";

const DRY_RUN = {
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
  rollbackPlan: "Restore previous Google Ads campaign budget.",
  blockers: [],
  providerObjects: [
    {
      resourceType: "campaign",
      resourceId: "customers/1234567890/campaigns/987654321",
      before: { dailyBudgetCents: 10000, status: "ENABLED" },
      after: { dailyBudgetCents: 12000, status: "ENABLED" }
    }
  ]
} as AcquisitionMutationDryRunEvidence & {
  providerObjects: Array<{
    resourceType: string;
    resourceId: string;
    before: Record<string, unknown>;
    after: Record<string, unknown>;
  }>;
};

function baseGateInput(overrides: Partial<AcquisitionMutationEnablementInput> = {}): AcquisitionMutationEnablementInput {
  return {
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
      tokenHealthStatus: "valid",
      capabilities: ["provider_write.dry_run", "provider_write.mutate"]
    },
    dryRun: DRY_RUN,
    approval: {
      id: "approval_1",
      workspaceId: "workspace_1",
      app: "acquisition",
      actionType: "provider_write_mutation",
      status: "approved",
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
    emergencyStopActive: false,
    ...overrides
  };
}

test("SimulatedAdProviderSandboxWriteAdapter applies only after mutation gates pass", () => {
  const gateDecision = buildAcquisitionMutationEnablementGate(baseGateInput());
  const result = new SimulatedAdProviderSandboxWriteAdapter().applySandboxMutation({
    workspaceId: "workspace_1",
    provider: "google_ads",
    operationType: "update_budget",
    externalAccountId: "1234567890",
    externalCampaignId: "customers/1234567890/campaigns/987654321",
    mutationIdempotencyKey: "mutation:dry_1:update_budget",
    dryRun: DRY_RUN,
    gateDecision
  });

  assert.equal(gateDecision.enabled, true);
  assert.equal(result.status, "applied");
  assert.equal(result.mode, "sandbox_mutation");
  assert.equal(result.providerOperationId, "sandbox_google_ads_0ques5o");
  assert.ok(result.appliedAt);
  assert.equal(result.rollback.supported, true);
  assert.equal(result.rollback.providerOperationId, "rollback_sandbox_google_ads_0ques5o");
  assert.deepEqual(result.providerObjects, DRY_RUN.providerObjects);
  assert.ok(result.warnings.some((warning) => /Sandbox adapter only/.test(warning)));
});

test("SimulatedAdProviderSandboxWriteAdapter blocks when mutation gate fails", () => {
  const gateDecision = buildAcquisitionMutationEnablementGate(baseGateInput({
    emergencyStopActive: true
  }));
  const result = new SimulatedAdProviderSandboxWriteAdapter().applySandboxMutation({
    workspaceId: "workspace_1",
    provider: "google_ads",
    operationType: "update_budget",
    externalAccountId: "1234567890",
    externalCampaignId: "customers/1234567890/campaigns/987654321",
    mutationIdempotencyKey: "mutation:dry_1:update_budget",
    dryRun: DRY_RUN,
    gateDecision
  });

  assert.equal(gateDecision.enabled, false);
  assert.equal(result.status, "blocked");
  assert.equal(result.providerOperationId, null);
  assert.ok(result.blockers.includes("emergency_stop"));
  assert.ok(result.blockers.includes("mutation_gate_blocked"));
});

test("SimulatedAdProviderSandboxWriteAdapter blocks unsupported sandbox operations", () => {
  const gateDecision = buildAcquisitionMutationEnablementGate(baseGateInput({
    operationType: "create_campaign",
    dryRun: {
      ...DRY_RUN,
      operationType: "create_campaign"
    }
  }));
  const result = new SimulatedAdProviderSandboxWriteAdapter().applySandboxMutation({
    workspaceId: "workspace_1",
    provider: "google_ads",
    operationType: "create_campaign",
    externalAccountId: "1234567890",
    externalCampaignId: "customers/1234567890/campaigns/987654321",
    mutationIdempotencyKey: "mutation:dry_1:create_campaign",
    dryRun: {
      ...DRY_RUN,
      operationType: "create_campaign"
    },
    gateDecision
  });

  assert.equal(gateDecision.enabled, true);
  assert.equal(result.status, "blocked");
  assert.deepEqual(result.blockers, ["sandbox_operation_not_allowed"]);
});

test("sandbox write adapter registry is opt-in", () => {
  assert.equal(hasAdProviderSandboxWriteAdapter(undefined), false);
  assert.equal(hasAdProviderSandboxWriteAdapter("simulated"), true);
  assert.equal(hasAdProviderSandboxWriteAdapter("simulated_sandbox"), true);
  assert.equal(hasAdProviderSandboxWriteAdapter("google_ads"), false);
  assert.equal(getAdProviderSandboxWriteAdapter("simulated")?.name, "simulated_sandbox");
});
