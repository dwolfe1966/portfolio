"use client";

import { useState } from "react";

export function RetentionRunButton() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function runPortfolio() {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/retention/runs", { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message ?? "Retention run failed");
      setMessage(`Recommendation: ${payload.simulation.recommendation}`);
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Retention run failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h3>Risk scoring control</h3>
      <p className="small">Scores all seeded accounts, recommends playbooks, and persists portfolio economics to Outputs and Audit.</p>
      <button type="button" onClick={runPortfolio} disabled={loading}>
        {loading ? "Scoring..." : "Run retention risk model"}
      </button>
      {message ? <p className="small" style={{ marginTop: 8 }}>{message}</p> : null}
    </div>
  );
}
