import { db } from "@/lib/db";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { apiOk, apiUnhandledError } from "@/lib/api-contract";
import { createEventId } from "@/lib/logging";

export async function GET() {
  const eventId = createEventId("price_segments_get");
  try {
    const segments = await db.pricingSegment.findMany({ orderBy: { createdAt: "asc" } });
    return apiOk({ segments, eventId });
  } catch (error) {
    if (isMissingDemoTableError(error)) return apiOk({ compatibilityMode: true, segments: [], eventId });
    return apiUnhandledError(error, eventId);
  }
}
