import { db } from "@/lib/db";

export type DatasetReadinessStatus = "available" | "partial" | "missing";

export type WorkspaceDatasetObject = {
  key: string;
  label: string;
  required: boolean;
};

export type WorkspaceDatasetSchema = {
  app: "lifecycle" | "acquisition" | "pricing" | "retention" | "expansion" | "auction";
  label: string;
  importPath: string;
  primaryAction: string;
  objects: WorkspaceDatasetObject[];
};

export type WorkspaceDatasetReadiness = WorkspaceDatasetSchema & {
  status: DatasetReadinessStatus;
  availableObjects: number;
  requiredObjects: number;
  recordCount: number;
  importCount: number;
  presetCount: number;
  gap: string;
};

export const WORKSPACE_DATASET_SCHEMAS: WorkspaceDatasetSchema[] = [
  {
    app: "lifecycle",
    label: "Lifecycle",
    importPath: "/workspace/connections/csv?tool=lifecycle",
    primaryAction: "Import lifecycle CSV",
    objects: [
      { key: "users", label: "Users", required: true },
      { key: "entities", label: "Entities", required: true },
      { key: "interestEdges", label: "Interest edges", required: true },
      { key: "changeEvents", label: "Change events", required: true }
    ]
  },
  {
    app: "acquisition",
    label: "Acquisition",
    importPath: "/workspace/connections/csv?tool=acquisition",
    primaryAction: "Map acquisition CSV",
    objects: [
      { key: "campaigns", label: "Campaigns", required: true },
      { key: "audiences", label: "Audiences", required: true },
      { key: "creatives", label: "Creatives", required: true },
      { key: "performance", label: "Performance rows", required: true }
    ]
  },
  {
    app: "pricing",
    label: "Pricing",
    importPath: "/workspace/connections/csv?tool=pricing",
    primaryAction: "Map pricing CSV",
    objects: [
      { key: "segments", label: "Segments", required: true },
      { key: "variants", label: "Variants", required: true },
      { key: "experiments", label: "Experiments", required: true },
      { key: "guardrails", label: "Guardrails", required: true }
    ]
  },
  {
    app: "retention",
    label: "Retention",
    importPath: "/workspace/connections/csv?tool=retention",
    primaryAction: "Map retention CSV",
    objects: [
      { key: "accounts", label: "Accounts", required: true },
      { key: "playbooks", label: "Playbooks", required: true },
      { key: "interventions", label: "Interventions", required: false },
      { key: "policy", label: "Policy", required: true }
    ]
  },
  {
    app: "expansion",
    label: "Expansion",
    importPath: "/workspace/connections/csv?tool=expansion",
    primaryAction: "Map expansion CSV",
    objects: [
      { key: "accounts", label: "Accounts", required: true },
      { key: "offers", label: "Offers", required: true },
      { key: "policy", label: "Policy", required: true }
    ]
  },
  {
    app: "auction",
    label: "Auction",
    importPath: "/workspace/connections/csv?tool=auction",
    primaryAction: "Map auction CSV",
    objects: [
      { key: "advertisers", label: "Advertisers", required: true },
      { key: "slots", label: "Slots", required: true },
      { key: "bids", label: "Bids", required: true },
      { key: "reserveSettings", label: "Reserve settings", required: true }
    ]
  }
];

function statusFromCounts(availableObjects: number, requiredObjects: number): DatasetReadinessStatus {
  if (availableObjects >= requiredObjects) return "available";
  if (availableObjects > 0) return "partial";
  return "missing";
}

function gapFor(status: DatasetReadinessStatus, importCount: number) {
  if (status === "missing") return "No usable dataset objects found yet.";
  if (status === "partial") return "Some required objects exist, but the tool cannot fully run on imported data yet.";
  if (importCount > 0) return "Imported dataset is available.";
  return "Seeded or editable data exists; imported dataset flow still needs to be connected.";
}

