import Link from "next/link";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { Section } from "@/components/site/Section";
import { DemoSetupNotice } from "@/components/site/DemoSetupNotice";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { LifecycleFunnelKpiStrip } from "@/components/demo/LifecycleFunnelKpiStrip";
import { LifecycleMessagePreviewTable } from "@/components/demo/LifecycleMessagePreviewTable";

export const dynamic = "force-dynamic";

type OutputRunRow = {
  id: string;
  runName: string;
  totalDeltas: number;
  totalMatches: number;
  totalHighPriority: number;
  estimatedRevenue: number;
  createdAt: Date;
};

async function loadRunsWithLegacyFallback() {
  try {
    return {
      runs: await db.campaignRun.findMany({
        orderBy: { createdAt: "desc" },
        take: 25,
        select: {
          id: true,
          runName: true,
          totalDeltas: true,
          totalMatches: true,
          totalHighPriority: true,
          estimatedRevenue: true,
          createdAt: true
        }
      }),
      usingLegacyFallback: false
    };
  } catch (error) {
    if (!isMissingDemoTableError(error)) throw error;

    const rows = await db.$queryRaw<OutputRunRow[]>(Prisma.sql`
      SELECT id, "runName", "totalDeltas", "totalMatches", "totalHighPriority", "estimatedRevenue", "createdAt"
      FROM "CampaignRun"
      ORDER BY "createdAt" DESC
      LIMIT 25
    `);

    return { runs: rows, usingLegacyFallback: true };
  }
}

type PageProps = {
  searchParams: Promise<{ preset?: string }>;
};

const outputPresets = [
  { id: "all", label: "All runs", href: "/lifecycle/outputs" },
  { id: "high-priority", label: "High-priority runs", href: "/lifecycle/outputs?preset=high-priority" },
  { id: "revenue", label: "Revenue-positive", href: "/lifecycle/outputs?preset=revenue" },
  { id: "recent", label: "Recent 5", href: "/lifecycle/outputs?preset=recent" }
];

function applyRunPreset(runs: OutputRunRow[], preset: string) {
  if (preset === "high-priority") return runs.filter((run) => run.totalHighPriority > 0);
  if (preset === "revenue") return runs.filter((run) => Number(run.estimatedRevenue) > 0);
  if (preset === "recent") return runs.slice(0, 5);
  return runs;
}

function presetEmptyMessage(preset: string) {
  if (preset === "high-priority") return "No runs match this preset yet. Generate a run with high-priority candidates to populate it.";
  if (preset === "revenue") return "No revenue-positive runs match this preset yet. Generate a run with modeled revenue to populate it.";
  if (preset === "recent") return "No recent runs yet. Generate a run from /lifecycle/simulations.";
  return "No campaign runs yet. Generate a run from /lifecycle/simulations.";
}

