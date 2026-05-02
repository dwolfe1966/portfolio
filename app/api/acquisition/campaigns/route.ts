import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { buildAudienceSegments, buildCreativeVariants, validateCreateCampaignInput } from "@/lib/acquisition";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { apiCompatibilityError, apiError, apiOk, apiUnhandledError } from "@/lib/api-contract";
import { isDemoMutationAllowed } from "@/lib/env-guard";
import { createEventId, logApiEvent } from "@/lib/logging";

export async function GET() {
  const eventId = createEventId("acq_campaigns_get");

  try {
    const campaigns = await db.acquisitionCampaign.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { creatives: true, audiences: true, testCells: true, budgetActivities: true } }
      },
      take: 20
    });

    logApiEvent("info", eventId, "acquisition.campaigns.list.completed", { count: campaigns.length });
    return apiOk({ campaigns, eventId });
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      logApiEvent("warn", eventId, "acquisition.campaigns.list.compatibility_mode");
      return apiOk({ compatibilityMode: true, campaigns: [], eventId });
    }
    logApiEvent("error", eventId, "acquisition.campaigns.list.unhandled_error");
    return apiUnhandledError(error, eventId);
  }
}

export async function POST(req: NextRequest) {
  const eventId = createEventId("acq_campaigns_post");

  if (!isDemoMutationAllowed()) {
    logApiEvent("warn", eventId, "acquisition.campaigns.create.disabled");
    return apiError(
      403,
      "MUTATION_DISABLED",
      "Campaign creation is disabled in this environment. Set DEMO_MUTATIONS_ENABLED=true to enable.",
      { eventId }
    );
  }

  const body = await req.json().catch(() => ({}));
  const parsed = validateCreateCampaignInput(body);

  if (!parsed.ok) {
    logApiEvent("warn", eventId, "acquisition.campaigns.create.invalid", { errors: parsed.errors });
    return apiError(400, "INVALID_INPUT", "Campaign input validation failed", { errors: parsed.errors, eventId });
  }

  const input = parsed.value;

  try {
    const creatives = buildCreativeVariants(input.channels);

    let audienceSeed: Array<{
      name: string;
      audienceType: string;
      targetingJson: import("@prisma/client").Prisma.InputJsonValue;
      predictedCpcCents: number;
      predictedCacCents: number;
      templateId: string | null;
    }>;

    if (input.templateIds && input.templateIds.length > 0) {
      const templates = await db.audienceTemplate.findMany({
        where: { id: { in: input.templateIds } }
      });
      const foundIds = new Set(templates.map((t) => t.id));
      const missing = input.templateIds.filter((id) => !foundIds.has(id));
      if (missing.length > 0) {
        logApiEvent("warn", eventId, "acquisition.campaigns.create.templates_missing", { missing });
        return apiError(422, "AUDIENCE_TEMPLATES_MISSING", "Some audience templates were not found", {
          eventId,
          missingIds: missing
        });
      }
      audienceSeed = templates.map((template) => ({
        name: template.name,
        audienceType: template.audienceType,
        targetingJson: template.targetingJson as import("@prisma/client").Prisma.InputJsonValue,
        predictedCpcCents: template.predictedCpcCents,
        predictedCacCents: template.predictedCacCents,
        templateId: template.id
      }));
    } else {
      audienceSeed = buildAudienceSegments().map((audience) => ({
        ...audience,
        templateId: null
      }));
    }

    const result = await db.$transaction(async (tx) => {
      const campaign = await tx.acquisitionCampaign.create({
        data: {
          name: input.name,
          objective: input.objective,
          budgetCents: input.budgetCents,
          startAt: new Date(input.startAt),
          endAt: new Date(input.endAt),
          channels: input.channels,
          maxBudgetShiftPct: input.maxBudgetShiftPct,
          minConfidence: input.minConfidence,
          cooldownHours: input.cooldownHours,
          targetCacCents: input.targetCacCents,
          targetLtvCents: input.targetLtvCents,
          state: "TESTING"
        }
      });

      const createdCreatives = await Promise.all(
        creatives.map((creative) =>
          tx.adCreative.create({
            data: {
              campaignId: campaign.id,
              ...creative
            }
          })
        )
      );

      const createdAudiences = await Promise.all(
        audienceSeed.map((audience) =>
          tx.audienceSegment.create({
            data: {
              campaignId: campaign.id,
              ...audience
            }
          })
        )
      );

      const totalCells = createdCreatives.length * createdAudiences.length;
      const perCellBudget = Math.floor(input.budgetCents / Math.max(totalCells, 1));

      for (const creative of createdCreatives) {
        for (const audience of createdAudiences) {
          await tx.testCell.create({
            data: {
              campaignId: campaign.id,
              creativeId: creative.id,
              audienceId: audience.id,
              budgetCents: perCellBudget,
              status: "PENDING"
            }
          });
        }
      }

      await tx.acquisitionAuditLog.create({
        data: {
          campaignId: campaign.id,
          actor: "system",
          action: "campaign_created",
          metadata: {
            channels: input.channels,
            creatives: createdCreatives.length,
            audiences: createdAudiences.length,
            totalCells,
            audienceSource: input.templateIds && input.templateIds.length > 0 ? "library_templates" : "default_segments",
            templateIds: input.templateIds ?? []
          }
        }
      });

      return campaign;
    });

    logApiEvent("info", eventId, "acquisition.campaigns.create.completed", { campaignId: result.id });
    return apiOk({ campaign: result, eventId });
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      logApiEvent("warn", eventId, "acquisition.campaigns.create.compatibility_mode");
      return apiCompatibilityError("Acquisition tables are missing.", { eventId });
    }
    logApiEvent("error", eventId, "acquisition.campaigns.create.unhandled_error");
    return apiUnhandledError(error, eventId);
  }
}
