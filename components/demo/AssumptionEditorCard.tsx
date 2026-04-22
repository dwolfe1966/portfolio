"use client";

import { useEffect, useState } from "react";
import { DEMO_ASSUMPTION_DEFAULTS, DemoAssumptions } from "@/lib/demo-assumptions";

type AssumptionSetRecord = {
  id: string;
  name: string;
  isActive: boolean;
} & DemoAssumptions;

export function AssumptionEditorCard() {
  const [form, setForm] = useState(DEMO_ASSUMPTION_DEFAULTS);
  const [setName, setSetName] = useState("Scenario Baseline");
  const [sets, setSets] = useState<AssumptionSetRecord[]>([]);
  const [activeSetId, setActiveSetId] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function loadFromServer() {
    setLoading(true);
    try {
      const response = await fetch("/api/assumptions", { cache: "no-store" });
      const payload = await response.json();
      setSets(payload.assumptionSets ?? []);
      if (payload.activeAssumptions) setForm(payload.activeAssumptions);
      if (payload.activeSet?.id) setActiveSetId(payload.activeSet.id);
      setStatus("Loaded assumptions from server.");
    } catch {
      setStatus("Failed to load assumptions.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadFromServer();
  }, []);

  function update<K extends keyof typeof form>(key: K, value: number) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    setLoading(true);
    try {
      const response = await fetch("/api/assumptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: setName, assumptions: form, makeActive: true })
      });
      const payload = await response.json();
      if (!payload.ok) throw new Error("save failed");
      setStatus("Saved assumptions server-side and set active.");
      await loadFromServer();
    } catch {
      setStatus("Could not save assumptions.");
    } finally {
      setLoading(false);
    }
  }

  async function activateSelected() {
    if (!activeSetId) return;
    setLoading(true);
    try {
      const response = await fetch("/api/assumptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activateId: activeSetId })
      });
      const payload = await response.json();
      if (!payload.ok) throw new Error("activate failed");
      setStatus("Activated selected assumption set.");
      await loadFromServer();
    } catch {
      setStatus("Could not activate assumption set.");
    } finally {
      setLoading(false);
    }
  }

  function resetDefaults() {
    setForm(DEMO_ASSUMPTION_DEFAULTS);
    setStatus("Reset to defaults (not saved yet).");
  }

  function applySet(id: string) {
    const selected = sets.find((item) => item.id === id);
    if (!selected) return;
    setForm({
      defaultTopN: selected.defaultTopN,
      recencyScore: selected.recencyScore,
      minPriorityScore: selected.minPriorityScore,
      highPriorityThreshold: selected.highPriorityThreshold,
      revenuePerHighPriority: selected.revenuePerHighPriority,
      openRate: selected.openRate,
      clickRate: selected.clickRate,
      engageRate: selected.engageRate,
      purchaseRate: selected.purchaseRate,
      avgOrderValue: selected.avgOrderValue
    });
    setActiveSetId(id);
    setSetName(selected.name);
  }

  return (
    <div className="card">
      <h3>Editable model assumptions</h3>
      <p>Assumption sets are now persisted server-side for reproducibility across runs.</p>

      <div className="grid grid-3" style={{ gap: 10, marginTop: 10 }}>
        <label>Set name<input value={setName} onChange={(e) => setSetName(e.target.value)} /></label>
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
        <button type="button" onClick={save} disabled={loading}>Save & Activate</button>
        <button type="button" onClick={resetDefaults} disabled={loading}>Reset defaults</button>
        <button type="button" onClick={loadFromServer} disabled={loading}>Refresh sets</button>
      </div>

      <div style={{ marginTop: 12 }}>
        <label>
          Existing sets
          <select value={activeSetId} onChange={(e) => applySet(e.target.value)}>
            <option value="">Select a set</option>
            {sets.map((set) => (
              <option key={set.id} value={set.id}>{set.name}{set.isActive ? " (active)" : ""}</option>
            ))}
          </select>
        </label>
        <div style={{ marginTop: 10 }}>
          <button type="button" onClick={activateSelected} disabled={loading || !activeSetId}>Activate selected set</button>
        </div>
      </div>

      {status && <p style={{ marginTop: 8 }}>{status}</p>}
    </div>
  );
}
