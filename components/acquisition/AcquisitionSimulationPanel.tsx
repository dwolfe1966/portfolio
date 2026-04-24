"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Campaign = {
  id: string;
  name: string;
  state: string;
  createdAt: string;
  _count?: { testCells: number; budgetActivities: number };
};

type PerformancePoint = {
  recordedAt: string;
  impressions: number;
  clicks: number;
  conversions: number;
  spendCents: number;
  revenueCents: number;
  cpaCents: number;
  roas: number;
};

type InsightsPayload = {
  ok: boolean;
  summary?: {
    spendCents: number;
    conversions: number;
    revenueCents: number;
    cpaCents: number;
    roas: number;
  };
  performanceSeries: PerformancePoint[];
};

export function AcquisitionSimulationPanel() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [performanceSeries, setPerformanceSeries] = useState<PerformancePoint[]>([]);

  const refreshCampaigns = useCallback(async function refreshCampaigns() {
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
      const nextCampaigns: Campaign[] = json.campaigns ?? [];
      setCampaigns(nextCampaigns);
      if (nextCampaigns.length && !selectedCampaignId) {
        setSelectedCampaignId(nextCampaigns[0].id);
      }
    } catch {
      setMessage("Network error while loading campaigns.");
    } finally {
      setLoading(false);
    }
  }, [selectedCampaignId]);

  const loadInsights = useCallback(async function loadInsights(campaignId: string) {
    if (!campaignId) {
      setPerformanceSeries([]);
      return;
    }

    try {
      const res = await fetch(`/api/acquisition/campaigns/${campaignId}/insights`, { cache: "no-store" });
      const json = (await res.json()) as InsightsPayload;
      if (!res.ok || !json.ok) {
        setMessage("Could not load performance chart data.");
        return;
      }
      setPerformanceSeries(json.performanceSeries ?? []);
    } catch {
      setMessage("Network error while loading insights.");
    }
  }, []);

  async function runIteration(campaignId: string) {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`/api/acquisition/campaigns/${campaignId}/iterate`, { method: "POST" });
      const json = await res.json();
      setMessage(json.ok ? `Iteration complete. Updated ${json.iteratedCells} test cells.` : json.error ?? "Iteration failed");
      await refreshCampaigns();
      await loadInsights(campaignId);
    } catch {
      setMessage("Network error while running iteration.");
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshCampaigns();
  }, [refreshCampaigns]);

  useEffect(() => {
    void loadInsights(selectedCampaignId);
  }, [selectedCampaignId, loadInsights]);

  const chartMax = useMemo(() => {
    const maxImpressions = Math.max(...performanceSeries.map((point) => point.impressions), 1);
    const maxClicks = Math.max(...performanceSeries.map((point) => point.clicks), 1);
    const maxConversions = Math.max(...performanceSeries.map((point) => point.conversions), 1);
    const maxCpa = Math.max(...performanceSeries.map((point) => point.cpaCents), 1);
    const maxRoas = Math.max(...performanceSeries.map((point) => point.roas), 1);
    return { maxImpressions, maxClicks, maxConversions, maxCpa, maxRoas };
  }, [performanceSeries]);

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
        <>
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

          <div className="card" style={{ marginTop: 14 }}>
            <h3>Performance trend charts</h3>
            <p className="small">Impressions, clicks, conversions, CAC, and ROAS over time.</p>
            <label>
              Campaign
              <select value={selectedCampaignId} onChange={(e) => setSelectedCampaignId(e.target.value)}>
                {campaigns.map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
                ))}
              </select>
            </label>

            {performanceSeries.length === 0 ? (
              <p className="small" style={{ marginTop: 10 }}>No performance points yet. Run an iteration to generate chart data.</p>
            ) : (
              <div className="grid grid-2" style={{ marginTop: 12 }}>
                {["impressions", "clicks", "conversions"].map((metric) => (
                  <div key={metric} className="card">
                    <h3 style={{ textTransform: "capitalize" }}>{metric}</h3>
                    <div className="chartColumns">
                      {performanceSeries.map((point, idx) => {
                        const value = point[metric as keyof PerformancePoint] as number;
                        const max = metric === "impressions" ? chartMax.maxImpressions : metric === "clicks" ? chartMax.maxClicks : chartMax.maxConversions;
                        return (
                          <div className="chartBarWrap" key={`${metric}-${idx}`}>
                            <div className="chartBar" style={{ height: `${(value / max) * 140}px` }} />
                            <p className="small">t{idx + 1}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                <div className="card">
                  <h3>CAC (CPA)</h3>
                  <div className="chartColumns">
                    {performanceSeries.map((point, idx) => (
                      <div className="chartBarWrap" key={`cpa-${idx}`}>
                        <div className="chartBar secondary" style={{ height: `${(point.cpaCents / chartMax.maxCpa) * 140}px` }} />
                        <p className="small">t{idx + 1}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card">
                  <h3>ROAS</h3>
                  <div className="chartColumns">
                    {performanceSeries.map((point, idx) => (
                      <div className="chartBarWrap" key={`roas-${idx}`}>
                        <div className="chartBar" style={{ height: `${(point.roas / chartMax.maxRoas) * 140}px` }} />
                        <p className="small">t{idx + 1}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
