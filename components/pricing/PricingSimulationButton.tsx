"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type PricingScenarioPreset = {
  id?: string;
  name: string;
  conversionLift: string;
  churnSensitivity: string;
  supportLoad: string;
  demandElasticity: string;
  savedAt: string;
  source?: "server" | "local";
};

const PRICING_PRESET_STORAGE_KEY = "pricing_scenario_presets_v1";
const PRICING_PRESET_URL = "/api/workspace/presets?app=pricing&presetType=scenario";

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

function normalizePreset(item: Partial<PricingScenarioPreset> & { values?: unknown; updatedAt?: string }): PricingScenarioPreset | null {
  if (typeof item.name !== "string") return null;
  const values = item.values && typeof item.values === "object" ? item.values as Partial<PricingScenarioPreset> : item;

  return {
    id: typeof item.id === "string" ? item.id : undefined,
    name: item.name,
    conversionLift: String(values.conversionLift ?? "7"),
    churnSensitivity: String(values.churnSensitivity ?? "1.1"),
    supportLoad: String(values.supportLoad ?? "1"),
    demandElasticity: String(values.demandElasticity ?? "0.35"),
    savedAt: typeof item.updatedAt === "string"
      ? item.updatedAt
      : typeof item.savedAt === "string"
        ? item.savedAt
        : new Date().toISOString(),
    source: item.source
  } satisfies PricingScenarioPreset;
}

function readLocalPresets() {
  const stored = localStorage.getItem(PRICING_PRESET_STORAGE_KEY);
  if (!stored) return [];
  try {
    const parsed = JSON.parse(stored) as Array<Partial<PricingScenarioPreset>>;
    return parsed
      .map((item) => normalizePreset({ ...item, source: "local" }))
      .filter((item): item is PricingScenarioPreset => Boolean(item));
  } catch {
    return [];
  }
}

function writeLocalPresets(next: PricingScenarioPreset[]) {
  localStorage.setItem(PRICING_PRESET_STORAGE_KEY, JSON.stringify(next.map((preset) => ({
    name: preset.name,
    conversionLift: preset.conversionLift,
    churnSensitivity: preset.churnSensitivity,
    supportLoad: preset.supportLoad,
    demandElasticity: preset.demandElasticity,
    savedAt: preset.savedAt
  }))));
}

