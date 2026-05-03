import Link from "next/link";
import { db } from "@/lib/db";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { Section } from "@/components/site/Section";
import { ResetDemoDataCard } from "@/components/site/ResetDemoDataCard";

export const dynamic = "force-dynamic";

export default async function RetentionOverviewPage() {
  let counts = { accounts: 0, playbooks: 0, policies: 0, runs: 0, interventions: 0 };
  let tableMissing = false;
  try {
    const [accounts, playbooks, policies, runs, interventions] = await Promise.all([
      db.retentionAccount.count(),
      db.retentionPlaybook.count(),
      db.retentionPolicy.count(),
      db.retentionRiskRun.count(),
      db.retentionIntervention.count()
    ]);
    counts = { accounts, playbooks, policies, runs, interventions };
  } catch (error) {
    if (isMissingDemoTableError(error)) tableMissing = true;
    else throw error;
  }

  return (
    <>
      <Section eyebrow="Retention Command Center" title="Prioritize save motions before churn becomes inevitable">
        <p>
          A retention operating system for account health signals, risk scoring, intervention
          recommendations, SLA ownership, and save-rate economics.
        </p>
        <div className="ctaRow">
          <Link className="btn primary" href="/retention/simulations">Run risk model</Link>
          <Link className="btn" href="/retention/interventions">Queue intervention</Link>
        </div>
      </Section>

      <Section title="Operating loop">
        <div className="grid grid-4">
          <div className="card"><h3>1. Signals</h3><p>Combine usage, support, NPS, renewal, billing, and relationship signals.</p></div>
          <div className="card"><h3>2. Risk score</h3><p>Classify account risk and identify the primary driver behind the exposure.</p></div>
          <div className="card"><h3>3. Save motion</h3><p>Recommend playbooks with SLA, discount ceiling, cost, and expected saved revenue.</p></div>
          <div className="card"><h3>4. Economics</h3><p>Track preventable churn, save rate, payback, and residual risk by run.</p></div>
        </div>
      </Section>

      <Section title="Readiness">
        {tableMissing ? (
          <div className="card">
            <p>Retention tables are missing. Run database migrations.</p>
            <pre className="code">npm run db:generate{"\n"}npm run db:migrate:deploy{"\n"}npm run db:seed</pre>
          </div>
        ) : (
          <div className="grid grid-4">
            <div className="card"><p className="small">Accounts</p><div className="kpi">{counts.accounts}</div></div>
            <div className="card"><p className="small">Playbooks</p><div className="kpi">{counts.playbooks}</div></div>
            <div className="card"><p className="small">Runs</p><div className="kpi">{counts.runs}</div></div>
            <div className="card"><p className="small">Interventions</p><div className="kpi">{counts.interventions}</div></div>
          </div>
        )}
      </Section>

      <Section title="Demo data operations">
        <ResetDemoDataCard appLabel="Retention" scope="retention" />
      </Section>
    </>
  );
}
