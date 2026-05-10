import test from "node:test";
import assert from "node:assert/strict";
import {
  acquisitionProviderDryRunAdapterAvailable,
  buildAcquisitionProviderWriteReadiness
} from "@/lib/acquisition-agent-generalization";
import {
  GoogleAdsProviderWriteDryRunAdapter,
  MetaAdsProviderWriteDryRunAdapter,
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
  assert.equal(acquisitionProviderDryRunAdapterAvailable("google_ads"), true);
  assert.equal(acquisitionProviderDryRunAdapterAvailable("meta_ads"), true);
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

test("GoogleAdsProviderWriteDryRunAdapter returns Google Ads resource diff without mutation", () => {
  const input = normalizeAdProviderWriteDryRunInput({
    idempotencyKey: "approval:approval_2:provider_write",
    proposedAction: {
      provider: "google_ads",
      operationType: "pause_resume",
      externalAccountId: "123-456-7890",
      externalCampaignId: "987654321",
      previousStatus: "ENABLED",
      nextStatus: "PAUSED"
    }
  });

  const dryRun = new GoogleAdsProviderWriteDryRunAdapter().dryRunProviderWrite(input);

  assert.equal(dryRun.provider, "google_ads");
  assert.equal(dryRun.operationType, "pause_resume");
  assert.equal(dryRun.providerObjects[0].resourceId, "customers/1234567890/campaigns/987654321");
  assert.equal(dryRun.providerObjects[0].after.googleAdsResourceName, "customers/1234567890/campaigns/987654321");
  assert.equal(dryRun.providerObjects[0].after.mutateOperation, "pause_resume");
  assert.equal(dryRun.permissionChecks.every((check) => check.ok), true);
  assert.equal(dryRun.rollbackSupported, true);
  assert.deepEqual(dryRun.blockers, []);
});

test("GoogleAdsProviderWriteDryRunAdapter blocks incomplete campaign mutation context", () => {
  const dryRun = new GoogleAdsProviderWriteDryRunAdapter().dryRunProviderWrite(
    normalizeAdProviderWriteDryRunInput({
      proposedAction: {
        provider: "google_ads",
        operationType: "update_budget"
      }
    })
  );

  assert.ok(dryRun.blockers.includes("google_ads_external_account_id_missing"));
  assert.ok(dryRun.blockers.includes("google_ads_campaign_resource_missing"));
  assert.equal(dryRun.permissionChecks.find((check) => check.capability === "google_ads.read_campaign")?.ok, false);
});

test("MetaAdsProviderWriteDryRunAdapter returns Meta object diff without mutation", () => {
  const input = normalizeAdProviderWriteDryRunInput({
    idempotencyKey: "approval:approval_3:provider_write",
    proposedAction: {
      provider: "meta_ads",
      operationType: "update_ad_set_budget",
      externalAccountId: "act_1234567890",
      externalCampaignId: "23850000000000001",
      externalAdSetId: "23850000000000002",
      previousBudgetCents: 15000,
      nextBudgetCents: 18000,
      shiftAmountCents: 3000
    }
  });

  const dryRun = new MetaAdsProviderWriteDryRunAdapter().dryRunProviderWrite(input);

  assert.equal(dryRun.provider, "meta_ads");
  assert.equal(dryRun.operationType, "update_ad_set_budget");
  assert.equal(dryRun.externalAccountId, "act_1234567890");
  assert.equal(dryRun.externalCampaignId, "23850000000000001");
  assert.equal(dryRun.providerObjects[0].resourceType, "ad_set");
  assert.equal(dryRun.providerObjects[0].resourceId, "23850000000000002");
  assert.equal(dryRun.providerObjects[0].after.metaAdSetId, "23850000000000002");
  assert.equal(dryRun.providerObjects[0].after.graphApiOperation, "update_ad_set_budget");
  assert.equal(dryRun.spendExposureCents, 3000);
  assert.equal(dryRun.rollbackSupported, true);
  assert.deepEqual(dryRun.blockers, []);
});

test("MetaAdsProviderWriteDryRunAdapter blocks incomplete ad set mutation context", () => {
  const dryRun = new MetaAdsProviderWriteDryRunAdapter().dryRunProviderWrite(
    normalizeAdProviderWriteDryRunInput({
      proposedAction: {
        provider: "meta_ads",
        operationType: "update_ad_set_budget",
        externalAccountId: "act_1234567890"
      }
    })
  );

  assert.ok(dryRun.blockers.includes("meta_ads_campaign_id_missing"));
  assert.ok(dryRun.blockers.includes("meta_ads_ad_set_id_missing"));
  assert.equal(dryRun.permissionChecks.find((check) => check.capability === "meta_ads.ads_read")?.ok, true);
});