export async function loadWorkspaceDatasetReadiness() {
  const [
    lifecycleUsers,
    lifecycleEntities,
    lifecycleEdges,
    lifecycleEvents,
    lifecycleImports,
    lifecyclePresets,
    acquisitionCampaigns,
    acquisitionAudiences,
    acquisitionCreatives,
    acquisitionPerformance,
    adConnections,
    pricingSegments,
    pricingVariants,
    pricingExperiments,
    pricingImports,
    retentionAccounts,
    retentionPlaybooks,
    retentionInterventions,
    retentionPolicies,
    retentionImports,
    expansionAccounts,
    expansionOffers,
    expansionPolicies,
    expansionImports,
    auctionAdvertisers,
    auctionSlots,
    auctionBids
  ] = await Promise.all([
    db.user.count(),
    db.entity.count(),
    db.interestEdge.count(),
    db.entityDelta.count(),
    db.lifecycleImportLog.count(),
    db.lifecycleMappingPreset.count({ where: { app: "lifecycle" } }),
    db.acquisitionCampaign.count(),
    db.audienceSegment.count(),
    db.adCreative.count(),
    db.adPerformance.count(),
    db.adAccountConnection.count(),
    db.pricingSegment.count(),
    db.pricingVariant.count(),
    db.pricingExperiment.count(),
    db.pricingAuditLog.count({ where: { action: "pricing_import" } }),
    db.retentionAccount.count(),
    db.retentionPlaybook.count(),
    db.retentionIntervention.count(),
    db.retentionPolicy.count(),
    db.retentionAuditLog.count({ where: { action: "retention_import" } }),
    db.expansionAccount.count(),
    db.expansionOffer.count(),
    db.expansionPolicy.count(),
    db.expansionAuditLog.count({ where: { action: "expansion_import" } }),
    db.auctionAdvertiser.count(),
    db.auctionSlot.count(),
    db.auctionBid.count()
  ]);

  const counts = {
    lifecycle: {
      objectCounts: [lifecycleUsers, lifecycleEntities, lifecycleEdges, lifecycleEvents],
      recordCount: lifecycleUsers + lifecycleEntities + lifecycleEdges + lifecycleEvents,
      importCount: lifecycleImports,
      presetCount: lifecyclePresets
    },
    acquisition: {
      objectCounts: [acquisitionCampaigns, acquisitionAudiences, acquisitionCreatives, acquisitionPerformance],
      recordCount: acquisitionCampaigns + acquisitionAudiences + acquisitionCreatives + acquisitionPerformance,
      importCount: adConnections,
      presetCount: 0
    },
    pricing: {
      objectCounts: [pricingSegments, pricingVariants, pricingExperiments, pricingExperiments],
      recordCount: pricingSegments + pricingVariants + pricingExperiments,
      importCount: pricingImports,
      presetCount: 0
    },
    retention: {
      objectCounts: [retentionAccounts, retentionPlaybooks, retentionInterventions, retentionPolicies],
      recordCount: retentionAccounts + retentionPlaybooks + retentionInterventions + retentionPolicies,
      importCount: retentionImports,
      presetCount: 0
    },
    expansion: {
      objectCounts: [expansionAccounts, expansionOffers, expansionPolicies],
      recordCount: expansionAccounts + expansionOffers + expansionPolicies,
      importCount: expansionImports,
      presetCount: 0
    },
    auction: {
      objectCounts: [auctionAdvertisers, auctionSlots, auctionBids, auctionSlots],
      recordCount: auctionAdvertisers + auctionSlots + auctionBids,
      importCount: 0,
      presetCount: 0
    }
  };

  return WORKSPACE_DATASET_SCHEMAS.map((schema) => {
    const requiredObjects = schema.objects.filter((object) => object.required).length;
    const appCounts = counts[schema.app];
    const availableObjects = appCounts.objectCounts
      .slice(0, schema.objects.length)
      .filter((count, index) => !schema.objects[index].required || count > 0)
      .length;
    const status = statusFromCounts(availableObjects, requiredObjects);

    return {
      ...schema,
      status,
      availableObjects,
      requiredObjects,
      recordCount: appCounts.recordCount,
      importCount: appCounts.importCount,
      presetCount: appCounts.presetCount,
      gap: gapFor(status, appCounts.importCount)
    } satisfies WorkspaceDatasetReadiness;
  });
}

export function summarizeDatasetReadiness(readiness: WorkspaceDatasetReadiness[]) {
  return {
    available: readiness.filter((item) => item.status === "available").length,
    partial: readiness.filter((item) => item.status === "partial").length,
    missing: readiness.filter((item) => item.status === "missing").length,
    imported: readiness.filter((item) => item.importCount > 0).length
  };
}
