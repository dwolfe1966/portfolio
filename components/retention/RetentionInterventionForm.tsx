"use client";

import { useState } from "react";

type Option = {
  id: string;
  name: string;
};

export function RetentionInterventionForm({
  accounts,
  playbooks
}: {
  accounts: Option[];
  playbooks: Option[];
}) {
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [playbookId, setPlaybookId] = useState(playbooks[0]?.id ?? "");
  const [owner, setOwner] = useState("customer-success");
  const [rationale, setRationale] = useState("Queue save motion from latest retention risk review.");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function createIntervention() {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/retention/interventions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, playbookId, owner, rationale, status: "queued" })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message ?? "Intervention failed");
      setMessage("Intervention queued.");
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Intervention failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h3>Queue intervention</h3>
      <div className="grid grid-2">
        <label>Account
          <select value={accountId} onChange={(event) => setAccountId(event.target.value)}>
            {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
          </select>
        </label>
        <label>Playbook
          <select value={playbookId} onChange={(event) => setPlaybookId(event.target.value)}>
            {playbooks.map((playbook) => <option key={playbook.id} value={playbook.id}>{playbook.name}</option>)}
          </select>
        </label>
      </div>
      <label>Owner
        <input value={owner} onChange={(event) => setOwner(event.target.value)} />
      </label>
      <label>Rationale
        <textarea value={rationale} onChange={(event) => setRationale(event.target.value)} rows={3} />
      </label>
      <button type="button" onClick={createIntervention} disabled={loading || !accountId || !playbookId}>
        {loading ? "Queueing..." : "Queue intervention"}
      </button>
      {message ? <p className="small" style={{ marginTop: 8 }}>{message}</p> : null}
    </div>
  );
}
