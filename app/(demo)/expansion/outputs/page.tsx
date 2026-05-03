import Link from "next/link";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { Section } from "@/components/site/Section";
import { ExpansionPipelineBoard } from "@/components/expansion/ExpansionPipelineBoard";

export const dynamic = "force-dynamic";

function money(cents: number) {
  return `$${Math.round(cents / 100).toLocaleString()}`;
}

export default async function ExpansionOutputsPage() {
  let run: Prisma.ExpansionRunGetPayload<{
    include: { rows: { include: { account: true; offer: true }; orderBy: { readinessScore: "desc" } } }
  }> | null = null;
  try {
    run = await db.expansionRun.findFirst({
      orderBy: { createdAt: "desc" },
      include: { rows: { include: { account: true, offer: true }, orderBy: { readinessScore: "desc" } } }
    });
  } catch (error) {
    if (!isMissingDemoTableError(error)) throw error;
  }

  return (
    <>
      <Section eyebrow="Outputs" title="Expansion ARR and account recommendations">
        <p>Outputs show the expansion pipeline, expected ARR, margin, payback, and account-level recommended motions.</p>
      </Section>
      {run ? (
        <>
          <Section title="Portfolio readout">
            <div className="grid grid-4">
              <div className="card"><p className="small">Pipeline ARR</p><div className="kpi">{money(run.pipelineArrCents)}</div></div>
              <div className="card"><p className="small">Expected expansion ARR</p><div className="kpi">{money(run.expectedExpansionArrCents)}</div></div>
              <div className="card"><p className="small">Margin</p><div className="kpi">{Math.round(run.averageMarginPercent * 100)}%</div></div>
              <div className="card"><p className="small">Payback</p><div className="kpi">{run.paybackRatio.toFixed(1)}x</div></div>
            </div>
          </Section>
          <Section title="Commercial lane board">
            <ExpansionPipelineBoard rows={run.rows} />
          </Section>
          <Section title="Motion mix">
            <div className="expansionMotionGrid">
              {Object.entries(run.rows.reduce<Record<string, number>>((acc, row) => {
                acc[row.primaryMotion] = (acc[row.primaryMotion] ?? 0) + row.expectedExpansionArrCents;
                return acc;
              }, {})).map(([motion, arr]) => (
                <div className="card" key={motion}>
                  <p className="eyebrow">{motion}</p>
                  <div className="kpi">{money(arr)}</div>
                </div>
              ))}
            </div>
          </Section>
        </>
      ) : (
        <Section title="No run yet">
          <div className="card"><p>No expansion runs have been created yet.</p><Link className="btn" href="/expansion/simulations">Run expansion model</Link></div>
        </Section>
      )}
    </>
  );
}
