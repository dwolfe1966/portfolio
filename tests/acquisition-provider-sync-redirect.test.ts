import assert from "node:assert/strict";
import test from "node:test";
import { providerConnectionSyncRedirectUrl } from "../lib/acquisition-provider-sync-redirect";

test("providerConnectionSyncRedirectUrl preserves selected provider scope", () => {
  const url = providerConnectionSyncRedirectUrl({
    connectionId: "conn_123",
    datasetId: "dataset_123",
    applied: true,
    scope: {
      externalCampaignId: "camp_1",
      externalAdGroupId: "group_1"
    }
  });

  assert.equal(
    url,
    "/acquisition/connections/conn_123?syncedDatasetId=dataset_123&syncApplied=1&campaignId=camp_1&adGroupId=group_1"
  );
});

test("providerConnectionSyncRedirectUrl omits empty provider scope", () => {
  const url = providerConnectionSyncRedirectUrl({
    connectionId: "conn_123",
    datasetId: "dataset_123",
    applied: false,
    scope: {
      externalCampaignId: null,
      externalAdGroupId: null
    }
  });

  assert.equal(url, "/acquisition/connections/conn_123?syncedDatasetId=dataset_123&syncApplied=0");
});

test("providerConnectionSyncRedirectUrl can label fallback snapshots", () => {
  const url = providerConnectionSyncRedirectUrl({
    connectionId: "conn_123",
    datasetId: "dataset_123",
    applied: true,
    source: "fallback",
    scope: {
      externalCampaignId: null,
      externalAdGroupId: null
    }
  });

  assert.equal(url, "/acquisition/connections/conn_123?syncedDatasetId=dataset_123&syncApplied=1&snapshotSource=fallback");
});
