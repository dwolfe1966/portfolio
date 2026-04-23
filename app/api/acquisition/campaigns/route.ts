import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildAudienceSegments, buildCreativeVariants, validateCreateCampaignInput } from "@/lib/acquisition";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";

export async function GET() {
  try {
    const campaigns = await db.acquisitionCampaign.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { creatives: true, audiences: true, testCells: true, budgetActivities: true } }
      },
      take: 20
    });

    return NextResponse.json({ ok: true, campaigns });
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      return NextResponse.json({ ok: true, compatibilityMode: true, campaigns: [] });
    }
    throw error;
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = validateCreateCampaignInput(body);

  if (!parsed.ok) {
    return NextResponse.json({ ok: false, errors: parsed.errors }, { status: 400 });
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

    return NextResponse.json({ ok: true, campaign: result });
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      return NextResponse.json(
        {
          ok: false,
          compatibilityMode: true,
          error: "Acquisition tables are missing. Run db push/migrations before using this endpoint."
        },
        { status: 503 }
      );
    }
    throw error;
  }
}
