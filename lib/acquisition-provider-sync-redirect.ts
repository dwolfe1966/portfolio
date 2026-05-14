export type ProviderSnapshotSyncRedirectScope = {
  externalCampaignId: string | null;
  externalAdGroupId: string | null;
};

export function providerConnectionSyncRedirectUrl({
  connectionId,
  datasetId,
  applied,
  scope,
  source
}: {
  connectionId: string;
  datasetId: string;
  applied: boolean;
  scope: ProviderSnapshotSyncRedirectScope;
  source?: "live" | "fallback";
}) {
  const params = new URLSearchParams({
    syncedDatasetId: datasetId,
    syncApplied: applied ? "1" : "0"
  });
  if (source) params.set("snapshotSource", source);
  if (scope.externalCampaignId) params.set("campaignId", scope.externalCampaignId);
  if (scope.externalAdGroupId) params.set("adGroupId", scope.externalAdGroupId);
  return `/acquisition/connections/${connectionId}?${params.toString()}`;
}
