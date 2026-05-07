import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ACCOUNT_SESSION_COOKIE, verifyAccountSessionToken } from "@/lib/account-session";
import { calculatePriorityBreakdown } from "@/lib/scoring";
import { generateLifecycleCopy, LifecycleCopyGenerationError } from "@/lib/ai";
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
import { buildAgentExecutionPlan, persistAgentExecutionPlan } from "@/lib/agent-execution-plan";
import { getDefaultWorkspace } from "@/lib/workspace";

function accountUserIdFromRequest(req: NextRequest) {
  return verifyAccountSessionToken(req.cookies.get(ACCOUNT_SESSION_COOKIE)?.value)?.userId ?? null;
}

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
  const accountUserId = accountUserIdFromRequest(req);
  try {
    const workspace = await getDefaultWorkspace();
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
        accountUserId,
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
    let queuedAgentJobs = 0;
    for (const item of selected) {
      const candidate = await db.campaignCandidate.findUnique({
        where: { id: item.id },
        include: { user: true, entity: true, entityDelta: true }
      });
      if (!candidate) continue;
      const interestEdge = await db.interestEdge.findFirst({
        where: {
          userId: candidate.userId,
          entityId: candidate.entityId
        },
        orderBy: { interestScore: "desc" }
      });
      const entityLocation = [candidate.entity.city, candidate.entity.state].filter(Boolean).join(", ");
      const recipientFirstName = candidate.user.fullName.split(" ")[0] || candidate.user.fullName;
      const copy = await generateLifecycleCopy({
        recipientName: candidate.user.fullName,
        recipientFirstName,
        recipientEmail: candidate.user.email,
        segment: candidate.segmentAtGeneration,
        subscriptionStatus: candidate.user.subscriptionStatus,
        lastActiveAt: candidate.user.lastActiveAt?.toISOString() ?? null,
        entityName: candidate.entity.name,
        entityType: candidate.entity.entityType,
        entityLocation,
        interestSource: interestEdge?.source ?? "unknown",
        interestScore: interestEdge?.interestScore.toFixed(2) ?? null,
        priorityScore: candidate.priorityScore.toFixed(2),
        priorityBreakdown: `interest ${candidate.interestContribution.toFixed(2)}, recency ${candidate.recencyContribution.toFixed(2)}, segment ${candidate.segmentContribution.toFixed(2)}, change type ${candidate.changeTypeContribution.toFixed(2)}`,
        changeType: candidate.entityDelta.changeType,
        oldValue: candidate.entityDelta.oldValue,
        newValue: candidate.entityDelta.newValue,
        deltaSummary: candidate.entityDelta.deltaSummary,
        detectedAt: candidate.entityDelta.detectedAt.toISOString(),
        offerFraming: "Unlock the latest update with a paid subscription."
      });
      const message = await db.generatedMessage.create({
        data: {
          campaignCandidateId: candidate.id,
          subjectLine: copy.subjectLine,
          previewText: copy.previewText,
          emailBody: copy.emailBody,
          landingHeadline: copy.landingHeadline,
          landingBody: copy.landingBody,
          ctaText: copy.ctaText,
          modelName: copy.modelName
        }
      });
      await db.campaignCandidate.update({
        where: { id: candidate.id },
        data: { status: CampaignStatus.GENERATED }
      });
      const plan = buildAgentExecutionPlan({
        workspaceId: workspace.id,
        accountUserId,
        app: "lifecycle",
        runbookId: `lifecycle:${run.id}:${candidate.id}`,
        currentStep: "trigger_delivery",
        steps: [
          {
            key: "trigger_delivery",
            status: "ready",
            auditEvent: "delivery.test_sent",
            summary: "Queue delivery execution for the generated lifecycle message.",
            reasons: []
          }
        ],
        payload: {
          campaignRunId: run.id,
          campaignCandidateId: candidate.id,
          generatedMessageId: message.id,
          recipientEmail: candidate.user.email
        },
        now: new Date()
      });
      const persistedPlan = await persistAgentExecutionPlan(plan);
      queuedAgentJobs += persistedPlan.jobsCreated;
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
      queuedAgentJobs,
      estimatedRevenue,
      assumptions: {
        ...assumptions
      },
      assumptionSetId: selectedSet?.id ?? null,
      eventId
    });
  } catch (error) {
    if (error instanceof LifecycleCopyGenerationError) {
      logApiEvent("error", eventId, "generate_campaigns.openai_failed", { message: error.message });
      return apiError(
        502,
        "OPENAI_MESSAGE_GENERATION_FAILED",
        "Lifecycle message generation requires OpenAI content and could not complete.",
        { eventId, message: error.message }
      );
    }

    if (isMissingDemoTableError(error)) {
      logApiEvent("warn", eventId, "generate_campaigns.compatibility_mode");
      return apiCompatibilityError("Lifecycle campaign tables are missing.", { eventId });
    }

    logApiEvent("error", eventId, "generate_campaigns.unhandled_error");
    return apiUnhandledError(error, eventId);
  }
}
