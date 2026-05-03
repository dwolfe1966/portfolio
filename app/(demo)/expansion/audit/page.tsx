import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { Section } from "@/components/site/Section";

export const dynamic = "force-dynamic";

export default async function ExpansionAuditPage() {
  let auditLogs: Prisma.ExpansionAuditLogGetPayload<{ include: { run: true } }>[] = [];
  try {
    auditLogs = await db.expansionAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { run: true }
    });
  } catch (error) {
    if (!isMissingDemoTableError(error)) throw error;
  }

  return (
    <>
      <Section eyebrow="Audit" title="Expansion command center audit feed">
        <p>Every expansion model run writes an audit event with actor, action, detail, and metadata.</p>
      </Section>
      <Section title="Recent events">
        {auditLogs.length ? (
          <div className="grid grid-2">
            {auditLogs.map((log) => (
              <div className="card" key={log.id}>
                <p className="eyebrow">{log.action} · {log.actor}</p>
                <h3>{log.run?.recommendation ?? "System event"}</h3>
                <p>{log.detail}</p>
                <p className="small">{log.createdAt.toLocaleString()}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="card"><p>No expansion audit events yet.</p></div>
        )}
      </Section>
    </>
  );
}
