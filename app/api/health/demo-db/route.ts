import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";

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

    return NextResponse.json({
      ok: true,
      ready: true,
      counts: { users, entities, deltas, candidates, messages, runs }
    });
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      return NextResponse.json(
        {
          ok: false,
          ready: false,
          code: "P2021",
          message: "Demo database schema is not initialized.",
          fix: ["npm run db:generate", "npx prisma db push", "npm run db:seed"]
        },
        { status: 503 }
      );
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        ok: false,
        ready: false,
        code: "UNKNOWN",
        message
      },
      { status: 500 }
    );
  }
}
