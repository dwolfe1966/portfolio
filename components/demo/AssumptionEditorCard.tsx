"use client";

import { useState } from "react";
import { DEMO_ASSUMPTIONS_KEY, DEMO_ASSUMPTION_DEFAULTS } from "@/lib/demo-assumptions";

export function AssumptionEditorCard() {
  const [form, setForm] = useState(DEMO_ASSUMPTION_DEFAULTS);
  const [status, setStatus] = useState<string>("");

  function update<K extends keyof typeof form>(key: K, value: number) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function save() {
    localStorage.setItem(DEMO_ASSUMPTIONS_KEY, JSON.stringify(form));
    setStatus("Saved assumptions to this browser.");
  }

  function load() {
    const raw = localStorage.getItem(DEMO_ASSUMPTIONS_KEY);
    if (!raw) {
      setStatus("No saved assumptions found.");
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      setForm({ ...DEMO_ASSUMPTION_DEFAULTS, ...parsed });
      setStatus("Loaded saved assumptions.");
    } catch {
      setStatus("Could not parse saved assumptions.");
    }
  }

  function resetDefaults() {
    setForm(DEMO_ASSUMPTION_DEFAULTS);
    setStatus("Reset to defaults.");
  }

  return (
    <div className="card">
      <h3>Editable model assumptions</h3>
      <p>These assumptions drive how events become candidates/messages and how outcomes are projected.</p>

      <div className="grid grid-3" style={{ gap: 10, marginTop: 10 }}>
        <label>Default Top N<input type="number" min={1} value={form.defaultTopN} onChange={(e) => update("defaultTopN", Number(e.target.value || 1))} /></label>
        <label>Recency score<input type="number" step="0.01" min={0} max={1} value={form.recencyScore} onChange={(e) => update("recencyScore", Number(e.target.value || 0))} /></label>
        <label>Min priority score<input type="number" step="0.01" min={0} max={1} value={form.minPriorityScore} onChange={(e) => update("minPriorityScore", Number(e.target.value || 0))} /></label>
        <label>High-priority threshold<input type="number" step="0.01" min={0} max={1} value={form.highPriorityThreshold} onChange={(e) => update("highPriorityThreshold", Number(e.target.value || 0))} /></label>
        <label>Revenue per high-priority<input type="number" min={0} value={form.revenuePerHighPriority} onChange={(e) => update("revenuePerHighPriority", Number(e.target.value || 0))} /></label>
        <label>Open rate<input type="number" step="0.01" min={0} max={1} value={form.openRate} onChange={(e) => update("openRate", Number(e.target.value || 0))} /></label>
        <label>Click rate<input type="number" step="0.01" min={0} max={1} value={form.clickRate} onChange={(e) => update("clickRate", Number(e.target.value || 0))} /></label>
        <label>Engage rate<input type="number" step="0.01" min={0} max={1} value={form.engageRate} onChange={(e) => update("engageRate", Number(e.target.value || 0))} /></label>
        <label>Purchase rate<input type="number" step="0.001" min={0} max={1} value={form.purchaseRate} onChange={(e) => update("purchaseRate", Number(e.target.value || 0))} /></label>
        <label>Average order value<input type="number" min={0} value={form.avgOrderValue} onChange={(e) => update("avgOrderValue", Number(e.target.value || 0))} /></label>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
        <button type="button" onClick={save}>Save assumptions</button>
        <button type="button" onClick={load}>Load saved</button>
        <button type="button" onClick={resetDefaults}>Reset defaults</button>
      </div>

      {status && <p style={{ marginTop: 8 }}>{status}</p>}
    </div>
  );
}
