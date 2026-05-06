import { db } from "@/lib/db";
import { ACCOUNT_SESSION_COOKIE, verifyAccountSessionToken } from "@/lib/account-session";
import { apiCompatibilityError, apiError, apiOk, apiUnhandledError } from "@/lib/api-contract";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { createEventId, logApiEvent } from "@/lib/logging";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const eventId = createEventId("run_get");
  const { id } = await params;
  const cookieHeader = request.headers.get("cookie") ?? "";
  const token = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${ACCOUNT_SESSION_COOKIE}=`))
    ?.slice(ACCOUNT_SESSION_COOKIE.length + 1);
  const accountUserId = verifyAccountSessionToken(token ? decodeURIComponent(token) : undefined)?.userId ?? null;

  try {
    const run = await db.campaignRun.findFirst({
      where: {
        id,
        OR: accountUserId
          ? [{ accountUserId }, { accountUserId: null }]
          : [{ accountUserId: null }]
      },
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
