import Link from "next/link";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { Section } from "@/components/site/Section";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";

export const dynamic = "force-dynamic";

function money(cents: number) {
  return `$${Math.round(cents / 100).toLocaleString()}`;
}

export default async function RetentionOutputsPage() {
  let run: Prisma.RetentionRiskRunGetPayload<{
    include: { rows: { include: { account: true; playbook: true }; orderBy: { riskScore: "desc" } } }
  }> | null = null;
  try {
    run = await db.retentionRiskRun.findFirst({
      orderBy: { createdAt: "desc" },
      include: { rows: { include: { account: true, playbook: true }, orderBy: { riskScore: "desc" } } }
    });
  } catch (error) {
    if (!isMissingDemoTableError(error)) throw error;
  }

  return (
    <>
      <Section eyebrow="Outputs" title="Retention economics and recommended save motions">
        <p>Outputs show how much churn is preventable, what the intervention portfolio is expected to save, and which accounts need action.</p>
      </Section>

      {run ? (
        <>
          <Section title="Portfolio readout">
            <div className="grid grid-4">
              <div className="card"><p className="small">Preventable churn</p><div className="kpi">{money(run.preventableChurnCents)}</div></div>
              <div className="card"><p className="small">Expected saved revenue</p><div className="kpi">{money(run.expectedSavedRevenueCents)}</div></div>
              <div className="card"><p className="small">Save rate</p><div className="kpi">{Math.round(run.saveRate * 100)}%</div></div>
              <div className="card"><p className="small">Payback</p><div className="kpi">{run.paybackRatio.toFixed(1)}x</div></div>
            </div>
          </Section>
          <Section title="Account recommendations">
            <div className="grid grid-2">
              {run.rows.map((row) => (
                <div className="card" key={row.id}>
                  <p className="eyebrow">{row.riskBand} risk · {row.primaryDriver}</p>
                  <h3>{row.account.name}</h3>
                  <p className="small">Playbook: {row.playbook?.name ?? "No playbook"} · SLA: {row.slaHours}h</p>
                  <p className="small">Expected save: {money(row.expectedSavedRevenueCents)} · Cost: {money(row.interventionCostCents)} · Payback: {row.paybackRatio.toFixed(1)}x</p>
                </div>
              ))}
            </div>
          </Section>
        </>
      ) : (
        <Section title="No run yet">
          <div className="card"><p>No retention risk runs have been created yet.</p><Link className="btn" href="/retention/simulations">Run risk model</Link></div>
        </Section>
      )}
    </>
  );
}
