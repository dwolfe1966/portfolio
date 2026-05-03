import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { Section } from "@/components/site/Section";
import { PricingDecisionForm } from "@/components/pricing/PricingDecisionForm";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";

export const dynamic = "force-dynamic";

export default async function PricingDecisionsPage() {
  let experiment: Prisma.PricingExperimentGetPayload<{ include: { runs: true } }> | null = null;
  let decisions: Prisma.PricingDecisionGetPayload<{ include: { experiment: true } }>[] = [];
  try {
    experiment = await db.pricingExperiment.findFirst({ orderBy: { createdAt: "desc" }, include: { runs: { orderBy: { createdAt: "desc" }, take: 1 } } });
    decisions = await db.pricingDecision.findMany({ orderBy: { createdAt: "desc" }, take: 20, include: { experiment: true } });
  } catch (error) {
    if (!isMissingDemoTableError(error)) throw error;
  }

  return (
    <>
      <Section eyebrow="Decisions" title="Promote, extend, pause, or roll back">
        <p>Pricing decisions are explicit operator actions with rationale and audit history.</p>
      </Section>
      <Section title="Decision queue">
        {experiment ? <PricingDecisionForm experimentId={experiment.id} /> : <div className="card"><p>No experiment found.</p></div>}
      </Section>
      <Section title="Decision history">
        <div className="grid">
          {decisions.map((decision) => (
            <div className="card" key={decision.id}>
              <p className="small">{decision.experiment.name} · {decision.actor}</p>
              <h3>{decision.decision}</h3>
              <p>{decision.rationale}</p>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
