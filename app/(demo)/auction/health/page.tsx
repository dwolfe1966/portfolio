import Link from "next/link";
import { db } from "@/lib/db";
import { Section } from "@/components/site/Section";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import {
  computeMarketplaceHealth,
  suggestReserve,
  type AdvertiserRollup
} from "@/lib/auction-engine";
import { HealthTrendBars } from "@/components/auction/HealthTrendBars";
import { ApplyReserveButton } from "@/components/auction/ApplyReserveButton";

export const dynamic = "force-dynamic";

const RECENT_RUN_LIMIT = 10;
const RESERVE_SAMPLE_LIMIT = 200;

function bandForFillRate(value: number): "healthy" | "watch" | "unhealthy" {
  if (value >= 0.7) return "healthy";
  if (value >= 0.4) return "watch";
  return "unhealthy";
}
function bandForStability(value: number): "healthy" | "watch" | "unhealthy" {
  if (value >= 0.7) return "healthy";
  if (value >= 0.4) return "watch";
  return "unhealthy";
}
function bandForHHI(value: number): "healthy" | "watch" | "unhealthy" {
  if (value < 0.2) return "healthy";
  if (value < 0.5) return "watch";
  return "unhealthy";
}

export default async function AuctionHealthPage() {
  try {
    const recentRuns = await db.auctionRun.findMany({
      orderBy: { createdAt: "desc" },
      take: RECENT_RUN_LIMIT,
      include: {
        spendSnapshots: {
          include: { advertiser: { select: { id: true, name: true, behaviorMode: true } } }
        }
      }
    });

    const orderedRuns = [...recentRuns].reverse();
    const summary = computeMarketplaceHealth(
      orderedRuns.map((run) => ({
        fillRate: run.fillRate,
        revenueStability: run.revenueStability,
        rollups: run.spendSnapshots.map<AdvertiserRollup>((snap) => ({
          advertiserId: snap.advertiserId,
          totalSpendCents: snap.totalSpendCents,
          totalWins: snap.totalWins,
          averageClearingCents: snap.averageClearingCents,
          fillShare: snap.fillShare
        }))
      }))
    );

    const slots = await db.auctionSlot.findMany({ orderBy: { createdAt: "asc" } });
    const reserveSuggestions = await Promise.all(
      slots.map(async (slot) => {
        const recentResults = await db.auctionResult.findMany({
          where: { slotId: slot.id, filled: true, clearingPriceCents: { not: null } },
          orderBy: { createdAt: "desc" },
          take: RESERVE_SAMPLE_LIMIT,
          select: { clearingPriceCents: true }
        });
        const prices = recentResults.map((r) => r.clearingPriceCents ?? 0).filter((p) => p > 0);
        const suggestion = suggestReserve({
          slotId: slot.id,
          currentReserveCents: slot.reservePriceCents,
          clearingPricesCents: prices
        });
        return { slot, suggestion };
      })
    );

    const latestRun = orderedRuns[orderedRuns.length - 1];

    if (recentRuns.length === 0) {
      return (
        <Section eyebrow="Health" title="Marketplace health">
          <div className="card">
            <p>No auction runs yet — trigger a run to populate health metrics.</p>
            <Link className="btn primary" href="/auction/simulations">Go to simulations</Link>
          </div>
        </Section>
      );
    }

    return (
      <>
        <Section eyebrow="Health" title="Marketplace health">
          <p>
            Aggregate signals across the most recent {summary.totalRunsAnalyzed} run
            {summary.totalRunsAnalyzed === 1 ? "" : "s"}. HHI measures revenue concentration;
            churn proxy counts advertisers that won in the prior run but not in the latest.
          </p>
        </Section>

        <Section title="Trends">
          <div className="grid grid-3">
            <div className="card">
              <HealthTrendBars
                values={summary.fillRateTrend}
                label="Fill rate (latest run)"
                format={(v) => `${(v * 100).toFixed(1)}%`}
                band={summary.fillRateTrend.length > 0 ? bandForFillRate(summary.fillRateTrend[summary.fillRateTrend.length - 1]) : "neutral"}
                max={1}
              />
            </div>
            <div className="card">
              <HealthTrendBars
                values={summary.revenueStabilityTrend}
                label="Revenue stability"
                format={(v) => v.toFixed(2)}
                band={summary.revenueStabilityTrend.length > 0 ? bandForStability(summary.revenueStabilityTrend[summary.revenueStabilityTrend.length - 1]) : "neutral"}
                max={1}
              />
            </div>
            <div className="card">
              <p className="small">HHI concentration</p>
              <div className={`kpi bandText--${bandForHHI(summary.hhi)}`}>{summary.hhi.toFixed(3)}</div>
              <p className="small">
                {summary.hhi < 0.2
                  ? "Competitive — many bidders share spend."
                  : summary.hhi < 0.5
                    ? "Moderate concentration."
                    : "High concentration — few bidders capture most spend."}
              </p>
            </div>
          </div>
          <div className="grid grid-3" style={{ marginTop: 12 }}>
            <div className="card">
              <p className="small">Bidder churn proxy</p>
              <div className={`kpi bandText--${summary.bidderChurnProxy === 0 ? "healthy" : summary.bidderChurnProxy < 3 ? "watch" : "unhealthy"}`}>
                {summary.bidderChurnProxy}
              </div>
              <p className="small">
                Advertisers that won in run {summary.totalRunsAnalyzed - 1 || "—"} but not in run {summary.totalRunsAnalyzed}.
              </p>
            </div>
            <div className="card">
              <p className="small">Runs analyzed</p>
              <div className="kpi">{summary.totalRunsAnalyzed}</div>
              <p className="small">Most recent {RECENT_RUN_LIMIT} runs are eligible for trend analysis.</p>
            </div>
            <div className="card">
              <p className="small">Latest run</p>
              <div className="kpi">{latestRun ? `${latestRun.totalAuctions}` : "—"}</div>
              <p className="small">
                {latestRun ? (
                  <Link href={`/auction/runs/${latestRun.id}`}>View per-auction breakdown</Link>
                ) : "—"}
              </p>
            </div>
          </div>
        </Section>

        <Section title="Reserve auto-tuning">
          {reserveSuggestions.length === 0 ? (
            <div className="card">
              <p>No slots configured. Define inventory in <Link href="/auction/inputs">Inputs</Link>.</p>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Slot</th>
                  <th>Current reserve</th>
                  <th>Suggested</th>
                  <th>Sample size</th>
                  <th>Lift estimate</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {reserveSuggestions.map(({ slot, suggestion }) => (
                  <tr key={slot.id}>
                    <td>{slot.name}</td>
                    <td>${(suggestion.currentReserveCents / 100).toFixed(2)}</td>
                    <td>${(suggestion.suggestedReserveCents / 100).toFixed(2)}</td>
                    <td>{suggestion.sampleSize}</td>
                    <td>
                      {suggestion.sampleSize < 4 ? (
                        <span className="small">need ≥4 fills</span>
                      ) : suggestion.expectedRevenueLift === 0 ? (
                        "0%"
                      ) : (
                        `${(suggestion.expectedRevenueLift * 100).toFixed(1)}%`
                      )}
                    </td>
                    <td>
                      <ApplyReserveButton
                        slotId={slot.id}
                        slotName={slot.name}
                        suggestedReserveCents={suggestion.suggestedReserveCents}
                        currentReserveCents={suggestion.currentReserveCents}
                        expectedDailyVolume={slot.expectedDailyVolume}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="small" style={{ marginTop: 12 }}>
            Suggestions use the 25th percentile of recent clearing prices for the slot. The
            lift estimate is conservative — it doesn&apos;t model bidder reaction to a higher
            floor, just the direct revenue impact across the historical sample.
          </p>
        </Section>

        <Section title={`Latest-run revenue concentration (run ${latestRun ? latestRun.id.slice(0, 8) : "—"}…)`}>
          {!latestRun || latestRun.spendSnapshots.length === 0 ? (
            <div className="card"><p>No advertiser-level revenue captured for the latest run.</p></div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Advertiser</th>
                  <th>Mode</th>
                  <th>Wins</th>
                  <th>Spend</th>
                  <th>Share</th>
                  <th>Squared share</th>
                </tr>
              </thead>
              <tbody>
                {latestRun.spendSnapshots
                  .slice()
                  .sort((a, b) => b.fillShare - a.fillShare)
                  .map((snap) => (
                    <tr key={snap.id}>
                      <td>{snap.advertiser.name}</td>
                      <td><code className="small">{snap.advertiser.behaviorMode}</code></td>
                      <td>{snap.totalWins}</td>
                      <td>${(snap.totalSpendCents / 100).toFixed(2)}</td>
                      <td>{(snap.fillShare * 100).toFixed(1)}%</td>
                      <td><code className="small">{(snap.fillShare ** 2).toFixed(4)}</code></td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </Section>
      </>
    );
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      return (
        <Section title="Marketplace health">
          <div className="card">
            <p>Auction tables are missing. Run database migrations.</p>
          </div>
        </Section>
      );
    }
    throw error;
  }
}
