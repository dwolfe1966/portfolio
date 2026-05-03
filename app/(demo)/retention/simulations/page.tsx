import Link from "next/link";
import { db } from "@/lib/db";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { Section } from "@/components/site/Section";
import { RetentionRunButton } from "@/components/retention/RetentionRunButton";

export const dynamic = "force-dynamic";

export default async function RetentionSimulationsPage() {
  let ready = false;
  let latestRun: Awaited<ReturnType<typeof db.retentionRiskRun.findFirst>> = null;
  try {
    const [accounts, playbooks, policy, run] = await Promise.all([
      db.retentionAccount.count(),
      db.retentionPlaybook.count(),
      db.retentionPolicy.count(),
      db.retentionRiskRun.findFirst({ orderBy: { createdAt: "desc" } })
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
      </Section>
      <Section title="Simulation control">
        {ready ? (
          <>
            <RetentionRunButton />
            {latestRun ? <p className="small">Latest run: {latestRun.recommendation} · {latestRun.createdAt.toLocaleString()}</p> : null}
          </>
        ) : (
          <div className="card"><p>No retention data found. Reset demo data from Overview.</p><Link className="btn" href="/retention/overview">Go to overview</Link></div>
        )}
      </Section>
    </>
  );
}
