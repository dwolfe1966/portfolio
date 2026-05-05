import { AcquisitionChannel, Prisma } from "@prisma/client";
import { apiCompatibilityError, apiError, apiOk, apiUnhandledError } from "@/lib/api-contract";
import { validateCreateCampaignInput } from "@/lib/acquisition";
import { db } from "@/lib/db";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { isDemoMutationAllowed } from "@/lib/env-guard";
import { createEventId } from "@/lib/logging";

type CsvRow = Record<string, unknown>;

type AcquisitionImportPayload = {
  sourceName?: unknown;
  sourceMetadata?: unknown;
  campaigns?: CsvRow[];
  audiences?: CsvRow[];
  creatives?: CsvRow[];
  performance?: CsvRow[];
};

function clean(value: unknown, max = 180) {
  return String(value ?? "").trim().slice(0, max);
}

function dollarsToCents(value: unknown) {
  return Math.round(Number(value) * 100);
}

function num(value: unknown, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function parseChannels(value: unknown) {
  const raw = Array.isArray(value) ? value : clean(value).split(",");
  const channels = raw
    .map((item) => clean(item).toUpperCase())
    .filter((item): item is AcquisitionChannel => Object.values(AcquisitionChannel).includes(item as AcquisitionChannel));
  return channels.length > 0 ? channels : [AcquisitionChannel.SEARCH];
}

function parseJson(value: unknown): Prisma.InputJsonValue {
  if (!value) return {};
  if (typeof value !== "string") return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  try {
    return JSON.parse(value) as Prisma.InputJsonValue;
  } catch {
    return {};
  }
}

function readRows(value: unknown, maxRows: number) {
  return Array.isArray(value) ? value.slice(0, maxRows) as CsvRow[] : [];
}

function readSourceMetadata(value: unknown): Prisma.InputJsonValue | undefined {
  if (!value || typeof value !== "object") return undefined;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function defaultStartAt() {
  return new Date().toISOString();
}

function defaultEndAt() {
  return new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString();
}

function validatePayload(payload: AcquisitionImportPayload) {
  const errors: string[] = [];
  const rows = {
    campaigns: readRows(payload.campaigns, 250),
    audiences: readRows(payload.audiences, 500),
    creatives: readRows(payload.creatives, 500),
    performance: readRows(payload.performance, 5000)
  };

  if (rows.campaigns.length === 0) errors.push("At least one acquisition campaign row is required.");
  if (rows.audiences.length === 0) errors.push("At least one acquisition audience row is required.");
  if (rows.creatives.length === 0) errors.push("At least one acquisition creative row is required.");

  const campaigns = rows.campaigns.map((row) => ({
    name: row.name,
    objective: row.objective,
    budgetCents: dollarsToCents(row.budget),
    channels: parseChannels(row.channels),
    targetCacCents: dollarsToCents(row.targetCAC),
    targetLtvCents: dollarsToCents(row.targetLTV),
    maxBudgetShiftPct: row.maxBudgetShiftPct,
    minConfidence: row.minConfidence,
    startAt: clean(row.startAt) || defaultStartAt(),
    endAt: clean(row.endAt) || defaultEndAt()
  }));

  const audiences = rows.audiences.map((row) => ({
    campaignName: clean(row.campaignName, 120),
    name: clean(row.name, 80),
    audienceType: clean(row.audienceType, 40),
    targetingJson: parseJson(row.targetingJson),
    predictedCpcCents: dollarsToCents(row.predictedCPC),
    predictedCacCents: dollarsToCents(row.predictedCAC)
  }));

  const creatives = rows.creatives.map((row) => {
    const channel = clean(row.channel).toUpperCase();
    return {
      campaignName: clean(row.campaignName, 120),
      headline: clean(row.headline, 120),
      description: clean(row.description, 240),
      callToAction: clean(row.callToAction, 80),
      channel: Object.values(AcquisitionChannel).includes(channel as AcquisitionChannel) ? channel as AcquisitionChannel : AcquisitionChannel.SEARCH,
      predictedCtr: num(row.predictedCtr),
      predictedConversion: num(row.predictedConversion)
    };
  });

  const performance = rows.performance.map((row) => ({
    campaignName: clean(row.campaignName, 120),
    creativeHeadline: clean(row.creativeHeadline, 120),
    audienceName: clean(row.audienceName, 80),
    date: clean(row.date) || new Date().toISOString(),
    impressions: Math.max(0, Math.round(num(row.impressions))),
    clicks: Math.max(0, Math.round(num(row.clicks))),
    conversions: Math.max(0, Math.round(num(row.conversions))),
    spendCents: Math.max(0, dollarsToCents(row.spend)),
    revenueCents: Math.max(0, dollarsToCents(row.revenue))
  }));

  campaigns.forEach((campaign, index) => {
    const parsed = validateCreateCampaignInput(campaign);
    if (!parsed.ok) errors.push(...parsed.errors.map((error) => `campaigns row ${index + 1}: ${error}`));
  });
  audiences.forEach((audience, index) => {
    const label = `audiences row ${index + 1}`;
    if (!audience.campaignName) errors.push(`${label}: campaignName is required.`);
    if (!audience.name) errors.push(`${label}: name is required.`);
    if (!audience.audienceType) errors.push(`${label}: audienceType is required.`);
    if (!Number.isFinite(audience.predictedCpcCents) || audience.predictedCpcCents < 0) errors.push(`${label}: predictedCPC must be non-negative.`);
    if (!Number.isFinite(audience.predictedCacCents) || audience.predictedCacCents < 0) errors.push(`${label}: predictedCAC must be non-negative.`);
  });
  creatives.forEach((creative, index) => {
    const label = `creatives row ${index + 1}`;
    if (!creative.campaignName) errors.push(`${label}: campaignName is required.`);
    if (!creative.headline) errors.push(`${label}: headline is required.`);
    if (!creative.description) errors.push(`${label}: description is required.`);
    if (!creative.callToAction) errors.push(`${label}: callToAction is required.`);
    if (creative.predictedCtr < 0 || creative.predictedCtr > 1) errors.push(`${label}: predictedCtr must be between 0 and 1.`);
    if (creative.predictedConversion < 0 || creative.predictedConversion > 1) errors.push(`${label}: predictedConversion must be between 0 and 1.`);
  });
  performance.forEach((row, index) => {
    const label = `performance row ${index + 1}`;
    if (!row.campaignName) errors.push(`${label}: campaignName is required.`);
    if (!Number.isFinite(new Date(row.date).getTime())) errors.push(`${label}: date must be valid.`);
  });

  return {
    errors: errors.slice(0, 40),
    rows,
    normalized: { campaigns, audiences, creatives, performance }
  };
}

export async function POST(request: Request) {
  const eventId = createEventId("acquisition_import");
  if (!isDemoMutationAllowed()) return apiError(403, "MUTATION_DISABLED", "Acquisition data import is disabled.", { eventId });

  const body = await request.json().catch(() => ({})) as AcquisitionImportPayload;
  const validation = validatePayload(body);
  const sourceName = clean(body.sourceName, 120) || "Acquisition CSV upload";
  const sourceMetadata = readSourceMetadata(body.sourceMetadata);

  if (validation.errors.length > 0) {
    return apiError(400, "VALIDATION_ERROR", "Acquisition import data is invalid.", {
      eventId,
      errors: validation.errors
    });
  }

  try {
    const result = await db.$transaction(async (tx) => {
      const campaignIdsByName = new Map<string, string>();
      const creativeIdsByKey = new Map<string, string>();
      const audienceIdsByKey = new Map<string, string>();
      let campaignsImported = 0;
      let audiencesImported = 0;
      let creativesImported = 0;
      let performanceImported = 0;

      for (const input of validation.normalized.campaigns) {
        const parsed = validateCreateCampaignInput(input);
        if (!parsed.ok) continue;
        const data = {
          name: parsed.value.name,
          objective: parsed.value.objective,
          budgetCents: parsed.value.budgetCents,
          startAt: new Date(parsed.value.startAt),
          endAt: new Date(parsed.value.endAt),
          channels: parsed.value.channels,
          maxBudgetShiftPct: parsed.value.maxBudgetShiftPct,
          minConfidence: parsed.value.minConfidence,
          cooldownHours: parsed.value.cooldownHours,
          targetCacCents: parsed.value.targetCacCents,
          targetLtvCents: parsed.value.targetLtvCents,
          cacAutoPausePctOfTarget: parsed.value.cacAutoPausePctOfTarget,
          minLtvCacRatio: parsed.value.minLtvCacRatio,
          approvalCapPct: parsed.value.approvalCapPct,
          state: "TESTING" as const
        };
        const existing = await tx.acquisitionCampaign.findFirst({ where: { name: data.name }, select: { id: true } });
        const campaign = existing
          ? await tx.acquisitionCampaign.update({ where: { id: existing.id }, data })
          : await tx.acquisitionCampaign.create({ data });
        campaignIdsByName.set(campaign.name.toLowerCase(), campaign.id);
        campaignsImported++;
      }

      for (const input of validation.normalized.audiences) {
        const campaignId = campaignIdsByName.get(input.campaignName.toLowerCase());
        if (!campaignId) continue;
        const existing = await tx.audienceSegment.findFirst({
          where: { campaignId, name: input.name },
          select: { id: true }
        });
        const audience = existing
          ? await tx.audienceSegment.update({
              where: { id: existing.id },
              data: {
                audienceType: input.audienceType,
                targetingJson: input.targetingJson,
                predictedCpcCents: input.predictedCpcCents,
                predictedCacCents: input.predictedCacCents
              }
            })
          : await tx.audienceSegment.create({
              data: {
                campaignId,
                name: input.name,
                audienceType: input.audienceType,
                targetingJson: input.targetingJson,
                predictedCpcCents: input.predictedCpcCents,
                predictedCacCents: input.predictedCacCents
              }
            });
        audienceIdsByKey.set(`${input.campaignName.toLowerCase()}::${audience.name.toLowerCase()}`, audience.id);
        audiencesImported++;
      }

      for (const input of validation.normalized.creatives) {
        const campaignId = campaignIdsByName.get(input.campaignName.toLowerCase());
        if (!campaignId) continue;
        const existing = await tx.adCreative.findFirst({
          where: { campaignId, headline: input.headline },
          select: { id: true }
        });
        const creative = existing
          ? await tx.adCreative.update({
              where: { id: existing.id },
              data: {
                description: input.description,
                callToAction: input.callToAction,
                channel: input.channel,
                predictedCtr: input.predictedCtr,
                predictedConversion: input.predictedConversion
              }
            })
          : await tx.adCreative.create({
              data: {
                campaignId,
                headline: input.headline,
                description: input.description,
                callToAction: input.callToAction,
                channel: input.channel,
                predictedCtr: input.predictedCtr,
                predictedConversion: input.predictedConversion
              }
            });
        creativeIdsByKey.set(`${input.campaignName.toLowerCase()}::${creative.headline.toLowerCase()}`, creative.id);
        creativesImported++;
      }

      for (const row of validation.normalized.performance) {
        const campaignId = campaignIdsByName.get(row.campaignName.toLowerCase());
        if (!campaignId) continue;
        const creativeId = creativeIdsByKey.get(`${row.campaignName.toLowerCase()}::${row.creativeHeadline.toLowerCase()}`);
        const audienceId = audienceIdsByKey.get(`${row.campaignName.toLowerCase()}::${row.audienceName.toLowerCase()}`);
        if (!creativeId || !audienceId) continue;

        const existingCell = await tx.testCell.findUnique({
          where: {
            campaignId_creativeId_audienceId: { campaignId, creativeId, audienceId }
          },
          select: { id: true, budgetCents: true }
        });
        const testCell = existingCell
          ? existingCell
          : await tx.testCell.create({
              data: {
                campaignId,
                creativeId,
                audienceId,
                budgetCents: row.spendCents,
                status: "PENDING"
              },
              select: { id: true, budgetCents: true }
            });

        const ctr = row.impressions > 0 ? row.clicks / row.impressions : 0;
        const conversionRate = row.clicks > 0 ? row.conversions / row.clicks : 0;
        const cpcCents = row.clicks > 0 ? Math.round(row.spendCents / row.clicks) : 0;
        const cpaCents = row.conversions > 0 ? Math.round(row.spendCents / row.conversions) : 0;
        const roas = row.spendCents > 0 ? row.revenueCents / row.spendCents : 0;

        await tx.adPerformance.create({
          data: {
            testCellId: testCell.id,
            recordedAt: new Date(row.date),
            impressions: row.impressions,
            clicks: row.clicks,
            conversions: row.conversions,
            spendCents: row.spendCents,
            revenueCents: row.revenueCents,
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
            impressions: { increment: row.impressions },
            clicks: { increment: row.clicks },
            conversions: { increment: row.conversions },
            spendCents: { increment: row.spendCents },
            revenueCents: { increment: row.revenueCents },
            cacCents: cpaCents,
            roas
          }
        });
        performanceImported++;
      }

      for (const [campaignName, campaignId] of campaignIdsByName.entries()) {
        await tx.acquisitionAuditLog.create({
          data: {
            campaignId,
            actor: "workspace-csv-import",
            action: "acquisition_import",
            metadata: {
              eventId,
              sourceName,
              sourceMetadata,
              campaignName,
              rowCounts: {
                campaigns: validation.rows.campaigns.length,
                audiences: validation.rows.audiences.length,
                creatives: validation.rows.creatives.length,
                performance: validation.rows.performance.length
              }
            }
          }
        });
      }

      return { campaignsImported, audiencesImported, creativesImported, performanceImported };
    });

    return apiOk({ eventId, import: result });
  } catch (error) {
    if (isMissingDemoTableError(error)) return apiCompatibilityError("Acquisition tables are missing.", { eventId });
    return apiUnhandledError(error, eventId);
  }
}
