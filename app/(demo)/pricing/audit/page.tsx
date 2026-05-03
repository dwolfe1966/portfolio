import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { Section } from "@/components/site/Section";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";

export const dynamic = "force-dynamic";

export default async function PricingAuditPage() {
  let auditLogs: Prisma.PricingAuditLogGetPayload<{ include: { experiment: true } }>[] = [];
  try {
    auditLogs = await db.pricingAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { experiment: true }
    });
  } catch (error) {
    if (!isMissingDemoTableError(error)) throw error;
  }

  return (
    <>
      <Section eyebrow="Audit" title="Pricing control tower audit feed">
        <p>Simulation runs, guardrail events, and operator decisions are recorded as auditable operating history.</p>
      </Section>
      <Section title="Recent events">
        <div className="grid">
          {auditLogs.map((log) => (
            <div className="card" key={log.id}>
              <p className="small">{log.createdAt.toLocaleString()} · {log.actor}</p>
              <h3>{log.action}</h3>
              <p>{log.detail}</p>
              {log.experiment ? <p className="small">{log.experiment.name}</p> : null}
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