export default async function DemoOutputsPage({ searchParams }: PageProps) {
  try {
    const query = await searchParams;
    const activePreset = query.preset ?? "all";
    const [
      { runs, usingLegacyFallback },
      events,
      messages,
      activeAssumptions,
      usersCount,
      entitiesCount,
      edgesCount,
      deltasCount,
      candidatesCount,
      generatedCount,
      segmentBreakdown
    ] = await Promise.all([
      loadRunsWithLegacyFallback(),
      db.entityDelta.findMany({ orderBy: { detectedAt: "desc" }, take: 10, include: { entity: true } }),
      db.generatedMessage.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { campaignCandidate: { include: { user: true, entity: true, entityDelta: true } } }
      }),
      db.assumptionSet.findFirst({
        where: { isActive: true },
        select: { openRate: true, clickRate: true, engageRate: true, purchaseRate: true, avgOrderValue: true }
      }),
      db.user.count(),
      db.entity.count(),
      db.interestEdge.count(),
      db.entityDelta.count(),
      db.campaignCandidate.count(),
      db.generatedMessage.count(),
      db.campaignCandidate.groupBy({
        by: ["segmentAtGeneration"],
        _count: { _all: true },
        _avg: { priorityScore: true }
      })
    ]);
    const visibleRuns = applyRunPreset(runs, activePreset);
    const trendRuns = [...visibleRuns].slice(0, 6).reverse();
    const maxTrendRevenue = Math.max(...trendRuns.map((run) => Number(run.estimatedRevenue)), 1);
    const sortedSegmentBreakdown = [...segmentBreakdown].sort((a, b) => b._count._all - a._count._all);

    return (
      <>
          <Section title="Outputs: runs, events, and generated messages">
          <p>This page focuses on resulting artifacts after simulation: campaign runs, event stream, and generated messaging.</p>
          <div style={{ marginTop: 12 }}>
            <LifecycleFunnelKpiStrip
              users={usersCount}
              entities={entitiesCount}
              interestEdges={edgesCount}
              entityChangeEvents={deltasCount}
              candidates={candidatesCount}
              sentMessages={generatedCount}
              assumptions={activeAssumptions}
              actuals={{
                revenue: visibleRuns.reduce((sum, run) => sum + Number(run.estimatedRevenue), 0),
                conversions: activeAssumptions
                  ? Math.round(visibleRuns.reduce((sum, run) => sum + Number(run.estimatedRevenue), 0) / Math.max(activeAssumptions.avgOrderValue, 1))
                  : undefined
              }}
            />
          </div>
        </Section>

        {usingLegacyFallback && (
          <Section title="Compatibility mode">
            <div className="card">
              <p>
                Your database appears to be on an older schema. This page is running in compatibility mode so outputs stay viewable,
                but you should still apply schema updates to unlock full run metadata.
              </p>
              <pre className="code">npm run db:generate{"\n"}npm run db:migrate:deploy{"\n"}npm run db:seed</pre>
            </div>
          </Section>
        )}

        <Section title="Output filter presets">
          <div className="card">
            <p className="small">Use presets to focus the run list and trend chart without changing the underlying data.</p>
            <div className="ctaRow">
              {outputPresets.map((preset) => (
                <Link
                  className={`btn ${activePreset === preset.id ? "primary" : ""}`}
                  href={preset.href}
                  key={preset.id}
                >
                  {preset.label}
                </Link>
              ))}
            </div>
          </div>
        </Section>

        <div id="recent-campaign-runs"><Section title="Recent campaign runs">
          {visibleRuns.length === 0 ? (
            <div className="card"><p>{presetEmptyMessage(activePreset)}</p></div>
          ) : (
            <table className="table">
              <thead><tr><th>Run</th><th>Deltas</th><th>Matches</th><th>High priority</th><th>Revenue</th></tr></thead>
              <tbody>
                {visibleRuns.map((run) => (
                  <tr key={run.id}>
                    <td><Link href={`/lifecycle/campaigns/${run.id}`}>{run.runName}</Link></td>
                    <td>{run.totalDeltas}</td>
                    <td>{run.totalMatches}</td>
                    <td>{run.totalHighPriority}</td>
                    <td>${Number(run.estimatedRevenue).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section></div>
        <Section title="Run-over-run trend">
          {trendRuns.length === 0 ? (
            <div className="card"><p>No trend data yet. Generate multiple runs to compare revenue estimates.</p></div>
          ) : (
            <div className="card">
              <div className="chartColumns">
                {trendRuns.map((run) => {
                  const revenue = Number(run.estimatedRevenue);
                  return (
                    <div className="chartBarWrap" key={run.id}>
                      <div
                        className="chartBar"
                        style={{ height: `${Math.max(8, (revenue / maxTrendRevenue) * 150)}px` }}
                        title={`$${revenue.toFixed(2)}`}
                      />
                      <p className="small" style={{ marginTop: 8 }}>{new Date(run.createdAt).toLocaleDateString()}</p>
                      <p className="small">${revenue.toFixed(0)}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Section>
        <Section title="Segment breakdown">
          {sortedSegmentBreakdown.length === 0 ? (
            <div className="card"><p>No candidate segment data yet. Generate a run to populate this breakdown.</p></div>
          ) : (
            <table className="table">
              <thead><tr><th>Segment</th><th>Candidates</th><th>Average priority score</th></tr></thead>
              <tbody>
                {sortedSegmentBreakdown.map((row) => (
                  <tr key={row.segmentAtGeneration}>
                    <td>{row.segmentAtGeneration}</td>
                    <td>{row._count._all}</td>
                    <td>{Number(row._avg.priorityScore ?? 0).toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>
        <Section title="Recent events">
          <table className="table">
            <thead><tr><th>Entity</th><th>Change type</th><th>Summary</th></tr></thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <td>{event.entity.name}</td>
                  <td>{event.changeType}</td>
                  <td>{event.deltaSummary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
        <div id="recent-generated-messages"><Section title="Recent generated messages">
          <LifecycleMessagePreviewTable
            messages={messages.map((message) => ({
              id: message.id,
              userName: message.campaignCandidate.user.fullName,
              entityName: message.campaignCandidate.entity.name,
              entityType: message.campaignCandidate.entity.entityType,
              changeType: message.campaignCandidate.entityDelta.changeType,
              deltaSummary: message.campaignCandidate.entityDelta.deltaSummary,
              subjectLine: message.subjectLine,
              previewText: message.previewText,
              emailBody: message.emailBody,
              landingHeadline: message.landingHeadline,
              landingBody: message.landingBody,
              ctaText: message.ctaText,
              modelName: message.modelName
            }))}
          />
        </Section></div>
      </>
    );
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      return (
        <DemoSetupNotice
          title="Workspace schema is out of date"
          detail="The database schema is missing required demo tables or columns. Run migrations and seed, then reload this page."
        />
      );
    }
    throw error;
  }
}
