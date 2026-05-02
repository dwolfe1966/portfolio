import { db } from "@/lib/db";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { apiCompatibilityError, apiOk, apiUnhandledError } from "@/lib/api-contract";
import { createEventId, logApiEvent } from "@/lib/logging";

export async function GET() {
  const eventId = createEventId("health_acq");

  try {
    const [campaigns, cells, budgetActivities, auditLogs] = await Promise.all([
      db.acquisitionCampaign.count(),
      db.testCell.count(),
      db.budgetActivity.count(),
      db.acquisitionAuditLog.count()
    ]);

    logApiEvent("info", eventId, "health.acquisition.ready", { campaigns, cells, budgetActivities, auditLogs });

    return apiOk({
      ready: true,
      counts: { campaigns, cells, budgetActivities, auditLogs },
      eventId
    });
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      logApiEvent("warn", eventId, "health.acquisition.compatibility_mode");
      return apiCompatibilityError("Acquisition schema is not initialized.", { eventId, ready: false });
    }

    logApiEvent("error", eventId, "health.acquisition.unhandled_error");
    return apiUnhandledError(error, eventId);
  }
}
