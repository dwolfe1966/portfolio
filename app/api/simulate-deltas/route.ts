import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { DeltaChangeType } from "@prisma/client";
import { apiCompatibilityError, apiError, apiOk, apiUnhandledError } from "@/lib/api-contract";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { isDemoMutationAllowed } from "@/lib/env-guard";
import { createEventId, logApiEvent } from "@/lib/logging";

const types = Object.values(DeltaChangeType);
function pick<T>(arr: T[]) { return arr[Math.floor(Math.random() * arr.length)]; }

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
  const count = Number(body.count ?? 10);
  try {
    const entities = await db.entity.findMany({ take: 50 });
    if (!entities.length) {
      logApiEvent("warn", eventId, "simulate_deltas.no_entities");
      return apiError(400, "NO_ENTITIES", "No entities found. Seed demo data before simulating deltas.", { eventId });
    }

    let created = 0;
    for (let i = 0; i < count; i++) {
      const entity = pick(entities);
      const changeType = pick(types);
      await db.entityDelta.create({ data: {
        entityId: entity.id,
        changeType,
        oldValue: "Old value",
        newValue: "New value",
        deltaSummary: `${entity.name} has a new ${changeType.toLowerCase().replaceAll("_"," ")}.`,
        detectedAt: new Date()
      }});
      created++;
    }
    logApiEvent("info", eventId, "simulate_deltas.completed", { created });
    return apiOk({ created, eventId });
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      logApiEvent("warn", eventId, "simulate_deltas.compatibility_mode");
      return apiCompatibilityError("Lifecycle database schema is not initialized.", { eventId });
    }

    logApiEvent("error", eventId, "simulate_deltas.unhandled_error");
    return apiUnhandledError(error, eventId);
  }
}
