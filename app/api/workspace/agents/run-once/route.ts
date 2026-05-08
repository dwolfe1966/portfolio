import { NextRequest } from "next/server";
import { ACCOUNT_SESSION_COOKIE, verifyAccountSessionToken } from "@/lib/account-session";
import { apiCompatibilityError, apiError, apiOk, apiUnhandledError } from "@/lib/api-contract";
import { runAgentWorkerOnce } from "@/lib/agent-worker";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { createEventId, logApiEvent } from "@/lib/logging";
import { getDefaultWorkspace } from "@/lib/workspace";

export async function POST(req: NextRequest) {
  const eventId = createEventId("agent_run_once");
  const accountUserId = verifyAccountSessionToken(req.cookies.get(ACCOUNT_SESSION_COOKIE)?.value)?.userId ?? null;
  if (!accountUserId) return apiError(401, "UNAUTHORIZED", "Sign in to run an agent worker.", { eventId });

  const body = await req.json().catch(() => ({}));
  const queueName = String(body.queueName ?? "lifecycle:generation").trim().slice(0, 120) || "lifecycle:generation";

  try {
    const workspace = await getDefaultWorkspace();
    const result = await runAgentWorkerOnce({
      workspaceId: workspace.id,
      queueName,
      workerId: `workspace:${accountUserId}`
    });

    logApiEvent("info", eventId, "agent.run_once.completed", { queueName, claimed: result.claimed });
    return apiOk({ eventId, result });
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      logApiEvent("warn", eventId, "agent.run_once.compatibility_mode");
      return apiCompatibilityError("Agent queue tables are missing or unavailable.", { eventId });
    }

    logApiEvent("error", eventId, "agent.run_once.unhandled_error");
    return apiUnhandledError(error, eventId);
  }
}
