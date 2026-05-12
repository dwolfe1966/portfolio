import assert from "node:assert/strict";
import test from "node:test";
import {
  acquisitionProviderSnapshotFacts,
  acquisitionProviderSnapshotScopeLabel
} from "../lib/acquisition-provider-snapshots";

test("acquisitionProviderSnapshotFacts reads selected provider scope metadata", () => {
  const facts = acquisitionProviderSnapshotFacts({
    provider: "google_ads",
    externalAccountId: "1234567890",
    connectionId: "conn_123",
    externalCampaignId: "camp_1",
    externalAdGroupId: "group_1",
    syncScope: "selected_provider_scope",
    syncedAt: "2026-05-12T10:00:00.000Z",
    providerRowCounts: { campaigns: 1, adGroups: 1, ads: 3 }
  });

  assert.equal(facts.provider, "google_ads");
  assert.equal(facts.externalAccountId, "1234567890");
  assert.equal(facts.connectionId, "conn_123");
  assert.equal(facts.externalCampaignId, "camp_1");
  assert.equal(facts.externalAdGroupId, "group_1");
  assert.equal(facts.syncScope, "selected_provider_scope");
  assert.deepEqual(facts.providerRowCounts, { campaigns: 1, adGroups: 1, ads: 3 });
});

test("acquisitionProviderSnapshotScopeLabel describes selected and account syncs", () => {
  assert.equal(
    acquisitionProviderSnapshotScopeLabel({
      syncScope: "selected_provider_scope",
      externalCampaignId: "camp_1",
      externalAdGroupId: "group_1"
    }),
    "selected campaign camp_1 / group group_1"
  );

  assert.equal(acquisitionProviderSnapshotScopeLabel({}, { sentenceCase: true }), "Account sync");
});

test("acquisitionProviderSnapshotFacts falls back to nested source metadata", () => {
  const facts = acquisitionProviderSnapshotFacts({
    sourceMetadata: {
      provider: "meta_ads",
      externalAccountId: "act_123",
      externalCampaignId: "camp_2",
      syncScope: "selected_provider_scope"
    }
  });

  assert.equal(facts.provider, "meta_ads");
  assert.equal(facts.externalAccountId, "act_123");
  assert.equal(facts.externalCampaignId, "camp_2");
  assert.equal(facts.syncScope, "selected_provider_scope");
});
