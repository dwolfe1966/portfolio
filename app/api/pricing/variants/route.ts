import { db } from "@/lib/db";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { apiOk, apiUnhandledError } from "@/lib/api-contract";
import { createEventId } from "@/lib/logging";

export async function GET() {
  const eventId = createEventId("price_variants_get");
  try {
    const variants = await db.pricingVariant.findMany({ orderBy: { createdAt: "asc" } });
    return apiOk({ variants, eventId });
  } catch (error) {
    if (isMissingDemoTableError(error)) return apiOk({ compatibilityMode: true, variants: [], eventId });
    return apiUnhandledError(error, eventId);
  }
}
