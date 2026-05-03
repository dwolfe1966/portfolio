"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { readErrorMessage } from "@/lib/api-contract";

const MOTIONS = ["seat_expansion", "feature_upgrade", "usage_commit", "services_attach"];

type Offer = {
  id: string;
  name: string;
  motion: string;
  targetSegment: string;
  expectedLiftPercent: number;
  costCents: number;
  marginPercent: number;
  slaDays: number;
};

export function ExpansionOfferEditor({ offer }: { offer: Offer }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: offer.name,
    motion: offer.motion,
    targetSegment: offer.targetSegment,
    expectedLiftPercent: offer.expectedLiftPercent,
    costDollars: Math.round(offer.costCents / 100),
    marginPercent: offer.marginPercent,
    slaDays: offer.slaDays
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
      const response = await fetch(`/api/expansion/offers/${offer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          motion: form.motion,
          targetSegment: form.targetSegment,
          expectedLiftPercent: form.expectedLiftPercent,
          costCents: Math.round(form.costDollars * 100),
          marginPercent: form.marginPercent,
          slaDays: form.slaDays
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
      <p className="eyebrow">{offer.motion} · {offer.targetSegment}</p>
      <h3>{offer.name}</h3>
      <div className="grid grid-2">
        <label>Name<input value={form.name} onChange={(event) => update("name", event.target.value)} /></label>
        <label>Motion
          <select value={form.motion} onChange={(event) => update("motion", event.target.value)}>
            {MOTIONS.map((motion) => <option key={motion} value={motion}>{motion}</option>)}
          </select>
        </label>
        <label>Target segment<input value={form.targetSegment} onChange={(event) => update("targetSegment", event.target.value)} /></label>
        <label>Expected lift<input type="number" min={0} max={1} step={0.01} value={form.expectedLiftPercent} onChange={(event) => update("expectedLiftPercent", Number(event.target.value || 0))} /></label>
        <label>Cost ($)<input type="number" min={0} step={1} value={form.costDollars} onChange={(event) => update("costDollars", Number(event.target.value || 0))} /></label>
        <label>Margin<input type="number" min={0} max={1} step={0.01} value={form.marginPercent} onChange={(event) => update("marginPercent", Number(event.target.value || 0))} /></label>
        <label>SLA days<input type="number" min={1} max={365} step={1} value={form.slaDays} onChange={(event) => update("slaDays", Number(event.target.value || 1))} /></label>
      </div>
      <button type="button" onClick={save} disabled={loading}>{loading ? "Saving..." : "Save offer"}</button>
      {status ? <p className="small" style={{ marginTop: 8 }}>{status}</p> : null}
    </div>
  );
}
