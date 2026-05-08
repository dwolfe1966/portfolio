import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { DeltaChangeType } from "@prisma/client";
import { ACCOUNT_SESSION_COOKIE, verifyAccountSessionToken } from "@/lib/account-session";
import { apiCompatibilityError, apiError, apiOk, apiUnhandledError } from "@/lib/api-contract";
import { DEMO_ASSUMPTION_DEFAULTS, normalizeDemoAssumptions } from "@/lib/demo-assumptions";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { isDemoMutationAllowed } from "@/lib/env-guard";
import { persistLifecycleTriggerQueue, type LifecycleTriggerQueueEvent } from "@/lib/lifecycle-event-trigger-queue";
import { createEventId, logApiEvent } from "@/lib/logging";
import { getDefaultWorkspace } from "@/lib/workspace";

const types = Object.values(DeltaChangeType);
function pick<T>(arr: T[]) { return arr[Math.floor(Math.random() * arr.length)]; }

function accountUserIdFromRequest(req: NextRequest) {
  return verifyAccountSessionToken(req.cookies.get(ACCOUNT_SESSION_COOKIE)?.value)?.userId ?? null;
}

export async function POST(req: NextRequest) {
  const eventId = createEventId("sim_delta");

  if (!isDemoMutationAllowed()) {
    logApiEvent("warn", eventId, "simulate_deltas.disabled");
    return apiError(
      403,
      "MUTATION_DISABLED",
      "Delta simulation is disabled in this environment. Set DEMO_MUTATIONS_ENABLED=true to enable.",
      { eventId }
    );
  }

  const body = await req.json().catch(() => ({}));
  const accountUserId = accountUserIdFromRequest(req);
  const count = Number(body.count ?? 10);
  const agentFanout = Math.max(1, Math.min(10, Math.round(Number(body.agentFanout ?? 3))));
  try {
    const workspace = await getDefaultWorkspace();
    const selectedSet = await db.assumptionSet.findFirst({ where: { isActive: true } });
    const assumptions = normalizeDemoAssumptions(selectedSet ?? DEMO_ASSUMPTION_DEFAULTS);
    const entities = await db.entity.findMany({ take: 50 });
    if (!entities.length) {
      logApiEvent("warn", eventId, "simulate_deltas.no_entities");
      return apiError(400, "NO_ENTITIES", "No entities found. Seed demo data before simulating deltas.", { eventId });
    }

    let created = 0;
    const triggerEvents: LifecycleTriggerQueueEvent[] = [];
    for (let i = 0; i < count; i++) {
      const entity = pick(entities);
      const changeType = pick(types);
      const delta = await db.entityDelta.create({ data: {
        entityId: entity.id,
        changeType,
        oldValue: "Old value",
        newValue: "New value",
        deltaSummary: `${entity.name} has a new ${changeType.toLowerCase().replaceAll("_"," ")}.`,
        detectedAt: new Date()
      }});
      created++;
      triggerEvents.push({
        id: delta.id,
        entityId: entity.id,
        entityName: entity.name,
        changeType,
        detectedAt: delta.detectedAt
      });
    }
    const queueResult = await persistLifecycleTriggerQueue({
      workspaceId: workspace.id,
      accountUserId,
      events: triggerEvents,
      minPriorityScore: assumptions.minPriorityScore,
      recencyScore: assumptions.recencyScore,
      agentFanout
    });
    logApiEvent("info", eventId, "simulate_deltas.completed", { created, ...queueResult });
    return apiOk({ created, ...queueResult, eventId });
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      logApiEvent("warn", eventId, "simulate_deltas.compatibility_mode");
      return apiCompatibilityError("Lifecycle database schema is not initialized.", { eventId });
    }

    logApiEvent("error", eventId, "simulate_deltas.unhandled_error");
    return apiUnhandledError(error, eventId);
  }
}
