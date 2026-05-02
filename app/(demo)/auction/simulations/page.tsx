import Link from "next/link";
import { db } from "@/lib/db";
import { Section } from "@/components/site/Section";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { RunAuctionsButton } from "@/components/auction/RunAuctionsButton";

export const dynamic = "force-dynamic";

export default async function AuctionSimulationsPage() {
  let latestRun: Awaited<ReturnType<typeof db.auctionRun.findFirst>> = null;
  let counts = { advertisers: 0, slots: 0, bids: 0 };
  let tableMissing = false;

  try {
    const [latest, advertisers, slots, bids] = await Promise.all([
      db.auctionRun.findFirst({ orderBy: { createdAt: "desc" } }),
      db.auctionAdvertiser.count(),
      db.auctionSlot.count(),
      db.auctionBid.count()
    ]);
    latestRun = latest;
    counts = { advertisers, slots, bids };
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      tableMissing = true;
    } else {
      throw error;
    }
  }

  return (
    <>
      <Section eyebrow="Simulations" title="Run a marketplace round">
        <p>
          Each run executes the configured slots, advertisers, and bids through the auction
          engine N times with small per-iteration noise. Results are persisted and can be
          replayed as a live ticker.
        </p>
      </Section>

      <Section title="Run trigger">
        {tableMissing ? (
          <div className="card">
            <p>Auction tables are missing. Run database migrations before triggering runs.</p>
          </div>
        ) : counts.advertisers === 0 || counts.slots === 0 || counts.bids === 0 ? (
          <div className="card">
            <p>
              Inputs incomplete: {counts.advertisers} advertiser(s), {counts.slots} slot(s),
              {" "}{counts.bids} bid(s).
            </p>
            <Link className="btn primary" href="/auction/inputs">Define inputs</Link>
          </div>
        ) : (
          <RunAuctionsButton />
        )}
      </Section>

      {latestRun ? (
        <Section title="Latest run">
          <div className="card">
            <h3>
              <Link href={`/auction/runs/${latestRun.id}`}>{latestRun.id.slice(0, 8)}…</Link>
            </h3>
            <p className="small">{new Date(latestRun.createdAt).toLocaleString()}</p>
            <div className="grid grid-4" style={{ marginTop: 8 }}>
              <div>
                <p className="small">Auctions</p>
                <div className="kpi">{latestRun.totalAuctions}</div>
              </div>
              <div>
                <p className="small">Revenue</p>
                <div className="kpi">${(latestRun.totalRevenueCents / 100).toFixed(2)}</div>
              </div>
              <div>
                <p className="small">Fill rate</p>
                <div className="kpi">{(latestRun.fillRate * 100).toFixed(1)}%</div>
              </div>
              <div>
                <p className="small">Stability</p>
                <div className="kpi">{latestRun.revenueStability.toFixed(2)}</div>
              </div>
            </div>
          </div>
        </Section>
      ) : null}
    </>
  );
}
