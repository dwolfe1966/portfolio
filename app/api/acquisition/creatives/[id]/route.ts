import { AcquisitionChannel } from "@prisma/client";
import { db } from "@/lib/db";
import { apiError, apiOk, apiUnhandledError } from "@/lib/api-contract";
import { isDemoMutationAllowed } from "@/lib/env-guard";
import { createEventId } from "@/lib/logging";

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const eventId = createEventId("acq_creative_patch");
  if (!isDemoMutationAllowed()) return apiError(403, "MUTATION_DISABLED", "Creative edits are disabled.", { eventId });
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const channel = Object.values(AcquisitionChannel).includes(body.channel) ? body.channel : AcquisitionChannel.SEARCH;

  try {
    const creative = await db.adCreative.update({
      where: { id },
      data: {
        headline: String(body.headline ?? "").trim().slice(0, 120),
        description: String(body.description ?? "").trim().slice(0, 240),
        callToAction: String(body.callToAction ?? "").trim().slice(0, 80),
        channel,
        predictedCtr: clamp(Number(body.predictedCtr), 0, 1),
        predictedConversion: clamp(Number(body.predictedConversion), 0, 1)
      }
    });
    return apiOk({ creative, eventId });
  } catch (error) {
    return apiUnhandledError(error, eventId);
  }
}
