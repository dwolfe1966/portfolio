"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { readErrorMessage } from "@/lib/api-contract";

type Policy = {
  id: string;
  name: string;
  highReadinessThreshold: number;
  mediumReadinessThreshold: number;
  minMarginPercent: number;
  minPaybackRatio: number;
  maxSlaDays: number;
};

export function ExpansionPolicyEditor({ policy }: { policy: Policy }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: policy.name,
    highReadinessThreshold: policy.highReadinessThreshold,
    mediumReadinessThreshold: policy.mediumReadinessThreshold,
    minMarginPercent: policy.minMarginPercent,
    minPaybackRatio: policy.minPaybackRatio,
    maxSlaDays: policy.maxSlaDays
  });
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  function update(key: keyof typeof form, value: string | number) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    setLoading(true);
    setStatus("");
    try {
      const response = await fetch(`/api/expansion/policy/${policy.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(readErrorMessage(payload, "Save failed."));
      setStatus("Saved.");
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h3>Editable expansion policy</h3>
      <div className="grid grid-3">
        <label>Name<input value={form.name} onChange={(event) => update("name", event.target.value)} /></label>
        <label>High readiness<input type="number" min={0} max={1} step={0.01} value={form.highReadinessThreshold} onChange={(event) => update("highReadinessThreshold", Number(event.target.value || 0))} /></label>
        <label>Medium readiness<input type="number" min={0} max={1} step={0.01} value={form.mediumReadinessThreshold} onChange={(event) => update("mediumReadinessThreshold", Number(event.target.value || 0))} /></label>
        <label>Min margin<input type="number" min={0} max={1} step={0.01} value={form.minMarginPercent} onChange={(event) => update("minMarginPercent", Number(event.target.value || 0))} /></label>
        <label>Min payback<input type="number" min={0} max={20} step={0.1} value={form.minPaybackRatio} onChange={(event) => update("minPaybackRatio", Number(event.target.value || 0))} /></label>
        <label>Max SLA days<input type="number" min={1} max={365} step={1} value={form.maxSlaDays} onChange={(event) => update("maxSlaDays", Number(event.target.value || 1))} /></label>
      </div>
      <button type="button" onClick={save} disabled={loading}>{loading ? "Saving..." : "Save policy"}</button>
      {status ? <p className="small" style={{ marginTop: 8 }}>{status}</p> : null}
    </div>
  );
}
