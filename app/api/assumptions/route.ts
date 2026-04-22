import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { DEMO_ASSUMPTION_DEFAULTS, normalizeDemoAssumptions } from "@/lib/demo-assumptions";

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
  const assumptionSets = await db.assumptionSet.findMany({ orderBy: { createdAt: "desc" } });
  const activeSet = assumptionSets.find((set) => set.isActive) ?? null;

  return NextResponse.json({
    ok: true,
    defaults: DEMO_ASSUMPTION_DEFAULTS,
    activeSet,
    activeAssumptions: activeSet ? toAssumptionPayload(activeSet) : DEMO_ASSUMPTION_DEFAULTS,
    assumptionSets
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  if (body.activateId) {
    const activateId = String(body.activateId);
    const exists = await db.assumptionSet.findUnique({ where: { id: activateId } });
    if (!exists) {
      return NextResponse.json({ ok: false, error: "Assumption set not found" }, { status: 404 });
    }

    await db.$transaction([
      db.assumptionSet.updateMany({ data: { isActive: false } }),
      db.assumptionSet.update({ where: { id: activateId }, data: { isActive: true } })
    ]);

    return NextResponse.json({ ok: true, activatedId: activateId });
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

  return NextResponse.json({ ok: true, assumptionSet: created });
}
