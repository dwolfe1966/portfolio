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

const MAX_VISIBLE = 18;

export function AuctionLiveTicker({ runId }: { runId: string }) {
  const [events, setEvents] = useState<TickerEvent[]>([]);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || typeof EventSource === "undefined") {
      setError("Live ticker requires a browser with EventSource support.");
      return;
    }
    const source = new EventSource(`/api/auction/runs/${runId}/stream`);
    sourceRef.current = source;

    source.addEventListener("auction", (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data) as TickerEvent;
        setEvents((prev) => {
          const next = [data, ...prev];
          return next.slice(0, MAX_VISIBLE);
        });
      } catch {
        // ignore malformed payloads
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

  return (
    <div className="card">
      <h3>Live auction stream</h3>
      <p className="small">
        Plays back the run&apos;s auctions one by one as they fire. {done ? "Stream complete." : "Streaming..."}
      </p>
      {error ? <p className="small bandText--unhealthy">{error}</p> : null}

      {events.length === 0 ? (
        <p className="small">Waiting for first auction…</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>#</th>
              <th>Slot</th>
              <th>Outcome</th>
              <th>Clearing</th>
              <th>Top bidder</th>
            </tr>
          </thead>
          <tbody>
            {events.map((evt) => {
              const winner = evt.rankedBids.find((b) => b.advertiserId === evt.winnerAdvertiserId);
              return (
                <tr key={evt.iterationIndex}>
                  <td><code className="small">{evt.iterationIndex}</code></td>
                  <td>{evt.slot.name}</td>
                  <td>
                    <span className={`small bandText--${evt.filled ? "healthy" : "unhealthy"}`}>
                      {evt.filled ? "filled" : "unfilled"}
                    </span>
                  </td>
                  <td>
                    {evt.clearingPriceCents != null
                      ? `$${(evt.clearingPriceCents / 100).toFixed(2)}`
                      : "—"}
                  </td>
                  <td>
                    {winner ? (
                      <>
                        {winner.advertiserName}
                        <div className="small">
                          <code className="small">{winner.behaviorMode}</code>
                          {" · adj "}
                          <code className="small">{winner.adjustedScore.toFixed(1)}</code>
                        </div>
                      </>
                    ) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
