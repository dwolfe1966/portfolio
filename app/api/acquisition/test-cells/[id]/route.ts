import { CampaignStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { apiError, apiOk, apiUnhandledError } from "@/lib/api-contract";
import { isDemoMutationAllowed } from "@/lib/env-guard";
import { createEventId } from "@/lib/logging";

function num(value: unknown, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const eventId = createEventId("acq_cell_patch");
  if (!isDemoMutationAllowed()) return apiError(403, "MUTATION_DISABLED", "Test-cell edits are disabled.", { eventId });
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const status = Object.values(CampaignStatus).includes(body.status) ? body.status : CampaignStatus.PENDING;
  const clicks = Math.max(0, Math.round(num(body.clicks)));
  const conversions = Math.max(0, Math.round(num(body.conversions)));
  const spendCents = Math.max(0, Math.round(num(body.spendCents)));
  const revenueCents = Math.max(0, Math.round(num(body.revenueCents)));

  try {
    const testCell = await db.testCell.update({
      where: { id },
      data: {
        budgetCents: Math.max(0, Math.round(num(body.budgetCents))),
        impressions: Math.max(0, Math.round(num(body.impressions))),
        clicks,
        conversions,
        spendCents,
        revenueCents,
        cacCents: conversions ? Math.round(spendCents / conversions) : 0,
        roas: spendCents ? revenueCents / spendCents : 0,
        score: clamp(num(body.score), 0, 1),
        status
      }
    });
    return apiOk({ testCell, eventId });
  } catch (error) {
    return apiUnhandledError(error, eventId);
  }
}
