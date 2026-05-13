export type AcquisitionProviderSnapshotFacts = {
  connectionId: string;
  provider: string;
  externalAccountId: string;
  externalCampaignId: string;
  externalAdGroupId: string;
  syncScope: string;
  syncedAt: string;
  fallbackSnapshot: boolean;
  sourceFlow: string;
  fallbackSource: string;
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
    fallbackSnapshot: record.fallbackSnapshot === true || sourceMetadata.sourceFlow === "provider_fallback_snapshot",
    sourceFlow: stringField(sourceMetadata.sourceFlow),
    fallbackSource: stringField(sourceMetadata.fallbackSource),
    providerRowCounts: metadataRecord(record.providerRowCounts)
  };
}

export function acquisitionProviderSnapshotSourceLabel(metadata: unknown) {
  const facts = acquisitionProviderSnapshotFacts(metadata);
  if (facts.fallbackSnapshot) return "Provider-shaped fallback";
  if (facts.sourceFlow === "provider_oauth_sync") return "Live provider sync";
  return "Provider snapshot";
}

export function acquisitionProviderSnapshotScopeLabel(metadata: unknown, options: { sentenceCase?: boolean } = {}) {
  const facts = acquisitionProviderSnapshotFacts(metadata);
  const fallbackPrefix = facts.fallbackSnapshot ? (options.sentenceCase ? "Fallback " : "fallback ") : "";
  const prefix = options.sentenceCase ? "Selected" : "selected";
  const accountLabel = facts.fallbackSnapshot
    ? `${fallbackPrefix}account sync`
    : options.sentenceCase ? "Account sync" : "account sync";

  if (facts.syncScope === "selected_provider_scope") {
    return facts.externalAdGroupId
      ? `${fallbackPrefix}${prefix} campaign ${facts.externalCampaignId || "unknown"} / group ${facts.externalAdGroupId}`
      : `${fallbackPrefix}${prefix} campaign ${facts.externalCampaignId || "unknown"}`;
  }

  return accountLabel;
}
