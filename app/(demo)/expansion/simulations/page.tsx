import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { Section } from "@/components/site/Section";
import { ExpansionRunButton } from "@/components/expansion/ExpansionRunButton";
import { ExpansionPipelineBoard } from "@/components/expansion/ExpansionPipelineBoard";
import { DemoAppMotionVisual } from "@/components/demo-shell/DemoAppMotionVisual";

export const dynamic = "force-dynamic";

function money(cents: number) {
  return `$${Math.round(cents / 100).toLocaleString()}`;
}

export default async function ExpansionSimulationsPage() {
  let ready = false;
  let latestRun: Prisma.ExpansionRunGetPayload<{
    include: { rows: { include: { account: true; offer: true } } };
  }> | null = null;
  try {
    const [accounts, offers, policy, run] = await Promise.all([
      db.expansionAccount.count(),
      db.expansionOffer.count(),
      db.expansionPolicy.count(),
      db.expansionRun.findFirst({
        orderBy: { createdAt: "desc" },
        include: {
          rows: {
            include: { account: true, offer: true },
            orderBy: { readinessScore: "desc" }
          }
        }
      })
    ]);
    ready = accounts > 0 && offers > 0 && policy > 0;
    latestRun = run;
  } catch (error) {
    if (!isMissingDemoTableError(error)) throw error;
  }

  return (
    <>
      <Section eyebrow="Simulations" title="Run the expansion revenue model">
        <p>The simulation scores account readiness, selects an expansion motion, and persists expected ARR, margin, and payback.</p>
        <div className="grid grid-3" style={{ marginTop: 14 }}>
          <div className="card">
            <h3>Inputs consumed</h3>
            <p>Installed-base ARR, seat utilization, usage growth, PQS, support health, renewal timing, commercial signals, offers, and policy.</p>
            <Link className="btn" href="/expansion/inputs">Review inputs</Link>
          </div>
          <div className="card">
            <h3>Simulation logic</h3>
            <p>Scores readiness, infers the best expansion motion, estimates ARR lift, and applies margin/payback/SLA guardrails.</p>
          </div>
          <div className="card">
            <h3>Outputs generated</h3>
            <p>Expected expansion ARR, high-readiness count, account recommendations, offer selection, and audit trail.</p>
            <Link className="btn" href="/expansion/outputs">Open outputs</Link>
          </div>
        </div>
      </Section>
      <Section title="Expansion motion">
        <DemoAppMotionVisual app="expansion" />
      </Section>
      <Section title="Simulation control">
        {ready ? (
          <>
            <ExpansionRunButton />
            {latestRun ? (
              <div className="grid grid-4" style={{ marginTop: 14 }}>
                <div className="card"><p className="small">Latest recommendation</p><div className="kpi">{latestRun.recommendation}</div></div>
                <div className="card"><p className="small">High-readiness accounts</p><div className="kpi">{latestRun.highReadinessAccounts}</div></div>
                <div className="card"><p className="small">Expected ARR</p><div className="kpi">{money(latestRun.expectedExpansionArrCents)}</div></div>
                <div className="card"><p className="small">Payback</p><div className="kpi">{latestRun.paybackRatio.toFixed(1)}x</div></div>
              </div>
            ) : null}
            {latestRun?.rows.length ? (
              <div style={{ marginTop: 14 }}>
                <ExpansionPipelineBoard rows={latestRun.rows} />
              </div>
            ) : null}
          </>
        ) : (
          <div className="card"><p>No expansion data found. Reset demo data from Overview.</p><Link className="btn" href="/expansion/overview">Go to overview</Link></div>
        )}
      </Section>
    </>
  );
}
