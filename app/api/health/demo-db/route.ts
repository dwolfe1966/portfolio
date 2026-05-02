import { db } from "@/lib/db";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { apiCompatibilityError, apiOk, apiUnhandledError } from "@/lib/api-contract";
import { createEventId, logApiEvent } from "@/lib/logging";

export async function GET() {
  const eventId = createEventId("health_lifecycle");

  try {
    const [users, entities, deltas, candidates, messages, runs] = await Promise.all([
      db.user.count(),
      db.entity.count(),
      db.entityDelta.count(),
      db.campaignCandidate.count(),
      db.generatedMessage.count(),
      db.campaignRun.count()
    ]);

    logApiEvent("info", eventId, "health.lifecycle.ready", { users, entities, deltas, candidates, messages, runs });

    return apiOk({
      ready: true,
      counts: { users, entities, deltas, candidates, messages, runs },
      eventId
    });
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      logApiEvent("warn", eventId, "health.lifecycle.compatibility_mode");
      return apiCompatibilityError("Lifecycle database schema is not initialized.", { eventId, ready: false });
    }

    logApiEvent("error", eventId, "health.lifecycle.unhandled_error");
    return apiUnhandledError(error, eventId);
  }
}
