import Link from "next/link";
import { db } from "@/lib/db";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { Section } from "@/components/site/Section";
import { ResetDemoDataCard } from "@/components/site/ResetDemoDataCard";

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

      <Section title="Operating loop">
        <div className="grid grid-4">
          <div className="card"><h3>1. Signals</h3><p>Use seat utilization, usage growth, product qualification, renewal timing, and support health.</p></div>
          <div className="card"><h3>2. Readiness</h3><p>Score account expansion readiness and classify pursue, nurture, or defer paths.</p></div>
          <div className="card"><h3>3. Motion</h3><p>Recommend seat expansion, feature upgrade, usage commit, or services attach.</p></div>
          <div className="card"><h3>4. Economics</h3><p>Track expected expansion ARR, gross margin, pursuit cost, and payback.</p></div>
        </div>
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
