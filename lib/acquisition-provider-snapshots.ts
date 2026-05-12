export type AcquisitionProviderSnapshotFacts = {
  connectionId: string;
  provider: string;
  externalAccountId: string;
  externalCampaignId: string;
  externalAdGroupId: string;
  syncScope: string;
  syncedAt: string;
  providerRowCounts: Record<string, unknown>;
};

function metadataRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stringField(primary: unknown, fallback?: unknown) {
  return typeof primary === "string" ? primary : typeof fallback === "string" ? fallback : "";
}

export function acquisitionProviderSnapshotFacts(metadata: unknown): AcquisitionProviderSnapshotFacts {
  const record = metadataRecord(metadata);
  const sourceMetadata = metadataRecord(record.sourceMetadata);

  return {
    connectionId: stringField(record.connectionId),
    provider: stringField(record.provider, sourceMetadata.provider),
    externalAccountId: stringField(record.externalAccountId, sourceMetadata.externalAccountId),
    externalCampaignId: stringField(record.externalCampaignId, sourceMetadata.externalCampaignId),
    externalAdGroupId: stringField(record.externalAdGroupId, sourceMetadata.externalAdGroupId),
    syncScope: stringField(record.syncScope, sourceMetadata.syncScope) || "provider_account",
    syncedAt: stringField(record.syncedAt),
    providerRowCounts: metadataRecord(record.providerRowCounts)
  };
}

export function acquisitionProviderSnapshotScopeLabel(metadata: unknown, options: { sentenceCase?: boolean } = {}) {
  const facts = acquisitionProviderSnapshotFacts(metadata);
  const prefix = options.sentenceCase ? "Selected" : "selected";
  const accountLabel = options.sentenceCase ? "Account sync" : "account sync";

  if (facts.syncScope === "selected_provider_scope") {
    return facts.externalAdGroupId
      ? `${prefix} campaign ${facts.externalCampaignId || "unknown"} / group ${facts.externalAdGroupId}`
      : `${prefix} campaign ${facts.externalCampaignId || "unknown"}`;
  }

  return accountLabel;
}
