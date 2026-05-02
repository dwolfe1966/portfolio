import Link from "next/link";
import { db } from "@/lib/db";
import { Section } from "@/components/site/Section";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";

export const dynamic = "force-dynamic";

export default async function AuctionAuditPage() {
  try {
    const logs = await db.auctionAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { run: { select: { id: true, totalAuctions: true } } }
    });

    return (
      <>
        <Section eyebrow="Audit" title="Auction Desk audit feed">
          <p>
            Every auction run emits an audit entry recording inputs, outputs, and KPI rollups.
            Future operator overrides will append additional entries here.
          </p>
        </Section>
        <Section title={`${logs.length} entries`}>
          {logs.length === 0 ? (
            <div className="card">
              <p>No audit entries yet — trigger a run to generate the first.</p>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Run</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td>{new Date(log.createdAt).toLocaleString()}</td>
                    <td>
                      {log.run ? (
                        <Link href={`/auction/runs/${log.run.id}`}>
                          <code className="small">{log.run.id.slice(0, 8)}…</code>
                        </Link>
                      ) : (
                        <span className="small">—</span>
                      )}
                    </td>
                    <td>{log.actor}</td>
                    <td><code className="small">{log.action}</code></td>
                    <td><code className="small">{JSON.stringify(log.metadata ?? {})}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>
      </>
    );
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      return (
        <Section title="Auction audit">
          <div className="card">
            <p>Auction tables are missing. Run database migrations.</p>
          </div>
        </Section>
      );
    }
    throw error;
  }
}
