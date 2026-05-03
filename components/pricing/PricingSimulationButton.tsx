"use client";

import { useState } from "react";

export function PricingSimulationButton({ experimentId }: { experimentId: string }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function runSimulation() {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/pricing/experiments/${experimentId}/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversionLiftPercent: 7,
          churnSensitivityPercent: 1.1,
          supportLoadSensitivity: 1,
          demandElasticity: 0.35
        })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message ?? "Simulation failed");
      setMessage(`Recommendation: ${payload.data.simulation.recommendation}`);
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Simulation failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button type="button" onClick={runSimulation} disabled={loading}>
        {loading ? "Running..." : "Run pricing simulation"}
      </button>
      {message ? <p className="small" style={{ marginTop: 8 }}>{message}</p> : null}
    </div>
  );
}
