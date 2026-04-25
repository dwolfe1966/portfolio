import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";

function toNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    const campaign = await db.acquisitionCampaign.findUnique({ where: { id } });
    if (!campaign) {
      return NextResponse.json({ ok: false, error: "Campaign not found" }, { status: 404 });
    }

    const action = String(body.action ?? "");

    if (action === "update_guardrails") {
      const maxBudgetShiftPct = Math.min(0.5, Math.max(0.01, toNumber(body.maxBudgetShiftPct, campaign.maxBudgetShiftPct)));
      const minConfidence = Math.min(0.95, Math.max(0.5, toNumber(body.minConfidence, campaign.minConfidence)));

      const updated = await db.$transaction(async (tx) => {
        const updatedCampaign = await tx.acquisitionCampaign.update({
          where: { id: campaign.id },
          data: { maxBudgetShiftPct, minConfidence }
        });

        await tx.acquisitionAuditLog.create({
          data: {
            campaignId: campaign.id,
            actor: "operator",
            action: "guardrails_updated",
            metadata: { maxBudgetShiftPct, minConfidence }
          }
        });

        return updatedCampaign;
      });

      return NextResponse.json({ ok: true, campaign: updated });
    }

    if (action === "lock_cell_budget") {
      const testCellId = String(body.testCellId ?? "");
      const budgetCents = Math.max(0, Math.round(toNumber(body.budgetCents, 0)));

      if (!testCellId) {
        return NextResponse.json({ ok: false, error: "testCellId is required" }, { status: 400 });
      }

      const testCell = await db.testCell.findFirst({ where: { id: testCellId, campaignId: campaign.id } });
      if (!testCell) {
        return NextResponse.json({ ok: false, error: "Test cell not found for campaign" }, { status: 404 });
      }

      await db.$transaction(async (tx) => {
        await tx.testCell.update({ where: { id: testCell.id }, data: { budgetCents } });
        await tx.acquisitionAuditLog.create({
          data: {
            campaignId: campaign.id,
            actor: "operator",
            action: "budget_lock_override",
            metadata: { testCellId, budgetCents }
          }
        });
      });

      return NextResponse.json({ ok: true, testCellId, budgetCents });
    }

    return NextResponse.json({ ok: false, error: "Unsupported action" }, { status: 400 });
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      return NextResponse.json({ ok: false, compatibilityMode: true, error: "Acquisition tables are missing." }, { status: 503 });
    }
    throw error;
  }
}
