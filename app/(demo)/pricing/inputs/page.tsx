import { db } from "@/lib/db";
import { Section } from "@/components/site/Section";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";

export const dynamic = "force-dynamic";

export default async function PricingInputsPage() {
  let experiments: Awaited<ReturnType<typeof db.pricingExperiment.findMany>> = [];
  let variants: Awaited<ReturnType<typeof db.pricingVariant.findMany>> = [];
  try {
    [experiments, variants] = await Promise.all([
      db.pricingExperiment.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
      db.pricingVariant.findMany({ orderBy: { createdAt: "asc" } })
    ]);
  } catch (error) {
    if (!isMissingDemoTableError(error)) throw error;
  }

  return (
    <>
      <Section eyebrow="Inputs" title="Pricing hypotheses, variants, and guardrails">
        <p>Seeded inputs model the pieces a pricing operator needs before exposing any customers to a price or packaging change.</p>
      </Section>
      <Section title="Experiments">
        <div className="grid">
          {experiments.map((experiment) => (
            <div className="card" key={experiment.id}>
              <p className="small">{experiment.state} · owner {experiment.owner}</p>
              <h3>{experiment.name}</h3>
              <p>{experiment.hypothesis}</p>
              <p className="small">Holdout {(experiment.holdoutPercent * 100).toFixed(0)}% · min sample {experiment.minimumSampleSize} · confidence {(experiment.minConfidence * 100).toFixed(0)}%</p>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Variants">
        <div className="grid grid-3">
          {variants.map((variant) => (
            <div className="card" key={variant.id}>
              <h3>{variant.name}</h3>
              <p className="kpi">${(variant.monthlyPriceCents / 100).toFixed(0)}</p>
              <p>{variant.packagingChange}</p>
              <p className="small">Margin impact {(variant.marginImpactPercent * 100).toFixed(1)}% · support delta {variant.expectedSupportLoadDelta.toFixed(2)}</p>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
