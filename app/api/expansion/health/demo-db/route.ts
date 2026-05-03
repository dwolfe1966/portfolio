import { db } from "@/lib/db";
import { apiCompatibilityError, apiOk, apiUnhandledError } from "@/lib/api-contract";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { createEventId } from "@/lib/logging";

export async function GET() {
  const eventId = createEventId("health_expansion");
  try {
    const [accounts, offers, policies, runs] = await Promise.all([
      db.expansionAccount.count(),
      db.expansionOffer.count(),
      db.expansionPolicy.count(),
      db.expansionRun.count()
    ]);
    return apiOk({ ready: true, counts: { accounts, offers, policies, runs }, eventId });
  } catch (error) {
    if (isMissingDemoTableError(error)) return apiCompatibilityError("Expansion schema is not initialized.", { eventId, ready: false });
    return apiUnhandledError(error, eventId);
  }
}