export function PricingSimulationButton({ experimentId }: { experimentId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [conversionLift, setConversionLift] = useState("7");
  const [churnSensitivity, setChurnSensitivity] = useState("1.1");
  const [supportLoad, setSupportLoad] = useState("1");
  const [demandElasticity, setDemandElasticity] = useState("0.35");
  const [presetName, setPresetName] = useState("Pricing scenario");
  const [presets, setPresets] = useState<PricingScenarioPreset[]>([]);
  const [presetStorage, setPresetStorage] = useState<"server" | "local">("local");

  const loadPresets = useCallback(async function loadPresets() {
    try {
      const response = await fetch(PRICING_PRESET_URL, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(readErrorMessage(payload, "Workspace presets unavailable."));

      const next = (payload.presets ?? [])
        .map((item: Partial<PricingScenarioPreset> & { values?: unknown; updatedAt?: string }) => normalizePreset({ ...item, source: "server" }))
        .filter((item: PricingScenarioPreset | null): item is PricingScenarioPreset => Boolean(item));
      setPresets(next);
      setPresetStorage("server");
    } catch {
      setPresets(readLocalPresets());
      setPresetStorage("local");
    }
  }, []);

  async function savePreset() {
    const trimmed = presetName.trim();
    if (!trimmed) {
      setMessage("Preset name is required.");
      return;
    }

    const savedAt = new Date().toISOString();

    try {
      const response = await fetch("/api/workspace/presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          app: "pricing",
          presetType: "scenario",
          name: trimmed,
          values: { conversionLift, churnSensitivity, supportLoad, demandElasticity },
          metadata: { experimentId, source: "pricing-simulation-control" }
        })
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(readErrorMessage(payload, "Unable to save workspace preset."));

      setPresetName(trimmed);
      setPresetStorage("server");
      await loadPresets();
      setMessage(`Saved workspace scenario preset: ${trimmed}`);
    } catch (error) {
      const next = [
        ...presets.filter((preset) => preset.name !== trimmed),
        { name: trimmed, conversionLift, churnSensitivity, supportLoad, demandElasticity, savedAt, source: "local" as const }
      ];
      setPresets(next);
      writeLocalPresets(next);
      setPresetName(trimmed);
      setPresetStorage("local");
      setMessage(error instanceof Error ? `${error.message} Saved locally instead.` : `Saved local scenario preset: ${trimmed}`);
    }
  }

  function applyPreset(preset: PricingScenarioPreset) {
    setPresetName(preset.name);
    setConversionLift(preset.conversionLift);
    setChurnSensitivity(preset.churnSensitivity);
    setSupportLoad(preset.supportLoad);
    setDemandElasticity(preset.demandElasticity);
    setMessage(`Loaded scenario preset: ${preset.name}`);
  }

  async function deletePreset(preset: PricingScenarioPreset) {
    if (preset.id && preset.source === "server") {
      try {
        const response = await fetch("/api/workspace/presets", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: preset.id })
        });
        const payload = await response.json();
        if (!response.ok || !payload.ok) throw new Error(readErrorMessage(payload, "Unable to delete workspace preset."));
        await loadPresets();
        setMessage(`Deleted scenario preset: ${preset.name}`);
        return;
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Unable to delete workspace preset.");
        return;
      }
    }

    const next = presets.filter((item) => item.name !== preset.name);
    setPresets(next);
    writeLocalPresets(next);
    setMessage(`Deleted scenario preset: ${preset.name}`);
  }

  async function runSimulation() {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/pricing/experiments/${experimentId}/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversionLiftPercent: Number(conversionLift),
          churnSensitivityPercent: Number(churnSensitivity),
          supportLoadSensitivity: Number(supportLoad),
          demandElasticity: Number(demandElasticity)
        })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message ?? "Simulation failed");
      setMessage(`Recommendation: ${payload.simulation.recommendation}`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Simulation failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPresets();
  }, [loadPresets]);

  return (
    <div className="card editorCard">
      <div className="editorHeader">
        <h3>Scenario assumptions</h3>
        <p className="editorKicker">Simulation controls</p>
      </div>
      <div className="grid grid-4">
        <label>Preset name
          <input value={presetName} onChange={(event) => setPresetName(event.target.value)} />
          <span className="small">Save these scenario assumptions.</span>
        </label>
        <label>Conversion lift (%)
          <input type="number" step="0.5" value={conversionLift} onChange={(event) => setConversionLift(event.target.value)} />
          <span className="small">Expected demand lift before price elasticity.</span>
        </label>
        <label>Churn sensitivity
          <input type="number" step="0.1" value={churnSensitivity} onChange={(event) => setChurnSensitivity(event.target.value)} />
          <span className="small">Higher values penalize price increases.</span>
        </label>
        <label>Support-load sensitivity
          <input type="number" step="0.1" value={supportLoad} onChange={(event) => setSupportLoad(event.target.value)} />
          <span className="small">Stress-tests operational drag.</span>
        </label>
        <label>Demand elasticity
          <input type="number" step="0.05" value={demandElasticity} onChange={(event) => setDemandElasticity(event.target.value)} />
          <span className="small">Higher values reduce conversion under price lift.</span>
        </label>
      </div>
      <div className="editorActions">
        <button type="button" onClick={runSimulation} disabled={loading}>
          {loading ? "Running..." : "Run pricing simulation"}
        </button>
        <button type="button" onClick={() => void savePreset()} disabled={loading}>Save preset</button>
        {message ? <p className="saveStatus">{message}</p> : null}
      </div>
      {presets.length ? (
        <div className="tableScroll" style={{ marginTop: 12 }}>
          <p className="small">Saved presets: {presetStorage === "server" ? "Workspace database" : "Local browser fallback"}</p>
          <table className="table">
            <thead><tr><th>Name</th><th>Conversion</th><th>Churn</th><th>Support</th><th>Elasticity</th><th>Storage</th><th>Action</th></tr></thead>
            <tbody>
              {presets.map((preset) => (
                <tr key={preset.id ?? preset.name}>
                  <td>{preset.name}</td>
                  <td>{preset.conversionLift}%</td>
                  <td>{preset.churnSensitivity}</td>
                  <td>{preset.supportLoad}</td>
                  <td>{preset.demandElasticity}</td>
                  <td>{preset.source === "server" ? "Workspace" : "Local"}</td>
                  <td>
                    <div className="ctaRow" style={{ marginTop: 0 }}>
                      <button type="button" onClick={() => applyPreset(preset)}>Load</button>
                      <button type="button" onClick={() => void deletePreset(preset)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
