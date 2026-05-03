import { db } from "@/lib/db";
import { apiCompatibilityError, apiOk, apiUnhandledError } from "@/lib/api-contract";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { createEventId } from "@/lib/logging";

export async function GET() {
  const eventId = createEventId("health_retention");
  try {
    const [accounts, playbooks, policies, runs, interventions] = await Promise.all([
      db.retentionAccount.count(),
      db.retentionPlaybook.count(),
      db.retentionPolicy.count(),
      db.retentionRiskRun.count(),
      db.retentionIntervention.count()
    ]);
    return apiOk({ ready: true, counts: { accounts, playbooks, policies, runs, interventions }, eventId });
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      return apiCompatibilityError("Retention schema is not initialized.", { eventId, ready: false });
    }
    return apiUnhandledError(error, eventId);
  }
}
