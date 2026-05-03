import { db } from "@/lib/db";
import { Section } from "@/components/site/Section";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { scoreRetentionRisk, type RetentionHealthTrend } from "@/lib/retention-engine";
import { RetentionAccountEditor } from "@/components/retention/RetentionAccountEditor";

export const dynamic = "force-dynamic";

function money(cents: number) {
  return `$${Math.round(cents / 100).toLocaleString()}`;
}

export default async function RetentionAccountsPage() {
  let accounts: Awaited<ReturnType<typeof db.retentionAccount.findMany>> = [];
  let policy: Awaited<ReturnType<typeof db.retentionPolicy.findFirst>> = null;
  try {
    [accounts, policy] = await Promise.all([
      db.retentionAccount.findMany({ orderBy: [{ renewalDays: "asc" }, { mrrCents: "desc" }] }),
      db.retentionPolicy.findFirst({ orderBy: { createdAt: "desc" } })
    ]);
  } catch (error) {
    if (!isMissingDemoTableError(error)) throw error;
  }

  return (
    <>
      <Section eyebrow="Accounts" title="Account health signal table">
        <p>Every account signal is editable, so changes to usage, support, NPS, billing, renewal timing, and relationship coverage flow into the next simulation run.</p>
      </Section>
      <Section title="Live risk readout">
        <div className="grid grid-2">
          {accounts.map((account) => {
            const score = scoreRetentionRisk({ ...account, healthTrend: account.healthTrend as RetentionHealthTrend }, policy ?? undefined);
            return (
              <div className="card" key={account.id}>
                <p className="eyebrow">{account.segment} · {score.riskBand} risk</p>
                <h3>{account.name}</h3>
                <div className="grid grid-3">
                  <p className="small"><strong>Risk</strong><br />{Math.round(score.riskScore * 100)}%</p>
                  <p className="small"><strong>MRR</strong><br />{money(account.mrrCents)}</p>
                  <p className="small"><strong>Renewal</strong><br />{account.renewalDays} days</p>
                </div>
                <p className="small">Driver: {score.primaryDriver} · Usage: {Math.round(account.usageScore * 100)}% · NPS: {account.npsScore} · Last touch: {account.lastTouchedDays}d</p>
              </div>
            );
          })}
        </div>
      </Section>
      <Section title="Editable account inputs">
        <div className="grid grid-2">
          {accounts.map((account) => (
            <RetentionAccountEditor key={account.id} account={account} />
          ))}
        </div>
      </Section>
    </>
  );
}
