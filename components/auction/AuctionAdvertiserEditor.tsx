"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { readErrorMessage } from "@/lib/api-contract";

type Advertiser = {
  id: string;
  name: string;
  qualityScore: number;
  dailyBudgetCents: number;
  smoothingFactor: number;
  behaviorMode: string;
  targetCacCents: number | null;
};

type FormState = {
  name: string;
  qualityScore: number;
  dailyBudgetDollars: number;
  smoothingFactor: number;
  behaviorMode: "truthful" | "shaded" | "auto_bid";
  targetCacDollars: number | null;
};

const BLANK: FormState = {
  name: "",
  qualityScore: 0.7,
  dailyBudgetDollars: 500,
  smoothingFactor: 0.5,
  behaviorMode: "truthful",
  targetCacDollars: null
};

export function AuctionAdvertiserEditor({ advertisers }: { advertisers: Advertiser[] }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(BLANK);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  function reset() {
    setForm(BLANK);
    setEditingId(null);
    setErrors([]);
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function loadForEdit(adv: Advertiser) {
    setEditingId(adv.id);
    setForm({
      name: adv.name,
      qualityScore: adv.qualityScore,
      dailyBudgetDollars: adv.dailyBudgetCents / 100,
      smoothingFactor: adv.smoothingFactor,
      behaviorMode: adv.behaviorMode as FormState["behaviorMode"],
      targetCacDollars: adv.targetCacCents == null ? null : adv.targetCacCents / 100
    });
    setErrors([]);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setStatus("");
    setErrors([]);
    const payload = {
      name: form.name,
      qualityScore: form.qualityScore,
      dailyBudgetCents: Math.round(form.dailyBudgetDollars * 100),
      smoothingFactor: form.smoothingFactor,
      behaviorMode: form.behaviorMode,
      targetCacCents:
        form.targetCacDollars == null ? null : Math.round(form.targetCacDollars * 100)
    };
    try {
      const url = editingId
        ? `/api/auction/advertisers/${editingId}`
        : "/api/auction/advertisers";
      const method = editingId ? "PATCH" : "POST";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await response.json();
      if (!json.ok) {
        setErrors((json.error?.details?.errors as string[] | undefined) ?? []);
        setStatus(readErrorMessage(json, "Save failed."));
        return;
      }
      setStatus(editingId ? "Updated." : "Created.");
      reset();
      router.refresh();
    } catch {
      setStatus("Network error.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteAdvertiser(id: string) {
    if (!confirm("Delete advertiser? Bids and historical results will lose their direct link.")) return;
    setLoading(true);
    try {
      await fetch(`/api/auction/advertisers/${id}`, { method: "DELETE" });
      if (editingId === id) reset();
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h3>Advertisers</h3>
      <form onSubmit={submit}>
        <div className="grid grid-2" style={{ gap: 10 }}>
          <label>
            Name
            <input value={form.name} onChange={(e) => update("name", e.target.value)} maxLength={80} />
          </label>
          <label>
            Quality score (0–1)
            <input type="number" min={0.01} max={1} step={0.01} value={form.qualityScore} onChange={(e) => update("qualityScore", Number(e.target.value || 0))} />
          </label>
          <label>
            Daily budget ($)
            <input type="number" min={0} step={1} value={form.dailyBudgetDollars} onChange={(e) => update("dailyBudgetDollars", Number(e.target.value || 0))} />
          </label>
          <label>
            Pacing smoothing (0.01–1)
            <input type="number" min={0.01} max={1} step={0.01} value={form.smoothingFactor} onChange={(e) => update("smoothingFactor", Number(e.target.value || 0.5))} />
          </label>
          <label>
            Behavior mode
            <select value={form.behaviorMode} onChange={(e) => update("behaviorMode", e.target.value as FormState["behaviorMode"])}>
              <option value="truthful">truthful</option>
              <option value="shaded">shaded (×0.85)</option>
              <option value="auto_bid">auto_bid (capped by target CAC)</option>
            </select>
          </label>
          {form.behaviorMode === "auto_bid" ? (
            <label>
              Target CAC ($)
              <input type="number" min={0} step={1} value={form.targetCacDollars ?? 0} onChange={(e) => update("targetCacDollars", Number(e.target.value || 0))} />
            </label>
          ) : null}
        </div>
        {errors.length > 0 ? (
          <ul style={{ marginTop: 8 }}>
            {errors.map((err) => <li key={err} className="bandText--unhealthy small">{err}</li>)}
          </ul>
        ) : null}
        <div className="ctaRow">
          <button type="submit" disabled={loading}>{editingId ? "Save changes" : "Add advertiser"}</button>
          {editingId ? <button type="button" onClick={reset}>Cancel</button> : null}
        </div>
        {status ? <p className="small">{status}</p> : null}
      </form>

      {advertisers.length > 0 ? (
        <table className="table" style={{ marginTop: 12 }}>
          <thead>
            <tr><th>Name</th><th>Quality</th><th>Daily $</th><th>Smooth</th><th>Mode</th><th></th></tr>
          </thead>
          <tbody>
            {advertisers.map((adv) => (
              <tr key={adv.id}>
                <td>{adv.name}</td>
                <td><code className="small">{adv.qualityScore.toFixed(2)}</code></td>
                <td>${(adv.dailyBudgetCents / 100).toFixed(0)}</td>
                <td><code className="small">{adv.smoothingFactor.toFixed(2)}</code></td>
                <td><code className="small">{adv.behaviorMode}</code></td>
                <td>
                  <button type="button" onClick={() => loadForEdit(adv)} disabled={loading}>Edit</button>
                  {" "}
                  <button type="button" onClick={() => deleteAdvertiser(adv.id)} disabled={loading}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}
