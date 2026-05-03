"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { readErrorMessage } from "@/lib/api-contract";

type CellOption = {
  id: string;
  label: string;
  budgetCents: number;
};

export function AcquisitionOperatorControls({
  campaignId,
  initialMaxShift,
  initialMinConfidence,
  initialCooldownHours,
  initialCacAutoPausePct,
  initialMinLtvCacRatio,
  initialApprovalCapPct,
  cellOptions,
  recentOverrideLogs
}: {
  campaignId: string;
  initialMaxShift: number;
  initialMinConfidence: number;
  initialCooldownHours: number;
  initialCacAutoPausePct: number;
  initialMinLtvCacRatio: number;
  initialApprovalCapPct: number;
  cellOptions: CellOption[];
  recentOverrideLogs: {
    id: string;
    action: string;
    createdAt: string;
    metadata: unknown;
  }[];
}) {
  const router = useRouter();
  const [maxShift, setMaxShift] = useState(initialMaxShift);
  const [minConfidence, setMinConfidence] = useState(initialMinConfidence);
  const [cooldownHours, setCooldownHours] = useState(initialCooldownHours);
  const [cacAutoPausePct, setCacAutoPausePct] = useState(initialCacAutoPausePct);
  const [minLtvCacRatio, setMinLtvCacRatio] = useState(initialMinLtvCacRatio);
  const [approvalCapPct, setApprovalCapPct] = useState(initialApprovalCapPct);
  const [cellId, setCellId] = useState(cellOptions[0]?.id ?? "");
  const [budgetDollars, setBudgetDollars] = useState((cellOptions[0]?.budgetCents ?? 0) / 100);
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function updateGuardrails() {
    setLoading(true);
    setStatus("");
    try {
      const response = await fetch(`/api/acquisition/campaigns/${campaignId}/overrides`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_guardrails",
          maxBudgetShiftPct: maxShift,
          minConfidence,
          cooldownHours,
          cacAutoPausePctOfTarget: cacAutoPausePct,
          minLtvCacRatio,
          approvalCapPct
        })
      });
      const payload = await response.json();
      setStatus(payload.ok ? "Guardrails updated." : readErrorMessage(payload, "Update failed."));
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
        body: JSON.stringify({
          action: "lock_cell_budget",
          testCellId: cellId,
          budgetCents: Math.round(budgetDollars * 100)
        })
      });
      const payload = await response.json();
      setStatus(payload.ok ? "Cell budget override applied." : readErrorMessage(payload, "Override failed."));
      router.refresh();
    } catch {
      setStatus("Network error while applying override.");
    } finally {
      setLoading(false);
    }
  }

  async function revertBudgetLock(auditLogId: string) {
    setLoading(true);
    setStatus("");
    try {
      const response = await fetch(`/api/acquisition/campaigns/${campaignId}/overrides`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revert_budget_lock", auditLogId })
      });
      const payload = await response.json();
      setStatus(payload.ok ? "Budget lock reverted." : readErrorMessage(payload, "Revert failed."));
      router.refresh();
    } catch {
      setStatus("Network error while reverting override.");
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
        <label>
          Reallocation cooldown (hours)
          <input type="number" min={1} max={168} step={1} value={cooldownHours} onChange={(e) => setCooldownHours(Number(e.target.value || 24))} />
        </label>
      </div>

      <h4 style={{ marginTop: 16 }}>Policy engine</h4>
      <p className="small">
        CAC/LTV thresholds drive auto-pause decisions and gate large budget shifts behind operator approval.
      </p>
      <div className="grid grid-2" style={{ marginTop: 8 }}>
        <label>
          Auto-pause at CAC × target
          <input type="number" min={1} max={3} step={0.05} value={cacAutoPausePct} onChange={(e) => setCacAutoPausePct(Number(e.target.value || 1.25))} />
        </label>
        <label>
          Min LTV : CAC ratio
          <input type="number" min={1} max={10} step={0.1} value={minLtvCacRatio} onChange={(e) => setMinLtvCacRatio(Number(e.target.value || 2.5))} />
        </label>
        <label>
          Auto-approval cap (budget shift fraction)
          <input type="number" min={0.01} max={0.5} step={0.01} value={approvalCapPct} onChange={(e) => setApprovalCapPct(Number(e.target.value || 0.15))} />
        </label>
      </div>

      <div className="ctaRow">
        <button type="button" onClick={updateGuardrails} disabled={loading}>Apply guardrails</button>
      </div>

      <hr style={{ margin: "16px 0", borderColor: "#ddddda" }} />

      <div className="grid grid-2">
        <label>
          Test cell
          <select
            value={cellId}
            onChange={(e) => {
              setCellId(e.target.value);
              const selected = cellOptions.find((cell) => cell.id === e.target.value);
              if (selected) setBudgetDollars(selected.budgetCents / 100);
            }}
          >
            {cellOptions.map((cell) => (
              <option key={cell.id} value={cell.id}>{cell.label}</option>
            ))}
          </select>
        </label>
        <label>
          Override budget ($)
          <input type="number" min={0} step={1} value={budgetDollars} onChange={(e) => setBudgetDollars(Number(e.target.value || 0))} />
        </label>
      </div>

      <div className="ctaRow">
        <button type="button" onClick={lockBudget} disabled={loading || !cellId}>Apply budget lock override</button>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <h3>Recent override logs</h3>
        {recentOverrideLogs.length === 0 ? (
          <p className="small">No override logs yet.</p>
        ) : (
          <table className="table">
            <thead><tr><th>When</th><th>Action</th><th>Details</th><th>Action</th></tr></thead>
            <tbody>
              {recentOverrideLogs.map((log) => {
                const details = JSON.stringify(log.metadata ?? {});
                const canRevert = log.action === "budget_lock_override";
                return (
                  <tr key={log.id}>
                    <td>{new Date(log.createdAt).toLocaleString()}</td>
                    <td>{log.action}</td>
                    <td><code className="small">{details}</code></td>
                    <td>
                      {canRevert ? (
                        <button type="button" onClick={() => revertBudgetLock(log.id)} disabled={loading}>Revert</button>
                      ) : (
                        <span className="small">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {status ? <p className="small" style={{ marginTop: 10 }}>{status}</p> : null}
    </div>
  );
}
