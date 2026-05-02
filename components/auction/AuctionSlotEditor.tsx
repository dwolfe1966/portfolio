"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { readErrorMessage } from "@/lib/api-contract";

type Slot = {
  id: string;
  name: string;
  reservePriceCents: number;
  expectedDailyVolume: number;
};

type FormState = {
  name: string;
  reservePriceCents: number;
  expectedDailyVolume: number;
};

const BLANK: FormState = { name: "", reservePriceCents: 200, expectedDailyVolume: 100 };

export function AuctionSlotEditor({ slots }: { slots: Slot[] }) {
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

  function loadForEdit(slot: Slot) {
    setEditingId(slot.id);
    setForm({
      name: slot.name,
      reservePriceCents: slot.reservePriceCents,
      expectedDailyVolume: slot.expectedDailyVolume
    });
    setErrors([]);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setStatus("");
    setErrors([]);
    try {
      const url = editingId ? `/api/auction/slots/${editingId}` : "/api/auction/slots";
      const method = editingId ? "PATCH" : "POST";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
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

  async function deleteSlot(id: string) {
    if (!confirm("Delete inventory slot? Linked bids will be removed.")) return;
    setLoading(true);
    try {
      await fetch(`/api/auction/slots/${id}`, { method: "DELETE" });
      if (editingId === id) reset();
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h3>Inventory slots</h3>
      <form onSubmit={submit}>
        <div className="grid grid-3" style={{ gap: 10 }}>
          <label>
            Name
            <input value={form.name} onChange={(e) => update("name", e.target.value)} maxLength={80} />
          </label>
          <label>
            Reserve price (cents)
            <input type="number" min={0} value={form.reservePriceCents} onChange={(e) => update("reservePriceCents", Number(e.target.value || 0))} />
          </label>
          <label>
            Expected daily volume
            <input type="number" min={1} value={form.expectedDailyVolume} onChange={(e) => update("expectedDailyVolume", Number(e.target.value || 1))} />
          </label>
        </div>
        {errors.length > 0 ? (
          <ul style={{ marginTop: 8 }}>
            {errors.map((err) => <li key={err} className="bandText--unhealthy small">{err}</li>)}
          </ul>
        ) : null}
        <div className="ctaRow">
          <button type="submit" disabled={loading}>{editingId ? "Save changes" : "Add slot"}</button>
          {editingId ? <button type="button" onClick={reset}>Cancel</button> : null}
        </div>
        {status ? <p className="small">{status}</p> : null}
      </form>

      {slots.length > 0 ? (
        <table className="table" style={{ marginTop: 12 }}>
          <thead><tr><th>Name</th><th>Reserve</th><th>Volume</th><th></th></tr></thead>
          <tbody>
            {slots.map((slot) => (
              <tr key={slot.id}>
                <td>{slot.name}</td>
                <td>${(slot.reservePriceCents / 100).toFixed(2)}</td>
                <td>{slot.expectedDailyVolume}</td>
                <td>
                  <button type="button" onClick={() => loadForEdit(slot)} disabled={loading}>Edit</button>
                  {" "}
                  <button type="button" onClick={() => deleteSlot(slot.id)} disabled={loading}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}
