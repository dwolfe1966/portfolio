"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Account = {
  id: string;
  name: string;
  segment: string;
  mrrCents: number;
  usageScore: number;
  supportTicketCount: number;
  npsScore: number;
  renewalDays: number;
  paymentRiskScore: number;
  executiveSponsor: boolean;
  lastTouchedDays: number;
  healthTrend: string;
};

export function RetentionAccountEditor({ account }: { account: Account }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: account.name,
    segment: account.segment,
    mrr: String(Math.round(account.mrrCents / 100)),
    usageScore: String(account.usageScore),
    supportTicketCount: String(account.supportTicketCount),
    npsScore: String(account.npsScore),
    renewalDays: String(account.renewalDays),
    paymentRiskScore: String(account.paymentRiskScore),
    executiveSponsor: account.executiveSponsor,
    lastTouchedDays: String(account.lastTouchedDays),
    healthTrend: account.healthTrend
  });
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  function update(key: keyof typeof form, value: string | boolean) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    setLoading(true);
    setStatus("");
    try {
      const response = await fetch(`/api/retention/accounts/${account.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          segment: form.segment,
          mrrCents: Math.round(Number(form.mrr) * 100),
          usageScore: Number(form.usageScore),
          supportTicketCount: Number(form.supportTicketCount),
          npsScore: Number(form.npsScore),
          renewalDays: Number(form.renewalDays),
          paymentRiskScore: Number(form.paymentRiskScore),
          executiveSponsor: form.executiveSponsor,
          lastTouchedDays: Number(form.lastTouchedDays),
          healthTrend: form.healthTrend
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
      <div>
        <p className="eyebrow">{account.segment}</p>
        <h3>{account.name}</h3>
      </div>
      <div className="grid grid-2">
        <label>Name<input value={form.name} onChange={(event) => update("name", event.target.value)} /></label>
        <label>Segment<input value={form.segment} onChange={(event) => update("segment", event.target.value)} /></label>
        <label>MRR ($)<input type="number" value={form.mrr} onChange={(event) => update("mrr", event.target.value)} /></label>
        <label>Usage score<input type="number" min="0" max="1" step="0.01" value={form.usageScore} onChange={(event) => update("usageScore", event.target.value)} /></label>
        <label>Support tickets<input type="number" min="0" value={form.supportTicketCount} onChange={(event) => update("supportTicketCount", event.target.value)} /></label>
        <label>NPS<input type="number" min="-100" max="100" value={form.npsScore} onChange={(event) => update("npsScore", event.target.value)} /></label>
        <label>Renewal days<input type="number" min="0" value={form.renewalDays} onChange={(event) => update("renewalDays", event.target.value)} /></label>
        <label>Payment risk<input type="number" min="0" max="1" step="0.01" value={form.paymentRiskScore} onChange={(event) => update("paymentRiskScore", event.target.value)} /></label>
        <label>Last touched days<input type="number" min="0" value={form.lastTouchedDays} onChange={(event) => update("lastTouchedDays", event.target.value)} /></label>
        <label>Health trend
          <select value={form.healthTrend} onChange={(event) => update("healthTrend", event.target.value)}>
            <option value="improving">Improving</option>
            <option value="flat">Flat</option>
            <option value="declining">Declining</option>
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
