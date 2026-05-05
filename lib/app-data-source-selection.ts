import type { WorkspaceDataset } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export type ToolScope = "lifecycle" | "acquisition" | "auction" | "pricing" | "retention" | "expansion";

type SelectionInput = {
  app: ToolScope;
  accountUserId?: string | null;
  mode: "sample" | "imported";
  label: string;
  sourceType?: string | null;
  datasetId?: string | null;
  rowCounts?: unknown;
};

const sampleLabels: Record<ToolScope, string> = {
  lifecycle: "Lifecycle sample data",
  acquisition: "Acquisition sample data",
  auction: "Auction sample data",
  pricing: "Pricing sample data",
  retention: "Retention sample data",
  expansion: "Expansion sample data"
};

async function countRows(app: ToolScope) {
  if (app === "lifecycle") {
    const [users, entities, interestEdges, events] = await Promise.all([
      db.user.count(),
      db.entity.count(),
      db.interestEdge.count(),
      db.entityDelta.count()
    ]);
    return { users, entities, interestEdges, events };
  }
  if (app === "acquisition") {
    const [campaigns, audiences, creatives, performance] = await Promise.all([
      db.acquisitionCampaign.count(),
      db.audienceSegment.count(),
      db.adCreative.count(),
      db.adPerformance.count()
    ]);
    return { campaigns, audiences, creatives, performance };
  }
  if (app === "auction") {
    const [advertisers, slots, bids, runs] = await Promise.all([
      db.auctionAdvertiser.count(),
      db.auctionSlot.count(),
      db.auctionBid.count(),
      db.auctionRun.count()
    ]);
    return { advertisers, slots, bids, runs };
  }
  if (app === "pricing") {
    const [segments, variants, experiments, decisions] = await Promise.all([
      db.pricingSegment.count(),
      db.pricingVariant.count(),
      db.pricingExperiment.count(),
      db.pricingDecision.count()
    ]);
    return { segments, variants, experiments, decisions };
  }
  if (app === "retention") {
    const [accounts, playbooks, policies, interventions] = await Promise.all([
      db.retentionAccount.count(),
      db.retentionPlaybook.count(),
      db.retentionPolicy.count(),
      db.retentionIntervention.count()
    ]);
    return { accounts, playbooks, policies, interventions };
  }
  const [accounts, offers, policies, runs] = await Promise.all([
    db.expansionAccount.count(),
    db.expansionOffer.count(),
    db.expansionPolicy.count(),
    db.expansionRun.count()
  ]);
  return { accounts, offers, policies, runs };
}

export async function getActiveDataSourceSelection(app: ToolScope, accountUserId?: string | null) {
  return db.appDataSourceSelection.findFirst({
    where: { app, accountUserId: accountUserId ?? null },
    orderBy: { updatedAt: "desc" }
  });
}

export async function recordDataSourceSelection(input: SelectionInput) {
  const existing = await db.appDataSourceSelection.findFirst({
    where: { app: input.app, accountUserId: input.accountUserId ?? null },
    orderBy: { updatedAt: "desc" }
  });
  const rowCounts = input.rowCounts === undefined
    ? Prisma.JsonNull
    : JSON.parse(JSON.stringify(input.rowCounts));
  const data = {
    app: input.app,
    accountUserId: input.accountUserId ?? null,
    mode: input.mode,
    label: input.label,
    sourceType: input.sourceType ?? null,
    datasetId: input.datasetId ?? null,
    rowCounts
  };
  if (existing) {
    return db.appDataSourceSelection.update({ where: { id: existing.id }, data });
  }
  return db.appDataSourceSelection.create({ data });
}

export async function recordImportedDataSourceSelection(
  app: ToolScope,
  dataset: Pick<WorkspaceDataset, "id" | "name" | "sourceType" | "rowCounts" | "accountUserId">,
  accountUserId?: string | null
) {
  return recordDataSourceSelection({
    app,
    accountUserId: accountUserId ?? dataset.accountUserId,
    mode: "imported",
    label: dataset.name,
    sourceType: dataset.sourceType,
    datasetId: dataset.id,
    rowCounts: dataset.rowCounts
  });
}

export async function recordSampleDataSourceSelection(app: ToolScope, accountUserId?: string | null) {
  return recordDataSourceSelection({
    app,
    accountUserId,
    mode: "sample",
    label: sampleLabels[app],
    sourceType: "sample",
    rowCounts: await countRows(app)
  });
}

export async function recordSampleDataSourceSelections(apps: ToolScope[], accountUserId?: string | null) {
  for (const app of apps) {
    await recordSampleDataSourceSelection(app, accountUserId);
  }
}
