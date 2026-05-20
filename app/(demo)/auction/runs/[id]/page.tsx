import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Section } from "@/components/site/Section";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { AuctionLiveTicker } from "@/components/auction/AuctionLiveTicker";
import { AuctionBidVisualizer } from "@/components/auction/AuctionBidVisualizer";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function AuctionRunDetailPage({ params }: PageProps) {
  const { id } = await params;
  try {
    const run = await db.auctionRun.findUnique({
      where: { id },
      include: {
        results: {
          orderBy: { iterationIndex: "asc" },
          include: {
            slot: { select: { id: true, name: true } },
            rankedBids: {
              orderBy: { rank: "asc" },
              include: { advertiser: { select: { id: true, name: true, behaviorMode: true } } }
            }
          },
          take: 200
        },
        spendSnapshots: {
          include: { advertiser: { select: { id: true, name: true, behaviorMode: true } } },
          orderBy: { totalSpendCents: "desc" }
        }
      }
    });

    if (!run) notFound();

    return (
      <>
        <Section eyebrow={`Run · ${new Date(run.createdAt).toLocaleString()}`} title={`${run.totalAuctions} auctions`}>
          <div className="grid grid-4">
            <div className="card">
              <p className="small">Revenue</p>
              <div className="kpi">${(run.totalRevenueCents / 100).toFixed(2)}</div>
            </div>
            <div className="card">
              <p className="small">Fill rate</p>
              <div className="kpi">{(run.fillRate * 100).toFixed(1)}%</div>
            </div>
            <div className="card">
              <p className="small">Fill quality</p>
              <div className="kpi">{run.fillQuality.toFixed(2)}</div>
            </div>
            <div className="card">
              <p className="small">Stability</p>
              <div className="kpi">{run.revenueStability.toFixed(2)}</div>
            </div>
            <div className="card">
              <p className="small">Trust proxy</p>
              <div className="kpi">{run.bidderTrustProxy.toFixed(2)}</div>
            </div>
          </div>
          <div className="ctaRow">
            <Link className="btn" href="/auction/outputs">All runs</Link>
          </div>
        </Section>

        <Section title="Live auction visualization">
          <AuctionBidVisualizer runId={run.id} />
        </Section>

        <Section title="Live ticker">
          <AuctionLiveTicker runId={run.id} />
        </Section>

        <Section title="Advertiser economics">
          {run.spendSnapshots.length === 0 ? (
            <div className="card"><p>No advertisers won during this run.</p></div>
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
                  {run.spendSnapshots.map((snap) => (
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

        <Section title={`Per-auction breakdown (showing ${run.results.length} of ${run.totalAuctions})`}>
          {run.results.length === 0 ? (
            <div className="card"><p>No persisted results.</p></div>
          ) : (
            <div className="tableScroll">
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Slot</th>
                    <th>Outcome</th>
                    <th>Clearing</th>
                    <th>Winner</th>
                    <th>Bidders</th>
                  </tr>
                </thead>
                <tbody>
                  {run.results.map((r) => {
                    const winner = r.rankedBids.find((b) => b.advertiserId === r.winnerAdvertiserId);
                    return (
                      <tr key={r.id}>
                        <td><code className="small">{r.iterationIndex}</code></td>
                        <td>{r.slot.name}</td>
                        <td>
                          <span className={`small bandText--${r.filled ? "healthy" : "unhealthy"}`}>
                            {r.filled ? "filled" : "unfilled"}
                          </span>
                        </td>
                        <td>{r.clearingPriceCents != null ? `$${(r.clearingPriceCents / 100).toFixed(2)}` : "—"}</td>
                        <td>{winner ? winner.advertiser.name : "—"}</td>
                        <td>{r.rankedBids.length}</td>
                      </tr>
                    );
                  })}
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
        <Section title="Auction run">
          <div className="card">
            <p>Auction tables are missing. Run database migrations.</p>
          </div>
        </Section>
      );
    }
    throw error;
  }
}
