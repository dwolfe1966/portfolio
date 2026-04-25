import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { apiError, apiOk } from "@/lib/api-contract";

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
      return apiError(404, "CAMPAIGN_NOT_FOUND", "Campaign not found");
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

      return apiOk({ campaign: updated });
    }

    if (action === "lock_cell_budget") {
      const testCellId = String(body.testCellId ?? "");
      const budgetCents = Math.max(0, Math.round(toNumber(body.budgetCents, 0)));

      if (!testCellId) {
        return apiError(400, "INVALID_INPUT", "testCellId is required");
      }

      const testCell = await db.testCell.findFirst({ where: { id: testCellId, campaignId: campaign.id } });
      if (!testCell) {
        return apiError(404, "TEST_CELL_NOT_FOUND", "Test cell not found for campaign");
      }

      await db.$transaction(async (tx) => {
        await tx.testCell.update({ where: { id: testCell.id }, data: { budgetCents } });
        await tx.acquisitionAuditLog.create({
          data: {
            campaignId: campaign.id,
            actor: "operator",
            action: "budget_lock_override",
            metadata: { testCellId, previousBudgetCents: testCell.budgetCents, budgetCents }
          }
        });
      });

      return apiOk({ testCellId, budgetCents });
    }

    if (action === "revert_budget_lock") {
      const auditLogId = String(body.auditLogId ?? "");
      if (!auditLogId) {
        return apiError(400, "INVALID_INPUT", "auditLogId is required");
      }

      const overrideLog = await db.acquisitionAuditLog.findFirst({
        where: { id: auditLogId, campaignId: campaign.id, action: "budget_lock_override" }
      });
      if (!overrideLog) {
        return apiError(404, "AUDIT_LOG_NOT_FOUND", "Budget lock override log not found");
      }

      const metadata = (overrideLog.metadata ?? {}) as {
        testCellId?: unknown;
        previousBudgetCents?: unknown;
      };
      const testCellId = String(metadata.testCellId ?? "");
      const previousBudgetCents = Math.max(0, Math.round(toNumber(metadata.previousBudgetCents, 0)));

      if (!testCellId) {
        return apiError(422, "INVALID_AUDIT_LOG", "Budget lock log is missing testCellId metadata");
      }

      const testCell = await db.testCell.findFirst({ where: { id: testCellId, campaignId: campaign.id } });
      if (!testCell) {
        return apiError(404, "TEST_CELL_NOT_FOUND", "Referenced test cell no longer exists");
      }

      await db.$transaction(async (tx) => {
        await tx.testCell.update({
          where: { id: testCell.id },
          data: { budgetCents: previousBudgetCents }
        });
        await tx.acquisitionAuditLog.create({
          data: {
            campaignId: campaign.id,
            actor: "operator",
            action: "budget_lock_reverted",
            metadata: { auditLogId, testCellId, restoredBudgetCents: previousBudgetCents }
          }
        });
      });

      return apiOk({ auditLogId, testCellId, budgetCents: previousBudgetCents });
    }

    return apiError(400, "UNSUPPORTED_ACTION", "Unsupported action");
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      return NextResponse.json(
        { ok: false, compatibilityMode: true, error: { code: "COMPATIBILITY_MODE", message: "Acquisition tables are missing." } },
        { status: 503 }
      );
    }
    throw error;
  }
}
