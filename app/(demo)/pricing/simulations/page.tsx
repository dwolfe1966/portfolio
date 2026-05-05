import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { Section } from "@/components/site/Section";
import { PricingSimulationButton } from "@/components/pricing/PricingSimulationButton";
import { PricingSimulationVisuals } from "@/components/pricing/PricingSimulationVisuals";
import { PricingWorkspaceDatasetPanel } from "@/components/pricing/PricingWorkspaceDatasetPanel";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { DemoAppMotionVisual } from "@/components/demo-shell/DemoAppMotionVisual";

export const dynamic = "force-dynamic";

function money(cents: number) {
  return `$${Math.round(cents / 100).toLocaleString()}`;
}

export default async function PricingSimulationsPage() {
  let experiment = null as Awaited<ReturnType<typeof db.pricingExperiment.findFirst>>;
  let latestRun: Prisma.PricingExperimentRunGetPayload<{
    include: { segmentResults: { include: { segment: true; variant: true } } };
  }> | null = null;
  try {
    experiment = await db.pricingExperiment.findFirst({ orderBy: { createdAt: "desc" } });
    if (experiment) {
      latestRun = await db.pricingExperimentRun.findFirst({
        where: { experimentId: experiment.id },
        orderBy: { createdAt: "desc" },
        include: {
          segmentResults: {
            include: { segment: true, variant: true },
            orderBy: { netRevenueLiftCents: "desc" }
          }
        }
      });
    }
  } catch (error) {
    if (!isMissingDemoTableError(error)) throw error;
  }

  return (
    <>
      <Section eyebrow="Simulations" title="Run pricing experiment scenarios">
        <p>Run the latest seeded experiment through the pricing engine with default scenario assumptions.</p>
        <div className="grid grid-3" style={{ marginTop: 14 }}>
          <div className="card">
            <h3>Inputs consumed</h3>
            <p>Experiment guardrails, eligible segments, control/treatment variants, pricing, margin, churn, and support assumptions.</p>
            <Link className="btn" href="/pricing/inputs">Review inputs</Link>
          </div>
          <div className="card">
            <h3>Simulation logic</h3>
            <p>Models conversion response, churn pressure, support load, holdout health, confidence, and net revenue lift.</p>
          </div>
          <div className="card">
            <h3>Outputs generated</h3>
            <p>Segment results, guardrail bands, revenue lift, confidence, and promote/extend/pause/rollback recommendation.</p>
            <Link className="btn" href="/pricing/outputs">Open outputs</Link>
          </div>
        </div>
      </Section>
      <Section title="Cohort motion">
        <DemoAppMotionVisual app="pricing" />
      </Section>
      <Section title="Run data">
        <PricingWorkspaceDatasetPanel compact />
      </Section>
      <Section title="Simulation control">
        {experiment ? (
          <>
            <div className="card">
            <h3>{experiment.name}</h3>
            <p>{experiment.hypothesis}</p>
            <p className="small">Adjust scenario assumptions, then run. Results persist to Outputs and Audit.</p>
            </div>
            <PricingSimulationButton experimentId={experiment.id} />
            {latestRun ? (
              <div className="grid grid-4" style={{ marginTop: 14 }}>
                <div className="card"><p className="small">Latest recommendation</p><div className="kpi">{latestRun.recommendation}</div></div>
                <div className="card"><p className="small">Revenue lift</p><div className="kpi">{money(latestRun.netRevenueLiftCents)}</div></div>
                <div className="card"><p className="small">Confidence</p><div className="kpi">{(latestRun.confidence * 100).toFixed(0)}%</div></div>
                <div className="card"><p className="small">Holdout</p><div className="kpi">{latestRun.holdoutHealth}</div></div>
              </div>
            ) : null}
            {latestRun?.segmentResults.length ? (
              <div style={{ marginTop: 14 }}>
                <PricingSimulationVisuals run={latestRun} />
              </div>
            ) : null}
          </>
        ) : (
          <div className="card"><p>No pricing experiment found. Reset workspace data from Overview.</p></div>
        )}
      </Section>
    </>
  );
}
