import { UserSegment, SubscriptionStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { apiError, apiOk, apiUnhandledError } from "@/lib/api-contract";
import { isDemoMutationAllowed } from "@/lib/env-guard";
import { createEventId } from "@/lib/logging";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const eventId = createEventId("lifecycle_user_patch");
  if (!isDemoMutationAllowed()) return apiError(403, "MUTATION_DISABLED", "Lifecycle user editing is disabled.", { eventId });
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const segment = Object.values(UserSegment).includes(body.segment) ? body.segment : UserSegment.FREE;
  const subscriptionStatus = Object.values(SubscriptionStatus).includes(body.subscriptionStatus)
    ? body.subscriptionStatus
    : SubscriptionStatus.NONE;

  try {
    const user = await db.user.update({
      where: { id },
      data: {
        fullName: String(body.fullName ?? "").trim().slice(0, 120),
        email: String(body.email ?? "").trim().slice(0, 180),
        segment,
        subscriptionStatus
      }
    });
    return apiOk({ user, eventId });
  } catch (error) {
    return apiUnhandledError(error, eventId);
  }
}
