import Link from "next/link";
import { db } from "@/lib/db";
import { Section } from "@/components/site/Section";
import { DemoWorkspaceNav } from "@/components/demo/DemoWorkspaceNav";
import { DemoSetupNotice } from "@/components/site/DemoSetupNotice";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";

export const dynamic = "force-dynamic";

export default async function DemoOutputsPage() {
  try {
    const [runs, events, messages] = await Promise.all([
      db.campaignRun.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
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
          detail="The database schema is missing newer campaign run columns (for example assumptionSetId). Run db push/migrations and seed, then reload this page."
        />
      );
    }
    throw error;
  }
}
