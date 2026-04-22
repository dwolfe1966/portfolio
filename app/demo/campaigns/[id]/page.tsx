import { db } from "@/lib/db";
import { Section } from "@/components/site/Section";
import { DemoSetupNotice } from "@/components/site/DemoSetupNotice";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import Link from "next/link";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function CampaignRunPage({ params }: PageProps) {
  const { id } = await params;

  try {
    const run = await db.campaignRun.findUnique({
      where: { id },
      include: { assumptionSet: true, candidates: { take: 5, orderBy: { priorityScore: "desc" } } }
    });

    if (!run) {
      return (
        <Section title="Campaign run not found">
          <p>No run found for this id.</p>
        </Section>
      );
    }

    return (
      <>
        <Section eyebrow="Demo" title={run.runName}>
          <div className="grid grid-2">
            <div className="card">
              <div className="kpi">{run.totalDeltas}</div>
              <p>Total deltas</p>
            </div>
            <div className="card">
              <div className="kpi">{run.totalMatches}</div>
              <p>Total matches</p>
            </div>
            <div className="card">
              <div className="kpi">{run.totalHighPriority}</div>
              <p>High-priority opportunities</p>
            </div>
            <div className="card">
              <div className="kpi">${run.estimatedRevenue.toFixed(2)}</div>
              <p>Estimated revenue</p>
            </div>
          </div>
        </Section>
        <Section title="Modeled funnel">
          <p>Open rate: {(run.estimatedOpenRate * 100).toFixed(1)}%</p>
          <p>CTR: {(run.estimatedCtr * 100).toFixed(1)}%</p>
          <p>Conversion: {(run.estimatedConversionRate * 100).toFixed(1)}%</p>
        </Section>
        <Section title="Active assumption set at run time">
          <p>Assumption set: {run.assumptionSet?.name ?? "No named set (inline/default assumptions)"}</p>
          <pre className="code">{JSON.stringify(run.assumptionsSnapshot, null, 2)}</pre>
        </Section>
        <Section title="Top candidates in this run">
          {run.candidates.length === 0 ? (
            <p>No candidates were attached to this run.</p>
          ) : (
            <table className="table">
              <thead><tr><th>Candidate</th><th>Score</th><th>Segment</th></tr></thead>
              <tbody>
                {run.candidates.map((candidate) => (
                  <tr key={candidate.id}>
                    <td><Link href={`/demo/candidates/${candidate.id}`}>{candidate.id}</Link></td>
                    <td>{candidate.priorityScore.toFixed(3)}</td>
                    <td>{candidate.segmentAtGeneration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>
      </>
    );
  } catch (error) {
    if (isMissingDemoTableError(error)) return <DemoSetupNotice />;
    throw error;
  }
}
