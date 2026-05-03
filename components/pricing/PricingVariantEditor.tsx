"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type PricingVariantEditorProps = {
  variant: {
    id: string;
    name: string;
    monthlyPriceCents: number;
    annualPriceCents: number | null;
    packagingChange: string;
    marginImpactPercent: number;
    expectedSupportLoadDelta: number;
  };
};

export function PricingVariantEditor({ variant }: PricingVariantEditorProps) {
  const router = useRouter();
  const [name, setName] = useState(variant.name);
  const [monthlyPrice, setMonthlyPrice] = useState((variant.monthlyPriceCents / 100).toFixed(0));
  const [annualPrice, setAnnualPrice] = useState(variant.annualPriceCents == null ? "" : (variant.annualPriceCents / 100).toFixed(0));
  const [packagingChange, setPackagingChange] = useState(variant.packagingChange);
  const [marginImpact, setMarginImpact] = useState((variant.marginImpactPercent * 100).toFixed(1));
  const [supportDelta, setSupportDelta] = useState(variant.expectedSupportLoadDelta.toFixed(2));
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    setStatus("");
    try {
      const response = await fetch(`/api/pricing/variants/${variant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          monthlyPriceCents: Math.round(Number(monthlyPrice) * 100),
          annualPriceCents: annualPrice === "" ? null : Math.round(Number(annualPrice) * 100),
          packagingChange,
          marginImpactPercent: Number(marginImpact) / 100,
          expectedSupportLoadDelta: Number(supportDelta)
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
      <div className="grid grid-2">
        <label>Monthly price ($)<input type="number" min="0" value={monthlyPrice} onChange={(event) => setMonthlyPrice(event.target.value)} /></label>
        <label>Annual price ($)<input type="number" min="0" value={annualPrice} onChange={(event) => setAnnualPrice(event.target.value)} /></label>
      </div>
      <label>Packaging change<textarea rows={3} value={packagingChange} onChange={(event) => setPackagingChange(event.target.value)} /></label>
      <div className="grid grid-2">
        <label>Margin impact (%)<input type="number" step="0.1" value={marginImpact} onChange={(event) => setMarginImpact(event.target.value)} /></label>
        <label>Support load delta<input type="number" step="0.01" value={supportDelta} onChange={(event) => setSupportDelta(event.target.value)} /></label>
      </div>
      <button type="button" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save variant"}</button>
      {status ? <p className="small" style={{ marginTop: 8 }}>{status}</p> : null}
    </div>
  );
}
