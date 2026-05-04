"use client";

import { useEffect, useMemo, useState } from "react";
import { DEMO_ASSUMPTION_DEFAULTS } from "@/lib/demo-assumptions";
import { SimulationCharts } from "@/components/demo/SimulationCharts";

type GenerateResult = {
  ok: boolean;
  campaignRunId?: string;
  generated?: number;
  estimatedRevenue?: number;
  error?: string | { message?: string };
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
  const [highPriorityLift, setHighPriorityLift] = useState(DEMO_ASSUMPTION_DEFAULTS.highPriorityLift);

  const [openRate, setOpenRate] = useState(DEMO_ASSUMPTION_DEFAULTS.openRate);
  const [clickRate, setClickRate] = useState(DEMO_ASSUMPTION_DEFAULTS.clickRate);
  const [engageRate, setEngageRate] = useState(DEMO_ASSUMPTION_DEFAULTS.engageRate);
  const [purchaseRate, setPurchaseRate] = useState(DEMO_ASSUMPTION_DEFAULTS.purchaseRate);
  const [avgOrderValue, setAvgOrderValue] = useState(DEMO_ASSUMPTION_DEFAULTS.avgOrderValue);

  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [generateResult, setGenerateResult] = useState<GenerateResult | null>(null);
  const [outcomeResult, setOutcomeResult] = useState<OutcomeResult | null>(null);
  const [monteCarlo, setMonteCarlo] = useState<number[]>([]);
  const [monteCarloRunCount, setMonteCarloRunCount] = useState(0);
  const [monteCarloLastRunAt, setMonteCarloLastRunAt] = useState<string | null>(null);
  const [aiProgressStep, setAiProgressStep] = useState(0);

  const aiProgressMessages = useMemo(() => {
    const targetCount = Math.max(1, Number(topN || 1));
    return [
      "Matching fresh entity changes to user interest edges.",
      `Ranking candidates and selecting the top ${targetCount} opportunities.`,
      "Starting OpenAI generation for each selected user.",
      `Generating custom AI subject lines, email bodies, landing copy, and CTAs for up to ${targetCount} recipients.`,
      "Validating OpenAI JSON output before saving message assets.",
      "Saving generated messages and campaign run metadata.",
      "Finalizing revenue estimates and audit records."
    ];
  }, [topN]);

  const generateButtonLabels = useMemo(() => {
    const targetCount = Math.max(1, Number(topN || 1));
    return [
      "Matching signals...",
      `Ranking top ${targetCount}...`,
      "Calling OpenAI...",
      "Writing AI subject lines...",
      "Writing AI message copy...",
      "Saving generated messages...",
      "Finalizing campaign run..."
    ];
  }, [topN]);

  const timeline = useMemo(() => {
    if (!outcomeResult?.counts) return [];
    return [
      `${deltaCount} changes detected`,
      `${Math.max(topN, outcomeResult.counts.clicks)} candidates filtered`,
      `${outcomeResult.counts.delivered} messages generated`,
      `$${Number(outcomeResult.revenue ?? 0).toFixed(2)} projected revenue`
    ];
  }, [deltaCount, topN, outcomeResult]);

  useEffect(() => {
    if (loadingAction !== "generate") {
      setAiProgressStep(0);
      return;
    }

    const timer = window.setInterval(() => {
      setAiProgressStep((step) => Math.min(step + 1, aiProgressMessages.length - 1));
    }, 2200);

    return () => window.clearInterval(timer);
  }, [aiProgressMessages.length, loadingAction]);

  function readGenerateError(payload: GenerateResult) {
    if (typeof payload.error === "string") return payload.error;
    if (payload.error?.message) return payload.error.message;
    return "Generation failed.";
  }

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
      setHighPriorityLift(Number(parsed.highPriorityLift ?? DEMO_ASSUMPTION_DEFAULTS.highPriorityLift));
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
          highPriorityLift,
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

  async function simulateOutcomes(): Promise<OutcomeResult | null> {
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
      return payload;
    } finally {
      setLoadingAction(null);
    }
  }

  async function runMonteCarlo() {
    const baseOutcome = outcomeResult?.counts ? outcomeResult : await simulateOutcomes();
    const delivered = baseOutcome?.counts?.delivered ?? Math.max(1, topN);
    const runs = new Array(50).fill(0).map(() => {
      const opens = delivered * randomAround(openRate);
      const clicks = opens * randomAround(clickRate);
      const purchases = clicks * randomAround(purchaseRate);
      return purchases * randomAround(avgOrderValue, 0.15);
    });
    setMonteCarlo(runs);
    setMonteCarloRunCount((value) => value + 1);
    setMonteCarloLastRunAt(new Date().toLocaleTimeString());
  }

  return (
    <div className="card">
      <h3>Lifecycle simulation</h3>
      <p>Run the scenario from signal creation through campaign generation and modeled revenue. Start with defaults, then change one variable at a time.</p>

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
        <button type="button" onClick={generate} disabled={loadingAction !== null}>
          {loadingAction === "generate" ? generateButtonLabels[aiProgressStep] : "2) Generate Campaigns"}
        </button>
        <button type="button" onClick={simulateOutcomes} disabled={loadingAction !== null}>{loadingAction === "simulate" ? "Simulating..." : "3) Simulate Outcomes"}</button>
        <button type="button" onClick={runMonteCarlo} disabled={loadingAction !== null}>Run Monte Carlo {monteCarloRunCount > 0 ? `(run ${monteCarloRunCount})` : ""}</button>
      </div>
      {loadingAction === "generate" && (
        <div className="card" style={{ marginTop: 12, borderColor: "#3b82f6" }} aria-live="polite">
          <p className="small" style={{ marginBottom: 6 }}>OpenAI lifecycle generation in progress</p>
          <p style={{ marginBottom: 8 }}>
            {aiProgressMessages[aiProgressStep]} This can take longer because the app is calling OpenAI for personalized subject lines and message copy, not reusing templates.
          </p>
          <div className="progressTrack" aria-hidden="true">
            <div
              className="progressFill"
              style={{ width: `${Math.max(14, ((aiProgressStep + 1) / aiProgressMessages.length) * 100)}%` }}
            />
          </div>
          <p className="small" style={{ marginTop: 8 }}>
            Step {aiProgressStep + 1} of {aiProgressMessages.length}. Keep this page open while messages are generated.
          </p>
        </div>
      )}
      {monteCarloRunCount > 0 && (
        <p className="small" style={{ marginTop: 8 }}>
          Monte Carlo refreshed {monteCarloRunCount}x{monteCarloLastRunAt ? ` · last run at ${monteCarloLastRunAt}` : ""}.
        </p>
      )}

      <details style={{ marginTop: 16 }}>
        <summary><strong>Advanced assumption controls</strong> (optional)</summary>
        <div className="grid grid-4" style={{ gap: 10, marginTop: 10 }}>
          <label>Recency score<input type="number" step="0.01" min={0} max={1} value={recencyScore} onChange={(e) => setRecencyScore(Number(e.target.value || 0))} /></label>
          <label>Min priority score<input type="number" step="0.01" min={0} max={1} value={minPriorityScore} onChange={(e) => setMinPriorityScore(Number(e.target.value || 0))} /></label>
          <label>High-priority threshold<input type="number" step="0.01" min={0} max={1} value={highPriorityThreshold} onChange={(e) => setHighPriorityThreshold(Number(e.target.value || 0))} /></label>
          <label>High-priority lift (× base conversion)<input type="number" step="0.1" min={1} max={5} value={highPriorityLift} onChange={(e) => setHighPriorityLift(Number(e.target.value || 1))} /><span className="small">Estimated revenue/high-priority = purchaseRate × AOV × lift = ${(purchaseRate * avgOrderValue * highPriorityLift).toFixed(2)}.</span></label>
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
          {generateResult.ok ? (
            <>
              <p>Run ID: <code>{generateResult.campaignRunId ?? "n/a"}</code></p>
              <p>Assumption set: <code>{assumptionSetId || "default-inline"}</code></p>
              <p>Generated with OpenAI: {generateResult.generated ?? 0}</p>
              <p>Estimated revenue: ${Number(generateResult.estimatedRevenue ?? 0).toFixed(2)}</p>
            </>
          ) : (
            <p style={{ color: "#b42318" }}><strong>Error:</strong> {readGenerateError(generateResult)}</p>
          )}
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
