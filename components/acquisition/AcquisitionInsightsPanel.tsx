"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Campaign = { id: string; name: string; state: string };

type InsightSummary = {
  totalCells: number;
  spendCents: number;
  conversions: number;
  revenueCents: number;
  cpaCents: number;
  roas: number;
};

type TopCell = {
  id: string;
  score: number;
  roas: number;
  cacCents: number;
  creative: { headline: string };
  audience: { name: string };
};

export function AcquisitionInsightsPanel() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignId, setCampaignId] = useState("");
  const [summary, setSummary] = useState<InsightSummary | null>(null);
  const [cells, setCells] = useState<TopCell[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const loadInsights = useCallback(async (id: string) => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/acquisition/campaigns/${id}/insights`, { cache: "no-store" });
      const json = await response.json();
      if (!response.ok || !json.ok) {
        setMessage(json.error ?? "Unable to load campaign insights");
        setSummary(null);
        setCells([]);
        return;
      }
      if (json.compatibilityMode) {
        setMessage("Acquisition schema is not ready yet. Run db push/migrations and seed.");
      } else {
        setMessage("");
      }
      setSummary(json.summary);
      setCells(json.topCells ?? []);
    } catch {
      setMessage("Network error while loading insights.");
      setSummary(null);
      setCells([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCampaigns = useCallback(async () => {
    try {
      const response = await fetch("/api/acquisition/campaigns", { cache: "no-store" });
      const json = await response.json();
      const items: Campaign[] = json.campaigns ?? [];
      setCampaigns(items);
      if (!campaignId && items[0]) {
        setCampaignId(items[0].id);
        void loadInsights(items[0].id);
      }
    } catch {
      setMessage("Network error while loading campaign list.");
    }
  }, [campaignId, loadInsights]);

  useEffect(() => {
    void loadCampaigns();
  }, [loadCampaigns]);

  const funnel = useMemo(() => {
    if (!summary) return [];
    return [
      { label: "Spend", value: summary.spendCents / 100 },
      { label: "Revenue", value: summary.revenueCents / 100 },
      { label: "ROAS", value: summary.roas }
    ];
  }, [summary]);

  return (
    <div className="card">
      <h3>Campaign insights</h3>
      <p>Inspect economics and top test cells after each simulation iteration.</p>
      <div className="grid grid-2">
        <label>
          Campaign
          <select
            value={campaignId}
            onChange={(event) => {
              setCampaignId(event.target.value);
              void loadInsights(event.target.value);
            }}
          >
            <option value="">Select a campaign</option>
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>{campaign.name} ({campaign.state})</option>
            ))}
          </select>
        </label>
        <div className="ctaRow" style={{ alignItems: "end" }}>
          <button type="button" onClick={() => void loadInsights(campaignId)} disabled={!campaignId || loading}>
            {loading ? "Loading..." : "Refresh insights"}
          </button>
        </div>
      </div>

      {message ? <p className="small">{message}</p> : null}

      {summary && (
        <>
          <div className="grid grid-4" style={{ marginTop: 12 }}>
            <div className="card"><div className="kpi">{summary.totalCells}</div><p>Test cells</p></div>
            <div className="card"><div className="kpi">{summary.conversions}</div><p>Conversions</p></div>
            <div className="card"><div className="kpi">${(summary.cpaCents / 100).toFixed(0)}</div><p>CPA</p></div>
            <div className="card"><div className="kpi">{summary.roas.toFixed(2)}x</div><p>ROAS</p></div>
          </div>

          <div style={{ marginTop: 16 }}>
            {funnel.map((item) => (
              <div key={item.label} style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span className="small">{item.label}</span>
                  <span className="small">{item.value.toFixed(2)}</span>
                </div>
                <div style={{ height: 10, background: "#e5e7eb", borderRadius: 999 }}>
                  <div style={{ height: 10, borderRadius: 999, background: "#111827", width: `${Math.min(100, item.value / 5)}%` }} />
                </div>
              </div>
            ))}
          </div>

          <table className="table" style={{ marginTop: 14 }}>
            <thead><tr><th>Creative</th><th>Audience</th><th>Score</th><th>CAC</th><th>ROAS</th></tr></thead>
            <tbody>
              {cells.map((cell) => (
                <tr key={cell.id}>
                  <td>{cell.creative.headline}</td>
                  <td>{cell.audience.name}</td>
                  <td>{cell.score.toFixed(3)}</td>
                  <td>${(cell.cacCents / 100).toFixed(2)}</td>
                  <td>{cell.roas.toFixed(2)}x</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
