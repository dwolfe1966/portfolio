"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ResetDemoDataCardProps = {
  appLabel: "Lifecycle" | "Acquisition";
};

export function ResetDemoDataCard({ appLabel }: ResetDemoDataCardProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [confirm, setConfirm] = useState(false);
  const router = useRouter();

  async function resetAndReseed() {
    setLoading(true);
    setStatus("");
    try {
      const response = await fetch("/api/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "RESET_DEMO" })
      });
      const payload = await response.json();
      if (!payload.ok) {
        setStatus(payload.error?.message ?? "Reset failed.");
        return;
      }
      setStatus(`${appLabel} + shared demo data reset and reseeded.`);
      router.refresh();
    } catch {
      setStatus("Reset failed due to network/server error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h3>Reset demo data</h3>
      <p className="small">
        Clears lifecycle and acquisition demo records, then reseeds representative baseline data for both apps.
      </p>
      <label className="small" style={{ display: "block", marginBottom: 8 }}>
        <input
          type="checkbox"
          checked={confirm}
          onChange={(event) => setConfirm(event.target.checked)}
          style={{ marginRight: 6 }}
        />
        I understand this will delete current demo rows and reseed both workspaces.
      </label>
      <button type="button" onClick={resetAndReseed} disabled={loading || !confirm}>
        {loading ? "Resetting..." : "Reset DB + reseed demo"}
      </button>
      {status && <p className="small" style={{ marginTop: 8 }}>{status}</p>}
    </div>
  );
}
