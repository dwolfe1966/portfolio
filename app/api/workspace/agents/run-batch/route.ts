import { NextRequest } from "next/server";
import { ACCOUNT_SESSION_COOKIE, verifyAccountSessionToken } from "@/lib/account-session";
import { apiCompatibilityError, apiError, apiOk, apiUnhandledError } from "@/lib/api-contract";
import { runAgentWorkerBatch } from "@/lib/agent-worker";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { createEventId, logApiEvent } from "@/lib/logging";
import { getDefaultWorkspace } from "@/lib/workspace";

function bearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? null;
}

function configuredWorkerSecret() {
  return process.env.AGENT_WORKER_SECRET?.trim() || process.env.CRON_SECRET?.trim() || null;
}

function readWorkerActor(request: NextRequest) {
  const accountUserId = verifyAccountSessionToken(request.cookies.get(ACCOUNT_SESSION_COOKIE)?.value)?.userId ?? null;
  if (accountUserId) return { ok: true as const, workerId: `workspace:${accountUserId}`, actor: "workspace_session" };

  const secret = configuredWorkerSecret();
  const token = bearerToken(request);
  if (secret && token && token === secret) {
    return { ok: true as const, workerId: "scheduler:agent-worker", actor: "scheduler_secret" };
  }

  return { ok: false as const };
}

function readQueueNames(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  return value.map((item) => String(item ?? "").trim()).filter(Boolean).slice(0, 25);
}

function readMaxJobs(value: unknown, fallback = 10) {
  return Math.max(1, Math.min(50, Math.round(Number(value ?? fallback))));
}

async function runBatch(request: NextRequest, input: { queueNames?: string[]; maxJobs?: number }) {
  const eventId = createEventId("agent_run_batch");
  const actor = readWorkerActor(request);
  if (!actor.ok) {
    return apiError(401, "UNAUTHORIZED", "Sign in or provide the configured agent worker bearer token.", { eventId });
  }

  try {
    const workspace = await getDefaultWorkspace();
    const result = await runAgentWorkerBatch({
      workspaceId: workspace.id,
      workerId: actor.workerId,
      queueNames: input.queueNames,
      maxJobs: input.maxJobs
    });

    const skippedQueueCount = result.skippedQueueNames.length;
    logApiEvent(skippedQueueCount > 0 ? "warn" : "info", eventId, "agent.run_batch.completed", {
      actor: actor.actor,
      requestedQueueCount: input.queueNames?.length ?? result.queueNames.length,
      queueCount: result.queueNames.length,
      skippedQueueCount,
      skippedQueueNames: result.skippedQueueNames,
      attempted: result.attempted,
      claimed: result.claimed,
      completed: result.completed,
      failed: result.failed,
      deadLettered: result.deadLettered
    });
    return apiOk({ eventId, result });
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      logApiEvent("warn", eventId, "agent.run_batch.compatibility_mode");
      return apiCompatibilityError("Agent queue tables are missing or unavailable.", { eventId });
    }

    logApiEvent("error", eventId, "agent.run_batch.unhandled_error");
    return apiUnhandledError(error, eventId);
  }
}

export async function GET(request: NextRequest) {
  return runBatch(request, {
    maxJobs: readMaxJobs(request.nextUrl.searchParams.get("maxJobs"), 10)
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const queueNames = readQueueNames(body.queueNames);

  return runBatch(request, {
    queueNames,
    maxJobs: readMaxJobs(body.maxJobs, queueNames?.length ?? 10)
  });
}
