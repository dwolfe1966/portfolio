"use client";

import { useState } from "react";

const decisions = ["promote", "extend", "pause", "rollback"];

export function PricingDecisionForm({ experimentId }: { experimentId: string }) {
  const [decision, setDecision] = useState("extend");
  const [rationale, setRationale] = useState("Continue until confidence and guardrails are stable.");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/pricing/experiments/${experimentId}/decisions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, rationale, actor: "demo-operator" })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message ?? "Decision failed");
      setMessage("Decision recorded.");
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Decision failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h3>Record operator decision</h3>
      <label>
        Decision
        <select value={decision} onChange={(e) => setDecision(e.target.value)}>
          {decisions.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </label>
      <label>
        Rationale
        <textarea value={rationale} onChange={(e) => setRationale(e.target.value)} rows={3} />
      </label>
      <button type="button" onClick={submit} disabled={loading}>
        {loading ? "Recording..." : "Record decision"}
      </button>
      {message ? <p className="small" style={{ marginTop: 8 }}>{message}</p> : null}
    </div>
  );
}
