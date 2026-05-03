import { db } from "@/lib/db";
import { Section } from "@/components/site/Section";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";

export const dynamic = "force-dynamic";

function pct(value: number) {
  return `${Math.round(value * 100)}%`;
}

export default async function RetentionInputsPage() {
  let playbooks: Awaited<ReturnType<typeof db.retentionPlaybook.findMany>> = [];
  let policy: Awaited<ReturnType<typeof db.retentionPolicy.findFirst>> = null;
  try {
    [playbooks, policy] = await Promise.all([
      db.retentionPlaybook.findMany({ orderBy: { riskDriver: "asc" } }),
      db.retentionPolicy.findFirst({ orderBy: { createdAt: "desc" } })
    ]);
  } catch (error) {
    if (!isMissingDemoTableError(error)) throw error;
  }

  return (
    <>
      <Section eyebrow="Inputs" title="Risk policy and intervention playbooks">
        <p>Inputs define how the operator classifies risk, controls discount exposure, and selects save motions by risk driver.</p>
      </Section>

      <Section title="Policy">
        {policy ? (
          <div className="grid grid-4">
            <div className="card"><p className="small">High risk threshold</p><div className="kpi">{pct(policy.highRiskThreshold)}</div></div>
            <div className="card"><p className="small">Medium risk threshold</p><div className="kpi">{pct(policy.mediumRiskThreshold)}</div></div>
            <div className="card"><p className="small">Max discount</p><div className="kpi">{pct(policy.maxDiscountPct)}</div></div>
            <div className="card"><p className="small">Min payback</p><div className="kpi">{policy.minPaybackRatio.toFixed(1)}x</div></div>
          </div>
        ) : (
          <div className="card"><p>No retention policy found. Reset demo data from Overview.</p></div>
        )}
      </Section>

      <Section title="Playbooks">
        <div className="grid grid-3">
          {playbooks.map((playbook) => (
            <div className="card" key={playbook.id}>
              <p className="eyebrow">{playbook.riskDriver}</p>
              <h3>{playbook.name}</h3>
              <p className="small">Save-rate lift: {pct(playbook.saveRateLift)} · Cost: ${(playbook.costCents / 100).toLocaleString()} · SLA: {playbook.slaHours}h</p>
              <p className="small">Discount ceiling: {pct(playbook.maxDiscountPct)}</p>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
