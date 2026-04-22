import Link from "next/link";
import { db } from "@/lib/db";
import { Section } from "@/components/site/Section";
import { DemoSetupNotice } from "@/components/site/DemoSetupNotice";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { RunGeneratorCard } from "@/components/demo/RunGeneratorCard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  try {
    const [deltas, candidates, generated, runs] = await Promise.all([
      db.entityDelta.count(),
      db.campaignCandidate.count(),
      db.generatedMessage.count(),
      db.campaignRun.findMany({ orderBy: { createdAt: "desc" }, take: 5 })
    ]);

    return (
      <>
        <Section eyebrow="Demo" title="Lifecycle Revenue Engine Dashboard">
          <div className="grid grid-3">
            <div className="card"><div className="kpi">{deltas}</div><p>Deltas detected</p></div>
            <div className="card"><div className="kpi">{candidates}</div><p>Campaign candidates</p></div>
            <div className="card"><div className="kpi">{generated}</div><p>Generated messages</p></div>
          </div>
        </Section>
        <Section title="Recent campaign runs">
          <table className="table">
            <thead><tr><th>Run</th><th>Deltas</th><th>Matches</th><th>High priority</th><th>Revenue</th></tr></thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id}>
                  <td><Link href={`/demo/campaigns/${run.id}`}>{run.runName}</Link></td>
                  <td>{run.totalDeltas}</td>
                  <td>{run.totalMatches}</td>
                  <td>{run.totalHighPriority}</td>
                  <td>${run.estimatedRevenue.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
        <Section title="Run a new generation flow">
          <RunGeneratorCard />
        </Section>
      </>
    );
  } catch (error) {
    if (isMissingDemoTableError(error)) return <DemoSetupNotice />;
    throw error;
  }
}
