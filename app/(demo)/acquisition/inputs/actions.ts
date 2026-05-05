"use server";

import { AcquisitionChannel } from "@prisma/client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ACCOUNT_SESSION_COOKIE, verifyAccountSessionToken } from "@/lib/account-session";
import { validateCreateCampaignInput } from "@/lib/acquisition";
import { db } from "@/lib/db";
import { isDemoMutationAllowed } from "@/lib/env-guard";

type AcquisitionSnapshotRows = {
  source?: unknown;
  normalized: {
    campaigns: unknown[];
    audiences: unknown[];
    creatives: unknown[];
    performance: unknown[];
  };
};

type NormalizedAudience = {
  campaignName?: unknown;
  name?: unknown;
  audienceType?: unknown;
  targetingJson?: unknown;
  predictedCpcCents?: unknown;
  predictedCacCents?: unknown;
};

type NormalizedCreative = {
  campaignName?: unknown;
  headline?: unknown;
  description?: unknown;
  callToAction?: unknown;
  channel?: unknown;
  predictedCtr?: unknown;
  predictedConversion?: unknown;
};

type NormalizedPerformance = {
  campaignName?: unknown;
  creativeHeadline?: unknown;
  audienceName?: unknown;
  date?: unknown;
  impressions?: unknown;
  clicks?: unknown;
  conversions?: unknown;
  spendCents?: unknown;
  revenueCents?: unknown;
};

function clean(value: unknown, max = 180) {
  return String(value ?? "").trim().slice(0, max);
}

