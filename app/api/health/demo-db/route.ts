import { db } from "@/lib/db";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { apiError, apiOk } from "@/lib/api-contract";

export async function GET() {
  try {
    const [users, entities, deltas, candidates, messages, runs] = await Promise.all([
      db.user.count(),
      db.entity.count(),
      db.entityDelta.count(),
      db.campaignCandidate.count(),
      db.generatedMessage.count(),
      db.campaignRun.count()
    ]);

    return apiOk({
      ready: true,
      counts: { users, entities, deltas, candidates, messages, runs }
    });
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      return apiError(
        503,
        "P2021",
        "Demo database schema is not initialized.",
        { ready: false, fix: ["npm run db:generate", "npx prisma db push", "npm run db:seed"] }
      );
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    return apiError(500, "UNKNOWN", message, { ready: false });
  }
}
