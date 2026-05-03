import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { Section } from "@/components/site/Section";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";

export const dynamic = "force-dynamic";

export default async function RetentionAuditPage() {
  let auditLogs: Prisma.RetentionAuditLogGetPayload<{
    include: { run: true; intervention: { include: { account: true } } }
  }>[] = [];
  try {
    auditLogs = await db.retentionAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { run: true, intervention: { include: { account: true } } }
    });
  } catch (error) {
    if (!isMissingDemoTableError(error)) throw error;
  }

  return (
    <>
      <Section eyebrow="Audit" title="Retention command center audit feed">
        <p>Every risk run and queued intervention writes an audit entry with actor, action, detail, and metadata.</p>
      </Section>
      <Section title="Recent events">
        {auditLogs.length ? (
          <div className="grid grid-2">
            {auditLogs.map((log) => (
              <div className="card" key={log.id}>
                <p className="eyebrow">{log.action} · {log.actor}</p>
                <h3>{log.intervention?.account.name ?? log.run?.recommendation ?? "System event"}</h3>
                <p>{log.detail}</p>
                <p className="small">{log.createdAt.toLocaleString()}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="card"><p>No retention audit events yet.</p></div>
        )}
      </Section>
    </>
  );
}
