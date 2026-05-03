import Link from "next/link";
import { db } from "@/lib/db";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { Section } from "@/components/site/Section";
import { ExpansionRunButton } from "@/components/expansion/ExpansionRunButton";
import { DemoAppMotionVisual } from "@/components/demo-shell/DemoAppMotionVisual";

export const dynamic = "force-dynamic";

export default async function ExpansionSimulationsPage() {
  let ready = false;
  let latestRun: Awaited<ReturnType<typeof db.expansionRun.findFirst>> = null;
  try {
    const [accounts, offers, policy, run] = await Promise.all([
      db.expansionAccount.count(),
      db.expansionOffer.count(),
      db.expansionPolicy.count(),
      db.expansionRun.findFirst({ orderBy: { createdAt: "desc" } })
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
      </Section>
      <Section title="Expansion motion">
        <DemoAppMotionVisual app="expansion" />
      </Section>
      <Section title="Simulation control">
        {ready ? (
          <>
            <ExpansionRunButton />
            {latestRun ? <p className="small">Latest run: {latestRun.recommendation} · {latestRun.createdAt.toLocaleString()}</p> : null}
          </>
        ) : (
          <div className="card"><p>No expansion data found. Reset demo data from Overview.</p><Link className="btn" href="/expansion/overview">Go to overview</Link></div>
        )}
      </Section>
    </>
  );
}
