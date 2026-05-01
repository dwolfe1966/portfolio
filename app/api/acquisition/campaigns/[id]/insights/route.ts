import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { apiError, apiOk } from "@/lib/api-contract";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const campaign = await db.acquisitionCampaign.findUnique({ where: { id } });
    if (!campaign) {
      return apiError(404, "CAMPAIGN_NOT_FOUND", "Campaign not found");
    }

    const [cells, activities, logs, performanceSeries] = await Promise.all([
      db.testCell.findMany({
        where: { campaignId: id },
        include: { creative: true, audience: true },
        orderBy: { score: "desc" }
      }),
      db.budgetActivity.findMany({ where: { campaignId: id }, orderBy: { createdAt: "desc" }, take: 20 }),
      db.acquisitionAuditLog.findMany({ where: { campaignId: id }, orderBy: { createdAt: "desc" }, take: 20 }),
      db.adPerformance.findMany({
        where: { testCell: { campaignId: id } },
        orderBy: { recordedAt: "asc" },
        take: 50
      })
    ]);

    const spendCents = cells.reduce((sum, cell) => sum + cell.spendCents, 0);
    const conversions = cells.reduce((sum, cell) => sum + cell.conversions, 0);
    const revenueCents = cells.reduce((sum, cell) => sum + cell.revenueCents, 0);
    const averageScore = cells.length ? cells.reduce((sum, cell) => sum + cell.score, 0) / cells.length : 0;

    return apiOk({
      campaign,
      summary: {
        totalCells: cells.length,
        spendCents,
        conversions,
        revenueCents,
        cpaCents: conversions ? Math.round(spendCents / conversions) : 0,
        roas: spendCents > 0 ? Number((revenueCents / spendCents).toFixed(4)) : 0,
        averageScore: Number(averageScore.toFixed(4)),
        budgetActivityCount: activities.length
      },
      topCells: cells.slice(0, 10),
      budgetActivities: activities,
      auditLogs: logs,
      performanceSeries: performanceSeries.map((point) => ({
        recordedAt: point.recordedAt,
        impressions: point.impressions,
        clicks: point.clicks,
        conversions: point.conversions,
        spendCents: point.spendCents,
        revenueCents: point.revenueCents,
        cpaCents: point.cpaCents,
        roas: point.roas
      }))
    });
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      return apiOk({ compatibilityMode: true, summary: null, topCells: [], budgetActivities: [], auditLogs: [], performanceSeries: [] });
    }
    throw error;
  }
}
