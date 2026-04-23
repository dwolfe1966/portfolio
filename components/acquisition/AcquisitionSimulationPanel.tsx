"use client";

import { useEffect, useState } from "react";

type Campaign = {
  id: string;
  name: string;
  state: string;
  createdAt: string;
  _count?: { testCells: number; budgetActivities: number };
};

export function AcquisitionSimulationPanel() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>("");

  async function refreshCampaigns() {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/acquisition/campaigns", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) {
        setMessage(json.error ?? "Unable to load campaigns");
        return;
      }
      if (json.compatibilityMode) {
        setMessage("Acquisition schema not available yet. Run db push/migrations and seed.");
      }
      setCampaigns(json.campaigns ?? []);
    } catch {
      setMessage("Network error while loading campaigns.");
    } finally {
      setLoading(false);
    }
  }

  async function runIteration(campaignId: string) {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`/api/acquisition/campaigns/${campaignId}/iterate`, { method: "POST" });
      const json = await res.json();
      setMessage(json.ok ? `Iteration complete. Updated ${json.iteratedCells} test cells.` : json.error ?? "Iteration failed");
      await refreshCampaigns();
    } catch {
      setMessage("Network error while running iteration.");
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshCampaigns();
  }, []);

  return (
    <div className="card">
      <h3>Run simulation loop</h3>
      <p>Each iteration scores cells, updates campaign state, and records budget-shift activity.</p>
      <div className="ctaRow">
        <button onClick={refreshCampaigns} disabled={loading}>{loading ? "Refreshing..." : "Refresh campaigns"}</button>
      </div>
      {message ? <p className="small">{message}</p> : null}

      {campaigns.length === 0 ? (
        <div className="card" style={{ marginTop: 10 }}>
          <p>No campaigns found. Create one on the Inputs tab, then run your first iteration here.</p>
        </div>
      ) : (
        <table className="table" style={{ marginTop: 10 }}>
          <thead><tr><th>Campaign</th><th>State</th><th>Created</th><th>Cells</th><th>Budget actions</th><th>Action</th></tr></thead>
          <tbody>
            {campaigns.map((campaign) => (
              <tr key={campaign.id}>
                <td>{campaign.name}</td>
                <td>{campaign.state}</td>
                <td>{new Date(campaign.createdAt).toLocaleString()}</td>
                <td>{campaign._count?.testCells ?? "—"}</td>
                <td>{campaign._count?.budgetActivities ?? "—"}</td>
                <td><button onClick={() => runIteration(campaign.id)} disabled={loading}>Run iteration</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
