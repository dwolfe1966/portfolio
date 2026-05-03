import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { Section } from "@/components/site/Section";
import { RetentionRunButton } from "@/components/retention/RetentionRunButton";
import { RetentionSimulationVisuals } from "@/components/retention/RetentionSimulationVisuals";
import { DemoAppMotionVisual } from "@/components/demo-shell/DemoAppMotionVisual";

export const dynamic = "force-dynamic";

function money(cents: number) {
  return `$${Math.round(cents / 100).toLocaleString()}`;
}

export default async function RetentionSimulationsPage() {
  let ready = false;
  let latestRun: Prisma.RetentionRiskRunGetPayload<{
    include: { rows: { include: { account: true; playbook: true } } };
  }> | null = null;
  try {
    const [accounts, playbooks, policy, run] = await Promise.all([
      db.retentionAccount.count(),
      db.retentionPlaybook.count(),
      db.retentionPolicy.count(),
      db.retentionRiskRun.findFirst({
        orderBy: { createdAt: "desc" },
        include: {
          rows: {
            include: { account: true, playbook: true },
            orderBy: { riskScore: "desc" }
          }
        }
      })
    ]);
    ready = accounts > 0 && playbooks > 0 && policy > 0;
    latestRun = run;
  } catch (error) {
    if (!isMissingDemoTableError(error)) throw error;
  }

  return (
    <>
      <Section eyebrow="Simulations" title="Run the retention portfolio risk model">
        <p>The simulation scores every account, assigns a driver-specific playbook, and persists save-rate economics.</p>
        <div className="grid grid-3" style={{ marginTop: 14 }}>
          <div className="card">
            <h3>Inputs consumed</h3>
            <p>Account health signals, MRR, renewal timing, payment risk, sponsor coverage, playbooks, policy thresholds, and payback floor.</p>
            <Link className="btn" href="/retention/inputs">Review inputs</Link>
          </div>
          <div className="card">
            <h3>Simulation logic</h3>
            <p>Scores account risk, identifies the primary churn driver, chooses a playbook, and calculates save economics.</p>
          </div>
          <div className="card">
            <h3>Outputs generated</h3>
            <p>Portfolio risk run, account-level recommendations, preventable churn, expected saved revenue, and audit events.</p>
            <Link className="btn" href="/retention/outputs">Open outputs</Link>
          </div>
        </div>
      </Section>
      <Section title="Intervention motion">
        <DemoAppMotionVisual app="retention" />
      </Section>
      <Section title="Simulation control">
        {ready ? (
          <>
            <RetentionRunButton />
            {latestRun ? (
              <div className="grid grid-4" style={{ marginTop: 14 }}>
                <div className="card"><p className="small">Latest recommendation</p><div className="kpi">{latestRun.recommendation}</div></div>
                <div className="card"><p className="small">High-risk accounts</p><div className="kpi">{latestRun.highRiskAccounts}</div></div>
                <div className="card"><p className="small">Expected saved</p><div className="kpi">{money(latestRun.expectedSavedRevenueCents)}</div></div>
                <div className="card"><p className="small">Payback</p><div className="kpi">{latestRun.paybackRatio.toFixed(1)}x</div></div>
              </div>
            ) : null}
            {latestRun?.rows.length ? (
              <div style={{ marginTop: 14 }}>
                <RetentionSimulationVisuals rows={latestRun.rows} />
              </div>
            ) : null}
          </>
        ) : (
          <div className="card"><p>No retention data found. Reset demo data from Overview.</p><Link className="btn" href="/retention/overview">Go to overview</Link></div>
        )}
      </Section>
    </>
  );
}
