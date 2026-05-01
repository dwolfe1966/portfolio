import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildAudienceSegments, buildCreativeVariants, validateCreateCampaignInput } from "@/lib/acquisition";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { apiError, apiOk } from "@/lib/api-contract";
import { isDemoMutationAllowed } from "@/lib/env-guard";

export async function GET() {
  try {
    const campaigns = await db.acquisitionCampaign.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { creatives: true, audiences: true, testCells: true, budgetActivities: true } }
      },
      take: 20
    });

    return apiOk({ campaigns });
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      return apiOk({ compatibilityMode: true, campaigns: [] });
    }
    throw error;
  }
}

export async function POST(req: NextRequest) {
  if (!isDemoMutationAllowed()) {
    return apiError(
      403,
      "MUTATION_DISABLED",
      "Campaign creation is disabled in this environment. Set DEMO_MUTATIONS_ENABLED=true to enable."
    );
  }

  const body = await req.json().catch(() => ({}));
  const parsed = validateCreateCampaignInput(body);

  if (!parsed.ok) {
    return apiError(400, "INVALID_INPUT", "Campaign input validation failed", { errors: parsed.errors });
  }

  const input = parsed.value;

  try {
    const creatives = buildCreativeVariants(input.channels);
    const audiences = buildAudienceSegments();

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
        audiences.map((audience) =>
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
            totalCells
          }
        }
      });

      return campaign;
    });

    return apiOk({ campaign: result });
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      return apiError(
        503,
        "COMPATIBILITY_MODE",
        "Acquisition tables are missing. Run db push/migrations before using this endpoint.",
        { compatibilityMode: true }
      );
    }
    throw error;
  }
}
