"use client";

import { useEffect, useRef, useState } from "react";

type RankedBid = {
  advertiserId: string;
  advertiserName: string;
  behaviorMode: string;
  bidCents: number;
  effectiveBidCents: number;
  qualityScore: number;
  adjustedScore: number;
  eligible: boolean;
  ineligibilityReason: string | null;
  rank: number;
};

type TickerEvent = {
  iterationIndex: number;
  slot: { id: string; name: string; reservePriceCents: number };
  filled: boolean;
  winnerAdvertiserId: string | null;
  clearingPriceCents: number | null;
  reservePriceCents: number;
  rankedBids: RankedBid[];
};

const REASON_LABEL: Record<string, string> = {
  budget_exhausted: "Budget exhausted",
  pacing_throttle: "Pacing throttle",
  below_reserve: "Below reserve",
  ineligible: "Ineligible"
};

/**
 * Per-auction bid landscape. Each new SSE auction event swaps in a fresh
 * bar chart of effective bids for that auction; eligibility, winner, and
 * clearing price are drawn directly on the bars.
 *
 * Bars use --demo-accent and band colors so they match the rest of the
 * Mission Control visual language. No chart library — just CSS widths.
 */
type RunningStats = {
  totalCents: number;
  filledCount: number;
  totalCount: number;
  clearingHistory: number[]; // newest first, capped
};

const HISTORY_CAP = 60;

