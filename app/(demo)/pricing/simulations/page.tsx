import { db } from "@/lib/db";
import { Section } from "@/components/site/Section";
import { PricingSimulationButton } from "@/components/pricing/PricingSimulationButton";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";

export const dynamic = "force-dynamic";

export default async function PricingSimulationsPage() {
  let experiment = null as Awaited<ReturnType<typeof db.pricingExperiment.findFirst>>;
  try {
    experiment = await db.pricingExperiment.findFirst({ orderBy: { createdAt: "desc" } });
  } catch (error) {
    if (!isMissingDemoTableError(error)) throw error;
  }

  return (
    <>
      <Section eyebrow="Simulations" title="Run pricing experiment scenarios">
        <p>Run the latest seeded experiment through the pricing engine with default scenario assumptions.</p>
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
          </>
        ) : (
          <div className="card"><p>No pricing experiment found. Reset demo data from Overview.</p></div>
        )}
      </Section>
    </>
  );
}
