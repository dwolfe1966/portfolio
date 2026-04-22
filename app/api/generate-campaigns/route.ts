import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { calculatePriorityScore } from "@/lib/scoring";
import { generateLifecycleCopy } from "@/lib/ai";
import { CampaignStatus } from "@prisma/client";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const topN = Number(body.topN ?? 10);
  const recencyScore = Number(body.recencyScore ?? 0.9);
  const minPriorityScore = Number(body.minPriorityScore ?? 0);
  const highPriorityThreshold = Number(body.highPriorityThreshold ?? 0.8);
  const revenuePerHighPriority = Number(body.revenuePerHighPriority ?? 18.5);
  const deltas = await db.entityDelta.findMany({
    take: 40,
    orderBy: { detectedAt: "desc" },
    include: { entity: true }
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
      const score = calculatePriorityScore({
        interestScore: edge.interestScore as any,
        segment: edge.user.segment as any,
        changeType: delta.changeType as any,
        recencyScore: Number.isFinite(recencyScore) ? recencyScore : 0.9
      });
      if (score < minPriorityScore) continue;
      const candidate = await db.campaignCandidate.create({
        data: {
          userId: edge.userId,
          entityId: delta.entityId,
          entityDeltaId: delta.id,
          segmentAtGeneration: edge.user.segment,
          priorityScore: score,
          status: CampaignStatus.PENDING
        }
      });
      candidates.push({ id: candidate.id, score });
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

  const highPriority = candidates.filter((c) => c.score >= highPriorityThreshold).length;
  const estimatedRevenue = Number((highPriority * revenuePerHighPriority).toFixed(2));
  const run = await db.campaignRun.create({
    data: {
      runName: String(body.runName ?? "Daily Demo Run"),
      totalDeltas: deltas.length,
      totalMatches,
      totalHighPriority: highPriority,
      estimatedOpenRate: 0.25,
      estimatedCtr: 0.03,
      estimatedConversionRate: 0.015,
      estimatedRevenue
    }
  });

  return NextResponse.json({
    ok: true,
    campaignRunId: run.id,
    totalDeltas: deltas.length,
    totalMatches,
    totalHighPriority: highPriority,
    generated: selected.length,
    estimatedRevenue,
    assumptions: {
      recencyScore,
      minPriorityScore,
      highPriorityThreshold,
      revenuePerHighPriority
    }
  });
}
