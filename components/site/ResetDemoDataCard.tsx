"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ResetDemoDataCardProps = {
  appLabel: "Lifecycle" | "Acquisition" | "Auction" | "Pricing" | "Retention" | "Expansion";
  scope?: "all" | "lifecycle" | "acquisition" | "auction" | "pricing" | "retention" | "expansion";
  variant?: "card" | "embedded";
};

export function ResetDemoDataCard({ appLabel, scope = "all", variant = "card" }: ResetDemoDataCardProps) {
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
        body: JSON.stringify({ confirm: "RESET_DEMO", scope })
      });
      const payload = await response.json();
      if (!payload.ok) {
        setStatus(payload.error?.message ?? "Reset failed.");
        return;
      }
      const scopeLabel = scope === "all" ? `${appLabel} + shared` : appLabel;
      setStatus(`${scopeLabel} workspace data reset and reseeded.`);
      router.refresh();
    } catch {
      setStatus("Reset failed due to network/server error.");
    } finally {
      setLoading(false);
    }
  }

  const scopeCopy = scope === "all"
    ? "Clears lifecycle, acquisition, auction, pricing, retention, and expansion records, then reseeds representative baseline data for all Tools."
    : `Clears ${appLabel.toLowerCase()} workspace records, then reseeds representative ${appLabel.toLowerCase()} baseline data.`;

  const wrapperClass = variant === "embedded" ? "sampleDataResetEmbedded" : "card";

  return (
    <div className={wrapperClass}>
      <h3>Reset workspace data</h3>
      <p className="small">{scopeCopy}</p>
      <label className="small" style={{ display: "block", marginBottom: 8 }}>
        <input
          type="checkbox"
          checked={confirm}
          onChange={(event) => setConfirm(event.target.checked)}
          style={{ marginRight: 6 }}
        />
        I understand this will delete current workspace rows and reseed selected workspace data.
      </label>
      <button type="button" onClick={resetAndReseed} disabled={loading || !confirm}>
        {loading ? "Resetting..." : "Reset DB + reseed workspace"}
      </button>
      {status && <p className="small" style={{ marginTop: 8 }}>{status}</p>}
    </div>
  );
}
