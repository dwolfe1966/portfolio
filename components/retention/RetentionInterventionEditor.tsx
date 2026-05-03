"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { readErrorMessage } from "@/lib/api-contract";

const STATUSES = ["queued", "in_progress", "completed", "cancelled"];

type Option = { id: string; name: string };

type Intervention = {
  id: string;
  accountId: string;
  playbookId: string;
  status: string;
  owner: string;
  rationale: string;
  dueAt: Date | string | null;
  savedRevenueCents: number | null;
  account: { name: string };
  playbook: { name: string };
};

export function RetentionInterventionEditor({
  intervention,
  accounts,
  playbooks
}: {
  intervention: Intervention;
  accounts: Option[];
  playbooks: Option[];
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    accountId: intervention.accountId,
    playbookId: intervention.playbookId,
    status: intervention.status,
    owner: intervention.owner,
    rationale: intervention.rationale,
    dueAt: intervention.dueAt ? new Date(intervention.dueAt).toISOString().slice(0, 16) : "",
    savedRevenueDollars: intervention.savedRevenueCents == null ? "" : String(Math.round(intervention.savedRevenueCents / 100))
  });
  const [message, setMessage] = useState("");

  async function save() {
    const response = await fetch(`/api/retention/interventions/${intervention.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : null,
        savedRevenueCents: form.savedRevenueDollars === "" ? null : Math.round(Number(form.savedRevenueDollars) * 100)
      })
    });
    const payload = await response.json();
    setMessage(response.ok ? "Saved." : readErrorMessage(payload, "Save failed."));
    if (response.ok) router.refresh();
  }

  return (
    <div className="card">
      <p className="eyebrow">{intervention.status} · {intervention.owner}</p>
      <h3>{intervention.account.name}</h3>
      <div className="grid grid-2">
        <label>Account<select value={form.accountId} onChange={(event) => setForm((current) => ({ ...current, accountId: event.target.value }))}>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
        <label>Playbook<select value={form.playbookId} onChange={(event) => setForm((current) => ({ ...current, playbookId: event.target.value }))}>{playbooks.map((playbook) => <option key={playbook.id} value={playbook.id}>{playbook.name}</option>)}</select></label>
        <label>Status<select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>{STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
        <label>Owner<input value={form.owner} onChange={(event) => setForm((current) => ({ ...current, owner: event.target.value }))} /></label>
        <label>Due at<input type="datetime-local" value={form.dueAt} onChange={(event) => setForm((current) => ({ ...current, dueAt: event.target.value }))} /></label>
        <label>Saved revenue ($)<input type="number" min={0} value={form.savedRevenueDollars} onChange={(event) => setForm((current) => ({ ...current, savedRevenueDollars: event.target.value }))} /></label>
      </div>
      <label>Rationale<textarea rows={3} value={form.rationale} onChange={(event) => setForm((current) => ({ ...current, rationale: event.target.value }))} /></label>
      <button type="button" onClick={save}>Save intervention</button>
      {message ? <p className="small" style={{ marginTop: 8 }}>{message}</p> : null}
    </div>
  );
}
