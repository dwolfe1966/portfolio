"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Playbook = {
  id: string;
  name: string;
  riskDriver: string;
  saveRateLift: number;
  costCents: number;
  maxDiscountPct: number;
  slaHours: number;
};

const drivers = ["usage", "support", "commercial", "relationship", "billing"];

export function RetentionPlaybookEditor({ playbook }: { playbook: Playbook }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: playbook.name,
    riskDriver: playbook.riskDriver,
    saveRateLift: String(playbook.saveRateLift),
    cost: String(Math.round(playbook.costCents / 100)),
    maxDiscountPct: String(playbook.maxDiscountPct),
    slaHours: String(playbook.slaHours)
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
      const response = await fetch(`/api/retention/playbooks/${playbook.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          riskDriver: form.riskDriver,
          saveRateLift: Number(form.saveRateLift),
          costCents: Math.round(Number(form.cost) * 100),
          maxDiscountPct: Number(form.maxDiscountPct),
          slaHours: Number(form.slaHours)
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
      <label>Name<input value={form.name} onChange={(event) => update("name", event.target.value)} /></label>
      <label>Risk driver
        <select value={form.riskDriver} onChange={(event) => update("riskDriver", event.target.value)}>
          {drivers.map((driver) => <option key={driver} value={driver}>{driver}</option>)}
        </select>
      </label>
      <div className="grid grid-2">
        <label>Save-rate lift<input type="number" min="0" max="0.8" step="0.01" value={form.saveRateLift} onChange={(event) => update("saveRateLift", event.target.value)} /></label>
        <label>Cost ($)<input type="number" min="0" value={form.cost} onChange={(event) => update("cost", event.target.value)} /></label>
        <label>Max discount<input type="number" min="0" max="0.5" step="0.01" value={form.maxDiscountPct} onChange={(event) => update("maxDiscountPct", event.target.value)} /></label>
        <label>SLA hours<input type="number" min="1" value={form.slaHours} onChange={(event) => update("slaHours", event.target.value)} /></label>
      </div>
      <button type="button" onClick={save} disabled={loading}>{loading ? "Saving..." : "Save playbook"}</button>
      {status ? <p className="small" style={{ marginTop: 8 }}>{status}</p> : null}
    </div>
  );
}
