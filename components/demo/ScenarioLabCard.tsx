"use client";

import { useMemo, useState } from "react";
import { DEMO_ASSUMPTION_DEFAULTS } from "@/lib/demo-assumptions";
import { SimulationCharts } from "@/components/demo/SimulationCharts";

type GenerateResult = {
  ok: boolean;
  campaignRunId?: string;
  generated?: number;
  estimatedRevenue?: number;
  error?: string;
};

type OutcomeCounts = {
  delivered: number;
  opens: number;
  clicks: number;
  engagements: number;
  purchases: number;
};

type OutcomeResult = {
  ok: boolean;
  counts?: OutcomeCounts;
  revenue?: number;
};

function randomAround(base: number, variance = 0.12) {
  const spread = base * variance;
  const delta = (Math.random() * spread * 2) - spread;
  return Math.max(0, base + delta);
}

export function ScenarioLabCard() {
  const [assumptionSetId, setAssumptionSetId] = useState<string>("");
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
  const [monteCarlo, setMonteCarlo] = useState<number[]>([]);

  const timeline = useMemo(() => {
    if (!outcomeResult?.counts) return [];
    return [
      `${deltaCount} changes detected`,
      `${Math.max(topN, outcomeResult.counts.clicks)} candidates filtered`,
      `${outcomeResult.counts.delivered} messages generated`,
      `$${Number(outcomeResult.revenue ?? 0).toFixed(2)} projected revenue`
    ];
  }, [deltaCount, topN, outcomeResult]);

  async function loadSavedAssumptions() {
    try {
      const response = await fetch("/api/lifecycle/assumptions", { cache: "no-store" });
      const payload = await response.json();
      const parsed = payload.activeAssumptions as Partial<typeof DEMO_ASSUMPTION_DEFAULTS> | undefined;
      if (!parsed) return;
      setAssumptionSetId(String(payload.activeSet?.id ?? ""));
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
    } catch {
      // no-op
    }
  }

  async function injectEvents() {
    setLoadingAction("inject");
    try {
      await fetch("/api/lifecycle/simulate-deltas", {
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
      const response = await fetch("/api/lifecycle/generate-campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topN,
          runName,
          recencyScore,
          minPriorityScore,
          highPriorityThreshold,
          revenuePerHighPriority,
          assumptionSetId
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
      const response = await fetch("/api/lifecycle/simulate-outcomes", {
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

  function runMonteCarlo() {
    const delivered = outcomeResult?.counts?.delivered ?? Math.max(1, topN);
    const runs = new Array(50).fill(0).map(() => {
      const opens = delivered * randomAround(openRate);
      const clicks = opens * randomAround(clickRate);
      const purchases = clicks * randomAround(purchaseRate);
      return purchases * randomAround(avgOrderValue, 0.15);
    });
    setMonteCarlo(runs);
  }

  return (
    <div className="card">
      <h3>Interactive scenario lab</h3>
      <p>Edit assumptions, run generation, and simulate downstream outcomes. Use recommended defaults first, then change one variable at a time.</p>

      <div className="grid grid-3" style={{ marginTop: 12, gap: 12 }}>
        <label>
          Run name
          <input value={runName} onChange={(e) => setRunName(e.target.value)} />
        </label>
        <label>
          Top N campaigns
          <input type="number" min={1} max={100} value={topN} onChange={(e) => setTopN(Number(e.target.value || 10))} />
          <span className="small">How many highest-priority candidates to include in this run (start: 15–25).</span>
        </label>
        <label>
          Inject delta events
          <input type="number" min={1} max={200} value={deltaCount} onChange={(e) => setDeltaCount(Number(e.target.value || 8))} />
          <span className="small">How many new trigger events to simulate before generation (start: 8–20).</span>
        </label>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
        <button type="button" onClick={loadSavedAssumptions} disabled={loadingAction !== null}>Load Active Assumptions</button>
        <button type="button" onClick={injectEvents} disabled={loadingAction !== null}>{loadingAction === "inject" ? "Injecting..." : "1) Inject Events"}</button>
        <button type="button" onClick={generate} disabled={loadingAction !== null}>{loadingAction === "generate" ? "Generating..." : "2) Generate Campaigns"}</button>
        <button type="button" onClick={simulateOutcomes} disabled={loadingAction !== null}>{loadingAction === "simulate" ? "Simulating..." : "3) Simulate Outcomes"}</button>
        <button type="button" onClick={runMonteCarlo} disabled={!outcomeResult?.counts}>Run Monte Carlo</button>
      </div>

      <details style={{ marginTop: 16 }}>
        <summary><strong>Advanced assumption controls</strong> (optional)</summary>
        <div className="grid grid-4" style={{ gap: 10, marginTop: 10 }}>
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
      </details>

      {generateResult && (
        <div style={{ marginTop: 14 }}>
          <h3>Generation result</h3>
          <p>Run ID: <code>{generateResult.campaignRunId ?? "n/a"}</code></p>
          <p>Assumption set: <code>{assumptionSetId || "default-inline"}</code></p>
          <p>Generated: {generateResult.generated ?? 0}</p>
          <p>Estimated revenue: ${Number(generateResult.estimatedRevenue ?? 0).toFixed(2)}</p>
        </div>
      )}

      {outcomeResult?.counts && (
        <div style={{ marginTop: 14 }}>
          <h3>Simulation and outputs</h3>
          <SimulationCharts counts={outcomeResult.counts} monteCarlo={monteCarlo} />
          <div className="card" style={{ marginTop: 12 }}>
            <h3>Simulation timeline</h3>
            <ol>
              {timeline.map((event) => <li key={event}>{event}</li>)}
            </ol>
            <p className="small">Projected revenue: ${Number(outcomeResult.revenue ?? 0).toFixed(2)}</p>
          </div>
        </div>
      )}
    </div>
  );
}
