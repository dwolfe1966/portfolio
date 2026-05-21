export type AcquisitionProviderSnapshotFacts = {
  connectionId: string;
  provider: string;
  providerLabel: string;
  externalAccountId: string;
  accountName: string;
  externalCampaignId: string;
  campaignName: string;
  externalAdGroupId: string;
  adGroupName: string;
  childScopeType: string;
  syncScope: string;
  syncedAt: string;
  fallbackSnapshot: boolean;
  snapshotSource: string;
  sourceFlow: string;
  fallbackSource: string;
  providerRowCounts: Record<string, unknown>;
};

type AcquisitionProviderSnapshotMetadataInput = {
  provider: string;
  providerLabel: string;
  connectionId: string;
  externalAccountId: string;
  accountName: string;
  externalCampaignId?: string | null;
  campaignName?: string | null;
  externalAdGroupId?: string | null;
  adGroupName?: string | null;
  childScopeType?: string | null;
  syncedAt: string;
  fallbackSnapshot?: boolean;
  providerRowCounts: Record<string, number>;
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
    providerLabel: stringField(record.providerLabel, sourceMetadata.providerLabel),
    externalAccountId: stringField(record.externalAccountId, sourceMetadata.externalAccountId),
    accountName: stringField(record.accountName, sourceMetadata.accountName),
    externalCampaignId: stringField(record.externalCampaignId, sourceMetadata.externalCampaignId),
    campaignName: stringField(record.campaignName, sourceMetadata.campaignName),
    externalAdGroupId: stringField(record.externalAdGroupId, sourceMetadata.externalAdGroupId),
    adGroupName: stringField(record.adGroupName, sourceMetadata.adGroupName),
    childScopeType: stringField(record.childScopeType, sourceMetadata.childScopeType),
    syncScope: stringField(record.syncScope, sourceMetadata.syncScope) || "provider_account",
    syncedAt: stringField(record.syncedAt),
    fallbackSnapshot: record.fallbackSnapshot === true || sourceMetadata.sourceFlow === "provider_fallback_snapshot",
    snapshotSource: stringField(record.snapshotSource, sourceMetadata.snapshotSource),
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
  const childLabel = facts.childScopeType === "ad_set" ? "ad set" : "group";
  const accountLabel = facts.fallbackSnapshot
    ? `${fallbackPrefix}account sync`
    : options.sentenceCase ? "Account sync" : "account sync";

  if (facts.syncScope === "selected_provider_scope") {
    return facts.externalAdGroupId
      ? `${fallbackPrefix}${prefix} campaign ${facts.externalCampaignId || "unknown"} / ${childLabel} ${facts.externalAdGroupId}`
      : `${fallbackPrefix}${prefix} campaign ${facts.externalCampaignId || "unknown"}`;
  }

  return accountLabel;
}

function compactText(value: string, max = 44) {
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned.length > max ? `${cleaned.slice(0, max - 3)}...` : cleaned;
}

function snapshotDate(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
}

export function acquisitionProviderSnapshotName(input: AcquisitionProviderSnapshotMetadataInput) {
  const scope = input.externalCampaignId
    ? `Campaign: ${compactText(input.campaignName || input.externalCampaignId)}`
    : "Account";
  const child = input.externalAdGroupId
    ? ` · ${input.childScopeType === "ad_set" ? "Ad set" : "Ad group"}: ${compactText(input.adGroupName || input.externalAdGroupId, 32)}`
    : "";
  const source = input.fallbackSnapshot ? "fallback" : "live";
  return `${input.providerLabel} · ${input.externalAccountId} · ${scope}${child} · ${source} · ${snapshotDate(input.syncedAt)}`.slice(0, 160);
}

export function acquisitionProviderSnapshotMetadata(input: AcquisitionProviderSnapshotMetadataInput) {
  const syncScope = input.externalCampaignId ? "selected_provider_scope" : "provider_account";
  const sourceFlow = input.fallbackSnapshot ? "provider_fallback_snapshot" : "provider_oauth_sync";
  const snapshotSource = input.fallbackSnapshot ? "fallback" : "live";

  return {
    provider: input.provider,
    providerLabel: input.providerLabel,
    externalAccountId: input.externalAccountId,
    accountName: input.accountName,
    externalCampaignId: input.externalCampaignId ?? null,
    campaignName: input.campaignName ?? null,
    externalAdGroupId: input.externalAdGroupId ?? null,
    adGroupName: input.adGroupName ?? null,
    childScopeType: input.childScopeType ?? null,
    connectionId: input.connectionId,
    syncScope,
    syncedAt: input.syncedAt,
    snapshotSource,
    fallbackSnapshot: input.fallbackSnapshot === true,
    sourceMetadata: {
      sourceFlow,
      provider: input.provider,
      providerLabel: input.providerLabel,
      externalAccountId: input.externalAccountId,
      accountName: input.accountName,
      externalCampaignId: input.externalCampaignId ?? null,
      campaignName: input.campaignName ?? null,
      externalAdGroupId: input.externalAdGroupId ?? null,
      adGroupName: input.adGroupName ?? null,
      childScopeType: input.childScopeType ?? null,
      syncScope,
      snapshotSource,
      liveProviderReadBlocked: input.fallbackSnapshot === true,
      fallbackSource: input.fallbackSnapshot ? "deterministic_simulated_provider_shape" : null
    },
    providerRowCounts: input.providerRowCounts
  };
}
