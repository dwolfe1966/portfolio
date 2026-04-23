import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const campaign = await db.acquisitionCampaign.findUnique({ where: { id } });
    if (!campaign) {
      return NextResponse.json({ ok: false, error: "Campaign not found" }, { status: 404 });
    }

    const [cells, activities, logs] = await Promise.all([
      db.testCell.findMany({
        where: { campaignId: id },
        include: { creative: true, audience: true },
        orderBy: { score: "desc" }
      }),
      db.budgetActivity.findMany({ where: { campaignId: id }, orderBy: { createdAt: "desc" }, take: 20 }),
      db.acquisitionAuditLog.findMany({ where: { campaignId: id }, orderBy: { createdAt: "desc" }, take: 20 })
    ]);

    const spendCents = cells.reduce((sum, cell) => sum + cell.spendCents, 0);
    const conversions = cells.reduce((sum, cell) => sum + cell.conversions, 0);
    const revenueCents = cells.reduce((sum, cell) => sum + cell.revenueCents, 0);

    return NextResponse.json({
      ok: true,
      campaign,
      summary: {
        totalCells: cells.length,
        spendCents,
        conversions,
        revenueCents,
        cpaCents: conversions ? Math.round(spendCents / conversions) : 0,
        roas: spendCents > 0 ? Number((revenueCents / spendCents).toFixed(4)) : 0
      },
      topCells: cells.slice(0, 10),
      budgetActivities: activities,
      auditLogs: logs
    });
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      return NextResponse.json({ ok: true, compatibilityMode: true, summary: null, topCells: [], budgetActivities: [], auditLogs: [] });
    }
    throw error;
  }
}