function num(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function jsonValue(value: unknown) {
  if (!value || typeof value !== "object") return {};
  return JSON.parse(JSON.stringify(value));
}

function isAcquisitionSnapshotRows(value: unknown): value is AcquisitionSnapshotRows {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const normalized = (value as Record<string, unknown>).normalized;
  if (!normalized || typeof normalized !== "object" || Array.isArray(normalized)) return false;
  const record = normalized as Record<string, unknown>;
  return Array.isArray(record.campaigns)
    && Array.isArray(record.audiences)
    && Array.isArray(record.creatives)
    && Array.isArray(record.performance);
}

export async function applyAcquisitionDatasetSnapshotAction(formData: FormData) {
  if (!isDemoMutationAllowed()) redirect("/acquisition/inputs?datasetError=mutations-disabled");

  const datasetId = clean(formData.get("datasetId"), 120);
  if (!datasetId) redirect("/acquisition/inputs?datasetError=missing-dataset");

  const cookieStore = await cookies();
  const session = verifyAccountSessionToken(cookieStore.get(ACCOUNT_SESSION_COOKIE)?.value);
  const dataset = await db.workspaceDataset.findFirst({
    where: {
      id: datasetId,
      app: "acquisition",
      OR: session
        ? [{ accountUserId: session.userId }, { accountUserId: null }]
        : [{ accountUserId: null }]
    }
  });

  if (!dataset || !isAcquisitionSnapshotRows(dataset.rowData)) {
    redirect("/acquisition/inputs?datasetError=dataset-not-found");
  }

  const normalized = dataset.rowData.normalized;
  await db.$transaction(async (tx) => {
    await tx.acquisitionAuditLog.deleteMany();
    await tx.budgetActivity.deleteMany();
    await tx.adPerformance.deleteMany();
    await tx.testCell.deleteMany();
    await tx.adCreative.deleteMany();
    await tx.audienceSegment.deleteMany();
    await tx.acquisitionCampaign.deleteMany();

    const campaignIdsByName = new Map<string, string>();
    const creativeIdsByKey = new Map<string, string>();
    const audienceIdsByKey = new Map<string, string>();
    let campaignsApplied = 0;
    let audiencesApplied = 0;
    let creativesApplied = 0;
    let performanceApplied = 0;

    for (const input of normalized.campaigns) {
      const parsed = validateCreateCampaignInput(input);
      if (!parsed.ok) continue;
      const campaign = await tx.acquisitionCampaign.create({
        data: {
          name: parsed.value.name,
          objective: parsed.value.objective,
          budgetCents: parsed.value.budgetCents,
          startAt: new Date(parsed.value.startAt),
          endAt: new Date(parsed.value.endAt),
          channels: parsed.value.channels as AcquisitionChannel[],
          maxBudgetShiftPct: parsed.value.maxBudgetShiftPct,
          minConfidence: parsed.value.minConfidence,
          cooldownHours: parsed.value.cooldownHours,
          targetCacCents: parsed.value.targetCacCents,
          targetLtvCents: parsed.value.targetLtvCents,
          cacAutoPausePctOfTarget: parsed.value.cacAutoPausePctOfTarget,
          minLtvCacRatio: parsed.value.minLtvCacRatio,
          approvalCapPct: parsed.value.approvalCapPct,
          state: "TESTING"
        }
      });
      campaignIdsByName.set(campaign.name.toLowerCase(), campaign.id);
      campaignsApplied++;
    }

    for (const input of normalized.audiences as NormalizedAudience[]) {
      const campaignName = clean(input.campaignName, 120);
      const campaignId = campaignIdsByName.get(campaignName.toLowerCase());
      const name = clean(input.name, 80);
      const audienceType = clean(input.audienceType, 40);
      const predictedCpcCents = Math.max(0, Math.round(num(input.predictedCpcCents)));
      const predictedCacCents = Math.max(0, Math.round(num(input.predictedCacCents)));
      if (!campaignId || !name || !audienceType) continue;
      const audience = await tx.audienceSegment.create({
        data: {
          campaignId,
          name,
          audienceType,
          targetingJson: jsonValue(input.targetingJson),
          predictedCpcCents,
          predictedCacCents
        }
      });
      audienceIdsByKey.set(`${campaignName.toLowerCase()}::${audience.name.toLowerCase()}`, audience.id);
      audiencesApplied++;
    }

    for (const input of normalized.creatives as NormalizedCreative[]) {
      const campaignName = clean(input.campaignName, 120);
      const campaignId = campaignIdsByName.get(campaignName.toLowerCase());
      const headline = clean(input.headline, 120);
      const channel = clean(input.channel).toUpperCase();
      if (!campaignId || !headline) continue;
      const creative = await tx.adCreative.create({
        data: {
          campaignId,
          headline,
          description: clean(input.description, 240),
          callToAction: clean(input.callToAction, 80),
          channel: Object.values(AcquisitionChannel).includes(channel as AcquisitionChannel)
            ? channel as AcquisitionChannel
            : AcquisitionChannel.SEARCH,
          predictedCtr: num(input.predictedCtr),
          predictedConversion: num(input.predictedConversion)
        }
      });
      creativeIdsByKey.set(`${campaignName.toLowerCase()}::${creative.headline.toLowerCase()}`, creative.id);
      creativesApplied++;
    }

    for (const row of normalized.performance as NormalizedPerformance[]) {
      const campaignName = clean(row.campaignName, 120);
      const campaignId = campaignIdsByName.get(campaignName.toLowerCase());
      const creativeId = creativeIdsByKey.get(`${campaignName.toLowerCase()}::${clean(row.creativeHeadline, 120).toLowerCase()}`);
      const audienceId = audienceIdsByKey.get(`${campaignName.toLowerCase()}::${clean(row.audienceName, 80).toLowerCase()}`);
      const recordedAt = new Date(clean(row.date) || new Date().toISOString());
      if (!campaignId || !creativeId || !audienceId || Number.isNaN(recordedAt.getTime())) continue;

      const impressions = Math.max(0, Math.round(num(row.impressions)));
      const clicks = Math.max(0, Math.round(num(row.clicks)));
      const conversions = Math.max(0, Math.round(num(row.conversions)));
      const spendCents = Math.max(0, Math.round(num(row.spendCents)));
      const revenueCents = Math.max(0, Math.round(num(row.revenueCents)));
      const ctr = impressions > 0 ? clicks / impressions : 0;
      const conversionRate = clicks > 0 ? conversions / clicks : 0;
      const cpcCents = clicks > 0 ? Math.round(spendCents / clicks) : 0;
      const cpaCents = conversions > 0 ? Math.round(spendCents / conversions) : 0;
      const roas = spendCents > 0 ? revenueCents / spendCents : 0;

      const testCell = await tx.testCell.upsert({
        where: {
          campaignId_creativeId_audienceId: { campaignId, creativeId, audienceId }
        },
        create: {
          campaignId,
          creativeId,
          audienceId,
          budgetCents: spendCents,
          status: "PENDING"
        },
        update: {}
      });

      await tx.adPerformance.create({
        data: {
          testCellId: testCell.id,
          recordedAt,
          impressions,
          clicks,
          conversions,
          spendCents,
          revenueCents,
          ctr,
          conversionRate,
          cpcCents,
          cpaCents,
          roas
        }
      });

      await tx.testCell.update({
        where: { id: testCell.id },
        data: {
          impressions: { increment: impressions },
          clicks: { increment: clicks },
          conversions: { increment: conversions },
          spendCents: { increment: spendCents },
          revenueCents: { increment: revenueCents },
          cacCents: cpaCents,
          roas
        }
      });
      performanceApplied++;
    }

    for (const [campaignName, campaignId] of campaignIdsByName.entries()) {
      await tx.acquisitionAuditLog.create({
        data: {
          campaignId,
          actor: "workspace-dataset-selector",
          action: "acquisition_dataset_applied",
          metadata: {
            datasetId: dataset.id,
            sourceName: dataset.name,
            sourceType: dataset.sourceType,
            campaignName,
            rowCounts: dataset.rowCounts,
            applied: { campaignsApplied, audiencesApplied, creativesApplied, performanceApplied }
          }
        }
      });
    }
  });

  revalidatePath("/acquisition/inputs");
  revalidatePath("/acquisition/overview");
  revalidatePath("/acquisition/simulations");
  revalidatePath("/acquisition/outputs");
  revalidatePath("/acquisition/campaigns");
  redirect(`/acquisition/inputs?datasetApplied=${encodeURIComponent(dataset.id)}`);
}
