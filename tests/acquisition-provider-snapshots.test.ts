import assert from "node:assert/strict";
import test from "node:test";
import {
  acquisitionProviderSnapshotFacts,
  acquisitionProviderSnapshotMetadata,
  acquisitionProviderSnapshotName,
  acquisitionProviderSnapshotScopeLabel,
  acquisitionProviderSnapshotSourceLabel
} from "../lib/acquisition-provider-snapshots";

test("acquisitionProviderSnapshotFacts reads selected provider scope metadata", () => {
  const facts = acquisitionProviderSnapshotFacts({
    provider: "google_ads",
    providerLabel: "Google Ads",
    externalAccountId: "1234567890",
    accountName: "Search Manager",
    connectionId: "conn_123",
    externalCampaignId: "camp_1",
    campaignName: "Brand Search",
    externalAdGroupId: "group_1",
    adGroupName: "Exact match",
    childScopeType: "ad_group",
    syncScope: "selected_provider_scope",
    snapshotSource: "live",
    syncedAt: "2026-05-12T10:00:00.000Z",
    providerRowCounts: { campaigns: 1, adGroups: 1, ads: 3 }
  });

  assert.equal(facts.provider, "google_ads");
  assert.equal(facts.providerLabel, "Google Ads");
  assert.equal(facts.externalAccountId, "1234567890");
  assert.equal(facts.accountName, "Search Manager");
  assert.equal(facts.connectionId, "conn_123");
  assert.equal(facts.externalCampaignId, "camp_1");
  assert.equal(facts.campaignName, "Brand Search");
  assert.equal(facts.externalAdGroupId, "group_1");
  assert.equal(facts.adGroupName, "Exact match");
  assert.equal(facts.childScopeType, "ad_group");
  assert.equal(facts.syncScope, "selected_provider_scope");
  assert.equal(facts.snapshotSource, "live");
  assert.equal(facts.fallbackSnapshot, false);
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

  assert.equal(
    acquisitionProviderSnapshotScopeLabel({
      syncScope: "selected_provider_scope",
      externalCampaignId: "camp_2",
      externalAdGroupId: "set_1",
      childScopeType: "ad_set"
    }),
    "selected campaign camp_2 / ad set set_1"
  );

  assert.equal(acquisitionProviderSnapshotScopeLabel({}, { sentenceCase: true }), "Account sync");
});

test("acquisition provider labels mark fallback snapshots", () => {
  const metadata = {
    fallbackSnapshot: true,
    syncScope: "provider_account",
    sourceMetadata: {
      sourceFlow: "provider_fallback_snapshot",
      fallbackSource: "deterministic_simulated_provider_shape"
    }
  };

  const facts = acquisitionProviderSnapshotFacts(metadata);
  assert.equal(facts.fallbackSnapshot, true);
  assert.equal(facts.sourceFlow, "provider_fallback_snapshot");
  assert.equal(facts.fallbackSource, "deterministic_simulated_provider_shape");
  assert.equal(acquisitionProviderSnapshotSourceLabel(metadata), "Provider-shaped fallback");
  assert.equal(acquisitionProviderSnapshotScopeLabel(metadata), "fallback account sync");
  assert.equal(acquisitionProviderSnapshotScopeLabel(metadata, { sentenceCase: true }), "Fallback account sync");
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

test("acquisition provider snapshot helpers build scoped names and metadata", () => {
  const input = {
    provider: "google_ads",
    providerLabel: "Google Ads",
    connectionId: "conn_123",
    externalAccountId: "4038304311",
    accountName: "MyLife Lookup",
    externalCampaignId: "camp_1",
    campaignName: "Brand Search Campaign",
    externalAdGroupId: "group_1",
    adGroupName: "Exact Match Group",
    childScopeType: "ad_group",
    syncedAt: "2026-05-20T18:25:00.000Z",
    providerRowCounts: {
      campaigns: 1,
      adGroups: 1,
      ads: 2,
      performanceSeries: 1,
      performancePoints: 14
    }
  };

  assert.equal(
    acquisitionProviderSnapshotName(input),
    "Google Ads · 4038304311 · Campaign: Brand Search Campaign · Ad group: Exact Match Group · live · 2026-05-20"
  );

  assert.deepEqual(acquisitionProviderSnapshotMetadata(input), {
    provider: "google_ads",
    providerLabel: "Google Ads",
    externalAccountId: "4038304311",
    accountName: "MyLife Lookup",
    externalCampaignId: "camp_1",
    campaignName: "Brand Search Campaign",
    externalAdGroupId: "group_1",
    adGroupName: "Exact Match Group",
    childScopeType: "ad_group",
    connectionId: "conn_123",
    syncScope: "selected_provider_scope",
    syncedAt: "2026-05-20T18:25:00.000Z",
    snapshotSource: "live",
    fallbackSnapshot: false,
    sourceMetadata: {
      sourceFlow: "provider_oauth_sync",
      provider: "google_ads",
      providerLabel: "Google Ads",
      externalAccountId: "4038304311",
      accountName: "MyLife Lookup",
      externalCampaignId: "camp_1",
      campaignName: "Brand Search Campaign",
      externalAdGroupId: "group_1",
      adGroupName: "Exact Match Group",
      childScopeType: "ad_group",
      syncScope: "selected_provider_scope",
      snapshotSource: "live",
      liveProviderReadBlocked: false,
      fallbackSource: null
    },
    providerRowCounts: {
      campaigns: 1,
      adGroups: 1,
      ads: 2,
      performanceSeries: 1,
      performancePoints: 14
    }
  });
});

test("acquisition provider snapshot helpers mark fallback account snapshots", () => {
  const metadata = acquisitionProviderSnapshotMetadata({
    provider: "meta_ads",
    providerLabel: "Meta Ads",
    connectionId: "conn_meta",
    externalAccountId: "act_123",
    accountName: "Meta Account",
    syncedAt: "2026-05-20T18:25:00.000Z",
    fallbackSnapshot: true,
    providerRowCounts: { campaigns: 2, adGroups: 0, ads: 0, performanceSeries: 2, performancePoints: 28 }
  });

  assert.equal(
    acquisitionProviderSnapshotName({
      provider: "meta_ads",
      providerLabel: "Meta Ads",
      connectionId: "conn_meta",
      externalAccountId: "act_123",
      accountName: "Meta Account",
      syncedAt: "2026-05-20T18:25:00.000Z",
      fallbackSnapshot: true,
      providerRowCounts: { campaigns: 2, adGroups: 0, ads: 0, performanceSeries: 2, performancePoints: 28 }
    }),
    "Meta Ads · act_123 · Account · fallback · 2026-05-20"
  );
  assert.equal(metadata.syncScope, "provider_account");
  assert.equal(metadata.snapshotSource, "fallback");
  assert.equal(metadata.sourceMetadata.sourceFlow, "provider_fallback_snapshot");
  assert.equal(metadata.sourceMetadata.fallbackSource, "deterministic_simulated_provider_shape");
});
