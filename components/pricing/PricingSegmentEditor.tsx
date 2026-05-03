"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type PricingSegmentEditorProps = {
  segment: {
    id: string;
    name: string;
    eligibilityRule: string;
    baselineConversionRate: number;
    baselineChurnRate: number;
    baselineArpuCents: number;
    grossMarginPercent: number;
    monthlyVolume: number;
    riskBand: string;
  };
};

export function PricingSegmentEditor({ segment }: PricingSegmentEditorProps) {
  const router = useRouter();
  const [name, setName] = useState(segment.name);
  const [eligibilityRule, setEligibilityRule] = useState(segment.eligibilityRule);
  const [conversionRate, setConversionRate] = useState((segment.baselineConversionRate * 100).toFixed(1));
  const [churnRate, setChurnRate] = useState((segment.baselineChurnRate * 100).toFixed(1));
  const [arpu, setArpu] = useState((segment.baselineArpuCents / 100).toFixed(0));
  const [grossMargin, setGrossMargin] = useState((segment.grossMarginPercent * 100).toFixed(0));
  const [monthlyVolume, setMonthlyVolume] = useState(String(segment.monthlyVolume));
  const [riskBand, setRiskBand] = useState(segment.riskBand);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  async function save() {
    setSaving(true);
    setStatus("");
    try {
      const response = await fetch(`/api/pricing/segments/${segment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          eligibilityRule,
          baselineConversionRate: Number(conversionRate) / 100,
          baselineChurnRate: Number(churnRate) / 100,
          baselineArpuCents: Math.round(Number(arpu) * 100),
          grossMarginPercent: Number(grossMargin) / 100,
          monthlyVolume: Number(monthlyVolume),
          riskBand
        })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message ?? "Save failed");
      setStatus("Saved.");
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card">
      <label>Name<input value={name} onChange={(event) => setName(event.target.value)} /></label>
      <label>Eligibility rule<textarea rows={2} value={eligibilityRule} onChange={(event) => setEligibilityRule(event.target.value)} /></label>
      <div className="grid grid-2">
        <label>Conversion rate (%)<input type="number" step="0.1" value={conversionRate} onChange={(event) => setConversionRate(event.target.value)} /></label>
        <label>Churn rate (%)<input type="number" step="0.1" value={churnRate} onChange={(event) => setChurnRate(event.target.value)} /></label>
      </div>
      <div className="grid grid-2">
        <label>ARPU ($)<input type="number" min="0" value={arpu} onChange={(event) => setArpu(event.target.value)} /></label>
        <label>Gross margin (%)<input type="number" min="0" max="100" value={grossMargin} onChange={(event) => setGrossMargin(event.target.value)} /></label>
      </div>
      <div className="grid grid-2">
        <label>Monthly volume<input type="number" min="0" value={monthlyVolume} onChange={(event) => setMonthlyVolume(event.target.value)} /></label>
        <label>Risk band<select value={riskBand} onChange={(event) => setRiskBand(event.target.value)}>
          <option value="low">low</option>
          <option value="medium">medium</option>
          <option value="high">high</option>
        </select></label>
      </div>
      <button type="button" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save segment"}</button>
      {status ? <p className="small" style={{ marginTop: 8 }}>{status}</p> : null}
    </div>
  );
}
