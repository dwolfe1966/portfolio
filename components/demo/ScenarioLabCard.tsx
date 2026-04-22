"use client";

import { useState } from "react";
import { DEMO_ASSUMPTIONS_KEY, DEMO_ASSUMPTION_DEFAULTS } from "@/lib/demo-assumptions";

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
  const [topN, setTopN] = useState(DEMO_ASSUMPTION_DEFAULTS.defaultTopN);
  const [deltaCount, setDeltaCount] = useState(8);
  const [recencyScore, setRecencyScore] = useState(DEMO_ASSUMPTION_DEFAULTS.recencyScore);
  const [minPriorityScore, setMinPriorityScore] = useState(DEMO_ASSUMPTION_DEFAULTS.minPriorityScore);
  const [highPriorityThreshold, setHighPriorityThreshold] = useState(DEMO_ASSUMPTION_DEFAULTS.highPriorityThreshold);
  const [revenuePerHighPriority, setRevenuePerHighPriority] = useState(DEMO_ASSUMPTION_DEFAULTS.revenuePerHighPriority);

  const [openRate, setOpenRate] = useState(DEMO_ASSUMPTION_DEFAULTS.openRate);
  const [clickRate, setClickRate] = useState(DEMO_ASSUMPTION_DEFAULTS.clickRate);
  const [engageRate, setEngageRate] = useState(DEMO_ASSUMPTION_DEFAULTS.engageRate);
  const [purchaseRate, setPurchaseRate] = useState(DEMO_ASSUMPTION_DEFAULTS.purchaseRate);
  const [avgOrderValue, setAvgOrderValue] = useState(DEMO_ASSUMPTION_DEFAULTS.avgOrderValue);

  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [generateResult, setGenerateResult] = useState<GenerateResult | null>(null);
  const [outcomeResult, setOutcomeResult] = useState<OutcomeResult | null>(null);

  function loadSavedAssumptions() {
    try {
      const raw = localStorage.getItem(DEMO_ASSUMPTIONS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<typeof DEMO_ASSUMPTION_DEFAULTS>;
      setTopN(Number(parsed.defaultTopN ?? DEMO_ASSUMPTION_DEFAULTS.defaultTopN));
      setRecencyScore(Number(parsed.recencyScore ?? DEMO_ASSUMPTION_DEFAULTS.recencyScore));
      setMinPriorityScore(Number(parsed.minPriorityScore ?? DEMO_ASSUMPTION_DEFAULTS.minPriorityScore));
      setHighPriorityThreshold(Number(parsed.highPriorityThreshold ?? DEMO_ASSUMPTION_DEFAULTS.highPriorityThreshold));
      setRevenuePerHighPriority(Number(parsed.revenuePerHighPriority ?? DEMO_ASSUMPTION_DEFAULTS.revenuePerHighPriority));
      setOpenRate(Number(parsed.openRate ?? DEMO_ASSUMPTION_DEFAULTS.openRate));
      setClickRate(Number(parsed.clickRate ?? DEMO_ASSUMPTION_DEFAULTS.clickRate));
      setEngageRate(Number(parsed.engageRate ?? DEMO_ASSUMPTION_DEFAULTS.engageRate));
      setPurchaseRate(Number(parsed.purchaseRate ?? DEMO_ASSUMPTION_DEFAULTS.purchaseRate));
      setAvgOrderValue(Number(parsed.avgOrderValue ?? DEMO_ASSUMPTION_DEFAULTS.avgOrderValue));
    } catch {}
  }

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
        body: JSON.stringify({
          topN,
          runName,
          recencyScore,
          minPriorityScore,
          highPriorityThreshold,
          revenuePerHighPriority
        })
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
        <button type="button" onClick={loadSavedAssumptions} disabled={loadingAction !== null}>
          Load Saved Assumptions
        </button>
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
        <label>Recency score<input type="number" step="0.01" min={0} max={1} value={recencyScore} onChange={(e) => setRecencyScore(Number(e.target.value || 0))} /></label>
        <label>Min priority score<input type="number" step="0.01" min={0} max={1} value={minPriorityScore} onChange={(e) => setMinPriorityScore(Number(e.target.value || 0))} /></label>
        <label>High-priority threshold<input type="number" step="0.01" min={0} max={1} value={highPriorityThreshold} onChange={(e) => setHighPriorityThreshold(Number(e.target.value || 0))} /></label>
        <label>Revenue / high-priority<input type="number" min={0} value={revenuePerHighPriority} onChange={(e) => setRevenuePerHighPriority(Number(e.target.value || 0))} /></label>
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
