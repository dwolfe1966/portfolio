import Link from "next/link";
import { db } from "@/lib/db";
import { Section } from "@/components/site/Section";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";

export const dynamic = "force-dynamic";

export default async function AuctionOutputsPage() {
  try {
    const runs = await db.auctionRun.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        spendSnapshots: {
          include: { advertiser: { select: { id: true, name: true, behaviorMode: true } } },
          orderBy: { totalSpendCents: "desc" }
        }
      }
    });

    if (runs.length === 0) {
      return (
        <Section title="Outputs">
          <div className="card">
            <p>No auction runs yet. Trigger one from the simulations page.</p>
            <Link className="btn primary" href="/auction/simulations">Go to simulations</Link>
          </div>
        </Section>
      );
    }

    const totalRevenue = runs.reduce((acc, r) => acc + r.totalRevenueCents, 0);
    const avgFillRate = runs.reduce((acc, r) => acc + r.fillRate, 0) / runs.length;
    const avgStability = runs.reduce((acc, r) => acc + r.revenueStability, 0) / runs.length;
    const avgTrust = runs.reduce((acc, r) => acc + r.bidderTrustProxy, 0) / runs.length;

    const latest = runs[0];

    return (
      <>
        <Section eyebrow="Outputs" title="Marketplace history">
          <p>
            Aggregate KPIs across the most recent {runs.length} run{runs.length === 1 ? "" : "s"}.
            Click any run to inspect the per-auction breakdown.
          </p>
          <div className="grid grid-4">
            <div className="card">
              <p className="small">Total revenue</p>
              <div className="kpi">${(totalRevenue / 100).toFixed(0)}</div>
            </div>
            <div className="card">
              <p className="small">Avg fill rate</p>
              <div className="kpi">{(avgFillRate * 100).toFixed(1)}%</div>
            </div>
            <div className="card">
              <p className="small">Avg stability</p>
              <div className="kpi">{avgStability.toFixed(2)}</div>
            </div>
            <div className="card">
              <p className="small">Avg trust proxy</p>
              <div className="kpi">{avgTrust.toFixed(2)}</div>
            </div>
          </div>
        </Section>

        <Section title="Run history">
          <div className="tableScroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Run</th>
                  <th>When</th>
                  <th>Auctions</th>
                  <th>Revenue</th>
                  <th>Fill</th>
                  <th>Stability</th>
                  <th>Trust</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id}>
                    <td>
                      <Link href={`/auction/runs/${run.id}`}>
                        <code className="small">{run.id.slice(0, 8)}…</code>
                      </Link>
                    </td>
                    <td>{new Date(run.createdAt).toLocaleString()}</td>
                    <td>{run.totalAuctions}</td>
                    <td>${(run.totalRevenueCents / 100).toFixed(0)}</td>
                    <td>{(run.fillRate * 100).toFixed(1)}%</td>
                    <td>{run.revenueStability.toFixed(2)}</td>
                    <td>{run.bidderTrustProxy.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title={`Advertiser economics (latest run · ${latest.id.slice(0, 8)}…)`}>
          {latest.spendSnapshots.length === 0 ? (
            <div className="card"><p>No advertiser activity in the latest run.</p></div>
          ) : (
            <div className="tableScroll">
              <table className="table">
                <thead>
                  <tr>
                    <th>Advertiser</th>
                    <th>Mode</th>
                    <th>Wins</th>
                    <th>Spend</th>
                    <th>Avg clearing</th>
                    <th>Share</th>
                  </tr>
                </thead>
                <tbody>
                  {latest.spendSnapshots.map((snap) => (
                    <tr key={snap.id}>
                      <td>{snap.advertiser.name}</td>
                      <td><code className="small">{snap.advertiser.behaviorMode}</code></td>
                      <td>{snap.totalWins}</td>
                      <td>${(snap.totalSpendCents / 100).toFixed(2)}</td>
                      <td>${(snap.averageClearingCents / 100).toFixed(2)}</td>
                      <td>{(snap.fillShare * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      </>
    );
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      return (
        <Section title="Auction outputs">
          <div className="card">
            <p>Auction tables are missing. Run database migrations.</p>
          </div>
        </Section>
      );
    }
    throw error;
  }
}
