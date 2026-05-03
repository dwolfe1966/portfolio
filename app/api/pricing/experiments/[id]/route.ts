import { db } from "@/lib/db";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { apiOk, apiUnhandledError } from "@/lib/api-contract";
import { createEventId } from "@/lib/logging";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const eventId = createEventId("price_exp_detail");
  const { id } = await params;
  try {
    const experiment = await db.pricingExperiment.findUnique({
      where: { id },
      include: {
        segments: { include: { segment: true } },
        variants: { include: { variant: true } },
        runs: { orderBy: { createdAt: "desc" }, include: { segmentResults: { include: { segment: true, variant: true } } } },
        decisions: { orderBy: { createdAt: "desc" } },
        auditLogs: { orderBy: { createdAt: "desc" }, take: 30 }
      }
    });
    return apiOk({ experiment, eventId });
  } catch (error) {
    if (isMissingDemoTableError(error)) return apiOk({ compatibilityMode: true, experiment: null, eventId });
    return apiUnhandledError(error, eventId);
  }
}
