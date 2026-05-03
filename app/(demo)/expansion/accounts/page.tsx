import { db } from "@/lib/db";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { Section } from "@/components/site/Section";
import { scoreExpansionReadiness, type ExpansionSignalTrend } from "@/lib/expansion-engine";
import { ExpansionAccountEditor } from "@/components/expansion/ExpansionAccountEditor";

export const dynamic = "force-dynamic";

function money(cents: number) {
  return `$${Math.round(cents / 100).toLocaleString()}`;
}

export default async function ExpansionAccountsPage() {
  let accounts: Awaited<ReturnType<typeof db.expansionAccount.findMany>> = [];
  let policy: Awaited<ReturnType<typeof db.expansionPolicy.findFirst>> = null;
  try {
    [accounts, policy] = await Promise.all([
      db.expansionAccount.findMany({ orderBy: { currentArrCents: "desc" } }),
      db.expansionPolicy.findFirst({ orderBy: { createdAt: "desc" } })
    ]);
  } catch (error) {
    if (!isMissingDemoTableError(error)) throw error;
  }

  return (
    <>
      <Section eyebrow="Accounts" title="Expansion signal table">
        <p>Seeded accounts expose the signals behind each readiness score: seats, usage growth, product qualification, renewal timing, and support health.</p>
      </Section>
      <Section title="Expansion queue">
        <div className="grid grid-2">
          {accounts.map((account) => {
            const score = policy
              ? scoreExpansionReadiness({ ...account, trend: account.trend as ExpansionSignalTrend }, policy)
              : null;
            return (
              <div key={account.id}>
                <div className="card" style={{ marginBottom: 12 }}>
                  <p className="eyebrow">{account.segment} · {score?.readinessBand ?? "unscored"} readiness</p>
                  <h3>{account.name}</h3>
                  <div className="grid grid-3">
                    <p className="small"><strong>ARR</strong><br />{money(account.currentArrCents)}</p>
                    <p className="small"><strong>Readiness</strong><br />{score ? `${Math.round(score.readinessScore * 100)}%` : "No policy"}</p>
                    <p className="small"><strong>Seats</strong><br />{account.seatsActive}/{account.seatsPurchased}</p>
                  </div>
                  <p className="small">Motion: {score?.primaryMotion ?? "n/a"} · Usage growth: {Math.round(account.usageGrowthRate * 100)}% · PQS: {Math.round(account.productQualifiedScore * 100)}%</p>
                </div>
                <ExpansionAccountEditor account={account} />
              </div>
            );
          })}
        </div>
      </Section>
    </>
  );
}
