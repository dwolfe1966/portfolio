"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type CsvObjectKey = "users" | "entities" | "interestEdges" | "changeEvents";

type CsvConfig = {
  key: CsvObjectKey;
  title: string;
  description: string;
  fields: string[];
  requiredFields: string[];
  sample: string;
};

type ParsedCsv = {
  headers: string[];
  sourceRows: Record<string, string>[];
  rows: Record<string, string>[];
  errors: string[];
};

type FieldMappings = Record<CsvObjectKey, Record<string, string>>;

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

const configs: CsvConfig[] = [
  {
    key: "users",
    title: "Users",
    description: "People eligible for lifecycle scoring and generated outreach.",
    fields: ["fullName", "email", "segment", "subscriptionStatus", "lastActiveAt"],
    requiredFields: ["fullName", "email", "segment", "subscriptionStatus"],
    sample: "fullName,email,segment,subscriptionStatus,lastActiveAt\nJordan Lee,jordan@example.com,TRIAL,TRIALING,2026-04-28\nMorgan Patel,morgan@example.com,LAPSED,EXPIRED,2026-04-15"
  },
  {
    key: "entities",
    title: "Entities",
    description: "Records, people, companies, properties, or objects a user is tracking.",
    fields: ["name", "entityType", "city", "state"],
    requiredFields: ["name", "entityType"],
    sample: "name,entityType,city,state\n123 Main St,property,Austin,TX\nAcme Holdings,business,Denver,CO"
  },
  {
    key: "interestEdges",
    title: "Interest edges",
    description: "Relationships connecting users to tracked entities with signal strength.",
    fields: ["userEmail", "entityName", "interestScore", "source"],
    requiredFields: ["userEmail", "entityName", "interestScore", "source"],
    sample: "userEmail,entityName,interestScore,source\njordan@example.com,123 Main St,0.82,saved_search\nmorgan@example.com,Acme Holdings,0.64,profile_view"
  },
  {
    key: "changeEvents",
    title: "Change events",
    description: "Detected deltas that create lifecycle campaign opportunities.",
    fields: ["entityName", "changeType", "oldValue", "newValue", "deltaSummary", "detectedAt"],
    requiredFields: ["entityName", "changeType", "deltaSummary", "detectedAt"],
    sample: "entityName,changeType,oldValue,newValue,deltaSummary,detectedAt\n123 Main St,ADDRESS_CHANGE,Old address,New address,A new address update was detected.,2026-05-01\nAcme Holdings,EMAIL_ADDED,,ops@example.com,A new email was added.,2026-05-02"
  }
];

const segments = new Set(["FREE", "TRIAL", "LAPSED", "ACTIVE"]);
const statuses = new Set(["NONE", "TRIALING", "ACTIVE", "CANCELED", "EXPIRED"]);
const changeTypes = new Set(["ADDRESS_CHANGE", "PHONE_ADDED", "PHONE_CHANGED", "EMAIL_ADDED", "ASSOCIATE_ADDED", "LEGAL_RECORD_ADDED"]);
const mappingPresetStorageKey = "lifecycle.csv.mappingPresets.v1";
const fieldAliases: Record<string, string[]> = {
  fullName: ["fullName", "full name", "name", "customer name", "user name"],
  email: ["email", "email address", "user email"],
  segment: ["segment", "user segment", "lifecycle segment"],
  subscriptionStatus: ["subscriptionStatus", "subscription status", "status", "plan status"],
  lastActiveAt: ["lastActiveAt", "last active", "last active at", "last seen"],
  name: ["name", "entity name", "record name"],
  entityType: ["entityType", "entity type", "type", "record type"],
  city: ["city", "entity city"],
  state: ["state", "region", "entity state"],
  userEmail: ["userEmail", "user email", "email", "customer email"],
  entityName: ["entityName", "entity name", "record name", "name"],
  interestScore: ["interestScore", "interest score", "score", "intent score"],
  source: ["source", "signal source", "event source"],
  changeType: ["changeType", "change type", "event type", "delta type"],
  oldValue: ["oldValue", "old value", "previous value"],
  newValue: ["newValue", "new value", "current value"],
  deltaSummary: ["deltaSummary", "delta summary", "summary", "event summary"],
  detectedAt: ["detectedAt", "detected at", "event date", "detected date", "date"]
};

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let value = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    const next = line[index + 1];

    if (char === "\"" && inQuotes && next === "\"") {
      value += "\"";
      index++;
    } else if (char === "\"") {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      cells.push(value.trim());
      value = "";
    } else {
      value += char;
    }
  }

  cells.push(value.trim());
  return cells;
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function createEmptyMappings(): FieldMappings {
  return Object.fromEntries(configs.map((config) => [
    config.key,
    Object.fromEntries(config.fields.map((field) => [field, ""]))
  ])) as FieldMappings;
}

function inferMapping(headers: string[], field: string) {
  const aliases = fieldAliases[field] ?? [field];
  const normalizedHeaders = headers.map((header) => ({ header, normalized: normalizeHeader(header) }));
  return normalizedHeaders.find((item) => aliases.some((alias) => item.normalized === normalizeHeader(alias)))?.header ?? "";
}

