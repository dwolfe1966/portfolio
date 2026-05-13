export type AcquisitionSourceLineage = {
  label: string;
  sourceName: string;
  sourceType: string;
  provider: string;
  datasetId: string;
  connectionId: string;
  externalAccountId: string;
  syncedAt: string | null;
  appliedAt: string | null;
  fallbackSnapshot: boolean;
  sourceFlow: string;
};

export type AcquisitionProviderAudienceLineage = {
  provider: string;
  externalCampaignId: string;
  externalAdGroupId: string;
};

export type AcquisitionProviderTargetingFacts = {
  provider: string;
  externalCampaignId: string;
  externalChildId: string;
};

type AuditLogLike = {
  action?: string;
  metadata: unknown;
  createdAt?: Date | string | null;
};

export const ACQUISITION_DEFAULT_SOURCE_NAME = "No imported dataset lineage";

export function acquisitionMetadataRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function isoDateValue(value: unknown) {
  if (!value) return null;
  const date = typeof value === "string" || value instanceof Date ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toISOString() : null;
}

export function acquisitionSourceTypeLabel(sourceType: unknown) {
  if (sourceType === "google_ads") return "Google Ads";
  if (sourceType === "meta_ads") return "Meta Ads";
  if (sourceType === "google_sheets") return "Google Sheets";
  if (sourceType === "csv") return "CSV";
  return typeof sourceType === "string" && sourceType ? sourceType.replaceAll("_", " ") : "Manual/sample";
}

export function acquisitionSourceLineageFromMetadata(
  metadata: unknown,
  appliedAt?: Date | string | null
): AcquisitionSourceLineage {
  const record = acquisitionMetadataRecord(metadata);
  const sourceType = stringValue(record.sourceType);
  const provider = stringValue(record.provider) || (sourceType === "google_ads" || sourceType === "meta_ads" ? sourceType : "");
  const sourceName = stringValue(record.sourceName);
  const sourceFlow = stringValue(record.sourceFlow);
  const fallbackSnapshot = record.fallbackSnapshot === true || sourceFlow === "provider_fallback_snapshot";

  return {
    label: fallbackSnapshot ? `${acquisitionSourceTypeLabel(sourceType || provider)} fallback` : acquisitionSourceTypeLabel(sourceType || provider),
    sourceName: sourceName || ACQUISITION_DEFAULT_SOURCE_NAME,
    sourceType,
    provider,
    datasetId: stringValue(record.datasetId),
    connectionId: stringValue(record.connectionId),
    externalAccountId: stringValue(record.externalAccountId),
    syncedAt: isoDateValue(record.syncedAt),
    appliedAt: isoDateValue(appliedAt),
    fallbackSnapshot,
    sourceFlow
  };
}

export function acquisitionSourceLineageFromAuditLogs(auditLogs: AuditLogLike[]) {
  const log = auditLogs.find((item) => item.action === "acquisition_dataset_applied") ?? auditLogs[0] ?? null;
  return acquisitionSourceLineageFromMetadata(log?.metadata, log?.createdAt ?? null);
}

export function acquisitionLineageHasLinks(source: AcquisitionSourceLineage) {
  return Boolean(source.datasetId || source.connectionId || source.externalAccountId);
}

export function acquisitionLineageIsProviderBacked(source: AcquisitionSourceLineage) {
  return source.provider === "google_ads" || source.provider === "meta_ads";
}

export function acquisitionProviderAudienceLineage(
  audiences: Array<{ targetingJson: unknown }>
): AcquisitionProviderAudienceLineage {
  for (const audience of audiences) {
    const targeting = acquisitionMetadataRecord(audience.targetingJson);
    if (targeting.provider || targeting.externalCampaignId || targeting.externalAdGroupId) {
      return {
        provider: stringValue(targeting.provider),
        externalCampaignId: stringValue(targeting.externalCampaignId),
        externalAdGroupId: stringValue(targeting.externalAdGroupId)
      };
    }
  }

  return { provider: "", externalCampaignId: "", externalAdGroupId: "" };
}

export function acquisitionProviderTargetingFacts(targetingJson: unknown): AcquisitionProviderTargetingFacts {
  const targeting = acquisitionMetadataRecord(targetingJson);
  const externalAdGroupId = stringValue(targeting.externalAdGroupId);
  const externalAdSetId = stringValue(targeting.externalAdSetId);
  return {
    provider: stringValue(targeting.provider),
    externalCampaignId: stringValue(targeting.externalCampaignId),
    externalChildId: externalAdGroupId || externalAdSetId
  };
}

export function acquisitionProviderLabel(provider: string) {
  if (provider === "google_ads") return "Google Ads";
  if (provider === "meta_ads") return "Meta Ads";
  return provider ? provider.replaceAll("_", " ") : "None";
}
