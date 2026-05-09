import test from "node:test";
import assert from "node:assert/strict";
import {
  acquisitionProviderDryRunAdapterAvailable,
  buildAcquisitionProviderWriteReadiness
} from "@/lib/acquisition-agent-generalization";
import {
  SimulatedAdProviderWriteDryRunAdapter,
  normalizeAdProviderWriteDryRunInput
} from "@/lib/ad-connectors/write-dry-run";

test("buildAcquisitionProviderWriteReadiness keeps acquisition provider writes simulated by default", () => {
  const readiness = buildAcquisitionProviderWriteReadiness();

  assert.equal(readiness.queueName, "acquisition:provider_write");
  assert.deepEqual(readiness.followOnQueues, ["acquisition:observation", "acquisition:measurement"]);
  assert.equal(readiness.currentMode, "simulated");
  assert.equal(readiness.nextMode, "simulated");
  assert.equal(readiness.readyForDryRun, false);
  assert.equal(readiness.readyForApprovedMutation, false);
  assert.deepEqual(readiness.blockers, [
    "provider_dry_run_adapter_missing",
    "rollback_metadata_missing",
    "approval_policy_missing",
    "measurement_outputs_missing",
    "protected_campaign_checks_missing",
    "emergency_stop_missing"
  ]);
  assert.ok(readiness.approvalGates.includes("emergency_stop"));
  assert.ok(readiness.approvalGates.includes("non_reversible_write"));
});

test("buildAcquisitionProviderWriteReadiness allows dry-run once provider adapters exist", () => {
  const readiness = buildAcquisitionProviderWriteReadiness({
    providerDryRunAdapterAvailable: true
  });

  assert.equal(readiness.readyForDryRun, true);
  assert.equal(readiness.readyForApprovedMutation, false);
  assert.equal(readiness.nextMode, "dry_run");
  assert.ok(!readiness.blockers.includes("provider_dry_run_adapter_missing"));
  assert.ok(readiness.blockers.includes("rollback_metadata_missing"));
  assert.ok(readiness.blockers.includes("approval_policy_missing"));
});

test("buildAcquisitionProviderWriteReadiness allows approved mutations only when every control is configured", () => {
  const readiness = buildAcquisitionProviderWriteReadiness({
    providerDryRunAdapterAvailable: true,
    rollbackMetadataAvailable: true,
    approvalPolicyConfigured: true,
    measurementConfigured: true,
    protectedCampaignChecksEnabled: true,
    emergencyStopConfigured: true
  });

  assert.equal(readiness.readyForDryRun, true);
  assert.equal(readiness.readyForApprovedMutation, true);
  assert.equal(readiness.nextMode, "approved_mutation");
  assert.deepEqual(readiness.blockers, []);
  assert.ok(readiness.rollbackRequirements.includes("provider_operation_id"));
  assert.ok(readiness.measurementOutputs.includes("spend_moved"));
  assert.ok(readiness.measurementOutputs.includes("revenue_impact_attribution"));
});

test("acquisitionProviderDryRunAdapterAvailable is backed by a registered adapter", () => {
  assert.equal(acquisitionProviderDryRunAdapterAvailable("simulated"), true);
  assert.equal(acquisitionProviderDryRunAdapterAvailable("unknown-provider"), false);
});

test("SimulatedAdProviderWriteDryRunAdapter returns provider diff and rollback metadata", () => {
  const input = normalizeAdProviderWriteDryRunInput({
    approvalRequestId: "approval_1",
    idempotencyKey: "approval:approval_1:provider_write",
    proposedAction: {
      provider: "google_ads",
      operationType: "update_budget",
      campaignId: "customers/123/campaigns/456",
      previousBudgetCents: 10000,
      nextBudgetCents: 12000,
      shiftAmountCents: 2000
    }
  });

  const dryRun = new SimulatedAdProviderWriteDryRunAdapter().dryRunProviderWrite(input);

  assert.equal(dryRun.mode, "dry_run");
  assert.equal(dryRun.provider, "google_ads");
  assert.equal(dryRun.operationType, "update_budget");
  assert.equal(dryRun.spendExposureCents, 2000);
  assert.equal(dryRun.rollbackSupported, true);
  assert.equal(dryRun.providerObjects[0].resourceId, "customers/123/campaigns/456");
  assert.deepEqual(dryRun.providerObjects[0].before, { status: "ENABLED", dailyBudgetCents: 10000 });
  assert.deepEqual(dryRun.providerObjects[0].after, { status: "ENABLED", dailyBudgetCents: 12000 });
});
