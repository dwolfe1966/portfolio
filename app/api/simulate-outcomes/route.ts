import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiCompatibilityError, apiError, apiOk, apiUnhandledError } from "@/lib/api-contract";
import { DEMO_ASSUMPTION_DEFAULTS } from "@/lib/demo-assumptions";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
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
  const openRate = toRate(body.openRate, DEMO_ASSUMPTION_DEFAULTS.openRate);
  const clickRate = toRate(body.clickRate, DEMO_ASSUMPTION_DEFAULTS.clickRate);
  const engageRate = toRate(body.engageRate, DEMO_ASSUMPTION_DEFAULTS.engageRate);
  const purchaseRate = toRate(body.purchaseRate, DEMO_ASSUMPTION_DEFAULTS.purchaseRate);
  const avgOrderValue = Number(body.avgOrderValue ?? DEMO_ASSUMPTION_DEFAULTS.avgOrderValue);

  try {
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
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      logApiEvent("warn", eventId, "simulate_outcomes.compatibility_mode");
      return apiCompatibilityError("Lifecycle generated message tables are missing.", { eventId });
    }

    logApiEvent("error", eventId, "simulate_outcomes.unhandled_error");
    return apiUnhandledError(error, eventId);
  }
}
