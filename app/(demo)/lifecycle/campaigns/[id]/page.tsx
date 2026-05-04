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
      include: {
        assumptionSet: true,
        candidates: {
          take: 10,
          orderBy: { priorityScore: "desc" },
          include: {
            user: true,
            entity: true,
            entityDelta: true,
            generatedMessage: true
          }
        }
      }
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
        <Section eyebrow="Tools" title={run.runName}>
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
              <thead><tr><th>Candidate</th><th>User</th><th>Entity</th><th>Score</th><th>Segment</th><th>Message</th></tr></thead>
              <tbody>
                {run.candidates.map((candidate) => (
                  <tr key={candidate.id}>
                    <td><Link href={`/lifecycle/candidates/${candidate.id}`}>{candidate.id}</Link></td>
                    <td>{candidate.user.fullName}</td>
                    <td>{candidate.entity.name}</td>
                    <td>{candidate.priorityScore.toFixed(3)}</td>
                    <td>{candidate.segmentAtGeneration}</td>
                    <td>{candidate.generatedMessage ? candidate.generatedMessage.subjectLine : "Not generated"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>
        <Section title="Operator audit panel">
          {run.candidates.length === 0 ? (
            <div className="card"><p>No candidate chain is available for this run.</p></div>
          ) : (
            <div className="grid">
              {run.candidates.map((candidate) => (
                <div className="card" key={candidate.id}>
                  <div className="grid grid-3">
                    <div>
                      <p className="small">Run</p>
                      <h3>{run.runName}</h3>
                      <p className="small">Created {new Date(run.createdAt).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="small">Candidate</p>
                      <h3>{candidate.user.fullName}</h3>
                      <p className="small">{candidate.segmentAtGeneration} segment · score {candidate.priorityScore.toFixed(3)}</p>
                    </div>
                    <div>
                      <p className="small">Generated message</p>
                      <h3>{candidate.generatedMessage ? "Ready" : "Pending"}</h3>
                      <p className="small">{candidate.generatedMessage?.modelName ?? "No message asset yet"}</p>
                    </div>
                  </div>
                  <div className="grid grid-2" style={{ marginTop: 14 }}>
                    <div>
                      <h3>Signal chain</h3>
                      <p>
                        {candidate.entity.name} triggered a {candidate.entityDelta.changeType.toLowerCase().replaceAll("_", " ")} event:
                        {" "}{candidate.entityDelta.deltaSummary}
                      </p>
                      <p className="small">
                        Linked candidate: <Link href={`/lifecycle/candidates/${candidate.id}`}>{candidate.id}</Link>
                      </p>
                    </div>
                    <div>
                      <h3>Score components</h3>
                      <div className="scoreStack" aria-label="Score component breakdown">
                        <span className="stack interest" style={{ width: `${Math.max(2, candidate.interestContribution * 100)}%` }} />
                        <span className="stack recency" style={{ width: `${Math.max(2, candidate.recencyContribution * 100)}%` }} />
                        <span className="stack segment" style={{ width: `${Math.max(2, candidate.segmentContribution * 100)}%` }} />
                        <span className="stack change" style={{ width: `${Math.max(2, candidate.changeTypeContribution * 100)}%` }} />
                      </div>
                      <p className="small" style={{ marginTop: 8 }}>
                        Interest {candidate.interestContribution.toFixed(3)} · Recency {candidate.recencyContribution.toFixed(3)} ·
                        Segment {candidate.segmentContribution.toFixed(3)} · Change {candidate.changeTypeContribution.toFixed(3)}
                      </p>
                    </div>
                  </div>
                  {candidate.generatedMessage ? (
                    <div style={{ marginTop: 14 }}>
                      <h3>Message asset</h3>
                      <p><strong>Subject:</strong> {candidate.generatedMessage.subjectLine}</p>
                      <p><strong>Preview:</strong> {candidate.generatedMessage.previewText}</p>
                      <p className="small"><strong>Landing:</strong> {candidate.generatedMessage.landingHeadline}</p>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </Section>
      </>
    );
  } catch (error) {
    if (isMissingDemoTableError(error)) return <DemoSetupNotice />;
    throw error;
  }
}
