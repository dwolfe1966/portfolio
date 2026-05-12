import { db } from "@/lib/db";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { apiError, apiOk, apiUnhandledError } from "@/lib/api-contract";
import { createEventId, logApiEvent } from "@/lib/logging";
import { acquisitionSourceLineageFromAuditLogs } from "@/lib/acquisition-source-lineage";

function metadataRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function booleanValue(value: unknown) {
  return typeof value === "boolean" ? value : false;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const eventId = createEventId("acq_insights");
  const { id } = await params;

  try {
    const campaign = await db.acquisitionCampaign.findUnique({ where: { id } });
    if (!campaign) {
      logApiEvent("warn", eventId, "acquisition.insights.campaign_not_found", { campaignId: id });
      return apiError(404, "CAMPAIGN_NOT_FOUND", "Campaign not found", { eventId });
    }

    const [cells, activities, logs, performanceSeries] = await Promise.all([
      db.testCell.findMany({
        where: { campaignId: id },
        include: { creative: true, audience: true },
        orderBy: { score: "desc" }
      }),
      db.budgetActivity.findMany({
        where: { campaignId: id },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          fromTestCell: { include: { creative: true, audience: true } },
          toTestCell: { include: { creative: true, audience: true } }
        }
      }),
      db.acquisitionAuditLog.findMany({ where: { campaignId: id }, orderBy: { createdAt: "desc" }, take: 20 }),
      db.adPerformance.findMany({
        where: { testCell: { campaignId: id } },
        include: { testCell: { include: { creative: true, audience: true } } },
        orderBy: { recordedAt: "asc" },
        take: 50
      })
    ]);

    const spendCents = cells.reduce((sum, cell) => sum + cell.spendCents, 0);
    const conversions = cells.reduce((sum, cell) => sum + cell.conversions, 0);
    const revenueCents = cells.reduce((sum, cell) => sum + cell.revenueCents, 0);
    const impressions = cells.reduce((sum, cell) => sum + cell.impressions, 0);
    const clicks = cells.reduce((sum, cell) => sum + cell.clicks, 0);
    const activeBudgetCents = cells.reduce((sum, cell) => sum + cell.budgetCents, 0);
    const averageScore = cells.length ? cells.reduce((sum, cell) => sum + cell.score, 0) / cells.length : 0;
    const cpaCents = conversions ? Math.round(spendCents / conversions) : 0;
    const roas = spendCents > 0 ? Number((revenueCents / spendCents).toFixed(4)) : 0;
    const latestIterationLog = logs.find((log) => log.action === "iteration_executed") ?? null;
    const latestIterationMetadata = metadataRecord(latestIterationLog?.metadata);

    const creativeMap = new Map<string, {
      id: string;
      label: string;
      channel: string;
      impressions: number;
      clicks: number;
      conversions: number;
      spendCents: number;
      revenueCents: number;
    }>();
    const audienceMap = new Map<string, {
      id: string;
      label: string;
      audienceType: string;
      impressions: number;
      clicks: number;
      conversions: number;
      spendCents: number;
      revenueCents: number;
    }>();

    for (const point of performanceSeries) {
      const creative = point.testCell.creative;
      const audience = point.testCell.audience;
      const creativeRow = creativeMap.get(creative.id) ?? {
        id: creative.id,
        label: creative.headline,
        channel: creative.channel,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        spendCents: 0,
        revenueCents: 0
      };
      creativeRow.impressions += point.impressions;
      creativeRow.clicks += point.clicks;
      creativeRow.conversions += point.conversions;
      creativeRow.spendCents += point.spendCents;
      creativeRow.revenueCents += point.revenueCents;
      creativeMap.set(creative.id, creativeRow);

      const audienceRow = audienceMap.get(audience.id) ?? {
        id: audience.id,
        label: audience.name,
        audienceType: audience.audienceType,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        spendCents: 0,
        revenueCents: 0
      };
      audienceRow.impressions += point.impressions;
      audienceRow.clicks += point.clicks;
      audienceRow.conversions += point.conversions;
      audienceRow.spendCents += point.spendCents;
      audienceRow.revenueCents += point.revenueCents;
      audienceMap.set(audience.id, audienceRow);
    }

    const withDerivedMetrics = <T extends {
      impressions: number;
      clicks: number;
      conversions: number;
      spendCents: number;
      revenueCents: number;
    }>(row: T) => ({
      ...row,
      ctr: row.impressions ? Number((row.clicks / row.impressions).toFixed(4)) : 0,
      conversionRate: row.clicks ? Number((row.conversions / row.clicks).toFixed(4)) : 0,
      cpaCents: row.conversions ? Math.round(row.spendCents / row.conversions) : 0,
      roas: row.spendCents ? Number((row.revenueCents / row.spendCents).toFixed(4)) : 0
    });

    return apiOk({
      campaign,
      source: acquisitionSourceLineageFromAuditLogs(logs),
      latestIteration: latestIterationLog ? {
        id: latestIterationLog.id,
        createdAt: latestIterationLog.createdAt,
        averageScore: numberValue(latestIterationMetadata.averageScore),
        winners: numberValue(latestIterationMetadata.winners),
        losers: numberValue(latestIterationMetadata.losers),
        cooldownActive: booleanValue(latestIterationMetadata.cooldownActive),
        reallocationCount: numberValue(latestIterationMetadata.reallocationCount),
        pendingApprovalCount: numberValue(latestIterationMetadata.pendingApprovalCount),
        policyBand: stringValue(latestIterationMetadata.policyBand),
        observedCacCents: numberValue(latestIterationMetadata.observedCacCents),
        observedRatio: numberValue(latestIterationMetadata.observedRatio)
      } : null,
      summary: {
        totalCells: cells.length,
        impressions,
        clicks,
        spendCents,
        conversions,
        revenueCents,
        activeBudgetCents,
        cpaCents,
        roas,
        ctr: impressions ? Number((clicks / impressions).toFixed(4)) : 0,
        conversionRate: clicks ? Number((conversions / clicks).toFixed(4)) : 0,
        revenuePerConversionCents: conversions ? Math.round(revenueCents / conversions) : 0,
        targetCacCents: campaign.targetCacCents,
        targetLtvCents: campaign.targetLtvCents,
        cacToTargetPct: campaign.targetCacCents ? Number((cpaCents / campaign.targetCacCents).toFixed(4)) : 0,
        ltvCacRatio: cpaCents ? Number((campaign.targetLtvCents / cpaCents).toFixed(2)) : 0,
        budgetUtilizationPct: activeBudgetCents ? Number((spendCents / activeBudgetCents).toFixed(4)) : 0,
        averageScore: Number(averageScore.toFixed(4)),
        budgetActivityCount: activities.length
      },
      topCells: cells.slice(0, 10),
      creativeTrends: [...creativeMap.values()].map(withDerivedMetrics).sort((a, b) => b.roas - a.roas),
      audienceTrends: [...audienceMap.values()].map(withDerivedMetrics).sort((a, b) => b.roas - a.roas),
      budgetTimeline: activities.map((activity) => ({
        id: activity.id,
        createdAt: activity.createdAt,
        amountCents: activity.amountCents,
        reason: activity.reason,
        fromLabel: activity.fromTestCell
          ? `${activity.fromTestCell.creative.headline} / ${activity.fromTestCell.audience.name}`
          : "New budget",
        toLabel: activity.toTestCell
          ? `${activity.toTestCell.creative.headline} / ${activity.toTestCell.audience.name}`
          : "Unassigned"
      })),
      budgetActivities: activities,
      auditLogs: logs,
      performanceSeries: performanceSeries.map((point) => ({
        recordedAt: point.recordedAt,
        creativeId: point.testCell.creativeId,
        creativeLabel: point.testCell.creative.headline,
        audienceId: point.testCell.audienceId,
        audienceLabel: point.testCell.audience.name,
        impressions: point.impressions,
        clicks: point.clicks,
        conversions: point.conversions,
        spendCents: point.spendCents,
        revenueCents: point.revenueCents,
        cpaCents: point.cpaCents,
        roas: point.roas
      })),
      eventId
    });
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      logApiEvent("warn", eventId, "acquisition.insights.compatibility_mode", { campaignId: id });
      return apiOk({ compatibilityMode: true, summary: null, topCells: [], budgetActivities: [], auditLogs: [], performanceSeries: [], eventId });
    }
    logApiEvent("error", eventId, "acquisition.insights.unhandled_error", { campaignId: id });
    return apiUnhandledError(error, eventId);
  }
}
