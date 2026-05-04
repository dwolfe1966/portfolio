"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  createEmptyMappings,
  getToolImportSchema,
  inferMapping,
  parseMappedCsvObject,
  parseSourceCsv,
  type FieldMappings,
  type ParsedMappedRows
} from "@/lib/tool-data-imports";

type CsvObjectKey = "users" | "entities" | "interestEdges" | "changeEvents";

type MappingPreset = {
  id: string;
  name: string;
  mappings: FieldMappings;
  createdAt: string;
  updatedAt?: string;
  source?: "server" | "local";
};

type ImportStatus =
  | { state: "idle"; message: string }
  | { state: "loading"; message: string }
  | { state: "success"; message: string }
  | { state: "error"; message: string };

const lifecycleSchema = getToolImportSchema("lifecycle");
const configs = lifecycleSchema.objects;
const mappingPresetStorageKey = "lifecycle.csv.mappingPresets.v1";

function lifecycleObjectKey(key: string) {
  return key as CsvObjectKey;
}

function readMappingPresets(): MappingPreset[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(mappingPresetStorageKey);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeMappingPresets(presets: MappingPreset[]) {
  window.localStorage.setItem(mappingPresetStorageKey, JSON.stringify(presets));
}

export function LifecycleCsvUploadScaffold() {
  const [sourceName, setSourceName] = useState("Lifecycle CSV upload");
  const [presetName, setPresetName] = useState("Lifecycle CSV mapping");
  const [selectedPresetId, setSelectedPresetId] = useState("");
  const [mappingPresets, setMappingPresets] = useState<MappingPreset[]>([]);
  const [importStatus, setImportStatus] = useState<ImportStatus>({
    state: "idle",
    message: "Validate all four lifecycle objects before importing rows into the workspace database."
  });
  const [csvByObject, setCsvByObject] = useState<Record<CsvObjectKey, string>>({
    users: "",
    entities: "",
    interestEdges: "",
    changeEvents: ""
  });
  const [mappingsByObject, setMappingsByObject] = useState<FieldMappings>(() => createEmptyMappings(lifecycleSchema));

  useEffect(() => {
    void loadMappingPresets();
  }, []);

  const parsedByObject = useMemo(
    () => Object.fromEntries(configs.map((config) => {
      const key = lifecycleObjectKey(config.key);
      return [
        key,
        parseMappedCsvObject(csvByObject[key], config, mappingsByObject[key] ?? {})
      ];
    })) as Record<CsvObjectKey, ParsedMappedRows>,
    [csvByObject, mappingsByObject]
  );

  const totalRows = configs.reduce((sum, config) => sum + parsedByObject[lifecycleObjectKey(config.key)].rows.length, 0);
  const totalErrors = configs.reduce((sum, config) => sum + parsedByObject[lifecycleObjectKey(config.key)].errors.length, 0);
  const importReady = totalRows > 0 && totalErrors === 0 && configs.every((config) => parsedByObject[lifecycleObjectKey(config.key)].rows.length > 0);

  function updateCsv(key: CsvObjectKey, value: string) {
    setCsvByObject((current) => ({ ...current, [key]: value }));
    const config = configs.find((item) => item.key === key);
    if (!config) return;
    const parsed = parseSourceCsv(value);
    setMappingsByObject((current) => ({
      ...current,
      [key]: Object.fromEntries(config.fields.map((field) => [
        field,
        current[key][field] && parsed.headers.includes(current[key][field])
          ? current[key][field]
          : inferMapping(parsed.headers, field, config)
      ]))
    }));
  }

  function updateMapping(key: CsvObjectKey, field: string, sourceHeader: string) {
    setMappingsByObject((current) => ({
      ...current,
      [key]: { ...current[key], [field]: sourceHeader }
    }));
  }

  async function loadFile(key: CsvObjectKey, file: File | null) {
    if (!file) return;
    updateCsv(key, await file.text());
  }

  async function loadMappingPresets() {
    try {
      const response = await fetch("/api/lifecycle/mapping-presets", { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error("server presets unavailable");
      setMappingPresets((payload.presets ?? []).map((preset: MappingPreset) => ({ ...preset, source: "server" })));
    } catch {
      setMappingPresets(readMappingPresets().map((preset) => ({ ...preset, source: "local" })));
    }
  }

  async function saveMappingPreset() {
    const trimmedName = presetName.trim() || "Lifecycle CSV mapping";
    try {
      const response = await fetch("/api/lifecycle/mapping-presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          mappings: mappingsByObject,
          metadata: {
            headers: Object.fromEntries(configs.map((config) => [config.key, parsedByObject[lifecycleObjectKey(config.key)].headers])),
            savedFrom: sourceName
          }
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error?.message ?? "server save failed");
      await loadMappingPresets();
      setSelectedPresetId(payload.preset.id);
      setImportStatus({ state: "idle", message: `Saved server mapping preset: ${trimmedName}.` });
    } catch {
      const preset: MappingPreset = {
        id: crypto.randomUUID(),
        name: trimmedName,
        mappings: mappingsByObject,
        createdAt: new Date().toISOString(),
        source: "local"
      };
      const next = [preset, ...mappingPresets.filter((item) => item.source !== "server")].slice(0, 8);
      writeMappingPresets(next);
      setMappingPresets(next);
      setSelectedPresetId(preset.id);
      setImportStatus({ state: "idle", message: `Saved local mapping preset: ${trimmedName}.` });
    }
  }

  function applyMappingPreset() {
    const preset = mappingPresets.find((item) => item.id === selectedPresetId);
    if (!preset) return;
    setMappingsByObject(preset.mappings);
    setPresetName(preset.name);
    setImportStatus({ state: "idle", message: `Applied mapping preset: ${preset.name}.` });
  }

  async function deleteMappingPreset() {
    const preset = mappingPresets.find((item) => item.id === selectedPresetId);
    if (preset?.source === "server") {
      await fetch("/api/lifecycle/mapping-presets", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedPresetId })
      }).catch(() => null);
      await loadMappingPresets();
    } else {
      const next = mappingPresets.filter((item) => item.id !== selectedPresetId);
      writeMappingPresets(next);
      setMappingPresets(next);
    }
    setSelectedPresetId("");
    setImportStatus({ state: "idle", message: "Deleted mapping preset." });
  }

  async function importDataset() {
    if (!importReady || importStatus.state === "loading") return;
    setImportStatus({ state: "loading", message: "Importing users, entities, interest edges, and change events into the lifecycle model..." });

    try {
      const response = await fetch("/api/lifecycle/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceName,
          sourceMetadata: {
            mappings: mappingsByObject,
            headers: Object.fromEntries(configs.map((config) => [config.key, parsedByObject[lifecycleObjectKey(config.key)].headers])),
            rowCounts: Object.fromEntries(configs.map((config) => [config.key, parsedByObject[lifecycleObjectKey(config.key)].rows.length]))
          },
          users: parsedByObject.users.rows,
          entities: parsedByObject.entities.rows,
          interestEdges: parsedByObject.interestEdges.rows,
          changeEvents: parsedByObject.changeEvents.rows
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const serverErrors = payload?.error?.details?.errors;
        const detail = Array.isArray(serverErrors) && serverErrors.length > 0 ? ` ${serverErrors.slice(0, 3).join(" ")}` : "";
        throw new Error(`${payload?.error?.message ?? "Import failed."}${detail}`);
      }
      const imported = payload.import ?? {};
      setImportStatus({
        state: "success",
        message: `Imported ${imported.usersImported ?? 0} users, ${imported.entitiesImported ?? 0} entities, ${imported.interestEdgesImported ?? 0} interest edges, and ${imported.changeEventsImported ?? 0} change events.`
      });
    } catch (error) {
      setImportStatus({
        state: "error",
        message: error instanceof Error ? error.message : "Import failed."
      });
    }
  }

  return (
    <div className="lifecycleCsvScaffold">
      <div className="card">
        <div className="editorHeader">
          <div>
            <p className="editorKicker">CSV upload scaffold</p>
            <h3>Validate lifecycle data before import</h3>
          </div>
          <p className={`statusPill ${importReady ? "live" : "progress"}`}>{importReady ? "Ready to import" : "Validation draft"}</p>
        </div>
        <p>
          Paste CSV text or load sample rows for each lifecycle object. This validates and previews data locally;
          ready data can now be imported into the lifecycle workspace database.
        </p>
        <label>
          Dataset name
          <input value={sourceName} onChange={(event) => setSourceName(event.target.value)} />
        </label>
        <div className="csvPresetPanel">
          <div className="editorHeader">
            <div>
              <p className="editorKicker">Mapping preset</p>
              <h3>Reuse column mappings</h3>
            </div>
            <p className="small">{mappingPresets.length} saved</p>
          </div>
          <div className="csvPresetControls">
            <label>
              Preset name
              <input value={presetName} onChange={(event) => setPresetName(event.target.value)} />
            </label>
            <label>
              Saved presets
              <select value={selectedPresetId} onChange={(event) => setSelectedPresetId(event.target.value)}>
                <option value="">Select preset</option>
                {mappingPresets.map((preset) => (
                  <option key={preset.id} value={preset.id}>{preset.name}{preset.source === "local" ? " (local)" : ""}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="ctaRow csvPresetActions">
            <button type="button" onClick={() => void saveMappingPreset()}>Save mapping</button>
            <button type="button" onClick={applyMappingPreset} disabled={!selectedPresetId}>Apply preset</button>
            <button type="button" onClick={() => void deleteMappingPreset()} disabled={!selectedPresetId}>Delete preset</button>
            <button type="button" onClick={() => void loadMappingPresets()}>Refresh presets</button>
          </div>
        </div>
        <p className="small">Rows parsed: {totalRows} · validation issues: {totalErrors}</p>
        <button type="button" disabled={!importReady || importStatus.state === "loading"} onClick={() => void importDataset()}>
          {importStatus.state === "loading" ? "Importing dataset..." : "Import dataset"}
        </button>
        <p className={`small lifecycleImportStatus lifecycleImportStatus--${importStatus.state}`}>{importStatus.message}</p>
        {importStatus.state === "success" ? (
          <div className="ctaRow lifecycleImportNextSteps">
            <Link className="btn primary" href="/lifecycle/inputs?imported=1">Review imported inputs</Link>
            <Link className="btn" href="/lifecycle/simulations?imported=1">Run simulation</Link>
          </div>
        ) : null}
      </div>

      <div className="grid grid-2">
        {configs.map((config) => {
          const key = lifecycleObjectKey(config.key);
          const parsed = parsedByObject[key];
          return (
            <div className="card editorCard" key={key}>
              <div className="editorHeader">
                <div>
                  <p className="editorKicker">{config.title}</p>
                  <h3>{parsed.rows.length} rows parsed</h3>
                </div>
                <button type="button" onClick={() => updateCsv(key, config.sample)}>Load sample</button>
              </div>
              <p>{config.description}</p>
              <p className="small">Required app fields: <code>{config.requiredFields.join(", ")}</code></p>
              <label>
                CSV data
                <textarea
                  rows={7}
                  value={csvByObject[key]}
                  onChange={(event) => updateCsv(key, event.target.value)}
                  placeholder={config.sample}
                />
              </label>
              <label>
                Upload CSV file
                <input type="file" accept=".csv,text/csv" onChange={(event) => void loadFile(key, event.target.files?.[0] ?? null)} />
              </label>

              {parsed.headers.length > 0 ? (
                <div className="csvMappingPanel">
                  <div className="editorHeader">
                    <div>
                      <p className="editorKicker">Field mapping</p>
                      <h3>Map source columns to lifecycle fields</h3>
                    </div>
                    <p className="small">{parsed.headers.length} source columns detected</p>
                  </div>
                  <div className="csvMappingGrid">
                    {config.fields.map((field) => (
                      <label key={field}>
                        {field}{config.requiredFields.includes(field) ? " *" : ""}
                        <select
                          value={mappingsByObject[key][field] ?? ""}
                          onChange={(event) => updateMapping(key, field, event.target.value)}
                        >
                          <option value="">Do not map</option>
                          {parsed.headers.map((header) => (
                            <option key={`${field}-${header}`} value={header}>{header}</option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}

              {parsed.errors.length > 0 ? (
                <div>
                  <p className="small bandText--unhealthy">Validation issues</p>
                  <ul>
                    {parsed.errors.slice(0, 5).map((error) => <li className="small bandText--unhealthy" key={error}>{error}</li>)}
                  </ul>
                </div>
              ) : parsed.rows.length > 0 ? (
                <p className="small bandText--healthy">Headers and preview rows look valid.</p>
              ) : null}

              {parsed.rows.length > 0 ? (
                <div className="tableScroll">
                  <table className="table">
                    <thead>
                      <tr>{config.fields.slice(0, 5).map((field) => <th key={field}>{field}</th>)}</tr>
                    </thead>
                    <tbody>
                      {parsed.rows.slice(0, 3).map((row, rowIndex) => (
                        <tr key={`${key}-${rowIndex}`}>
                          {config.fields.slice(0, 5).map((field) => <td key={field}>{row[field]}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
