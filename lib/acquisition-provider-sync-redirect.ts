export type ProviderSnapshotSyncRedirectScope = {
  externalCampaignId: string | null;
  externalAdGroupId: string | null;
};

export function providerConnectionSyncRedirectUrl({
  connectionId,
  datasetId,
  applied,
  scope
}: {
  connectionId: string;
  datasetId: string;
  applied: boolean;
  scope: ProviderSnapshotSyncRedirectScope;
}) {
  const params = new URLSearchParams({
    syncedDatasetId: datasetId,
    syncApplied: applied ? "1" : "0"
  });
  if (scope.externalCampaignId) params.set("campaignId", scope.externalCampaignId);
  if (scope.externalAdGroupId) params.set("adGroupId", scope.externalAdGroupId);
  return `/acquisition/connections/${connectionId}?${params.toString()}`;
}
