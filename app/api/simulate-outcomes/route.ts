import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiError, apiOk } from "@/lib/api-contract";
import { isDemoMutationAllowed } from "@/lib/env-guard";
import { createEventId, logApiEvent } from "@/lib/logging";

function toRate(input: unknown, fallback: number) {
  const n = Number(input);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(1, n));
}

export async function POST(req: NextRequest) {
  const eventId = createEventId("sim_out");

  if (!isDemoMutationAllowed()) {
    logApiEvent("warn", eventId, "simulate_outcomes.disabled");
    return apiError(
      403,
      "MUTATION_DISABLED",
      "Outcome simulation is disabled in this environment. Set DEMO_MUTATIONS_ENABLED=true to enable.",
      { eventId }
    );
  }

  const body = await req.json().catch(() => ({}));
  const openRate = toRate(body.openRate, 0.3);
  const clickRate = toRate(body.clickRate, 0.08);
  const engageRate = toRate(body.engageRate, 0.04);
  const purchaseRate = toRate(body.purchaseRate, 0.012);
  const avgOrderValue = Number(body.avgOrderValue ?? 89);

  const messages = await db.generatedMessage.findMany({
    orderBy: { createdAt: "desc" },
    take: Number(body.sampleSize ?? 500)
  });

  const delivered = messages.length;
  const opens = Math.round(delivered * openRate);
  const clicks = Math.round(opens * clickRate);
  const engagements = Math.round(clicks * engageRate);
  const purchases = Math.round(engagements * purchaseRate);
  const revenue = Number((purchases * avgOrderValue).toFixed(2));

  logApiEvent("info", eventId, "simulate_outcomes.completed", { delivered, purchases, revenue });

  return apiOk({
    assumptions: { openRate, clickRate, engageRate, purchaseRate, avgOrderValue },
    counts: { delivered, opens, clicks, engagements, purchases },
    revenue,
    eventId
  });
}
