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

type ScenarioPreset = {
  id?: string;
  name: string;
  runCount: number;
  spendVariance: number;
  conversionVariance: number;
  savedAt: string;
  source?: "server" | "local";
};

const PRESET_STORAGE_KEY = "acq_scenario_presets_v1";
const WORKSPACE_PRESET_URL = "/api/workspace/presets?app=acquisition&presetType=scenario";

function randomFactor(variance: number) {
  const delta = (Math.random() * 2 - 1) * variance;
  return Math.max(0.01, 1 + delta);
}

function readErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;
  const error = (payload as { error?: unknown }).error;
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return fallback;
}

function normalizePreset(item: Partial<ScenarioPreset> & { values?: unknown; updatedAt?: string }): ScenarioPreset | null {
  if (typeof item.name !== "string") return null;
  const values = item.values && typeof item.values === "object" ? item.values as Partial<ScenarioPreset> : item;

  return {
    id: typeof item.id === "string" ? item.id : undefined,
    name: item.name,
    runCount: Number(values.runCount ?? 50),
    spendVariance: Number(values.spendVariance ?? 0.15),
    conversionVariance: Number(values.conversionVariance ?? 0.2),
    savedAt: typeof item.updatedAt === "string"
      ? item.updatedAt
      : typeof item.savedAt === "string"
        ? item.savedAt
        : new Date().toISOString(),
    source: item.source
  };
}

function readLocalPresets() {
  const stored = localStorage.getItem(PRESET_STORAGE_KEY);
  if (!stored) return [];

  try {
    const parsed = JSON.parse(stored) as Array<Partial<ScenarioPreset>>;
    return parsed
      .map((item) => normalizePreset({ ...item, source: "local" }))
      .filter((item): item is ScenarioPreset => Boolean(item));
  } catch {
    return [];
  }
}

function writeLocalPresets(presets: ScenarioPreset[]) {
  localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(presets.map((preset) => ({
    name: preset.name,
    runCount: preset.runCount,
    spendVariance: preset.spendVariance,
    conversionVariance: preset.conversionVariance,
    savedAt: preset.savedAt
  }))));
}

