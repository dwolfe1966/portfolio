import assert from "node:assert/strict";
import test from "node:test";
import {
  ACQUISITION_DEFAULT_SOURCE_NAME,
  acquisitionLineageIsProviderBacked,
  acquisitionProviderAudienceLineage,
  acquisitionProviderLabel,
  acquisitionProviderTargetingFacts,
  acquisitionSourceLineageFromAuditLogs,
  acquisitionSourceLineageFromMetadata
} from "../lib/acquisition-source-lineage";

test("acquisitionSourceLineageFromMetadata normalizes provider dataset metadata", () => {
  const source = acquisitionSourceLineageFromMetadata({
    sourceType: "google_ads",
    sourceName: "Google Ads sync",
    datasetId: "dataset_1",
    connectionId: "conn_1",
    externalAccountId: "1234567890",
    syncedAt: "2026-05-01T12:00:00.000Z"
  }, "2026-05-02T12:00:00.000Z");

  assert.equal(source.label, "Google Ads");
  assert.equal(source.provider, "google_ads");
  assert.equal(source.sourceName, "Google Ads sync");
  assert.equal(source.datasetId, "dataset_1");
  assert.equal(source.connectionId, "conn_1");
  assert.equal(source.externalAccountId, "1234567890");
  assert.equal(source.syncedAt, "2026-05-01T12:00:00.000Z");
  assert.equal(source.appliedAt, "2026-05-02T12:00:00.000Z");
  assert.equal(acquisitionLineageIsProviderBacked(source), true);
});

test("acquisitionSourceLineageFromAuditLogs prefers dataset application events", () => {
  const source = acquisitionSourceLineageFromAuditLogs([
    {
      action: "campaign_created",
      metadata: { sourceType: "csv", sourceName: "Manual setup" },
      createdAt: "2026-05-01T12:00:00.000Z"
    },
    {
      action: "acquisition_dataset_applied",
      metadata: { sourceType: "meta_ads", sourceName: "Meta snapshot" },
      createdAt: "2026-05-03T12:00:00.000Z"
    }
  ]);

  assert.equal(source.label, "Meta Ads");
  assert.equal(source.sourceName, "Meta snapshot");
  assert.equal(source.appliedAt, "2026-05-03T12:00:00.000Z");
});

test("acquisition lineage defaults manual metadata without links", () => {
  const source = acquisitionSourceLineageFromMetadata(null);

  assert.equal(source.label, "Manual/sample");
  assert.equal(source.sourceName, ACQUISITION_DEFAULT_SOURCE_NAME);
  assert.equal(source.datasetId, "");
  assert.equal(acquisitionLineageIsProviderBacked(source), false);
});

test("acquisitionProviderAudienceLineage finds provider campaign context", () => {
  const source = acquisitionProviderAudienceLineage([
    { targetingJson: { region: "us" } },
    {
      targetingJson: {
        provider: "google_ads",
        externalCampaignId: "campaign_1",
        externalAdGroupId: "group_1"
      }
    }
  ]);

  assert.deepEqual(source, {
    provider: "google_ads",
    externalCampaignId: "campaign_1",
    externalAdGroupId: "group_1"
  });
});

test("acquisitionProviderTargetingFacts normalizes ad group and ad set ids", () => {
  assert.deepEqual(acquisitionProviderTargetingFacts({
    provider: "google_ads",
    externalCampaignId: "campaign_1",
    externalAdGroupId: "group_1"
  }), {
    provider: "google_ads",
    externalCampaignId: "campaign_1",
    externalChildId: "group_1"
  });

  assert.deepEqual(acquisitionProviderTargetingFacts({
    provider: "meta_ads",
    externalCampaignId: "campaign_2",
    externalAdSetId: "set_1"
  }), {
    provider: "meta_ads",
    externalCampaignId: "campaign_2",
    externalChildId: "set_1"
  });
  assert.equal(acquisitionProviderLabel("google_ads"), "Google Ads");
  assert.equal(acquisitionProviderLabel("unknown_provider"), "unknown provider");
});
