import { db } from "@/lib/db";
import { Section } from "@/components/site/Section";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function CampaignRunPage({ params }: PageProps) {
  const { id } = await params;

  const run = await db.campaignRun.findUnique({ where: { id } });

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
    </>
  );
}
