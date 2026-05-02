import Link from "next/link";
import { db } from "@/lib/db";
import { Section } from "@/components/site/Section";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";

export const dynamic = "force-dynamic";

export default async function AuctionOverviewPage() {
  let counts = { advertisers: 0, slots: 0, bids: 0, runs: 0 };
  let tableMissing = false;
  try {
    const [advertisers, slots, bids, runs] = await Promise.all([
      db.auctionAdvertiser.count(),
      db.auctionSlot.count(),
      db.auctionBid.count(),
      db.auctionRun.count()
    ]);
    counts = { advertisers, slots, bids, runs };
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      tableMissing = true;
    } else {
      throw error;
    }
  }

  return (
    <>
      <Section
        eyebrow="Auction Desk"
        title="Quality-adjusted second-price auctions for a closed ad marketplace"
      >
        <p>
          A working operator console for a publisher running their own ad inventory: define
          slots, accept bids from advertisers, run auctions with quality-weighted ranking and
          second-price clearing, and watch reserves and pacing keep the marketplace healthy.
        </p>
        <div className="ctaRow">
          <Link className="btn primary" href="/auction/inputs">Define inputs</Link>
          <Link className="btn" href="/auction/simulations">Run simulations</Link>
        </div>
      </Section>

      <Section title="Pipeline">
        <div className="grid grid-4">
          <div className="card">
            <h3>1. Bid intake</h3>
            <p>Validate campaign constraints, budgets, pacing, and placement eligibility before auction.</p>
          </div>
          <div className="card">
            <h3>2. Quality-adjusted scoring</h3>
            <p>Rank bids by <code className="small">bid × qualityScore</code> to reward relevance and user experience.</p>
          </div>
          <div className="card">
            <h3>3. Second-price clearing</h3>
            <p>Charge winner the next-best adjusted bid divided by their quality score, plus minimal increment.</p>
          </div>
          <div className="card">
            <h3>4. Pacing + reserve</h3>
            <p>Reserve floors and per-advertiser pacing smooth delivery and keep the marketplace stable.</p>
          </div>
        </div>
      </Section>

      <Section title="Marketplace readiness">
        {tableMissing ? (
          <div className="card">
            <p>Auction tables are missing. Run database migrations.</p>
            <pre className="code">npm run db:generate{"\n"}npm run db:migrate:deploy{"\n"}npm run db:seed</pre>
          </div>
        ) : (
          <div className="grid grid-4">
            <div className="card">
              <p className="small">Advertisers</p>
              <div className="kpi">{counts.advertisers}</div>
            </div>
            <div className="card">
              <p className="small">Slots</p>
              <div className="kpi">{counts.slots}</div>
            </div>
            <div className="card">
              <p className="small">Bids</p>
              <div className="kpi">{counts.bids}</div>
            </div>
            <div className="card">
              <p className="small">Runs</p>
              <div className="kpi">{counts.runs}</div>
            </div>
          </div>
        )}
      </Section>

      <Section title="Operator decisions surfaced">
        <div className="grid grid-3">
          <div className="card">
            <h3>Reserve prices</h3>
            <p>Per-slot floor below which auctions go unfilled. Health page recommends data-backed values.</p>
          </div>
          <div className="card">
            <h3>Pacing</h3>
            <p>Each advertiser carries a daily budget and a smoothing factor that throttles per-auction bids.</p>
          </div>
          <div className="card">
            <h3>Behavior modes</h3>
            <p>Advertisers can be truthful, shaded (×0.85), or auto-bid (capped by target CAC). Vickrey rewards truthful.</p>
          </div>
        </div>
      </Section>
    </>
  );
}