export function AcquisitionSimulationPanel() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [performanceSeries, setPerformanceSeries] = useState<PerformancePoint[]>([]);

  const [runCount, setRunCount] = useState(50);
  const [spendVariance, setSpendVariance] = useState(0.15);
  const [conversionVariance, setConversionVariance] = useState(0.2);
  const [presetName, setPresetName] = useState("Default scenario");
  const [presets, setPresets] = useState<ScenarioPreset[]>([]);
  const [presetStorage, setPresetStorage] = useState<"server" | "local">("local");
  const [monteCarloRevenues, setMonteCarloRevenues] = useState<number[]>([]);

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
        setMessage("Acquisition schema not available yet. Run migrations and seed.");
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

  function runMonteCarloScenario() {
    const baseline = performanceSeries.at(-1);
    if (!baseline) {
      setMessage("Run at least one iteration before scenario analysis.");
      return;
    }

    const cvr = baseline.clicks ? baseline.conversions / baseline.clicks : 0;
    const cpc = baseline.clicks ? baseline.spendCents / baseline.clicks : 0;
    const revenuePerConversion = baseline.conversions ? baseline.revenueCents / baseline.conversions : 0;

    const runs = new Array(runCount).fill(0).map(() => {
      const simulatedSpend = baseline.spendCents * randomFactor(spendVariance);
      const simulatedClicks = simulatedSpend / Math.max(1, cpc);
      const simulatedConversions = simulatedClicks * cvr * randomFactor(conversionVariance);
      return (simulatedConversions * revenuePerConversion) / 100;
    });

    setMonteCarloRevenues(runs);
  }

  async function loadPresets() {
    try {
      const res = await fetch(WORKSPACE_PRESET_URL, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(readErrorMessage(json, "Workspace presets unavailable."));

      const normalized = (json.presets ?? [])
        .map((item: Partial<ScenarioPreset> & { values?: unknown; updatedAt?: string }) => normalizePreset({ ...item, source: "server" }))
        .filter((item: ScenarioPreset | null): item is ScenarioPreset => Boolean(item));
      setPresets(normalized);
      setPresetStorage("server");
    } catch {
      setPresets(readLocalPresets());
      setPresetStorage("local");
    }
  }

  async function savePreset() {
    const trimmed = presetName.trim();
    if (!trimmed) {
      setMessage("Preset name is required.");
      return;
    }

    const savedAt = new Date().toISOString();

    try {
      const res = await fetch("/api/workspace/presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          app: "acquisition",
          presetType: "scenario",
          name: trimmed,
          values: { runCount, spendVariance, conversionVariance },
          metadata: { source: "acquisition-simulation-panel" }
        })
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(readErrorMessage(json, "Unable to save workspace preset."));

      setPresetName(trimmed);
      setPresetStorage("server");
      await loadPresets();
      setMessage(`Saved workspace scenario preset: ${trimmed}`);
    } catch (error) {
      const next: ScenarioPreset[] = [
        ...presets.filter((preset) => preset.name !== trimmed),
        { name: trimmed, runCount, spendVariance, conversionVariance, savedAt, source: "local" }
      ];
      setPresets(next);
      writeLocalPresets(next);
      setPresetName(trimmed);
      setPresetStorage("local");
      setMessage(error instanceof Error ? `${error.message} Saved locally instead.` : `Saved local scenario preset: ${trimmed}`);
    }
  }

  function applyPreset(name: string) {
    const preset = presets.find((item) => item.name === name);
    if (!preset) return;
    setPresetName(preset.name);
    setRunCount(preset.runCount);
    setSpendVariance(preset.spendVariance);
    setConversionVariance(preset.conversionVariance);
    setMessage(`Loaded scenario preset: ${preset.name}`);
  }

  async function deletePreset(preset: ScenarioPreset) {
    if (preset.id && preset.source === "server") {
      try {
        const res = await fetch("/api/workspace/presets", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: preset.id })
        });
        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(readErrorMessage(json, "Unable to delete workspace preset."));
        await loadPresets();
        setMessage(`Deleted scenario preset: ${preset.name}`);
        return;
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Unable to delete workspace preset.");
        return;
      }
    }

    const name = preset.name;
    const next = presets.filter((item) => item.name !== name);
    setPresets(next);
    writeLocalPresets(next);
    if (presetName === name) {
      setPresetName(next[0]?.name ?? "");
    }
    setMessage(`Deleted scenario preset: ${name}`);
  }

  useEffect(() => {
    void refreshCampaigns();
  }, [refreshCampaigns]);

  useEffect(() => {
    void loadInsights(selectedCampaignId);
  }, [selectedCampaignId, loadInsights]);

  useEffect(() => {
    void loadPresets();
  }, []);

  const chartMax = useMemo(() => {
    const maxImpressions = Math.max(...performanceSeries.map((point) => point.impressions), 1);
    const maxClicks = Math.max(...performanceSeries.map((point) => point.clicks), 1);
    const maxConversions = Math.max(...performanceSeries.map((point) => point.conversions), 1);
    const maxCpa = Math.max(...performanceSeries.map((point) => point.cpaCents), 1);
    const maxRoas = Math.max(...performanceSeries.map((point) => point.roas), 1);
    return { maxImpressions, maxClicks, maxConversions, maxCpa, maxRoas };
  }, [performanceSeries]);

  const revenueBuckets = useMemo(() => {
    const bucketCount = 10;
    const buckets = new Array(bucketCount).fill(0);
    if (monteCarloRevenues.length === 0) return buckets;

    const min = Math.min(...monteCarloRevenues);
    const max = Math.max(...monteCarloRevenues);
    const span = Math.max(1, max - min);

    monteCarloRevenues.forEach((value) => {
      const index = Math.min(bucketCount - 1, Math.floor(((value - min) / span) * bucketCount));
      buckets[index] += 1;
    });

    return buckets;
  }, [monteCarloRevenues]);

  const maxBucket = Math.max(...revenueBuckets, 1);

  const monteCarloSummary = useMemo(() => {
    if (monteCarloRevenues.length === 0) return null;
    const sorted = [...monteCarloRevenues].sort((a, b) => a - b);
    const pick = (pct: number) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * pct))];
    const mean = sorted.reduce((sum, value) => sum + value, 0) / sorted.length;
    return {
      min: sorted[0],
      p10: pick(0.1),
      p50: pick(0.5),
      p90: pick(0.9),
      max: sorted[sorted.length - 1],
      mean
    };
  }, [monteCarloRevenues]);

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

          <div className="card" style={{ marginTop: 14 }}>
            <h3>Scenario controls + Monte Carlo</h3>
            <p className="small">Save/load scenario presets and simulate revenue distribution for planning confidence.</p>
            <div className="grid grid-4" style={{ marginTop: 10 }}>
              <label>
                Preset name
                <input value={presetName} onChange={(e) => setPresetName(e.target.value)} />
              </label>
              <label>
                Monte Carlo runs
                <input type="number" min={20} max={500} value={runCount} onChange={(e) => setRunCount(Number(e.target.value || 50))} />
              </label>
              <label>
                Spend variance
                <input type="number" step={0.01} min={0.01} max={0.6} value={spendVariance} onChange={(e) => setSpendVariance(Number(e.target.value || 0.15))} />
              </label>
              <label>
                Conversion variance
                <input type="number" step={0.01} min={0.01} max={0.6} value={conversionVariance} onChange={(e) => setConversionVariance(Number(e.target.value || 0.2))} />
              </label>
            </div>

            <div className="ctaRow">
              <button type="button" onClick={runMonteCarloScenario}>Run scenario</button>
              <button type="button" onClick={savePreset}>Save preset</button>
            </div>

            {presets.length > 0 && (
              <div className="card" style={{ marginTop: 12 }}>
                <h3>Scenario presets</h3>
                <p className="small">Storage: {presetStorage === "server" ? "Workspace database" : "Local browser fallback"}</p>
                <table className="table">
                  <thead><tr><th>Name</th><th>Runs</th><th>Variance</th><th>Storage</th><th>Saved</th><th>Action</th></tr></thead>
                  <tbody>
                    {presets.map((preset) => (
                      <tr key={preset.name}>
                        <td>{preset.name}</td>
                        <td>{preset.runCount}</td>
                        <td>S {preset.spendVariance.toFixed(2)} / C {preset.conversionVariance.toFixed(2)}</td>
                        <td>{preset.source === "server" ? "Workspace" : "Local"}</td>
                        <td>{new Date(preset.savedAt).toLocaleString()}</td>
                        <td>
                          <div className="ctaRow" style={{ marginTop: 0 }}>
                            <button type="button" onClick={() => applyPreset(preset.name)}>Load</button>
                            <button type="button" onClick={() => deletePreset(preset)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {monteCarloSummary && (
              <div className="card" style={{ marginTop: 12 }}>
                <h3>Projected revenue distribution</h3>
                <div className="grid grid-3" style={{ marginBottom: 10 }}>
                  <div className="card"><div className="kpi">${monteCarloSummary.p10.toFixed(0)}</div><p>P10 downside</p></div>
                  <div className="card"><div className="kpi">${monteCarloSummary.p50.toFixed(0)}</div><p>Median (P50)</p></div>
                  <div className="card"><div className="kpi">${monteCarloSummary.p90.toFixed(0)}</div><p>P90 upside</p></div>
                </div>
                <div className="chartColumns">
                  {revenueBuckets.map((bucket, index) => (
                    <div className="chartBarWrap" key={`bucket-${index}`}>
                      <div className="chartBar secondary" style={{ height: `${(bucket / maxBucket) * 140}px` }} />
                      <p className="small">B{index + 1}</p>
                    </div>
                  ))}
                </div>
                <p className="small" style={{ marginTop: 8 }}>
                  Range ${monteCarloSummary.min.toFixed(0)} to ${monteCarloSummary.max.toFixed(0)} • Mean ${monteCarloSummary.mean.toFixed(0)}
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
