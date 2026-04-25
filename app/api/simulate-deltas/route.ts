import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { DeltaChangeType } from "@prisma/client";
import { apiError, apiOk } from "@/lib/api-contract";
import { isDemoMutationAllowed } from "@/lib/env-guard";

const types = Object.values(DeltaChangeType);
function pick<T>(arr: T[]) { return arr[Math.floor(Math.random() * arr.length)]; }

export async function POST(req: NextRequest) {
  if (!isDemoMutationAllowed()) {
    return apiError(
      403,
      "MUTATION_DISABLED",
      "Delta simulation is disabled in this environment. Set DEMO_MUTATIONS_ENABLED=true to enable."
    );
  }

  const body = await req.json().catch(() => ({}));
  const count = Number(body.count ?? 10);
  const entities = await db.entity.findMany({ take: 50 });
  if (!entities.length) {
    return apiError(400, "NO_ENTITIES", "No entities found. Seed demo data before simulating deltas.");
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
  return apiOk({ created });
}
