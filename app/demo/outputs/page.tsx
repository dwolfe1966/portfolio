import Link from "next/link";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { Section } from "@/components/site/Section";
import { DemoWorkspaceNav } from "@/components/demo/DemoWorkspaceNav";
import { DemoSetupNotice } from "@/components/site/DemoSetupNotice";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";

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
        take: 10,
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
      LIMIT 10
    `);

    return { runs: rows, usingLegacyFallback: true };
  }
}

export default async function DemoOutputsPage() {
  try {
    const [{ runs, usingLegacyFallback }, events, messages] = await Promise.all([
      loadRunsWithLegacyFallback(),
      db.entityDelta.findMany({ orderBy: { detectedAt: "desc" }, take: 10, include: { entity: true } }),
      db.generatedMessage.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { campaignCandidate: { include: { user: true, entity: true } } }
      })
    ]);

    return (
      <>
        <DemoWorkspaceNav />
        <Section title="Outputs: runs, events, and generated messages">
          <p>This page focuses on resulting artifacts after simulation: campaign runs, event stream, and generated messaging.</p>
          <div className="grid grid-3" style={{ marginTop: 14 }}>
            <div className="card"><div className="kpi">{runs.length}</div><p>Recent runs shown</p></div>
            <div className="card"><div className="kpi">{events.length}</div><p>Recent deltas shown</p></div>
            <div className="card"><div className="kpi">{messages.length}</div><p>Recent messages shown</p></div>
          </div>
        </Section>

        {usingLegacyFallback && (
          <Section title="Compatibility mode">
            <div className="card">
              <p>
                Your database appears to be on an older schema. This page is running in compatibility mode so outputs stay viewable,
                but you should still apply schema updates to unlock full run metadata.
              </p>
              <pre className="code">npm run db:generate{"\n"}npx prisma db push{"\n"}npm run db:seed</pre>
            </div>
          </Section>
        )}

        <Section title="Recent campaign runs">
          {runs.length === 0 ? (
            <div className="card"><p>No campaign runs yet. Generate a run from /demo/simulations.</p></div>
          ) : (
            <table className="table">
              <thead><tr><th>Run</th><th>Deltas</th><th>Matches</th><th>High priority</th><th>Revenue</th></tr></thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id}>
                    <td><Link href={`/demo/campaigns/${run.id}`}>{run.runName}</Link></td>
                    <td>{run.totalDeltas}</td>
                    <td>{run.totalMatches}</td>
                    <td>{run.totalHighPriority}</td>
                    <td>${Number(run.estimatedRevenue).toFixed(2)}</td>
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
    if (isMissingDemoTableError(error)) {
      return (
        <DemoSetupNotice
          title="Demo schema is out of date"
          detail="The database schema is missing required demo tables or columns. Run db push/migrations and seed, then reload this page."
        />
      );
    }
    throw error;
  }
}
