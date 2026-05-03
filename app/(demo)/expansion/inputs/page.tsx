import { db } from "@/lib/db";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { Section } from "@/components/site/Section";
import { ExpansionOfferEditor } from "@/components/expansion/ExpansionOfferEditor";
import { ExpansionPolicyEditor } from "@/components/expansion/ExpansionPolicyEditor";

export const dynamic = "force-dynamic";

function pct(value: number) {
  return `${Math.round(value * 100)}%`;
}

export default async function ExpansionInputsPage() {
  let offers: Awaited<ReturnType<typeof db.expansionOffer.findMany>> = [];
  let policy: Awaited<ReturnType<typeof db.expansionPolicy.findFirst>> = null;
  try {
    [offers, policy] = await Promise.all([
      db.expansionOffer.findMany({ orderBy: { motion: "asc" } }),
      db.expansionPolicy.findFirst({ orderBy: { createdAt: "desc" } })
    ]);
  } catch (error) {
    if (!isMissingDemoTableError(error)) throw error;
  }

  return (
    <>
      <Section eyebrow="Inputs" title="Expansion policy and offer library">
        <p>Inputs define what counts as expansion-ready and which monetization motion should be offered by signal pattern.</p>
      </Section>
      <Section title="Policy">
        {policy ? (
          <>
            <div className="grid grid-4">
              <div className="card"><p className="small">High readiness</p><div className="kpi">{pct(policy.highReadinessThreshold)}</div></div>
              <div className="card"><p className="small">Medium readiness</p><div className="kpi">{pct(policy.mediumReadinessThreshold)}</div></div>
              <div className="card"><p className="small">Min margin</p><div className="kpi">{pct(policy.minMarginPercent)}</div></div>
              <div className="card"><p className="small">Min payback</p><div className="kpi">{policy.minPaybackRatio.toFixed(1)}x</div></div>
            </div>
            <div style={{ marginTop: 14 }}>
              <ExpansionPolicyEditor policy={policy} />
            </div>
          </>
        ) : (
          <div className="card"><p>No expansion policy found. Reset demo data from Overview.</p></div>
        )}
      </Section>
      <Section title="Offers">
        <div className="grid grid-2">
          {offers.map((offer) => <ExpansionOfferEditor offer={offer} key={offer.id} />)}
        </div>
      </Section>
    </>
  );
}
