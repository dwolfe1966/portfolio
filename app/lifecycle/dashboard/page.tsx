import Link from "next/link";
import { db } from "@/lib/db";
import { Section } from "@/components/site/Section";
import { DemoSetupNotice } from "@/components/site/DemoSetupNotice";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { RunGeneratorCard } from "@/components/demo/RunGeneratorCard";
import { ScenarioLabCard } from "@/components/demo/ScenarioLabCard";
import { DemoHowItWorks } from "@/components/demo/DemoHowItWorks";
import { KpiTrendBars } from "@/components/demo/KpiTrendBars";
import { DataFlowMap } from "@/components/demo/DataFlowMap";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  try {
    const [deltas, candidates, generated, runs, users, entities, edges, events, messages] = await Promise.all([
      db.entityDelta.count(),
      db.campaignCandidate.count(),
      db.generatedMessage.count(),
      db.campaignRun.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
      db.user.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
      db.entity.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
      db.interestEdge.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { user: true, entity: true }
      }),
      db.entityDelta.findMany({
        orderBy: { detectedAt: "desc" },
        take: 8,
        include: { entity: true }
      }),
      db.generatedMessage.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        include: {
          campaignCandidate: {
            include: { user: true, entity: true, entityDelta: true }
          }
        }
      })
    ]);

    return (
      <>
          <DemoHowItWorks />
        <Section eyebrow="Demo" title="Lifecycle Revenue Engine Dashboard">
          <div className="grid grid-3">
            <div className="card"><div className="kpi">{deltas}</div><p>Deltas detected</p></div>
            <div className="card"><div className="kpi">{candidates}</div><p>Campaign candidates</p></div>
            <div className="card"><div className="kpi">{generated}</div><p>Generated messages</p></div>
          </div>
        </Section>
        <Section title="Funnel visual">
          <KpiTrendBars deltas={deltas} candidates={candidates} generated={generated} />
        </Section>
        <Section title="Data flow visualization">
          <DataFlowMap
            users={users.length}
            entities={entities.length}
            edges={edges.length}
            events={events.length}
            candidates={candidates}
            messages={generated}
          />
        </Section>
        <Section title="Recent campaign runs">
          {runs.length === 0 ? (
            <div className="card">
              <h3>No campaign runs yet</h3>
              <p>Use the generator below to create your first run and populate this table.</p>
            </div>
          ) : (
            <table className="table">
              <thead><tr><th>Run</th><th>Deltas</th><th>Matches</th><th>High priority</th><th>Revenue</th></tr></thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id}>
                    <td><Link href={`/lifecycle/campaigns/${run.id}`}>{run.runName}</Link></td>
                    <td>{run.totalDeltas}</td>
                    <td>{run.totalMatches}</td>
                    <td>{run.totalHighPriority}</td>
                    <td>${run.estimatedRevenue.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>
        <Section title="Run and test scenarios">
          <div className="grid grid-2">
            <RunGeneratorCard />
            <ScenarioLabCard />
          </div>
        </Section>
        <Section title="Recent users">
          <table className="table">
            <thead><tr><th>User</th><th>Segment</th><th>Status</th><th>Created</th></tr></thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td><Link href={`/lifecycle/users/${user.id}`}>{user.fullName}</Link></td>
                  <td>{user.segment}</td>
                  <td>{user.subscriptionStatus}</td>
                  <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
        <Section title="Recent entities of interest">
          <table className="table">
            <thead><tr><th>Entity</th><th>Type</th><th>Location</th><th>Created</th></tr></thead>
            <tbody>
              {entities.map((entity) => (
                <tr key={entity.id}>
                  <td>{entity.name}</td>
                  <td>{entity.entityType}</td>
                  <td>{[entity.city, entity.state].filter(Boolean).join(", ") || "—"}</td>
                  <td>{new Date(entity.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
        <Section title="Recent user ↔ entity relationships">
          <table className="table">
            <thead><tr><th>User</th><th>Entity</th><th>Score</th><th>Source</th></tr></thead>
            <tbody>
              {edges.map((edge) => (
                <tr key={edge.id}>
                  <td>{edge.user.fullName}</td>
                  <td>{edge.entity.name}</td>
                  <td>{edge.interestScore.toFixed(2)}</td>
                  <td>{edge.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
        <Section title="Recent events (entity deltas)">
          <table className="table">
            <thead><tr><th>Entity</th><th>Change type</th><th>Summary</th><th>Detected</th></tr></thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <td>{event.entity.name}</td>
                  <td>{event.changeType}</td>
                  <td>{event.deltaSummary}</td>
                  <td>{new Date(event.detectedAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
        <Section title="Recent generated messages">
          <table className="table">
            <thead><tr><th>User</th><th>Entity</th><th>Subject</th><th>Model</th></tr></thead>
            <tbody>
              {messages.map((message) => (
                <tr key={message.id}>
                  <td>{message.campaignCandidate.user.fullName}</td>
                  <td>{message.campaignCandidate.entity.name}</td>
                  <td>{message.subjectLine}</td>
                  <td>{message.modelName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      </>
    );
  } catch (error) {
    if (isMissingDemoTableError(error)) return <DemoSetupNotice />;
    throw error;
  }
}
