"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PricingSimulationButton({ experimentId }: { experimentId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [conversionLift, setConversionLift] = useState("7");
  const [churnSensitivity, setChurnSensitivity] = useState("1.1");
  const [supportLoad, setSupportLoad] = useState("1");
  const [demandElasticity, setDemandElasticity] = useState("0.35");

  async function runSimulation() {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/pricing/experiments/${experimentId}/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversionLiftPercent: Number(conversionLift),
          churnSensitivityPercent: Number(churnSensitivity),
          supportLoadSensitivity: Number(supportLoad),
          demandElasticity: Number(demandElasticity)
        })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message ?? "Simulation failed");
      setMessage(`Recommendation: ${payload.simulation.recommendation}`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Simulation failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card editorCard">
      <div className="editorHeader">
        <h3>Scenario assumptions</h3>
        <p className="editorKicker">Simulation controls</p>
      </div>
      <div className="grid grid-4">
        <label>Conversion lift (%)
          <input type="number" step="0.5" value={conversionLift} onChange={(event) => setConversionLift(event.target.value)} />
          <span className="small">Expected demand lift before price elasticity.</span>
        </label>
        <label>Churn sensitivity
          <input type="number" step="0.1" value={churnSensitivity} onChange={(event) => setChurnSensitivity(event.target.value)} />
          <span className="small">Higher values penalize price increases.</span>
        </label>
        <label>Support-load sensitivity
          <input type="number" step="0.1" value={supportLoad} onChange={(event) => setSupportLoad(event.target.value)} />
          <span className="small">Stress-tests operational drag.</span>
        </label>
        <label>Demand elasticity
          <input type="number" step="0.05" value={demandElasticity} onChange={(event) => setDemandElasticity(event.target.value)} />
          <span className="small">Higher values reduce conversion under price lift.</span>
        </label>
      </div>
      <div className="editorActions">
        <button type="button" onClick={runSimulation} disabled={loading}>
          {loading ? "Running..." : "Run pricing simulation"}
        </button>
        {message ? <p className="saveStatus">{message}</p> : null}
      </div>
    </div>
  );
}
