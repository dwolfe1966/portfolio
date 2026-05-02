import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { apiCompatibilityError, apiError, apiOk, apiUnhandledError } from "@/lib/api-contract";
import { isDemoMutationAllowed } from "@/lib/env-guard";
import { createEventId, logApiEvent } from "@/lib/logging";
import { isValidStateTransition, type AcquisitionCampaignState } from "@/lib/acquisition";

const VALID_STATES: AcquisitionCampaignState[] = ["DRAFT", "TESTING", "SCALING", "PAUSED", "COMPLETED"];

function toNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const eventId = createEventId("acq_override");

  if (!isDemoMutationAllowed()) {
    logApiEvent("warn", eventId, "acquisition.override.disabled");
    return apiError(
      403,
      "MUTATION_DISABLED",
      "Campaign override mutations are disabled in this environment. Set DEMO_MUTATIONS_ENABLED=true to enable.",
      { eventId }
    );
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    const campaign = await db.acquisitionCampaign.findUnique({ where: { id } });
    if (!campaign) {
      logApiEvent("warn", eventId, "acquisition.override.campaign_not_found", { campaignId: id });
      return apiError(404, "CAMPAIGN_NOT_FOUND", "Campaign not found", { eventId });
    }

    const action = String(body.action ?? "");

    if (action === "update_guardrails") {
      const maxBudgetShiftPct = Math.min(0.5, Math.max(0.01, toNumber(body.maxBudgetShiftPct, campaign.maxBudgetShiftPct)));
      const minConfidence = Math.min(0.95, Math.max(0.5, toNumber(body.minConfidence, campaign.minConfidence)));
      const cooldownHours = Math.min(168, Math.max(1, Math.round(toNumber(body.cooldownHours, campaign.cooldownHours))));
      const cacAutoPausePctOfTarget = Math.min(3, Math.max(1, toNumber(body.cacAutoPausePctOfTarget, campaign.cacAutoPausePctOfTarget)));
      const minLtvCacRatio = Math.min(10, Math.max(1, toNumber(body.minLtvCacRatio, campaign.minLtvCacRatio)));
      const approvalCapPct = Math.min(0.5, Math.max(0.01, toNumber(body.approvalCapPct, campaign.approvalCapPct)));

      const updated = await db.$transaction(async (tx) => {
        const updatedCampaign = await tx.acquisitionCampaign.update({
          where: { id: campaign.id },
          data: {
            maxBudgetShiftPct,
            minConfidence,
            cooldownHours,
            cacAutoPausePctOfTarget,
            minLtvCacRatio,
            approvalCapPct
          }
        });

        await tx.acquisitionAuditLog.create({
          data: {
            campaignId: campaign.id,
            actor: "operator",
            action: "guardrails_updated",
            metadata: {
              maxBudgetShiftPct,
              minConfidence,
              cooldownHours,
              cacAutoPausePctOfTarget,
              minLtvCacRatio,
              approvalCapPct
            }
          }
        });

        return updatedCampaign;
      });

      logApiEvent("info", eventId, "acquisition.override.guardrails_updated", { campaignId: id });
      return apiOk({ campaign: updated, eventId });
    }

    if (action === "lock_cell_budget") {
      const testCellId = String(body.testCellId ?? "");
      const budgetCents = Math.max(0, Math.round(toNumber(body.budgetCents, 0)));

      if (!testCellId) {
        return apiError(400, "INVALID_INPUT", "testCellId is required", { eventId });
      }

      const testCell = await db.testCell.findFirst({ where: { id: testCellId, campaignId: campaign.id } });
      if (!testCell) {
        return apiError(404, "TEST_CELL_NOT_FOUND", "Test cell not found for campaign", { eventId });
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

      logApiEvent("info", eventId, "acquisition.override.budget_locked", { campaignId: id, testCellId, budgetCents });
      return apiOk({ testCellId, budgetCents, eventId });
    }

    if (action === "revert_budget_lock") {
      const auditLogId = String(body.auditLogId ?? "");
      if (!auditLogId) {
        return apiError(400, "INVALID_INPUT", "auditLogId is required", { eventId });
      }

      const overrideLog = await db.acquisitionAuditLog.findFirst({
        where: { id: auditLogId, campaignId: campaign.id, action: "budget_lock_override" }
      });
      if (!overrideLog) {
        return apiError(404, "AUDIT_LOG_NOT_FOUND", "Budget lock override log not found", { eventId });
      }

      const metadata = (overrideLog.metadata ?? {}) as {
        testCellId?: unknown;
        previousBudgetCents?: unknown;
      };
      const testCellId = String(metadata.testCellId ?? "");
      const previousBudgetCents = Math.max(0, Math.round(toNumber(metadata.previousBudgetCents, 0)));

      if (!testCellId) {
        return apiError(422, "INVALID_AUDIT_LOG", "Budget lock log is missing testCellId metadata", { eventId });
      }

      const testCell = await db.testCell.findFirst({ where: { id: testCellId, campaignId: campaign.id } });
      if (!testCell) {
        return apiError(404, "TEST_CELL_NOT_FOUND", "Referenced test cell no longer exists", { eventId });
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

      logApiEvent("info", eventId, "acquisition.override.budget_reverted", { campaignId: id, auditLogId, testCellId });
      return apiOk({ auditLogId, testCellId, budgetCents: previousBudgetCents, eventId });
    }

    if (action === "transition_state") {
      const requested = String(body.toState ?? "").toUpperCase();
      if (!VALID_STATES.includes(requested as AcquisitionCampaignState)) {
        return apiError(400, "INVALID_STATE", `toState must be one of ${VALID_STATES.join(", ")}`, { eventId });
      }
      const targetState = requested as AcquisitionCampaignState;
      const fromState = campaign.state as AcquisitionCampaignState;

      if (!isValidStateTransition(fromState, targetState)) {
        return apiError(
          422,
          "INVALID_TRANSITION",
          `Cannot transition from ${fromState} to ${targetState}`,
          { eventId }
        );
      }

      const reason = String(body.reason ?? "Operator-initiated transition").slice(0, 240);

      const updated = await db.$transaction(async (tx) => {
        const updatedCampaign = await tx.acquisitionCampaign.update({
          where: { id: campaign.id },
          data: { state: targetState }
        });

        await tx.acquisitionAuditLog.create({
          data: {
            campaignId: campaign.id,
            actor: "operator",
            action: "campaign_state_change",
            metadata: { from: fromState, to: targetState, reason }
          }
        });

        return updatedCampaign;
      });

      logApiEvent("info", eventId, "acquisition.override.state_transitioned", {
        campaignId: id,
        from: fromState,
        to: targetState
      });
      return apiOk({ campaign: updated, from: fromState, to: targetState, eventId });
    }

    return apiError(400, "UNSUPPORTED_ACTION", "Unsupported action", { eventId });
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      logApiEvent("warn", eventId, "acquisition.override.compatibility_mode", { campaignId: id });
      return apiCompatibilityError("Acquisition tables are missing.", { eventId });
    }
    logApiEvent("error", eventId, "acquisition.override.unhandled_error", { campaignId: id });
    return apiUnhandledError(error, eventId);
  }
}
