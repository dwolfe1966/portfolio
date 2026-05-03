"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ExpansionRunButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function runExpansionModel() {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/expansion/runs", { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message ?? "Expansion run failed");
      setMessage(`Recommendation: ${payload.simulation.recommendation}`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Expansion run failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card editorCard">
      <div className="editorHeader">
        <h3>Expansion scoring control</h3>
        <p className="editorKicker">Portfolio run</p>
      </div>
      <p className="small">Scores all seeded accounts, recommends expansion motions, and persists ARR economics to Outputs and Audit.</p>
      <div className="editorActions">
        <button type="button" onClick={runExpansionModel} disabled={loading}>
          {loading ? "Scoring..." : "Run expansion model"}
        </button>
        {message ? <p className="saveStatus">{message}</p> : null}
      </div>
    </div>
  );
}
