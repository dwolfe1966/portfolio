import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Section } from "@/components/site/Section";
import { PricingSimulationButton } from "@/components/pricing/PricingSimulationButton";

export const dynamic = "force-dynamic";

export default async function PricingExperimentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const experiment = await db.pricingExperiment.findUnique({
    where: { id },
    include: {
      segments: { include: { segment: true } },
      variants: { include: { variant: true } },
      runs: { orderBy: { createdAt: "desc" }, include: { segmentResults: { include: { segment: true, variant: true } } } },
      decisions: { orderBy: { createdAt: "desc" } }
    }
  });
  if (!experiment) notFound();

  return (
    <>
      <Section eyebrow="Experiment detail" title={experiment.name}>
        <p>{experiment.hypothesis}</p>
        <p className="small">{experiment.state} · owner {experiment.owner} · holdout {(experiment.holdoutPercent * 100).toFixed(0)}%</p>
        <PricingSimulationButton experimentId={experiment.id} />
      </Section>
      <Section title="Segments and variants">
        <div className="grid grid-2">
          <div className="card">
            <h3>Segments</h3>
            {experiment.segments.map(({ segment }) => <p key={segment.id}>{segment.name}</p>)}
          </div>
          <div className="card">
            <h3>Variants</h3>
            {experiment.variants.map(({ variant, role }) => <p key={variant.id}>{role}: {variant.name}</p>)}
          </div>
        </div>
      </Section>
    </>
  );
}
