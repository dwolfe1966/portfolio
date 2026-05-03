"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { readErrorMessage } from "@/lib/api-contract";

type Cell = {
  id: string;
  score: number;
  budgetCents: number;
  impressions: number;
  clicks: number;
  conversions: number;
  spendCents: number;
  revenueCents: number;
  status: string;
  creative: { headline: string };
  audience: { name: string };
};

export function AcquisitionTestCellEditor({ cell }: { cell: Cell }) {
  const router = useRouter();
  const [form, setForm] = useState({
    budgetDollars: Math.round(cell.budgetCents / 100),
    impressions: cell.impressions,
    clicks: cell.clicks,
    conversions: cell.conversions,
    spendDollars: Math.round(cell.spendCents / 100),
    revenueDollars: Math.round(cell.revenueCents / 100),
    score: cell.score,
    status: cell.status
  });
  const [message, setMessage] = useState("");

  async function save() {
    const response = await fetch(`/api/acquisition/test-cells/${cell.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        budgetCents: Math.round(form.budgetDollars * 100),
        impressions: form.impressions,
        clicks: form.clicks,
        conversions: form.conversions,
        spendCents: Math.round(form.spendDollars * 100),
        revenueCents: Math.round(form.revenueDollars * 100),
        score: form.score,
        status: form.status
      })
    });
    const payload = await response.json();
    setMessage(response.ok ? "Saved." : readErrorMessage(payload, "Save failed."));
    if (response.ok) router.refresh();
  }

  return (
    <tr>
      <td>{cell.creative.headline}<br /><span className="small">{cell.audience.name}</span></td>
      <td><input type="number" min={0} step={1} value={form.budgetDollars} onChange={(event) => setForm((current) => ({ ...current, budgetDollars: Number(event.target.value || 0) }))} /></td>
      <td><input type="number" min={0} step={1} value={form.impressions} onChange={(event) => setForm((current) => ({ ...current, impressions: Number(event.target.value || 0) }))} /></td>
      <td><input type="number" min={0} step={1} value={form.clicks} onChange={(event) => setForm((current) => ({ ...current, clicks: Number(event.target.value || 0) }))} /></td>
      <td><input type="number" min={0} step={1} value={form.conversions} onChange={(event) => setForm((current) => ({ ...current, conversions: Number(event.target.value || 0) }))} /></td>
      <td><input type="number" min={0} step={1} value={form.spendDollars} onChange={(event) => setForm((current) => ({ ...current, spendDollars: Number(event.target.value || 0) }))} /></td>
      <td><input type="number" min={0} step={1} value={form.revenueDollars} onChange={(event) => setForm((current) => ({ ...current, revenueDollars: Number(event.target.value || 0) }))} /></td>
      <td><input type="number" min={0} max={1} step={0.001} value={form.score} onChange={(event) => setForm((current) => ({ ...current, score: Number(event.target.value || 0) }))} /></td>
      <td><button type="button" onClick={save}>Save</button>{message ? <p className="small">{message}</p> : null}</td>
    </tr>
  );
}
