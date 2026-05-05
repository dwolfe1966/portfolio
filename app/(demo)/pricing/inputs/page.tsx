import { db } from "@/lib/db";
import { Section } from "@/components/site/Section";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { PricingExperimentBuilder } from "@/components/pricing/PricingExperimentBuilder";
import { PricingVariantEditor } from "@/components/pricing/PricingVariantEditor";
import { PricingWorkspaceDatasetPanel } from "@/components/pricing/PricingWorkspaceDatasetPanel";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function PricingInputsPage() {
  let experiments: Prisma.PricingExperimentGetPayload<{
    include: { segments: true; variants: true };
  }>[] = [];
  let variants: Awaited<ReturnType<typeof db.pricingVariant.findMany>> = [];
  let segments: Awaited<ReturnType<typeof db.pricingSegment.findMany>> = [];
  try {
    [experiments, variants, segments] = await Promise.all([
      db.pricingExperiment.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { segments: true, variants: true }
      }),
      db.pricingVariant.findMany({ orderBy: { createdAt: "asc" } }),
      db.pricingSegment.findMany({ orderBy: { name: "asc" } })
    ]);
  } catch (error) {
    if (!isMissingDemoTableError(error)) throw error;
  }

  return (
    <>
      <Section eyebrow="Inputs" title="Pricing hypotheses, variants, and guardrails">
        <p>Seeded inputs model the pieces a pricing operator needs before exposing any customers to a price or packaging change.</p>
      </Section>
      <Section title="Input data mode">
        <PricingWorkspaceDatasetPanel compact />
      </Section>
      <Section title="Experiments">
        <div className="grid grid-2">
          <PricingExperimentBuilder segments={segments} variants={variants} />
          {experiments.map((experiment) => (
            <PricingExperimentBuilder
              key={experiment.id}
              experiment={experiment}
              segments={segments}
              variants={variants}
            />
          ))}
        </div>
      </Section>
      <Section title="Variants">
        <div className="grid grid-3">
          {variants.map((variant) => (
            <PricingVariantEditor key={variant.id} variant={variant} />
          ))}
        </div>
      </Section>
    </>
  );
}
