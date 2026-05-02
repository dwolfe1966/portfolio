"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { readErrorMessage } from "@/lib/api-contract";
import {
  validTransitionsFrom,
  type AcquisitionCampaignState
} from "@/lib/acquisition";

type TransitionHistoryEntry = {
  id: string;
  actor: string;
  createdAt: string;
  from: string;
  to: string;
  reason: string;
};

export function CampaignStateControls({
  campaignId,
  currentState,
  history
}: {
  campaignId: string;
  currentState: AcquisitionCampaignState;
  history: TransitionHistoryEntry[];
}) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const allowed = validTransitionsFrom(currentState);

  async function transition(toState: AcquisitionCampaignState) {
    setLoading(true);
    setStatus("");
    try {
      const response = await fetch(`/api/acquisition/campaigns/${campaignId}/overrides`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "transition_state", toState, reason })
      });
      const payload = await response.json();
      setStatus(payload.ok ? `Transitioned to ${toState}.` : readErrorMessage(payload, "Transition failed."));
      if (payload.ok) setReason("");
      router.refresh();
    } catch {
      setStatus("Network error while transitioning state.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h3>Campaign state</h3>
      <p>
        Current state: <strong>{currentState}</strong>
      </p>
      {allowed.length === 0 ? (
        <p className="small">This campaign is in a terminal state — no further transitions allowed.</p>
      ) : (
        <>
          <label>
            Reason (optional)
            <input
              type="text"
              maxLength={240}
              value={reason}
              placeholder="e.g. Approved scaling after CAC stabilized"
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <div className="ctaRow" style={{ marginTop: 8 }}>
            {allowed.map((next) => (
              <button
                key={next}
                type="button"
                disabled={loading}
                onClick={() => transition(next)}
              >
                Move to {next}
              </button>
            ))}
          </div>
        </>
      )}

      <h4 style={{ marginTop: 16 }}>Transition history</h4>
      {history.length === 0 ? (
        <p className="small">No state transitions recorded yet.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>When</th>
              <th>Actor</th>
              <th>From → To</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            {history.map((entry) => (
              <tr key={entry.id}>
                <td>{new Date(entry.createdAt).toLocaleString()}</td>
                <td>{entry.actor}</td>
                <td>
                  {entry.from} → {entry.to}
                </td>
                <td>{entry.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {status ? <p className="small" style={{ marginTop: 10 }}>{status}</p> : null}
    </div>
  );
}
