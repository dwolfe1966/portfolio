"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Policy = {
  id: string;
  name: string;
  highRiskThreshold: number;
  mediumRiskThreshold: number;
  maxDiscountPct: number;
  minPaybackRatio: number;
  slaHoursHighRisk: number;
};

export function RetentionPolicyEditor({ policy }: { policy: Policy }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: policy.name,
    highRiskThreshold: String(policy.highRiskThreshold),
    mediumRiskThreshold: String(policy.mediumRiskThreshold),
    maxDiscountPct: String(policy.maxDiscountPct),
    minPaybackRatio: String(policy.minPaybackRatio),
    slaHoursHighRisk: String(policy.slaHoursHighRisk)
  });
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    setLoading(true);
    setStatus("");
    try {
      const response = await fetch(`/api/retention/policy/${policy.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          highRiskThreshold: Number(form.highRiskThreshold),
          mediumRiskThreshold: Number(form.mediumRiskThreshold),
          maxDiscountPct: Number(form.maxDiscountPct),
          minPaybackRatio: Number(form.minPaybackRatio),
          slaHoursHighRisk: Number(form.slaHoursHighRisk)
        })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message ?? "Save failed");
      setStatus("Saved.");
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Save failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card retentionEditorCard">
      <h3>{policy.name}</h3>
      <label>Name<input value={form.name} onChange={(event) => update("name", event.target.value)} /></label>
      <div className="grid grid-2">
        <label>High risk threshold<input type="number" min="0" max="1" step="0.01" value={form.highRiskThreshold} onChange={(event) => update("highRiskThreshold", event.target.value)} /></label>
        <label>Medium risk threshold<input type="number" min="0" max="1" step="0.01" value={form.mediumRiskThreshold} onChange={(event) => update("mediumRiskThreshold", event.target.value)} /></label>
        <label>Max discount<input type="number" min="0" max="0.5" step="0.01" value={form.maxDiscountPct} onChange={(event) => update("maxDiscountPct", event.target.value)} /></label>
        <label>Min payback<input type="number" min="0" step="0.1" value={form.minPaybackRatio} onChange={(event) => update("minPaybackRatio", event.target.value)} /></label>
        <label>High-risk SLA hours<input type="number" min="1" value={form.slaHoursHighRisk} onChange={(event) => update("slaHoursHighRisk", event.target.value)} /></label>
      </div>
      <button type="button" onClick={save} disabled={loading}>{loading ? "Saving..." : "Save policy"}</button>
      {status ? <p className="small" style={{ marginTop: 8 }}>{status}</p> : null}
    </div>
  );
}
