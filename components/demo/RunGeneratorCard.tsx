"use client";

import { useEffect, useMemo, useState } from "react";

type GenerateResponse = {
  ok: boolean;
  campaignRunId?: string;
  assumptionSetId?: string | null;
  generated?: number;
  totalMatches?: number;
  totalHighPriority?: number;
  estimatedRevenue?: number;
  error?: string | { message?: string };
};

export function RunGeneratorCard() {
  const [topN, setTopN] = useState(10);
  const [runName, setRunName] = useState("Manual Demo Run");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [aiProgressStep, setAiProgressStep] = useState(0);

  const aiProgressMessages = useMemo(() => {
    const targetCount = Math.max(1, Number(topN || 1));
    return [
      "Scoring lifecycle candidates from user and entity signals.",
      `Selecting the top ${targetCount} campaign opportunities.`,
      "Calling OpenAI to write personalized subject lines and message content.",
      "Generating AI subject lines, preview text, email body, landing copy, and CTA text.",
      "Validating the model JSON and saving generated message assets."
    ];
  }, [topN]);

  useEffect(() => {
    if (!loading) {
      setAiProgressStep(0);
      return;
    }

    const timer = window.setInterval(() => {
      setAiProgressStep((step) => Math.min(step + 1, aiProgressMessages.length - 1));
    }, 2200);

    return () => window.clearInterval(timer);
  }, [aiProgressMessages.length, loading]);

  function readError(payload: GenerateResponse) {
    if (typeof payload.error === "string") return payload.error;
    if (payload.error?.message) return payload.error.message;
    return "Generation failed.";
  }

  async function onGenerate() {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/lifecycle/generate-campaigns", {
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
      <p>Trigger <code>POST /api/lifecycle/generate-campaigns</code> from the demo UI.</p>
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
      {loading && (
        <div className="card" style={{ marginTop: 12, borderColor: "#3b82f6" }} aria-live="polite">
          <p className="small" style={{ marginBottom: 6 }}>OpenAI message generation in progress</p>
          <p style={{ marginBottom: 8 }}>
            {aiProgressMessages[aiProgressStep]} The wait is expected because this run creates new AI-written subject lines and copy for selected users.
          </p>
          <div className="progressTrack" aria-hidden="true">
            <div
              className="progressFill"
              style={{ width: `${Math.max(16, ((aiProgressStep + 1) / aiProgressMessages.length) * 100)}%` }}
            />
          </div>
          <p className="small" style={{ marginTop: 8 }}>Step {aiProgressStep + 1} of {aiProgressMessages.length}</p>
        </div>
      )}

      {result && (
        <div style={{ marginTop: 16 }}>
          {result.ok ? (
            <>
              <p><strong>Success.</strong> Run ID: <code>{result.campaignRunId}</code></p>
              <p>Assumption set: <code>{result.assumptionSetId ?? "default"}</code></p>
              <p>Generated with OpenAI: {result.generated ?? 0}</p>
              <p>Total matches: {result.totalMatches ?? 0}</p>
              <p>High priority: {result.totalHighPriority ?? 0}</p>
              <p>Estimated revenue: ${Number(result.estimatedRevenue ?? 0).toFixed(2)}</p>
            </>
          ) : (
            <p style={{ color: "#b42318" }}><strong>Error:</strong> {readError(result)}</p>
          )}
        </div>
      )}
    </div>
  );
}
