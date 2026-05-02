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
export function AuctionBidVisualizer({ runId }: { runId: string }) {
  const [current, setCurrent] = useState<TickerEvent | null>(null);
  const [count, setCount] = useState(0);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || typeof EventSource === "undefined") {
      setError("Live visualizer requires a browser with EventSource support.");
      return;
    }
    const source = new EventSource(`/api/auction/runs/${runId}/stream`);
    sourceRef.current = source;

    source.addEventListener("auction", (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data) as TickerEvent;
        setCurrent(data);
        setCount((prev) => prev + 1);
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

  return (
    <div className="card">
      <h3>
        Per-bid visualization
        {" "}
        <span className="small">— auction {current.iterationIndex + 1}{done ? " (final)" : ""}</span>
      </h3>
      <p className="small">
        Slot <strong>{current.slot.name}</strong> · reserve ${(current.reservePriceCents / 100).toFixed(2)} ·
        {" "}
        {current.filled ? (
          <>
            cleared at <strong>${((current.clearingPriceCents ?? 0) / 100).toFixed(2)}</strong>
          </>
        ) : (
          <span className="bandText--unhealthy">unfilled</span>
        )}
        {" · "}
        {count} of {done ? count : "…"} streamed
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
                        transition: "width 0.2s ease"
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
          Bar width = effective bid (cents). Dashed line = reserve. Solid white tick on winner = clearing price.
        </div>
      </div>
    </div>
  );
}
