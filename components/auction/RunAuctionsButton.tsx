"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { readErrorMessage } from "@/lib/api-contract";

export function RunAuctionsButton({
  defaultTotal = 60
}: {
  defaultTotal?: number;
}) {
  const router = useRouter();
  const [total, setTotal] = useState(defaultTotal);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  async function run() {
    setLoading(true);
    setStatus("");
    try {
      const response = await fetch("/api/auction/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ totalAuctions: total })
      });
      const json = await response.json();
      if (!json.ok) {
        setStatus(readErrorMessage(json, "Run failed."));
        return;
      }
      const runId = json.run?.id;
      if (runId) {
        router.push(`/auction/runs/${runId}`);
      } else {
        router.refresh();
      }
    } catch {
      setStatus("Network error while running auctions.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h3>Run auctions</h3>
      <p className="small">
        Each run executes the configured slots, advertisers, and bids through the auction engine
        N times with small per-iteration noise on bids and quality scores. Capped at 500.
      </p>
      <div className="grid grid-2" style={{ gap: 10 }}>
        <label>
          Total auctions
          <input
            type="number"
            min={1}
            max={500}
            step={1}
            value={total}
            onChange={(e) => setTotal(Math.min(500, Math.max(1, Number(e.target.value || 1))))}
          />
        </label>
      </div>
      <div className="ctaRow">
        <button type="button" onClick={run} disabled={loading}>
          {loading ? "Running..." : `Run ${total} auctions`}
        </button>
      </div>
      {status ? <p className="small">{status}</p> : null}
    </div>
  );
}
