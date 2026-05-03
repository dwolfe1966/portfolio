import Link from "next/link";
import { db } from "@/lib/db";
import { Section } from "@/components/site/Section";
import { ResetDemoDataCard } from "@/components/site/ResetDemoDataCard";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { DemoSystemGraph } from "@/components/demo-shell/DemoSystemGraph";

export const dynamic = "force-dynamic";

export default async function PricingOverviewPage() {
  let counts = { segments: 0, variants: 0, experiments: 0, runs: 0, decisions: 0 };
  let tableMissing = false;
  try {
    const [segments, variants, experiments, runs, decisions] = await Promise.all([
      db.pricingSegment.count(),
      db.pricingVariant.count(),
      db.pricingExperiment.count(),
      db.pricingExperimentRun.count(),
      db.pricingDecision.count()
    ]);
    counts = { segments, variants, experiments, runs, decisions };
  } catch (error) {
    if (isMissingDemoTableError(error)) tableMissing = true;
    else throw error;
  }

  return (
    <>
      <Section eyebrow="Pricing Control Tower" title="Segmented pricing experiments with explicit risk guardrails">
        <p>
          A pricing operating system for hypotheses, cohorts, exposure integrity, margin/churn guardrails,
          simulation runs, and promotion or rollback decisions.
        </p>
        <div className="ctaRow">
          <Link className="btn primary" href="/pricing/simulations">Run simulation</Link>
          <Link className="btn" href="/pricing/decisions">Review decisions</Link>
        </div>
      </Section>

      <Section title="Operating loop">
        <DemoSystemGraph title="Pricing decision loop" nodes={["Hypothesis", "Cohorts", "Guardrails", "Decision"]} />
      </Section>

      <Section title="Readiness">
        {tableMissing ? (
          <div className="card">
            <p>Pricing tables are missing. Run database migrations.</p>
            <pre className="code">npm run db:generate{"\n"}npm run db:migrate:deploy{"\n"}npm run db:seed</pre>
          </div>
        ) : (
          <div className="grid grid-4">
            <div className="card"><p className="small">Segments</p><div className="kpi">{counts.segments}</div></div>
            <div className="card"><p className="small">Variants</p><div className="kpi">{counts.variants}</div></div>
            <div className="card"><p className="small">Experiments</p><div className="kpi">{counts.experiments}</div></div>
            <div className="card"><p className="small">Runs</p><div className="kpi">{counts.runs}</div></div>
          </div>
        )}
      </Section>

      <Section title="Demo data operations">
        <ResetDemoDataCard appLabel="Pricing" scope="pricing" />
      </Section>
    </>
  );
}
