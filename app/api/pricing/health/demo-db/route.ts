import { db } from "@/lib/db";
import { apiCompatibilityError, apiOk, apiUnhandledError } from "@/lib/api-contract";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { createEventId } from "@/lib/logging";

export async function GET() {
  const eventId = createEventId("health_pricing");
  try {
    const [segments, variants, experiments, runs, decisions] = await Promise.all([
      db.pricingSegment.count(),
      db.pricingVariant.count(),
      db.pricingExperiment.count(),
      db.pricingExperimentRun.count(),
      db.pricingDecision.count()
    ]);
    return apiOk({ ready: true, counts: { segments, variants, experiments, runs, decisions }, eventId });
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      return apiCompatibilityError("Pricing schema is not initialized.", { eventId, ready: false });
    }
    return apiUnhandledError(error, eventId);
  }
}
