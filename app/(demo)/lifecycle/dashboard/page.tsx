import Link from "next/link";
import { cookies } from "next/headers";
import { ACCOUNT_SESSION_COOKIE, verifyAccountSessionToken } from "@/lib/account-session";
import { db } from "@/lib/db";
import { Section } from "@/components/site/Section";
import { DemoSetupNotice } from "@/components/site/DemoSetupNotice";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { RunGeneratorCard } from "@/components/demo/RunGeneratorCard";
import { ScenarioLabCard } from "@/components/demo/ScenarioLabCard";
import { DemoHowItWorks } from "@/components/demo/DemoHowItWorks";
import { KpiTrendBars } from "@/components/demo/KpiTrendBars";
import { DataFlowMap } from "@/components/demo/DataFlowMap";
import { LifecycleFunnelKpiStrip } from "@/components/demo/LifecycleFunnelKpiStrip";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  try {
    const cookieStore = await cookies();
    const session = verifyAccountSessionToken(cookieStore.get(ACCOUNT_SESSION_COOKIE)?.value);
    const ownedOrLegacy = {
      OR: session
        ? [{ accountUserId: session.userId }, { accountUserId: null }]
        : [{ accountUserId: null }]
    };
    const [
      deltas,
      candidates,
      generated,
      runs,
      users,
      entities,
      edges,
      events,
      messages,
      usersCount,
      entitiesCount,
      edgesCount,
      activeAssumptions
    ] = await Promise.all([
      db.entityDelta.count(),
      db.campaignCandidate.count({ where: { campaignRun: ownedOrLegacy } }),
      db.generatedMessage.count({ where: { campaignCandidate: { campaignRun: ownedOrLegacy } } }),
      db.campaignRun.findMany({ where: ownedOrLegacy, orderBy: { createdAt: "desc" }, take: 5 }),
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
        where: { campaignCandidate: { campaignRun: ownedOrLegacy } },
        orderBy: { createdAt: "desc" },
        take: 8,
        include: {
          campaignCandidate: {
            include: { user: true, entity: true, entityDelta: true }
          }
        }
      }),
      db.user.count(),
      db.entity.count(),
      db.interestEdge.count(),
      db.assumptionSet.findFirst({
        where: { isActive: true },
        select: { openRate: true, clickRate: true, engageRate: true, purchaseRate: true, avgOrderValue: true }
      })
    ]);

    return (
      <>
          <DemoHowItWorks />
        <Section eyebrow="Tools" title="Lifecycle Revenue Engine Dashboard">
          <LifecycleFunnelKpiStrip
            users={usersCount}
            entities={entitiesCount}
            interestEdges={edgesCount}
            entityChangeEvents={deltas}
            candidates={candidates}
            sentMessages={generated}
            assumptions={activeAssumptions}
            actuals={{
              revenue: runs.reduce((sum, run) => sum + Number(run.estimatedRevenue), 0),
              conversions: activeAssumptions
                ? Math.round(runs.reduce((sum, run) => sum + Number(run.estimatedRevenue), 0) / Math.max(activeAssumptions.avgOrderValue, 1))
                : undefined
            }}
          />
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
            <div className="tableScroll">
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
            </div>
          )}
        </Section>
        <Section title="Run and test scenarios">
          <div className="grid grid-2">
            <RunGeneratorCard />
            <ScenarioLabCard />
          </div>
        </Section>
        <div id="recent-users"><Section title="Recent users">
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
        </Section></div>
        <div id="recent-entities"><Section title="Recent entities of interest">
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
        </Section></div>
        <div id="recent-interest-edges"><Section title="Recent user ↔ entity relationships">
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
        </Section></div>
        <div id="recent-events"><Section title="Recent events (entity deltas)">
          <div className="tableScroll">
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
          </div>
        </Section></div>
        <div id="recent-generated-messages"><Section title="Recent generated messages">
          <div className="tableScroll">
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
          </div>
        </Section></div>
      </>
    );
  } catch (error) {
    if (isMissingDemoTableError(error)) return <DemoSetupNotice />;
    throw error;
  }
}
