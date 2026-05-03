"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { readErrorMessage } from "@/lib/api-contract";

type Campaign = {
  id: string;
  name: string;
  objective: string;
  budgetCents: number;
  targetCacCents: number;
  targetLtvCents: number;
  maxBudgetShiftPct: number;
  minConfidence: number;
  cooldownHours: number;
  cacAutoPausePctOfTarget: number;
  minLtvCacRatio: number;
  approvalCapPct: number;
};

export function AcquisitionCampaignEditor({ campaign }: { campaign: Campaign }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: campaign.name,
    objective: campaign.objective,
    budgetDollars: Math.round(campaign.budgetCents / 100),
    targetCacDollars: Math.round(campaign.targetCacCents / 100),
    targetLtvDollars: Math.round(campaign.targetLtvCents / 100),
    maxBudgetShiftPct: campaign.maxBudgetShiftPct,
    minConfidence: campaign.minConfidence,
    cooldownHours: campaign.cooldownHours,
    cacAutoPausePctOfTarget: campaign.cacAutoPausePctOfTarget,
    minLtvCacRatio: campaign.minLtvCacRatio,
    approvalCapPct: campaign.approvalCapPct
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
      const response = await fetch(`/api/acquisition/campaigns/${campaign.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          budgetCents: Math.round(form.budgetDollars * 100),
          targetCacCents: Math.round(form.targetCacDollars * 100),
          targetLtvCents: Math.round(form.targetLtvDollars * 100)
        })
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
      <h3>Editable campaign inputs</h3>
      <label>Name<input value={form.name} onChange={(event) => update("name", event.target.value)} /></label>
      <label>Objective<textarea rows={3} value={form.objective} onChange={(event) => update("objective", event.target.value)} /></label>
      <div className="grid grid-3">
        <label>Budget ($)<input type="number" min={0} step={1} value={form.budgetDollars} onChange={(event) => update("budgetDollars", Number(event.target.value || 0))} /></label>
        <label>Target CAC ($)<input type="number" min={0} step={1} value={form.targetCacDollars} onChange={(event) => update("targetCacDollars", Number(event.target.value || 0))} /></label>
        <label>Target LTV ($)<input type="number" min={0} step={1} value={form.targetLtvDollars} onChange={(event) => update("targetLtvDollars", Number(event.target.value || 0))} /></label>
        <label>Max budget shift<input type="number" min={0.01} max={0.5} step={0.01} value={form.maxBudgetShiftPct} onChange={(event) => update("maxBudgetShiftPct", Number(event.target.value || 0))} /></label>
        <label>Min confidence<input type="number" min={0.5} max={0.95} step={0.01} value={form.minConfidence} onChange={(event) => update("minConfidence", Number(event.target.value || 0))} /></label>
        <label>Cooldown hours<input type="number" min={1} max={168} step={1} value={form.cooldownHours} onChange={(event) => update("cooldownHours", Number(event.target.value || 1))} /></label>
        <label>Auto-pause CAC × target<input type="number" min={1} max={3} step={0.05} value={form.cacAutoPausePctOfTarget} onChange={(event) => update("cacAutoPausePctOfTarget", Number(event.target.value || 1))} /></label>
        <label>Min LTV:CAC<input type="number" min={1} max={10} step={0.1} value={form.minLtvCacRatio} onChange={(event) => update("minLtvCacRatio", Number(event.target.value || 1))} /></label>
        <label>Approval cap<input type="number" min={0.01} max={0.5} step={0.01} value={form.approvalCapPct} onChange={(event) => update("approvalCapPct", Number(event.target.value || 0.01))} /></label>
      </div>
      <button type="button" onClick={save} disabled={loading}>{loading ? "Saving..." : "Save campaign"}</button>
      {status ? <p className="small" style={{ marginTop: 8 }}>{status}</p> : null}
    </div>
  );
}
