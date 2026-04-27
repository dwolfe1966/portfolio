import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { DEMO_ASSUMPTION_DEFAULTS, normalizeDemoAssumptions } from "@/lib/demo-assumptions";
import { apiError, apiOk } from "@/lib/api-contract";
import { createEventId, logApiEvent } from "@/lib/logging";

function toAssumptionPayload(set: {
  defaultTopN: number;
  recencyScore: number;
  minPriorityScore: number;
  highPriorityThreshold: number;
  revenuePerHighPriority: number;
  openRate: number;
  clickRate: number;
  engageRate: number;
  purchaseRate: number;
  avgOrderValue: number;
}) {
  return {
    defaultTopN: set.defaultTopN,
    recencyScore: set.recencyScore,
    minPriorityScore: set.minPriorityScore,
    highPriorityThreshold: set.highPriorityThreshold,
    revenuePerHighPriority: set.revenuePerHighPriority,
    openRate: set.openRate,
    clickRate: set.clickRate,
    engageRate: set.engageRate,
    purchaseRate: set.purchaseRate,
    avgOrderValue: set.avgOrderValue
  };
}

export async function GET() {
  const eventId = createEventId("assume_get");
  const assumptionSets = await db.assumptionSet.findMany({ orderBy: { createdAt: "desc" } });
  const activeSet = assumptionSets.find((set) => set.isActive) ?? null;

  logApiEvent("info", eventId, "assumptions.get.completed", { count: assumptionSets.length, activeId: activeSet?.id ?? null });

  return apiOk({
    defaults: DEMO_ASSUMPTION_DEFAULTS,
    activeSet,
    activeAssumptions: activeSet ? toAssumptionPayload(activeSet) : DEMO_ASSUMPTION_DEFAULTS,
    assumptionSets,
    eventId
  });
}

export async function POST(req: NextRequest) {
  const eventId = createEventId("assume_post");
  const body = await req.json().catch(() => ({}));

  if (body.activateId) {
    const activateId = String(body.activateId);
    const exists = await db.assumptionSet.findUnique({ where: { id: activateId } });
    if (!exists) {
      logApiEvent("warn", eventId, "assumptions.activate.not_found", { activateId });
      return apiError(404, "ASSUMPTION_SET_NOT_FOUND", "Assumption set not found", { eventId });
    }

    await db.$transaction([
      db.assumptionSet.updateMany({ data: { isActive: false } }),
      db.assumptionSet.update({ where: { id: activateId }, data: { isActive: true } })
    ]);

    logApiEvent("info", eventId, "assumptions.activate.completed", { activateId });
    return apiOk({ activatedId: activateId, eventId });
  }

  const assumptions = normalizeDemoAssumptions(body.assumptions);
  const name = String(body.name ?? `Assumptions ${new Date().toISOString().slice(0, 10)}`);
  const makeActive = Boolean(body.makeActive ?? true);

  if (makeActive) {
    await db.assumptionSet.updateMany({ data: { isActive: false } });
  }

  const created = await db.assumptionSet.create({
    data: {
      name,
      isActive: makeActive,
      ...assumptions
    }
  });

  logApiEvent("info", eventId, "assumptions.create.completed", { id: created.id, makeActive });
  return apiOk({ assumptionSet: created, eventId });
}
