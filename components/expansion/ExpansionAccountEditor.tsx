"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { readErrorMessage } from "@/lib/api-contract";

const TRENDS = ["accelerating", "steady", "softening"];

type Account = {
  id: string;
  name: string;
  segment: string;
  currentArrCents: number;
  seatsPurchased: number;
  seatsActive: number;
  usageGrowthRate: number;
  productQualifiedScore: number;
  supportHealthScore: number;
  renewalDays: number;
  executiveSponsor: boolean;
  openExpansionSignals: number;
  trend: string;
};

export function ExpansionAccountEditor({ account }: { account: Account }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: account.name,
    segment: account.segment,
    currentArrDollars: Math.round(account.currentArrCents / 100),
    seatsPurchased: account.seatsPurchased,
    seatsActive: account.seatsActive,
    usageGrowthRate: account.usageGrowthRate,
    productQualifiedScore: account.productQualifiedScore,
    supportHealthScore: account.supportHealthScore,
    renewalDays: account.renewalDays,
    executiveSponsor: account.executiveSponsor,
    openExpansionSignals: account.openExpansionSignals,
    trend: account.trend
  });
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  function update(key: keyof typeof form, value: string | number | boolean) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    setLoading(true);
    setStatus("");
    try {
      const response = await fetch(`/api/expansion/accounts/${account.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          segment: form.segment,
          currentArrCents: Math.round(form.currentArrDollars * 100),
          seatsPurchased: form.seatsPurchased,
          seatsActive: form.seatsActive,
          usageGrowthRate: form.usageGrowthRate,
          productQualifiedScore: form.productQualifiedScore,
          supportHealthScore: form.supportHealthScore,
          renewalDays: form.renewalDays,
          executiveSponsor: form.executiveSponsor,
          openExpansionSignals: form.openExpansionSignals,
          trend: form.trend
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
    <div className="card retentionEditorCard">
      <p className="eyebrow">{form.segment}</p>
      <h3>{form.name}</h3>
      <div className="grid grid-3">
        <label>Name<input value={form.name} onChange={(event) => update("name", event.target.value)} /></label>
        <label>Segment<input value={form.segment} onChange={(event) => update("segment", event.target.value)} /></label>
        <label>ARR ($)<input type="number" min={0} step={1} value={form.currentArrDollars} onChange={(event) => update("currentArrDollars", Number(event.target.value || 0))} /></label>
        <label>Seats purchased<input type="number" min={1} step={1} value={form.seatsPurchased} onChange={(event) => update("seatsPurchased", Number(event.target.value || 1))} /></label>
        <label>Seats active<input type="number" min={0} step={1} value={form.seatsActive} onChange={(event) => update("seatsActive", Number(event.target.value || 0))} /></label>
        <label>Usage growth<input type="number" min={-1} max={1} step={0.01} value={form.usageGrowthRate} onChange={(event) => update("usageGrowthRate", Number(event.target.value || 0))} /></label>
        <label>Product-qualified score<input type="number" min={0} max={1} step={0.01} value={form.productQualifiedScore} onChange={(event) => update("productQualifiedScore", Number(event.target.value || 0))} /></label>
        <label>Support health<input type="number" min={0} max={1} step={0.01} value={form.supportHealthScore} onChange={(event) => update("supportHealthScore", Number(event.target.value || 0))} /></label>
        <label>Renewal days<input type="number" min={0} max={730} step={1} value={form.renewalDays} onChange={(event) => update("renewalDays", Number(event.target.value || 0))} /></label>
        <label>Open signals<input type="number" min={0} max={20} step={1} value={form.openExpansionSignals} onChange={(event) => update("openExpansionSignals", Number(event.target.value || 0))} /></label>
        <label>Trend
          <select value={form.trend} onChange={(event) => update("trend", event.target.value)}>
            {TRENDS.map((trend) => <option key={trend} value={trend}>{trend}</option>)}
          </select>
        </label>
      </div>
      <label className="small">
        <input type="checkbox" checked={form.executiveSponsor} onChange={(event) => update("executiveSponsor", event.target.checked)} style={{ marginRight: 6 }} />
        Executive sponsor active
      </label>
      <button type="button" onClick={save} disabled={loading}>{loading ? "Saving..." : "Save account inputs"}</button>
      {status ? <p className="small" style={{ marginTop: 8 }}>{status}</p> : null}
    </div>
  );
}
