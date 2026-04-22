"use client";

import { useState } from "react";

type GenerateResult = {
  ok: boolean;
  campaignRunId?: string;
  generated?: number;
  estimatedRevenue?: number;
  error?: string;
};

type OutcomeResult = {
  ok: boolean;
  counts?: {
    delivered: number;
    opens: number;
    clicks: number;
    engagements: number;
    purchases: number;
  };
  revenue?: number;
};

export function ScenarioLabCard() {
  const [runName, setRunName] = useState("Scenario Run");
  const [topN, setTopN] = useState(10);
  const [deltaCount, setDeltaCount] = useState(8);

  const [openRate, setOpenRate] = useState(0.3);
  const [clickRate, setClickRate] = useState(0.08);
  const [engageRate, setEngageRate] = useState(0.04);
  const [purchaseRate, setPurchaseRate] = useState(0.012);
  const [avgOrderValue, setAvgOrderValue] = useState(89);

  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [generateResult, setGenerateResult] = useState<GenerateResult | null>(null);
  const [outcomeResult, setOutcomeResult] = useState<OutcomeResult | null>(null);

  async function injectEvents() {
    setLoadingAction("inject");
    try {
      await fetch("/api/simulate-deltas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: deltaCount })
      });
    } finally {
      setLoadingAction(null);
    }
  }

  async function generate() {
    setLoadingAction("generate");
    setGenerateResult(null);
    try {
      const response = await fetch("/api/generate-campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topN, runName })
      });
      const payload = (await response.json()) as GenerateResult;
      setGenerateResult(payload);
    } catch {
      setGenerateResult({ ok: false, error: "Failed to generate campaigns." });
    } finally {
      setLoadingAction(null);
    }
  }

  async function simulateOutcomes() {
    setLoadingAction("simulate");
    setOutcomeResult(null);
    try {
      const response = await fetch("/api/simulate-outcomes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          openRate,
          clickRate,
          engageRate,
          purchaseRate,
          avgOrderValue
        })
      });
      const payload = (await response.json()) as OutcomeResult;
      setOutcomeResult(payload);
    } finally {
      setLoadingAction(null);
    }
  }

  return (
    <div className="card">
      <h3>Interactive scenario lab</h3>
      <p>Edit upstream data, run generation, then simulate downstream outcomes.</p>

      <div className="grid grid-2" style={{ marginTop: 12, gap: 12 }}>
        <label>
          Run name
          <input value={runName} onChange={(e) => setRunName(e.target.value)} />
        </label>
        <label>
          Top N campaigns
          <input type="number" min={1} max={100} value={topN} onChange={(e) => setTopN(Number(e.target.value || 10))} />
        </label>
        <label>
          Inject delta events
          <input type="number" min={1} max={200} value={deltaCount} onChange={(e) => setDeltaCount(Number(e.target.value || 8))} />
        </label>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
        <button type="button" onClick={injectEvents} disabled={loadingAction !== null}>
          {loadingAction === "inject" ? "Injecting..." : "1) Inject Events"}
        </button>
        <button type="button" onClick={generate} disabled={loadingAction !== null}>
          {loadingAction === "generate" ? "Generating..." : "2) Generate Campaigns"}
        </button>
        <button type="button" onClick={simulateOutcomes} disabled={loadingAction !== null}>
          {loadingAction === "simulate" ? "Simulating..." : "3) Simulate Outcomes"}
        </button>
      </div>

      <h3 style={{ marginTop: 16 }}>Global outcome assumptions</h3>
      <div className="grid grid-3" style={{ gap: 10 }}>
        <label>Open rate<input type="number" step="0.01" min={0} max={1} value={openRate} onChange={(e) => setOpenRate(Number(e.target.value || 0))} /></label>
        <label>Click rate<input type="number" step="0.01" min={0} max={1} value={clickRate} onChange={(e) => setClickRate(Number(e.target.value || 0))} /></label>
        <label>Engage rate<input type="number" step="0.01" min={0} max={1} value={engageRate} onChange={(e) => setEngageRate(Number(e.target.value || 0))} /></label>
        <label>Purchase rate<input type="number" step="0.001" min={0} max={1} value={purchaseRate} onChange={(e) => setPurchaseRate(Number(e.target.value || 0))} /></label>
        <label>Avg order value<input type="number" min={0} value={avgOrderValue} onChange={(e) => setAvgOrderValue(Number(e.target.value || 0))} /></label>
      </div>

      {generateResult && (
        <div style={{ marginTop: 14 }}>
          <h3>Generation result</h3>
          <p>Run ID: <code>{generateResult.campaignRunId ?? "n/a"}</code></p>
          <p>Generated: {generateResult.generated ?? 0}</p>
          <p>Estimated revenue: ${Number(generateResult.estimatedRevenue ?? 0).toFixed(2)}</p>
        </div>
      )}

      {outcomeResult?.counts && (
        <div style={{ marginTop: 14 }}>
          <h3>Downstream outcomes</h3>
          <p>Delivered: {outcomeResult.counts.delivered}</p>
          <p>Opens: {outcomeResult.counts.opens}</p>
          <p>Clicks: {outcomeResult.counts.clicks}</p>
          <p>Engagements: {outcomeResult.counts.engagements}</p>
          <p>Purchases: {outcomeResult.counts.purchases}</p>
          <p>Projected revenue: ${Number(outcomeResult.revenue ?? 0).toFixed(2)}</p>
        </div>
      )}
    </div>
  );
}
