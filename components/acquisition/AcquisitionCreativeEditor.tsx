"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { readErrorMessage } from "@/lib/api-contract";

const CHANNELS = ["SEARCH", "SOCIAL", "DISPLAY", "VIDEO"];

type Creative = {
  id: string;
  headline: string;
  description: string;
  callToAction: string;
  channel: string;
  predictedCtr: number;
  predictedConversion: number;
};

export function AcquisitionCreativeEditor({ creative }: { creative: Creative }) {
  const router = useRouter();
  const [form, setForm] = useState(creative);
  const [status, setStatus] = useState("");

  async function save() {
    const response = await fetch(`/api/acquisition/creatives/${creative.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    const payload = await response.json();
    setStatus(response.ok ? "Saved." : readErrorMessage(payload, "Save failed."));
    if (response.ok) router.refresh();
  }

  return (
    <div className="card">
      <label>Headline<input value={form.headline} onChange={(event) => setForm((current) => ({ ...current, headline: event.target.value }))} /></label>
      <label>Description<input value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} /></label>
      <div className="grid grid-2">
        <label>CTA<input value={form.callToAction} onChange={(event) => setForm((current) => ({ ...current, callToAction: event.target.value }))} /></label>
        <label>Channel<select value={form.channel} onChange={(event) => setForm((current) => ({ ...current, channel: event.target.value }))}>{CHANNELS.map((channel) => <option key={channel} value={channel}>{channel}</option>)}</select></label>
        <label>Predicted CTR<input type="number" min={0} max={1} step={0.001} value={form.predictedCtr} onChange={(event) => setForm((current) => ({ ...current, predictedCtr: Number(event.target.value || 0) }))} /></label>
        <label>Predicted conversion<input type="number" min={0} max={1} step={0.001} value={form.predictedConversion} onChange={(event) => setForm((current) => ({ ...current, predictedConversion: Number(event.target.value || 0) }))} /></label>
      </div>
      <button type="button" onClick={save}>Save creative</button>
      {status ? <p className="small" style={{ marginTop: 6 }}>{status}</p> : null}
    </div>
  );
}
