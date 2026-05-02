import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { calculatePriorityBreakdown } from "@/lib/scoring";
import { generateLifecycleCopy } from "@/lib/ai";
import { CampaignStatus } from "@prisma/client";
import {
  DEMO_ASSUMPTION_DEFAULTS,
  expectedRevenuePerHighPriority,
  normalizeDemoAssumptions
} from "@/lib/demo-assumptions";
import { apiCompatibilityError, apiError, apiOk, apiUnhandledError } from "@/lib/api-contract";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { isDemoMutationAllowed } from "@/lib/env-guard";
import { createEventId, logApiEvent } from "@/lib/logging";

export async function POST(req: NextRequest) {
  const eventId = createEventId("gen_campaign");

  if (!isDemoMutationAllowed()) {
    logApiEvent("warn", eventId, "generate_campaigns.disabled");
    return apiError(
      403,
      "MUTATION_DISABLED",
      "Campaign generation is disabled in this environment. Set DEMO_MUTATIONS_ENABLED=true to enable.",
      { eventId }
    );
  }

  const body = await req.json().catch(() => ({}));
  try {
    const requestedSetId = body.assumptionSetId ? String(body.assumptionSetId) : null;
    const selectedSet = requestedSetId
      ? await db.assumptionSet.findUnique({ where: { id: requestedSetId } })
      : await db.assumptionSet.findFirst({ where: { isActive: true } });
    const baseAssumptions = normalizeDemoAssumptions(selectedSet ?? DEMO_ASSUMPTION_DEFAULTS);
    const bodyAssumptions = normalizeDemoAssumptions(body);
    const assumptions = {
      ...baseAssumptions,
      ...Object.fromEntries(
        Object.entries(bodyAssumptions).filter(([key]) => key in body)
      )
    };
    const topN = Number(body.topN ?? assumptions.defaultTopN);

    const deltas = await db.entityDelta.findMany({
      take: 40,
      orderBy: { detectedAt: "desc" },
      include: { entity: true }
    });

    const run = await db.campaignRun.create({
      data: {
        runName: String(body.runName ?? "Daily Demo Run"),
        assumptionSetId: selectedSet?.id,
        assumptionsSnapshot: assumptions,
        totalDeltas: deltas.length,
        totalMatches: 0,
        totalHighPriority: 0,
        estimatedOpenRate: assumptions.openRate,
        estimatedCtr: assumptions.clickRate,
        estimatedConversionRate: assumptions.purchaseRate,
        estimatedRevenue: 0
      }
    });

    const candidates: { id: string; score: number }[] = [];
    let totalMatches = 0;

    for (const delta of deltas) {
      const edges = await db.interestEdge.findMany({
        where: { entityId: delta.entityId },
        include: { user: true }
      });

      for (const edge of edges) {
        totalMatches++;
        const breakdown = calculatePriorityBreakdown({
          interestScore: edge.interestScore as any,
          segment: edge.user.segment as any,
          changeType: delta.changeType as any,
          recencyScore: assumptions.recencyScore
        });
        if (breakdown.totalScore < assumptions.minPriorityScore) continue;
        const candidate = await db.campaignCandidate.create({
          data: {
            campaignRunId: run.id,
            userId: edge.userId,
            entityId: delta.entityId,
            entityDeltaId: delta.id,
            segmentAtGeneration: edge.user.segment,
            priorityScore: breakdown.totalScore,
            interestContribution: breakdown.interestContribution,
            recencyContribution: breakdown.recencyContribution,
            segmentContribution: breakdown.segmentContribution,
            changeTypeContribution: breakdown.changeTypeContribution,
            status: CampaignStatus.PENDING
          }
        });
        candidates.push({ id: candidate.id, score: breakdown.totalScore });
      }
    }

    candidates.sort((a, b) => b.score - a.score);
    const selected = candidates.slice(0, topN);
    for (const item of selected) {
      const candidate = await db.campaignCandidate.findUnique({
        where: { id: item.id },
        include: { user: true, entity: true, entityDelta: true }
      });
      if (!candidate) continue;
      const copy = await generateLifecycleCopy({
        segment: candidate.segmentAtGeneration,
        subscriptionStatus: candidate.user.subscriptionStatus,
        entityName: candidate.entity.name,
        interestSource: "search_history",
        interestScore: candidate.priorityScore.toFixed(2),
        changeType: candidate.entityDelta.changeType,
        oldValue: candidate.entityDelta.oldValue,
        newValue: candidate.entityDelta.newValue,
        deltaSummary: candidate.entityDelta.deltaSummary,
        offerFraming: "Unlock the latest update with a paid subscription."
      });
      await db.generatedMessage.create({
        data: {
          campaignCandidateId: candidate.id,
          subjectLine: copy.subjectLine,
          previewText: copy.previewText,
          emailBody: copy.emailBody,
          landingHeadline: copy.landingHeadline,
          landingBody: copy.landingBody,
          ctaText: copy.ctaText,
          modelName: process.env.OPENAI_API_KEY ? "responses-api" : "fallback-template"
        }
      });
      await db.campaignCandidate.update({
        where: { id: candidate.id },
        data: { status: CampaignStatus.GENERATED }
      });
    }

    const highPriority = candidates.filter((c) => c.score >= assumptions.highPriorityThreshold).length;
    const revenuePerHighPriority = expectedRevenuePerHighPriority({
      purchaseRate: assumptions.purchaseRate,
      avgOrderValue: assumptions.avgOrderValue,
      highPriorityLift: assumptions.highPriorityLift
    });
    const estimatedRevenue = Number((highPriority * revenuePerHighPriority).toFixed(2));
    await db.campaignRun.update({
      where: { id: run.id },
      data: {
        totalMatches,
        totalHighPriority: highPriority,
        estimatedOpenRate: assumptions.openRate,
        estimatedCtr: assumptions.clickRate,
        estimatedConversionRate: assumptions.purchaseRate,
        estimatedRevenue
      }
    });

    logApiEvent("info", eventId, "generate_campaigns.completed", {
      campaignRunId: run.id,
      totalDeltas: deltas.length,
      totalMatches,
      totalHighPriority: highPriority,
      generated: selected.length
    });

    return apiOk({
      campaignRunId: run.id,
      totalDeltas: deltas.length,
      totalMatches,
      totalHighPriority: highPriority,
      generated: selected.length,
      estimatedRevenue,
      assumptions: {
        ...assumptions
      },
      assumptionSetId: selectedSet?.id ?? null,
      eventId
    });
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      logApiEvent("warn", eventId, "generate_campaigns.compatibility_mode");
      return apiCompatibilityError("Lifecycle campaign tables are missing.", { eventId });
    }

    logApiEvent("error", eventId, "generate_campaigns.unhandled_error");
    return apiUnhandledError(error, eventId);
  }
}
