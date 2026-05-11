"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Campaign = { id: string; name: string; state: string };

type SourceLineage = {
  label: string;
  sourceName: string;
  provider?: string;
  datasetId?: string;
  connectionId?: string;
  externalAccountId?: string;
  appliedAt?: string | null;
};

type InsightSummary = {
  totalCells: number;
  impressions: number;
  clicks: number;
  spendCents: number;
  conversions: number;
  revenueCents: number;
  activeBudgetCents: number;
  cpaCents: number;
  roas: number;
  ctr: number;
  conversionRate: number;
  revenuePerConversionCents: number;
  targetCacCents: number;
  targetLtvCents: number;
  cacToTargetPct: number;
  ltvCacRatio: number;
  budgetUtilizationPct: number;
  averageScore: number;
  budgetActivityCount: number;
};

type TopCell = {
  id: string;
  score: number;
  roas: number;
  cacCents: number;
  creative: { headline: string };
  audience: { name: string };
};

type TrendRow = {
  id: string;
  label: string;
  channel?: string;
  audienceType?: string;
  impressions: number;
  clicks: number;
  conversions: number;
  spendCents: number;
  revenueCents: number;
  ctr: number;
  conversionRate: number;
  cpaCents: number;
  roas: number;
};

type BudgetTimelineItem = {
  id: string;
  createdAt: string;
  amountCents: number;
  reason: string;
  fromLabel: string;
  toLabel: string;
};

export function AcquisitionInsightsPanel() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignId, setCampaignId] = useState("");
  const [summary, setSummary] = useState<InsightSummary | null>(null);
  const [cells, setCells] = useState<TopCell[]>([]);
  const [creativeTrends, setCreativeTrends] = useState<TrendRow[]>([]);
  const [audienceTrends, setAudienceTrends] = useState<TrendRow[]>([]);
  const [budgetTimeline, setBudgetTimeline] = useState<BudgetTimelineItem[]>([]);
  const [source, setSource] = useState<SourceLineage | null>(null);
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
        setCreativeTrends([]);
        setAudienceTrends([]);
        setBudgetTimeline([]);
        setSource(null);
        return;
      }
      if (json.compatibilityMode) {
        setMessage("Acquisition schema is not ready yet. Run migrations and seed.");
      } else {
        setMessage("");
      }
      setSummary(json.summary);
      setCells(json.topCells ?? []);
      setCreativeTrends(json.creativeTrends ?? []);
      setAudienceTrends(json.audienceTrends ?? []);
      setBudgetTimeline(json.budgetTimeline ?? []);
      setSource(json.source ?? null);
    } catch {
      setMessage("Network error while loading insights.");
      setSummary(null);
      setCells([]);
      setCreativeTrends([]);
      setAudienceTrends([]);
      setBudgetTimeline([]);
      setSource(null);
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
          {source ? (
            <div className="grid grid-3" style={{ marginTop: 12 }}>
              <div className="card">
                <p className="small">Insight source</p>
                <div className="workspaceSettingValue">{source.label}</div>
                <p className="small">{source.sourceName}</p>
              </div>
              <div className="card">
                <p className="small">Provider account</p>
                <div className="workspaceSettingValue">{source.externalAccountId || "None"}</div>
                <p className="small">{source.connectionId ? `Connection ${source.connectionId.slice(0, 8)}` : "No linked provider account"}</p>
              </div>
              <div className="card">
                <p className="small">Applied</p>
                <div className="workspaceSettingValue">{source.appliedAt ? new Date(source.appliedAt).toLocaleString() : "Sample/manual"}</div>
                <p className="small">{source.datasetId ? `Dataset ${source.datasetId.slice(0, 8)}` : "No dataset reference"}</p>
              </div>
            </div>
          ) : null}
          <div className="grid grid-3" style={{ marginTop: 12 }}>
            <div className="card"><div className="kpi">{summary.totalCells}</div><p>Test cells</p></div>
            <div className="card"><div className="kpi">{summary.conversions}</div><p>Conversions</p></div>
            <div className="card"><div className="kpi">${(summary.cpaCents / 100).toFixed(0)}</div><p>CPA</p></div>
            <div className="card"><div className="kpi">{summary.roas.toFixed(2)}x</div><p>ROAS</p></div>
            <div className="card"><div className="kpi">{summary.averageScore.toFixed(3)}</div><p>Avg score</p></div>
            <div className="card"><div className="kpi">{summary.budgetActivityCount}</div><p>Budget actions</p></div>
          </div>
          <div className="grid grid-4" style={{ marginTop: 12 }}>
            <div className="card"><div className="kpi">{(summary.ctr * 100).toFixed(1)}%</div><p>CTR</p></div>
            <div className="card"><div className="kpi">{(summary.conversionRate * 100).toFixed(1)}%</div><p>Click → conversion</p></div>
            <div className="card"><div className="kpi">{summary.ltvCacRatio.toFixed(2)}x</div><p>LTV/CAC ratio</p></div>
            <div className="card"><div className="kpi">{(summary.budgetUtilizationPct * 100).toFixed(0)}%</div><p>Budget utilized</p></div>
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

          <div className="grid grid-2" style={{ marginTop: 14 }}>
            <div className="card">
              <h3>Creative trend comparison</h3>
              {creativeTrends.length === 0 ? (
                <p className="small">Run iterations to populate creative-level trends.</p>
              ) : (
                <table className="table">
                  <thead><tr><th>Creative</th><th>Channel</th><th>Conv.</th><th>CPA</th><th>ROAS</th></tr></thead>
                  <tbody>
                    {creativeTrends.slice(0, 6).map((row) => (
                      <tr key={row.id}>
                        <td>{row.label}</td>
                        <td>{row.channel ?? "—"}</td>
                        <td>{row.conversions}</td>
                        <td>${(row.cpaCents / 100).toFixed(0)}</td>
                        <td>{row.roas.toFixed(2)}x</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="card">
              <h3>Audience trend comparison</h3>
              {audienceTrends.length === 0 ? (
                <p className="small">Run iterations to populate audience-level trends.</p>
              ) : (
                <table className="table">
                  <thead><tr><th>Audience</th><th>Type</th><th>Conv.</th><th>CPA</th><th>ROAS</th></tr></thead>
                  <tbody>
                    {audienceTrends.slice(0, 6).map((row) => (
                      <tr key={row.id}>
                        <td>{row.label}</td>
                        <td>{row.audienceType ?? "—"}</td>
                        <td>{row.conversions}</td>
                        <td>${(row.cpaCents / 100).toFixed(0)}</td>
                        <td>{row.roas.toFixed(2)}x</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="card" style={{ marginTop: 14 }}>
            <h3>Budget activity timeline</h3>
            {budgetTimeline.length === 0 ? (
              <p className="small">No budget moves recorded yet.</p>
            ) : (
              <div className="budgetTimeline">
                {budgetTimeline.map((item) => (
                  <div className="budgetTimelineItem" key={item.id}>
                    <div className="budgetTimelineAmount">${(item.amountCents / 100).toFixed(0)}</div>
                    <div>
                      <p className="small">{new Date(item.createdAt).toLocaleString()}</p>
                      <h3>{item.reason}</h3>
                      <p className="small">From: {item.fromLabel}</p>
                      <p className="small">To: {item.toLabel}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