function parseSourceCsv(text: string): Pick<ParsedCsv, "headers" | "sourceRows"> & { parseErrors: string[] } {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return { headers: [], sourceRows: [], parseErrors: ["Paste CSV text or load the sample data."] };

  const headers = parseCsvLine(lines[0]);
  const sourceRows = lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
  });

  return { headers, sourceRows, parseErrors: [] };
}

function normalizeRows(sourceRows: Record<string, string>[], mappings: Record<string, string>, config: CsvConfig) {
  return sourceRows.map((sourceRow) => Object.fromEntries(
    config.fields.map((field) => [field, mappings[field] ? sourceRow[mappings[field]] ?? "" : ""])
  ));
}

function parseCsv(text: string, config: CsvConfig, mappings: Record<string, string>): ParsedCsv {
  const parsed = parseSourceCsv(text);
  const errors: string[] = [...parsed.parseErrors];
  const missing = config.requiredFields.filter((field) => !mappings[field]);
  if (missing.length > 0 && parsed.headers.length > 0) errors.push(`Map required fields: ${missing.join(", ")}`);

  const rows = normalizeRows(parsed.sourceRows, mappings, config);

  rows.slice(0, 100).forEach((row, index) => {
    const rowNumber = index + 2;
    config.requiredFields.forEach((field) => {
      if (!row[field]) errors.push(`Row ${rowNumber}: ${field} is required.`);
    });
    if (config.key === "users") {
      if (row.segment && !segments.has(row.segment)) errors.push(`Row ${rowNumber}: segment must be FREE, TRIAL, LAPSED, or ACTIVE.`);
      if (row.subscriptionStatus && !statuses.has(row.subscriptionStatus)) errors.push(`Row ${rowNumber}: subscriptionStatus is not recognized.`);
      if (row.email && !row.email.includes("@")) errors.push(`Row ${rowNumber}: email does not look valid.`);
    }
    if (config.key === "interestEdges") {
      const score = Number(row.interestScore);
      if (!Number.isFinite(score) || score < 0 || score > 1) errors.push(`Row ${rowNumber}: interestScore must be between 0 and 1.`);
    }
    if (config.key === "changeEvents" && row.changeType && !changeTypes.has(row.changeType)) {
      errors.push(`Row ${rowNumber}: changeType is not recognized.`);
    }
  });

  if (rows.length === 0) errors.push("CSV has headers but no data rows.");

  return { headers: parsed.headers, sourceRows: parsed.sourceRows, rows, errors: [...new Set(errors)] };
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
    message: "Validate all four lifecycle objects before importing rows into the demo database."
  });
  const [csvByObject, setCsvByObject] = useState<Record<CsvObjectKey, string>>({
    users: "",
    entities: "",
    interestEdges: "",
    changeEvents: ""
  });
  const [mappingsByObject, setMappingsByObject] = useState<FieldMappings>(createEmptyMappings);

  useEffect(() => {
    void loadMappingPresets();
  }, []);

  const parsedByObject = useMemo(
    () => Object.fromEntries(configs.map((config) => [config.key, parseCsv(csvByObject[config.key], config, mappingsByObject[config.key])])) as Record<CsvObjectKey, ParsedCsv>,
    [csvByObject, mappingsByObject]
  );

  const totalRows = configs.reduce((sum, config) => sum + parsedByObject[config.key].rows.length, 0);
  const totalErrors = configs.reduce((sum, config) => sum + parsedByObject[config.key].errors.length, 0);
  const importReady = totalRows > 0 && totalErrors === 0 && configs.every((config) => parsedByObject[config.key].rows.length > 0);

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
          : inferMapping(parsed.headers, field)
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
            headers: Object.fromEntries(configs.map((config) => [config.key, parsedByObject[config.key].headers])),
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
            headers: Object.fromEntries(configs.map((config) => [config.key, parsedByObject[config.key].headers])),
            rowCounts: Object.fromEntries(configs.map((config) => [config.key, parsedByObject[config.key].rows.length]))
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
          ready data can now be imported into the lifecycle demo database.
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
          const parsed = parsedByObject[config.key];
          return (
            <div className="card editorCard" key={config.key}>
              <div className="editorHeader">
                <div>
                  <p className="editorKicker">{config.title}</p>
                  <h3>{parsed.rows.length} rows parsed</h3>
                </div>
                <button type="button" onClick={() => updateCsv(config.key, config.sample)}>Load sample</button>
              </div>
              <p>{config.description}</p>
              <p className="small">Required app fields: <code>{config.requiredFields.join(", ")}</code></p>
              <label>
                CSV data
                <textarea
                  rows={7}
                  value={csvByObject[config.key]}
                  onChange={(event) => updateCsv(config.key, event.target.value)}
                  placeholder={config.sample}
                />
              </label>
              <label>
                Upload CSV file
                <input type="file" accept=".csv,text/csv" onChange={(event) => void loadFile(config.key, event.target.files?.[0] ?? null)} />
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
                          value={mappingsByObject[config.key][field] ?? ""}
                          onChange={(event) => updateMapping(config.key, field, event.target.value)}
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
                        <tr key={`${config.key}-${rowIndex}`}>
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
