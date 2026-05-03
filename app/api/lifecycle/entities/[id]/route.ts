import { db } from "@/lib/db";
import { apiError, apiOk, apiUnhandledError } from "@/lib/api-contract";
import { isDemoMutationAllowed } from "@/lib/env-guard";
import { createEventId } from "@/lib/logging";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const eventId = createEventId("lifecycle_entity_patch");
  if (!isDemoMutationAllowed()) return apiError(403, "MUTATION_DISABLED", "Lifecycle entity editing is disabled.", { eventId });
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  try {
    const entity = await db.entity.update({
      where: { id },
      data: {
        name: String(body.name ?? "").trim().slice(0, 120),
        entityType: String(body.entityType ?? "").trim().slice(0, 60),
        city: String(body.city ?? "").trim().slice(0, 80) || null,
        state: String(body.state ?? "").trim().slice(0, 30) || null
      }
    });
    return apiOk({ entity, eventId });
  } catch (error) {
    return apiUnhandledError(error, eventId);
  }
}
