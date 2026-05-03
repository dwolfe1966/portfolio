import Link from "next/link";
import { db } from "@/lib/db";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { Section } from "@/components/site/Section";
import { ResetDemoDataCard } from "@/components/site/ResetDemoDataCard";
import { DemoSystemGraph } from "@/components/demo-shell/DemoSystemGraph";

export const dynamic = "force-dynamic";

export default async function ExpansionOverviewPage() {
  let counts = { accounts: 0, offers: 0, policies: 0, runs: 0 };
  let tableMissing = false;
  try {
    const [accounts, offers, policies, runs] = await Promise.all([
      db.expansionAccount.count(),
      db.expansionOffer.count(),
      db.expansionPolicy.count(),
      db.expansionRun.count()
    ]);
    counts = { accounts, offers, policies, runs };
  } catch (error) {
    if (isMissingDemoTableError(error)) tableMissing = true;
    else throw error;
  }

  return (
    <>
      <Section eyebrow="Expansion Command Center" title="Find expansion revenue already hiding inside the account base">
        <p>
          A revenue intelligence workspace for expansion signals, account readiness scoring,
          recommended upsell motions, SLA timing, expected ARR, margin, and payback.
        </p>
        <div className="ctaRow">
          <Link className="btn primary" href="/expansion/simulations">Run expansion model</Link>
          <Link className="btn" href="/expansion/outputs">Review ARR output</Link>
        </div>
      </Section>

      <Section title="Whitespace planning loop">
        <DemoSystemGraph title="Expansion portfolio flow" nodes={["Installed base", "Whitespace map", "Commercial lane", "ARR portfolio"]} />
      </Section>

      <Section title="Readiness">
        {tableMissing ? (
          <div className="card">
            <p>Expansion tables are missing. Run database migrations.</p>
            <pre className="code">npm run db:generate{"\n"}npm run db:migrate:deploy{"\n"}npm run db:seed</pre>
          </div>
        ) : (
          <div className="grid grid-4">
            <div className="card"><p className="small">Accounts</p><div className="kpi">{counts.accounts}</div></div>
            <div className="card"><p className="small">Offers</p><div className="kpi">{counts.offers}</div></div>
            <div className="card"><p className="small">Policies</p><div className="kpi">{counts.policies}</div></div>
            <div className="card"><p className="small">Runs</p><div className="kpi">{counts.runs}</div></div>
          </div>
        )}
      </Section>

      <Section title="Demo data operations">
        <ResetDemoDataCard appLabel="Expansion" scope="expansion" />
      </Section>
    </>
  );
}
