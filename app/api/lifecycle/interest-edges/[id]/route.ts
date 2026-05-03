import { db } from "@/lib/db";
import { apiError, apiOk, apiUnhandledError } from "@/lib/api-contract";
import { isDemoMutationAllowed } from "@/lib/env-guard";
import { createEventId } from "@/lib/logging";

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const eventId = createEventId("lifecycle_interest_edge_patch");
  if (!isDemoMutationAllowed()) return apiError(403, "MUTATION_DISABLED", "Lifecycle interest-edge editing is disabled.", { eventId });
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const score = Number(body.interestScore);

  try {
    const edge = await db.interestEdge.update({
      where: { id },
      data: {
        interestScore: clamp(Number.isFinite(score) ? score : 0, 0, 1),
        source: String(body.source ?? "").trim().slice(0, 80)
      }
    });
    return apiOk({ edge, eventId });
  } catch (error) {
    return apiUnhandledError(error, eventId);
  }
}
