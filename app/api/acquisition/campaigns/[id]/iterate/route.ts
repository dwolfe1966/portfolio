import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  evaluateBudgetShift,
  evaluateCampaignPolicy,
  nextStateFromScore,
  scoreTestCell
} from "@/lib/acquisition";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { apiCompatibilityError, apiError, apiOk, apiUnhandledError } from "@/lib/api-contract";
import { isDemoMutationAllowed } from "@/lib/env-guard";
import { createEventId, logApiEvent } from "@/lib/logging";
import { buildAgentExecutionPlan, persistAgentExecutionPlan } from "@/lib/agent-execution-plan";
import { getDefaultWorkspace } from "@/lib/workspace";

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const eventId = createEventId("acq_iter");

  if (!isDemoMutationAllowed()) {
    logApiEvent("warn", eventId, "acquisition.iteration.disabled");
    return apiError(
      403,
      "MUTATION_DISABLED",
      "Campaign iteration is disabled in this environment. Set DEMO_MUTATIONS_ENABLED=true to enable.",
      { eventId }
    );
  }

  const { id } = await params;
  logApiEvent("info", eventId, "acquisition.iteration.started", { campaignId: id });

  try {
    const campaign = await db.acquisitionCampaign.findUnique({ where: { id } });
    if (!campaign) {
      logApiEvent("warn", eventId, "acquisition.iteration.not_found", { campaignId: id });
      return apiError(404, "CAMPAIGN_NOT_FOUND", "Campaign not found", { eventId });
    }
    const workspace = await getDefaultWorkspace();

    const cells = await db.testCell.findMany({
      where: { campaignId: id },
      include: { creative: true, audience: true }
    });

    if (!cells.length) {
      logApiEvent("warn", eventId, "acquisition.iteration.no_cells", { campaignId: id });
      return apiError(400, "NO_TEST_CELLS", "No test cells found for this campaign", { eventId });
    }

    const scored: Array<{ id: string; score: number; budgetCents: number }> = [];
    const aggregate = { spendCents: 0, revenueCents: 0, conversions: 0 };
    let iterationSummary = {
      averageScore: 0,
      winners: 0,
      losers: 0,
      cooldownActive: false,
      reallocationCount: 0,
      pendingApprovalCount: 0,
      policyBand: "healthy",
      observedCacCents: 0,
      observedRatio: 0,
      nextState: campaign.state
    };

    await db.$transaction(async (tx) => {
      for (const cell of cells) {
        const impressions = randomInt(900, 4800);
        const clicks = Math.max(1, Math.round(impressions * (cell.creative.predictedCtr + Math.random() * 0.01)));
        const conversions = Math.max(0, Math.round(clicks * (cell.creative.predictedConversion + Math.random() * 0.05)));
        const spendCents = Math.max(1200, Math.round(clicks * cell.audience.predictedCpcCents));
        const revenueCents = conversions * campaign.targetLtvCents;
        const ctr = clicks / impressions;
        const conversionRate = clicks ? conversions / clicks : 0;
        const cpcCents = Math.round(spendCents / Math.max(clicks, 1));
        const cpaCents = Math.round(spendCents / Math.max(conversions, 1));
        const roas = spendCents > 0 ? Number((revenueCents / spendCents).toFixed(4)) : 0;
        const score = scoreTestCell({
          ctr,
          conversionRate,
          cpaCents,
          roas,
          targetCacCents: campaign.targetCacCents,
          targetLtvCents: campaign.targetLtvCents
        });

        scored.push({ id: cell.id, score, budgetCents: cell.budgetCents });
        aggregate.spendCents += spendCents;
        aggregate.revenueCents += revenueCents;
        aggregate.conversions += conversions;

        await tx.testCell.update({
          where: { id: cell.id },
          data: {
            impressions,
            clicks,
            conversions,
            spendCents,
            revenueCents,
            cacCents: cpaCents,
            roas,
            score,
            status: score >= 0.45 ? "GENERATED" : "REJECTED"
          }
        });

        await tx.adPerformance.create({
          data: {
            testCellId: cell.id,
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
      }

      const ranked = [...scored].sort((a, b) => b.score - a.score);
      const winners = ranked.slice(0, Math.max(1, Math.ceil(ranked.length * 0.3)));
      const losers = ranked.slice(Math.floor(ranked.length * 0.7));
      let reallocationCount = 0;
      let pendingApprovalCount = 0;

      const cooldownCutoff = new Date(Date.now() - campaign.cooldownHours * 60 * 60 * 1000);
      const recentActivity = await tx.budgetActivity.findFirst({
        where: { campaignId: campaign.id, createdAt: { gte: cooldownCutoff } },
        orderBy: { createdAt: "desc" }
      });
      const cooldownActive = Boolean(recentActivity);

      if (!cooldownActive) {
        for (const loser of losers) {
          const amount = Math.round(loser.budgetCents * campaign.maxBudgetShiftPct);
          if (amount < 100) continue;
          const winner = winners[randomInt(0, winners.length - 1)];
          const decision = evaluateBudgetShift({
            amountCents: amount,
            fromBudgetCents: loser.budgetCents,
            approvalCapPct: campaign.approvalCapPct
          });

          if (!decision.approved) {
            pendingApprovalCount++;
            const runbookId = `acquisition:${campaign.id}:${loser.id}:${winner.id}:${amount}`;
            const approvalTitle = `acquisition approval: request_approval (${runbookId})`;
            const plan = buildAgentExecutionPlan({
              workspaceId: workspace.id,
              app: "acquisition",
              runbookId,
              currentStep: "request_approval",
              steps: [
                {
                  key: "request_approval",
                  status: "approval_required",
                  auditEvent: "approval.requested",
                  summary: "Approve a proposed acquisition budget shift before the provider write is applied.",
                  reasons: ["Shift exceeds auto-approval cap; operator review required."]
                }
              ],
              proposedAction: {
                campaignId: campaign.id,
                fromTestCellId: loser.id,
                toTestCellId: winner.id,
                amountCents: amount,
                shiftPct: Number(decision.shiftPct.toFixed(4))
              },
              approvalPolicy: {
                approvalCapPct: campaign.approvalCapPct,
                maxBudgetShiftPct: campaign.maxBudgetShiftPct,
                reason: "Shift exceeds auto-approval cap; operator review required"
              },
              requiredApproverRole: "owner",
              now: new Date()
            });
            await persistAgentExecutionPlan(plan, tx);
            const approvalRequest = await tx.agentApprovalRequest.findFirst({
              where: {
                workspaceId: workspace.id,
                app: "acquisition",
                actionType: "request_approval",
                title: approvalTitle,
                status: { in: ["pending", "escalated"] }
              },
              select: { id: true }
            });
            await tx.acquisitionAuditLog.create({
              data: {
                campaignId: campaign.id,
                actor: "agent-orchestrator",
                action: "budget_shift_pending_approval",
                metadata: {
                  approvalRequestId: approvalRequest?.id ?? null,
                  fromTestCellId: loser.id,
                  toTestCellId: winner.id,
                  amountCents: amount,
                  shiftPct: Number(decision.shiftPct.toFixed(4)),
                  approvalCapPct: campaign.approvalCapPct,
                  reason: "Shift exceeds auto-approval cap; operator review required"
                }
              }
            });
            continue;
          }

          await tx.testCell.update({ where: { id: loser.id }, data: { budgetCents: Math.max(0, loser.budgetCents - amount) } });
          await tx.testCell.update({ where: { id: winner.id }, data: { budgetCents: winner.budgetCents + amount } });
          winner.budgetCents += amount;
          reallocationCount++;

          await tx.budgetActivity.create({
            data: {
              campaignId: campaign.id,
              fromTestCellId: loser.id,
              toTestCellId: winner.id,
              amountCents: amount,
              reason: "Automated budget reallocation based on score"
            }
          });
        }
      }

      const averageScore = ranked.reduce((sum, row) => sum + row.score, 0) / ranked.length;
      const observedCacCents = aggregate.conversions > 0
        ? Math.round(aggregate.spendCents / aggregate.conversions)
        : 0;
      const policy = evaluateCampaignPolicy({
        observedCacCents,
        observedRevenueCents: aggregate.revenueCents,
        conversions: aggregate.conversions,
        targetCacCents: campaign.targetCacCents,
        targetLtvCents: campaign.targetLtvCents,
        cacAutoPausePctOfTarget: campaign.cacAutoPausePctOfTarget,
        minLtvCacRatio: campaign.minLtvCacRatio
      });

      const nextState = policy.shouldPause ? "PAUSED" : nextStateFromScore(averageScore);
      const previousState = campaign.state;
      await tx.acquisitionCampaign.update({
        where: { id: campaign.id },
        data: { state: nextState }
      });

      if (nextState !== previousState) {
        await tx.acquisitionAuditLog.create({
          data: {
            campaignId: campaign.id,
            actor: policy.shouldPause ? "policy-engine" : "agent-orchestrator",
            action: "campaign_state_change",
            metadata: {
              from: previousState,
              to: nextState,
              reason: policy.shouldPause
                ? "Auto-pause triggered by policy engine"
                : `Score-based transition (avg ${averageScore.toFixed(3)})`,
              averageScore: Number(averageScore.toFixed(4))
            }
          }
        });
      }

      if (policy.shouldPause) {
        await tx.acquisitionAuditLog.create({
          data: {
            campaignId: campaign.id,
            actor: "policy-engine",
            action: "policy_auto_pause",
            metadata: {
              band: policy.band,
              observedCacCents,
              observedRatio: Number(policy.observedRatio.toFixed(4)),
              cacOverrunPct: Number(policy.cacOverrunPct.toFixed(4)),
              reasons: policy.reasons
            }
          }
        });
      }

      await tx.acquisitionAuditLog.create({
        data: {
          campaignId: campaign.id,
          actor: "agent-orchestrator",
          action: "iteration_executed",
          metadata: {
            averageScore,
            winners: winners.length,
            losers: losers.length,
            cooldownHours: campaign.cooldownHours,
            cooldownActive,
            reallocationCount,
            pendingApprovalCount,
            policyBand: policy.band,
            observedCacCents,
            observedRatio: Number(policy.observedRatio.toFixed(4))
          }
        }
      });

      iterationSummary = {
        averageScore: Number(averageScore.toFixed(4)),
        winners: winners.length,
        losers: losers.length,
        cooldownActive,
        reallocationCount,
        pendingApprovalCount,
        policyBand: policy.band,
        observedCacCents,
        observedRatio: Number(policy.observedRatio.toFixed(4)),
        nextState
      };
    });

    logApiEvent("info", eventId, "acquisition.iteration.completed", { campaignId: id, iteratedCells: cells.length });
    return apiOk({ campaignId: id, iteratedCells: cells.length, summary: iterationSummary, eventId });
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      logApiEvent("warn", eventId, "acquisition.iteration.compatibility_mode", { campaignId: id });
      return apiCompatibilityError("Acquisition tables are missing.", { eventId });
    }
    logApiEvent("error", eventId, "acquisition.iteration.unhandled_error", { campaignId: id });
    return apiUnhandledError(error, eventId);
  }
}
