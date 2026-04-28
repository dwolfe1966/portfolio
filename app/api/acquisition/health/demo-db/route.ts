import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";

export async function GET() {
  try {
    const [campaigns, cells, budgetActivities, auditLogs] = await Promise.all([
      db.acquisitionCampaign.count(),
      db.testCell.count(),
      db.budgetActivity.count(),
      db.acquisitionAuditLog.count()
    ]);

    return NextResponse.json({
      ok: true,
      ready: true,
      counts: { campaigns, cells, budgetActivities, auditLogs }
    });
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      return NextResponse.json(
        {
          ok: false,
          ready: false,
          code: "ACQ_SCHEMA_MISSING",
          message: "Acquisition schema is not initialized.",
          fix: ["npm run db:generate", "npx prisma db push", "npm run db:seed"]
        },
        { status: 503 }
      );
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, ready: false, code: "UNKNOWN", message }, { status: 500 });
  }
}
