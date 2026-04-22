"use client";

import { useState } from "react";

type GenerateResponse = {
  ok: boolean;
  campaignRunId?: string;
  assumptionSetId?: string | null;
  generated?: number;
  totalMatches?: number;
  totalHighPriority?: number;
  estimatedRevenue?: number;
  error?: string;
};

export function RunGeneratorCard() {
  const [topN, setTopN] = useState(10);
  const [runName, setRunName] = useState("Manual Demo Run");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerateResponse | null>(null);

  async function onGenerate() {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/generate-campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topN, runName })
      });

      const payload = (await response.json()) as GenerateResponse;
      setResult(payload);
    } catch {
      setResult({ ok: false, error: "Request failed. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 640 }}>
      <h3>Run Campaign Generation</h3>
      <p>Trigger <code>POST /api/generate-campaigns</code> from the demo UI.</p>
      <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
        <label>
          Run name
          <input
            value={runName}
            onChange={(e) => setRunName(e.target.value)}
            placeholder="Manual Demo Run"
          />
        </label>
        <label>
          Top N campaigns
          <input
            type="number"
            min={1}
            max={100}
            value={topN}
            onChange={(e) => setTopN(Number(e.target.value || 10))}
          />
        </label>
        <button type="button" onClick={onGenerate} disabled={loading}>
          {loading ? "Running..." : "Generate Campaign Run"}
        </button>
      </div>

      {result && (
        <div style={{ marginTop: 16 }}>
          {result.ok ? (
            <>
              <p><strong>Success.</strong> Run ID: <code>{result.campaignRunId}</code></p>
              <p>Assumption set: <code>{result.assumptionSetId ?? "default"}</code></p>
              <p>Generated: {result.generated ?? 0}</p>
              <p>Total matches: {result.totalMatches ?? 0}</p>
              <p>High priority: {result.totalHighPriority ?? 0}</p>
              <p>Estimated revenue: ${Number(result.estimatedRevenue ?? 0).toFixed(2)}</p>
            </>
          ) : (
            <p style={{ color: "#b42318" }}><strong>Error:</strong> {result.error ?? "Generation failed."}</p>
          )}
        </div>
      )}
    </div>
  );
}
