import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { nextStateFromScore, scoreTestCell } from "@/lib/acquisition";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { apiError, apiOk } from "@/lib/api-contract";
import { isDemoMutationAllowed } from "@/lib/env-guard";

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isDemoMutationAllowed()) {
    return apiError(
      403,
      "MUTATION_DISABLED",
      "Campaign iteration is disabled in this environment. Set DEMO_MUTATIONS_ENABLED=true to enable."
    );
  }

  const { id } = await params;

  try {
    const campaign = await db.acquisitionCampaign.findUnique({ where: { id } });
    if (!campaign) {
      return apiError(404, "CAMPAIGN_NOT_FOUND", "Campaign not found");
    }

    const cells = await db.testCell.findMany({
      where: { campaignId: id },
      include: { creative: true, audience: true }
    });

    if (!cells.length) {
      return apiError(400, "NO_TEST_CELLS", "No test cells found for this campaign");
    }

    const scored: Array<{ id: string; score: number; budgetCents: number }> = [];

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
      await tx.acquisitionCampaign.update({
        where: { id: campaign.id },
        data: { state: nextStateFromScore(averageScore) }
      });

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
            reallocationCount
          }
        }
      });
    });

    return apiOk({ campaignId: id, iteratedCells: cells.length });
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
