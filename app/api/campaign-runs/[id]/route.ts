import { db } from "@/lib/db";
import { apiCompatibilityError, apiError, apiOk, apiUnhandledError } from "@/lib/api-contract";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { createEventId, logApiEvent } from "@/lib/logging";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const eventId = createEventId("run_get");
  const { id } = await params;

  try {
    const run = await db.campaignRun.findUnique({
      where: { id },
      include: { assumptionSet: true }
    });

    if (!run) {
      logApiEvent("warn", eventId, "campaign_run.not_found", { id });
      return apiError(404, "CAMPAIGN_RUN_NOT_FOUND", "Campaign run not found.", { eventId });
    }

    logApiEvent("info", eventId, "campaign_run.get.completed", { id });
    return apiOk({ run, eventId });
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      logApiEvent("warn", eventId, "campaign_run.compatibility_mode", { id });
      return apiCompatibilityError("Lifecycle campaign tables are missing.", { eventId });
    }

    logApiEvent("error", eventId, "campaign_run.unhandled_error", { id });
    return apiUnhandledError(error, eventId);
  }
}
