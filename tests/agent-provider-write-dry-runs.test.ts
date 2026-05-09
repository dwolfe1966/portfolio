import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAgentProviderWriteDryRunRecord,
  buildProviderWriteMeasurementPayload,
  shouldCreateProviderWriteMeasurementHandoff
} from "@/lib/agent-provider-write-dry-runs";
import type { AgentJobExecutionResult, AgentJobForExecution } from "@/lib/agent-worker";

const JOB: AgentJobForExecution = {
  id: "job_1",
  workspaceId: "workspace_1",
  accountUserId: "acct_1",
  app: "acquisition",
  queueName: "acquisition:provider_write",
  jobType: "provider_write",
  payload: {},
  attemptCount: 0,
  maxAttempts: 3
};

test("buildAgentProviderWriteDryRunRecord persists ready dry-run metadata", () => {
  const result: AgentJobExecutionResult = {
    executor: "acquisition.provider_write.google_ads.dry_run",
    action: "dry_run_ad_provider_write",
    providerMutation: "dry_run",
    summary: "Prepared dry-run.",
    output: {
      dryRun: {
        mode: "dry_run",
        provider: "google_ads",
        operationType: "update_budget",
        idempotencyKey: "approval:approval_1:provider_write",
        externalAccountId: "1234567890",
        externalCampaignId: "customers/1234567890/campaigns/987",
        permissionChecks: [{ capability: "google_ads.mutate_campaign", ok: true }],
        providerObjects: [{ resourceType: "campaign", resourceId: "customers/1234567890/campaigns/987", before: {}, after: {} }],
        spendExposureCents: 2500,
        rollbackSupported: true,
        rollbackPlan: "Restore previous budget.",
        blockers: [],
        warnings: []
      }
    }
  };

  const record = buildAgentProviderWriteDryRunRecord(JOB, result);

  assert.ok(record);
  assert.equal(record.status, "ready");
  assert.equal(record.provider, "google_ads");
  assert.equal(record.spendExposureCents, 2500);
  assert.equal(record.rollbackSupported, true);
  assert.equal(record.externalCampaignId, "customers/1234567890/campaigns/987");
});

test("buildAgentProviderWriteDryRunRecord marks blocked dry-runs and ignores non-dry-run results", () => {
  const blocked = buildAgentProviderWriteDryRunRecord(JOB, {
    executor: "acquisition.provider_write.google_ads.dry_run",
    action: "dry_run_ad_provider_write",
    providerMutation: "dry_run",
    summary: "Prepared dry-run.",
    output: {
      dryRun: {
        mode: "dry_run",
        provider: "google_ads",
        operationType: "update_budget",
        idempotencyKey: null,
        externalAccountId: null,
        externalCampaignId: null,
        permissionChecks: [],
        providerObjects: [],
        spendExposureCents: 0,
        rollbackSupported: false,
        rollbackPlan: null,
        blockers: ["google_ads_external_account_id_missing"],
        warnings: []
      }
    }
  });

  assert.ok(blocked);
  assert.equal(blocked.status, "blocked");
  assert.deepEqual(blocked.blockers, ["google_ads_external_account_id_missing"]);

  const ignored = buildAgentProviderWriteDryRunRecord(JOB, {
    executor: "acquisition.provider_write.fake",
    action: "simulate_ad_provider_write",
    providerMutation: "simulated",
    summary: "Simulated.",
    output: {}
  });

  assert.equal(ignored, null);
});

test("shouldCreateProviderWriteMeasurementHandoff only allows ready acquisition dry-runs", () => {
  assert.equal(shouldCreateProviderWriteMeasurementHandoff({ app: "acquisition", status: "ready", blockers: [] }), true);
  assert.equal(shouldCreateProviderWriteMeasurementHandoff({ app: "acquisition", status: "blocked", blockers: ["missing"] }), false);
  assert.equal(shouldCreateProviderWriteMeasurementHandoff({ app: "lifecycle", status: "ready", blockers: [] }), false);
});

test("buildProviderWriteMeasurementPayload preserves measurement handoff context", () => {
  const payload = buildProviderWriteMeasurementPayload({
    dryRunId: "dry_1",
    sourceAgentJobId: "job_1",
    app: "acquisition",
    provider: "google_ads",
    operationType: "update_budget",
    idempotencyKey: "approval:approval_1:provider_write",
    externalAccountId: "1234567890",
    externalCampaignId: "customers/1234567890/campaigns/987",
    spendExposureCents: 2500,
    rollbackSupported: true,
    rollbackPlan: "Restore previous budget.",
    providerObjects: [{ resourceType: "campaign" }]
  });

  assert.equal(payload.providerWriteDryRunId, "dry_1");
  assert.equal(payload.spendExposureCents, 2500);
  assert.equal(payload.rollbackSupported, true);
  assert.ok(payload.measurementOutputs.includes("spend_moved"));
  assert.ok(payload.measurementOutputs.includes("revenue_impact_attribution"));
});
