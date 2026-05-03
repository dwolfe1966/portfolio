import { db } from "@/lib/db";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { apiOk, apiUnhandledError } from "@/lib/api-contract";
import { createEventId } from "@/lib/logging";

export async function GET() {
  const eventId = createEventId("price_exp_get");
  try {
    const experiments = await db.pricingExperiment.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        segments: { include: { segment: true } },
        variants: { include: { variant: true } },
        runs: { orderBy: { createdAt: "desc" }, take: 1 },
        decisions: { orderBy: { createdAt: "desc" }, take: 1 }
      }
    });
    return apiOk({ experiments, eventId });
  } catch (error) {
    if (isMissingDemoTableError(error)) return apiOk({ compatibilityMode: true, experiments: [], eventId });
    return apiUnhandledError(error, eventId);
  }
}