export function AuctionBidVisualizer({ runId }: { runId: string }) {
  const [current, setCurrent] = useState<TickerEvent | null>(null);
  const [meta, setMeta] = useState<{ total: number } | null>(null);
  const [stats, setStats] = useState<RunningStats>({
    totalCents: 0,
    filledCount: 0,
    totalCount: 0,
    clearingHistory: []
  });
  const [pulseId, setPulseId] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sourceRef = useRef<EventSource | null>(null);
  const pulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || typeof EventSource === "undefined") {
      setError("Live visualizer requires a browser with EventSource support.");
      return;
    }
    const source = new EventSource(`/api/auction/runs/${runId}/stream`);
    sourceRef.current = source;

    source.addEventListener("meta", (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data) as { total: number };
        setMeta({ total: data.total });
      } catch {
        // ignore
      }
    });
    source.addEventListener("auction", (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data) as TickerEvent;
        setCurrent(data);
        setStats((prev) => {
          const cleared = data.filled && data.clearingPriceCents != null ? data.clearingPriceCents : 0;
          return {
            totalCents: prev.totalCents + cleared,
            filledCount: prev.filledCount + (data.filled ? 1 : 0),
            totalCount: prev.totalCount + 1,
            clearingHistory: [
              data.clearingPriceCents ?? 0,
              ...prev.clearingHistory
            ].slice(0, HISTORY_CAP)
          };
        });
        if (data.filled && data.winnerAdvertiserId) {
          if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
          const key = `${data.iterationIndex}:${data.winnerAdvertiserId}`;
          setPulseId(key);
          pulseTimerRef.current = setTimeout(() => setPulseId(null), 480);
        }
      } catch {
        // ignore malformed payload
      }
    });
    source.addEventListener("done", () => {
      setDone(true);
      source.close();
    });
    source.onerror = () => {
      setError("Live stream interrupted.");
      source.close();
    };

    return () => {
      source.close();
      if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
    };
  }, [runId]);

  if (error) {
    return <div className="card"><p className="small bandText--unhealthy">{error}</p></div>;
  }

  if (!current) {
    return (
      <div className="card">
        <h3>Per-bid visualization</h3>
        <p className="small">Waiting for first auction…</p>
      </div>
    );
  }

  // Normalize bar widths: largest effective bid in this auction = 100%.
  const maxEffective = Math.max(
    ...current.rankedBids.map((b) => b.effectiveBidCents),
    current.reservePriceCents,
    1
  );
  // Clamp the reserve line position to stay inside the chart.
  const reservePct = Math.min(100, (current.reservePriceCents / maxEffective) * 100);

  const fillRate = stats.totalCount > 0 ? stats.filledCount / stats.totalCount : 0;
  const totalForProgress = meta?.total ?? 0;
  const progressPct = totalForProgress > 0
    ? Math.min(100, (stats.totalCount / totalForProgress) * 100)
    : 0;

  return (
    <div className="card">
      <style>{PULSE_KEYFRAMES}</style>
      <h3>
        Per-bid visualization
        {" "}
        <span className="small">— auction {current.iterationIndex + 1}{done ? " (final)" : ""}</span>
      </h3>

      {/* Cumulative stats strip — counters tick up as auctions stream. */}
      <div className="grid grid-4" style={{ gap: 10, marginTop: 8, marginBottom: 12 }}>
        <div>
          <p className="small">Cumulative revenue</p>
          <div className="kpi" style={{ transition: "color 0.2s ease" }}>
            ${(stats.totalCents / 100).toFixed(2)}
          </div>
        </div>
        <div>
          <p className="small">Filled</p>
          <div className="kpi">
            {stats.filledCount}<span className="small"> / {stats.totalCount}</span>
          </div>
        </div>
        <div>
          <p className="small">Fill rate</p>
          <div className={`kpi bandText--${fillRate >= 0.7 ? "healthy" : fillRate >= 0.4 ? "watch" : "unhealthy"}`}>
            {(fillRate * 100).toFixed(0)}%
          </div>
        </div>
        <div>
          <p className="small">Progress</p>
          <div className="kpi">{stats.totalCount}{totalForProgress > 0 ? <span className="small"> / {totalForProgress}</span> : null}</div>
          {totalForProgress > 0 ? (
            <div style={{ marginTop: 4, height: 4, background: "rgba(0,0,0,0.08)", borderRadius: 2, overflow: "hidden" }}>
              <div
                style={{
                  width: `${progressPct}%`,
                  height: "100%",
                  background: "var(--demo-accent, #1e6ddc)",
                  transition: "width 0.2s ease"
                }}
              />
            </div>
          ) : null}
        </div>
      </div>

      {/* Clearing-price sparkline — last 60 clearings, oldest left, newest right. */}
      {stats.clearingHistory.length > 1 ? (
        <ClearingSparkline values={[...stats.clearingHistory].reverse()} />
      ) : null}

      <p className="small" style={{ marginTop: 12 }}>
        Slot <strong>{current.slot.name}</strong> · reserve ${(current.reservePriceCents / 100).toFixed(2)} ·
        {" "}
        {current.filled ? (
          <>
            cleared at <strong>${((current.clearingPriceCents ?? 0) / 100).toFixed(2)}</strong>
          </>
        ) : (
          <span className="bandText--unhealthy">unfilled</span>
        )}
      </p>

      <div style={{ position: "relative", marginTop: 12 }}>
        {/* Reserve line drawn across all bars. */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${reservePct}%`,
            borderLeft: "2px dashed var(--demo-text-muted, #5a6371)",
            opacity: 0.6,
            pointerEvents: "none"
          }}
          title={`Reserve $${(current.reservePriceCents / 100).toFixed(2)}`}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {[...current.rankedBids]
            .sort((a, b) => {
              if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
              return b.effectiveBidCents - a.effectiveBidCents;
            })
            .map((bid) => {
              const widthPct = Math.max(2, Math.round((bid.effectiveBidCents / maxEffective) * 100));
              const isWinner = bid.advertiserId === current.winnerAdvertiserId;
              const band = isWinner
                ? "healthy"
                : bid.eligible
                  ? "neutral"
                  : "unhealthy";
              const barColor =
                band === "healthy"
                  ? "var(--band-healthy, #0f6b3b)"
                  : band === "unhealthy"
                    ? "var(--band-unhealthy, #a02020)"
                    : "var(--demo-accent, #1e6ddc)";
              const reasonText = bid.ineligibilityReason
                ? REASON_LABEL[bid.ineligibilityReason] ?? bid.ineligibilityReason
                : null;
              return (
                <div key={bid.advertiserId} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 140, fontSize: 13, fontWeight: isWinner ? 600 : 400 }}>
                    {bid.advertiserName}
                    <div className="small" style={{ color: "var(--demo-text-muted, #5a6371)" }}>
                      <code>{bid.behaviorMode}</code> · q{bid.qualityScore.toFixed(2)}
                    </div>
                  </div>
                  <div style={{ flex: 1, position: "relative", height: 28, background: "rgba(0,0,0,0.04)", borderRadius: 3 }}>
                    <div
                      style={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: `${widthPct}%`,
                        background: barColor,
                        opacity: bid.eligible ? 1 : 0.35,
                        borderRadius: 3,
                        transition: "width 0.25s ease",
                        animation: isWinner && pulseId === `${current.iterationIndex}:${bid.advertiserId}`
                          ? "auctionWinPulse 0.48s ease-out"
                          : undefined
                      }}
                    />
                    {/* Clearing-price tick on the winner's bar. */}
                    {isWinner && current.clearingPriceCents != null ? (
                      <div
                        aria-hidden
                        style={{
                          position: "absolute",
                          top: -2,
                          bottom: -2,
                          left: `${Math.min(100, (current.clearingPriceCents / maxEffective) * 100)}%`,
                          borderLeft: "2px solid #fff",
                          mixBlendMode: "difference"
                        }}
                        title={`Clearing $${(current.clearingPriceCents / 100).toFixed(2)}`}
                      />
                    ) : null}
                    <div
                      style={{
                        position: "absolute",
                        left: 8,
                        top: "50%",
                        transform: "translateY(-50%)",
                        fontFamily: "var(--demo-mono, monospace)",
                        fontSize: 11,
                        color: bid.eligible ? "#fff" : "var(--demo-text-muted, #5a6371)",
                        whiteSpace: "nowrap"
                      }}
                    >
                      ${(bid.effectiveBidCents / 100).toFixed(2)}
                      {" · adj "}
                      {bid.adjustedScore.toFixed(0)}
                      {!bid.eligible && reasonText ? ` · ${reasonText}` : ""}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
        <div className="small" style={{ marginTop: 8, color: "var(--demo-text-muted, #5a6371)" }}>
          Bar width = effective bid. Dashed line = reserve. Solid white tick on winner = clearing price.
          Cumulative metrics tick up as auctions stream; winner bars pulse green on each clear.
        </div>
      </div>
    </div>
  );
}

const PULSE_KEYFRAMES = `
@keyframes auctionWinPulse {
  0% { box-shadow: 0 0 0 0 rgba(15, 107, 59, 0.55); filter: brightness(1.15); }
  60% { box-shadow: 0 0 0 8px rgba(15, 107, 59, 0); filter: brightness(1); }
  100% { box-shadow: 0 0 0 0 rgba(15, 107, 59, 0); filter: brightness(1); }
}
`;

function ClearingSparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const width = 320;
  const height = 44;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = Math.max(max - min, 1);
  const step = width / Math.max(values.length - 1, 1);

  const points = values.map((value, idx) => {
    const x = idx * step;
    const y = height - ((value - min) / span) * (height - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const pathD = `M ${points[0]} L ${points.slice(1).join(" L ")}`;

  const lastValue = values[values.length - 1];
  const lastX = (values.length - 1) * step;
  const lastY = height - ((lastValue - min) / span) * (height - 4) - 2;

  return (
    <div>
      <p className="small" style={{ marginBottom: 4 }}>
        Clearing-price sparkline · last {values.length} auctions ·
        {" "}
        latest <strong>${(lastValue / 100).toFixed(2)}</strong>
        {" · "}
        range ${(min / 100).toFixed(2)}–${(max / 100).toFixed(2)}
      </p>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        style={{ width: "100%", height: 44, display: "block" }}
        role="img"
        aria-label="Clearing-price sparkline"
      >
        <path
          d={pathD}
          fill="none"
          stroke="var(--demo-accent, #1e6ddc)"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx={lastX} cy={lastY} r={2.6} fill="var(--demo-accent, #1e6ddc)" />
      </svg>
    </div>
  );
}
