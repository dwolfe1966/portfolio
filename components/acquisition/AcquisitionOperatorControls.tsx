"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type CellOption = {
  id: string;
  label: string;
  budgetCents: number;
};

export function AcquisitionOperatorControls({
  campaignId,
  initialMaxShift,
  initialMinConfidence,
  cellOptions
}: {
  campaignId: string;
  initialMaxShift: number;
  initialMinConfidence: number;
  cellOptions: CellOption[];
}) {
  const router = useRouter();
  const [maxShift, setMaxShift] = useState(initialMaxShift);
  const [minConfidence, setMinConfidence] = useState(initialMinConfidence);
  const [cellId, setCellId] = useState(cellOptions[0]?.id ?? "");
  const [budgetCents, setBudgetCents] = useState(cellOptions[0]?.budgetCents ?? 0);
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function updateGuardrails() {
    setLoading(true);
    setStatus("");
    try {
      const response = await fetch(`/api/acquisition/campaigns/${campaignId}/overrides`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_guardrails", maxBudgetShiftPct: maxShift, minConfidence })
      });
      const payload = await response.json();
      setStatus(payload.ok ? "Guardrails updated." : payload.error ?? "Update failed.");
      router.refresh();
    } catch {
      setStatus("Network error while updating guardrails.");
    } finally {
      setLoading(false);
    }
  }

  async function lockBudget() {
    if (!cellId) return;
    setLoading(true);
    setStatus("");
    try {
      const response = await fetch(`/api/acquisition/campaigns/${campaignId}/overrides`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "lock_cell_budget", testCellId: cellId, budgetCents })
      });
      const payload = await response.json();
      setStatus(payload.ok ? "Cell budget override applied." : payload.error ?? "Override failed.");
      router.refresh();
    } catch {
      setStatus("Network error while applying override.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h3>Operator controls</h3>
      <p className="small">Adjust guardrails and apply explicit budget overrides when human intervention is required.</p>

      <div className="grid grid-2" style={{ marginTop: 10 }}>
        <label>
          Max budget shift percentage
          <input type="number" min={0.01} max={0.5} step={0.01} value={maxShift} onChange={(e) => setMaxShift(Number(e.target.value || 0.2))} />
        </label>
        <label>
          Min confidence threshold
          <input type="number" min={0.5} max={0.95} step={0.01} value={minConfidence} onChange={(e) => setMinConfidence(Number(e.target.value || 0.65))} />
        </label>
      </div>

      <div className="ctaRow">
        <button type="button" onClick={updateGuardrails} disabled={loading}>Apply guardrails</button>
      </div>

      <hr style={{ margin: "16px 0", borderColor: "#ddddda" }} />

      <div className="grid grid-2">
        <label>
          Test cell
          <select value={cellId} onChange={(e) => setCellId(e.target.value)}>
            {cellOptions.map((cell) => (
              <option key={cell.id} value={cell.id}>{cell.label}</option>
            ))}
          </select>
        </label>
        <label>
          Override budget (cents)
          <input type="number" min={0} value={budgetCents} onChange={(e) => setBudgetCents(Number(e.target.value || 0))} />
        </label>
      </div>

      <div className="ctaRow">
        <button type="button" onClick={lockBudget} disabled={loading || !cellId}>Apply budget lock override</button>
      </div>

      {status ? <p className="small" style={{ marginTop: 10 }}>{status}</p> : null}
    </div>
  );
}
