import Link from "next/link";
import { db } from "@/lib/db";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { Section } from "@/components/site/Section";

export const dynamic = "force-dynamic";

export default async function LifecycleAuditPage() {
  try {
    const [runs, messages, fallbackCount] = await Promise.all([
      db.campaignRun.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { _count: { select: { candidates: true } } }
      }),
      db.generatedMessage.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          campaignCandidate: {
            include: {
              campaignRun: true,
              user: true,
              entity: true
            }
          }
        }
      }),
      db.generatedMessage.count({ where: { modelName: "fallback-template" } })
    ]);

    return (
      <>
        <Section eyebrow="Audit" title="Lifecycle Engine audit feed">
          <p>
            Campaign runs, candidate counts, generated messages, and model attribution are recorded here so operators can verify what the system did.
          </p>
          <div className="kpiGrid" style={{ marginTop: 16 }}>
            <div className="card">
              <p className="small">Campaign runs</p>
              <div className="kpi">{runs.length}</div>
            </div>
            <div className="card">
              <p className="small">Generated messages</p>
              <div className="kpi">{messages.length}</div>
            </div>
            <div className="card">
              <p className="small">Template fallbacks</p>
              <div className="kpi">{fallbackCount}</div>
            </div>
          </div>
        </Section>

        <Section title="Generated message audit">
          {messages.length === 0 ? (
            <div className="card">
              <p>No generated lifecycle messages yet. Run a lifecycle simulation to create OpenAI-generated copy.</p>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Run</th>
                  <th>Recipient</th>
                  <th>Entity</th>
                  <th>Model</th>
                  <th>Subject</th>
                </tr>
              </thead>
              <tbody>
                {messages.map((message) => (
                  <tr key={message.id}>
                    <td>{new Date(message.createdAt).toLocaleString()}</td>
                    <td>
                      {message.campaignCandidate.campaignRun ? (
                        <Link href={`/lifecycle/campaigns/${message.campaignCandidate.campaignRun.id}`}>
                          {message.campaignCandidate.campaignRun.runName}
                        </Link>
                      ) : (
                        <span className="small">No run</span>
                      )}
                    </td>
                    <td>{message.campaignCandidate.user.fullName}</td>
                    <td>{message.campaignCandidate.entity.name}</td>
                    <td><code className="small">{message.modelName}</code></td>
                    <td>{message.subjectLine}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        <Section title="Campaign run audit">
          {runs.length === 0 ? (
            <div className="card">
              <p>No campaign runs yet.</p>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Run</th>
                  <th>Deltas</th>
                  <th>Matches</th>
                  <th>Candidates</th>
                  <th>High priority</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id}>
                    <td>{new Date(run.createdAt).toLocaleString()}</td>
                    <td><Link href={`/lifecycle/campaigns/${run.id}`}>{run.runName}</Link></td>
                    <td>{run.totalDeltas}</td>
                    <td>{run.totalMatches}</td>
                    <td>{run._count.candidates}</td>
                    <td>{run.totalHighPriority}</td>
                    <td>${Number(run.estimatedRevenue).toFixed(2)}</td>
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
        <Section title="Lifecycle audit">
          <div className="card">
            <p>Lifecycle campaign tables are missing. Run database migrations and seed the workspace data.</p>
          </div>
        </Section>
      );
    }
    throw error;
  }
}
