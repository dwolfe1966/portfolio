import { db } from "@/lib/db";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { apiOk, apiUnhandledError } from "@/lib/api-contract";
import { createEventId } from "@/lib/logging";

export async function GET() {
  const eventId = createEventId("price_audit_get");
  try {
    const auditLogs = await db.pricingAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { experiment: true }
    });
    return apiOk({ auditLogs, eventId });
  } catch (error) {
    if (isMissingDemoTableError(error)) return apiOk({ compatibilityMode: true, auditLogs: [], eventId });
    return apiUnhandledError(error, eventId);
  }
}
