import assert from "node:assert/strict";
import test from "node:test";
import { buildProviderWritePreflight } from "@/lib/provider-preflight";

const ACTIVE_GOOGLE_GRANT = {
  id: "grant_1",
  status: "active",
  environment: "test",
  tokenHealthStatus: "valid",
  capabilities: [
    "provider.account.read",
    "provider.object.read",
    "provider.performance.read",
    "provider_write.dry_run",
    "google_ads.customer.read",
    "google_ads.campaign.read",
    "google_ads.performance.read"
  ]
};

test("buildProviderWritePreflight passes approval with active grant and selected object", () => {
  const result = buildProviderWritePreflight({
    provider: "google_ads",
    externalAccountId: "1234567890",
    externalCampaignId: "987654321",
    credentialGrant: ACTIVE_GOOGLE_GRANT,
    providerObjectSelected: true,
    approvalPolicyConfigured: true,
    dryRunAdapterAvailable: true,
    measurementConfigured: true
  });

  assert.equal(result.readyForApproval, true);
  assert.equal(result.readyForExecution, true);
  assert.deepEqual(result.blockers, []);
  assert.ok(result.warnings.includes("write_permission"));
});

test("buildProviderWritePreflight blocks missing grants and selected provider objects", () => {
  const result = buildProviderWritePreflight({
    provider: "meta_ads",
    externalAccountId: "act_123",
    credentialGrant: null,
    providerObjectSelected: false,
    approvalPolicyConfigured: true,
    dryRunAdapterAvailable: true,
    measurementConfigured: false
  });

  assert.equal(result.readyForApproval, false);
  assert.ok(result.blockers.includes("credential_grant"));
  assert.ok(result.blockers.includes("provider_object"));
  assert.ok(result.warnings.includes("measurement_readiness"));
});

test("buildProviderWritePreflight blocks expired tokens and live-read failures", () => {
  const result = buildProviderWritePreflight({
    provider: "google_ads",
    externalAccountId: "1234567890",
    externalCampaignId: "987654321",
    credentialGrant: { ...ACTIVE_GOOGLE_GRANT, tokenHealthStatus: "expired" },
    providerObjectSelected: true,
    liveDataError: "Provider account is not a test account.",
    approvalPolicyConfigured: true,
    dryRunAdapterAvailable: true,
    measurementConfigured: true
  });

  assert.equal(result.status, "blocked");
  assert.ok(result.blockers.includes("token_health"));
  assert.ok(result.blockers.includes("live_read"));
});
