"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Segment = { id: string; name: string };
type Variant = { id: string; name: string };
type Experiment = {
  id: string;
  name: string;
  hypothesis: string;
  owner: string;
  state: string;
  holdoutPercent: number;
  minimumSampleSize: number;
  minGrossMarginPercent: number;
  maxChurnDeltaPercent: number;
  maxSupportLoadDelta: number;
  minConfidence: number;
  segments: Array<{ segmentId: string }>;
  variants: Array<{ variantId: string; role: string }>;
};

const states = ["DRAFT", "RUNNING", "PAUSED", "DECISION_READY", "PROMOTED", "ROLLED_BACK"];

export function PricingExperimentBuilder({
  experiment,
  segments,
  variants
}: {
  experiment?: Experiment;
  segments: Segment[];
  variants: Variant[];
}) {
  const router = useRouter();
  const [name, setName] = useState(experiment?.name ?? "New pricing experiment");
  const [hypothesis, setHypothesis] = useState(experiment?.hypothesis ?? "This price/package change will improve ARPU while preserving margin and churn guardrails.");
  const [owner, setOwner] = useState(experiment?.owner ?? "pricing-operator");
  const [state, setState] = useState(experiment?.state ?? "DRAFT");
  const [holdout, setHoldout] = useState(((experiment?.holdoutPercent ?? 0.15) * 100).toFixed(0));
  const [minimumSample, setMinimumSample] = useState(String(experiment?.minimumSampleSize ?? 1200));
  const [marginFloor, setMarginFloor] = useState(((experiment?.minGrossMarginPercent ?? 0.72) * 100).toFixed(0));
  const [churnCap, setChurnCap] = useState(String(experiment?.maxChurnDeltaPercent ?? 1.5));
  const [supportCap, setSupportCap] = useState(String(experiment?.maxSupportLoadDelta ?? 0.25));
  const [confidence, setConfidence] = useState(((experiment?.minConfidence ?? 0.7) * 100).toFixed(0));
  const [selectedSegments, setSelectedSegments] = useState<string[]>(experiment?.segments.map((item) => item.segmentId) ?? segments.slice(0, 2).map((item) => item.id));
  const [controlVariantId, setControlVariantId] = useState(experiment?.variants.find((item) => item.role === "control")?.variantId ?? variants[0]?.id ?? "");
  const [treatmentVariantId, setTreatmentVariantId] = useState(experiment?.variants.find((item) => item.role === "treatment")?.variantId ?? variants[1]?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  function toggleSegment(segmentId: string) {
    setSelectedSegments((current) =>
      current.includes(segmentId)
        ? current.filter((id) => id !== segmentId)
        : [...current, segmentId]
    );
  }

  async function save() {
    setSaving(true);
    setStatus("");
    try {
      const url = experiment ? `/api/pricing/experiments/${experiment.id}` : "/api/pricing/experiments";
      const method = experiment ? "PATCH" : "POST";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          hypothesis,
          owner,
          state,
          holdoutPercent: Number(holdout) / 100,
          minimumSampleSize: Number(minimumSample),
          minGrossMarginPercent: Number(marginFloor) / 100,
          maxChurnDeltaPercent: Number(churnCap),
          maxSupportLoadDelta: Number(supportCap),
          minConfidence: Number(confidence) / 100,
          segmentIds: selectedSegments,
          controlVariantId,
          treatmentVariantIds: [treatmentVariantId]
        })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message ?? "Save failed");
      setStatus(experiment ? "Experiment updated." : "Experiment created.");
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card">
      <h3>{experiment ? "Edit experiment" : "Create experiment"}</h3>
      <label>Name<input value={name} onChange={(event) => setName(event.target.value)} /></label>
      <label>Hypothesis<textarea rows={3} value={hypothesis} onChange={(event) => setHypothesis(event.target.value)} /></label>
      <div className="grid grid-2">
        <label>Owner<input value={owner} onChange={(event) => setOwner(event.target.value)} /></label>
        <label>State<select value={state} onChange={(event) => setState(event.target.value)}>
          {states.map((item) => <option key={item} value={item}>{item}</option>)}
        </select></label>
      </div>
      <div className="grid grid-2">
        <label>Control variant<select value={controlVariantId} onChange={(event) => setControlVariantId(event.target.value)}>
          {variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.name}</option>)}
        </select></label>
        <label>Treatment variant<select value={treatmentVariantId} onChange={(event) => setTreatmentVariantId(event.target.value)}>
          {variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.name}</option>)}
        </select></label>
      </div>
      <div className="grid grid-4">
        <label>Holdout (%)<input type="number" value={holdout} onChange={(event) => setHoldout(event.target.value)} /></label>
        <label>Min sample<input type="number" value={minimumSample} onChange={(event) => setMinimumSample(event.target.value)} /></label>
        <label>Margin floor (%)<input type="number" value={marginFloor} onChange={(event) => setMarginFloor(event.target.value)} /></label>
        <label>Confidence (%)<input type="number" value={confidence} onChange={(event) => setConfidence(event.target.value)} /></label>
      </div>
      <div className="grid grid-2">
        <label>Max churn delta (%)<input type="number" step="0.1" value={churnCap} onChange={(event) => setChurnCap(event.target.value)} /></label>
        <label>Max support delta<input type="number" step="0.01" value={supportCap} onChange={(event) => setSupportCap(event.target.value)} /></label>
      </div>
      <div>
        <p className="small">Eligible segments</p>
        <div className="grid grid-2">
          {segments.map((segment) => (
            <label className="small" key={segment.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={selectedSegments.includes(segment.id)}
                onChange={() => toggleSegment(segment.id)}
                style={{ width: "auto", marginTop: 0 }}
              />
              {segment.name}
            </label>
          ))}
        </div>
      </div>
      <button type="button" onClick={save} disabled={saving}>{saving ? "Saving..." : experiment ? "Save experiment" : "Create experiment"}</button>
      {status ? <p className="small" style={{ marginTop: 8 }}>{status}</p> : null}
    </div>
  );
}
