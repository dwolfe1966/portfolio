"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  TOOL_IMPORT_SCHEMAS,
  createEmptyMappings,
  inferMapping,
  parseMappedCsvObject,
  parseSourceCsv,
  type FieldMappings,
  type ParsedMappedRows,
  type ToolImportSchema,
  type ToolKey
} from "@/lib/tool-data-imports";

type ImportStatus =
  | { state: "idle"; message: string }
  | { state: "loading"; message: string }
  | { state: "success"; message: string }
  | { state: "error"; message: string };

const toolOrder = TOOL_IMPORT_SCHEMAS.map((schema) => schema.tool);

function isToolKey(value: string | undefined): value is ToolKey {
  return Boolean(value && toolOrder.includes(value as ToolKey));
}

function emptyCsvByObject(schema: ToolImportSchema) {
  return Object.fromEntries(schema.objects.map((object) => [object.key, ""])) as Record<string, string>;
}

function initializeCsvState() {
  return Object.fromEntries(TOOL_IMPORT_SCHEMAS.map((schema) => [schema.tool, emptyCsvByObject(schema)])) as Record<ToolKey, Record<string, string>>;
}

function initializeMappingState() {
  return Object.fromEntries(TOOL_IMPORT_SCHEMAS.map((schema) => [schema.tool, createEmptyMappings(schema)])) as Record<ToolKey, FieldMappings>;
}

function summarizeRows(schema: ToolImportSchema, parsedByObject: Record<string, ParsedMappedRows>) {
  return schema.objects.reduce((sum, object) => sum + (parsedByObject[object.key]?.rows.length ?? 0), 0);
}

function summarizeErrors(schema: ToolImportSchema, parsedByObject: Record<string, ParsedMappedRows>) {
  return schema.objects.reduce((sum, object) => sum + (parsedByObject[object.key]?.errors.length ?? 0), 0);
}

export function WorkspaceCsvConnectionFlow({ initialTool }: { initialTool?: string }) {
  const [selectedTool, setSelectedTool] = useState<ToolKey>(isToolKey(initialTool) ? initialTool : "lifecycle");
  const [datasetName, setDatasetName] = useState("Workspace CSV upload");
  const [csvByTool, setCsvByTool] = useState<Record<ToolKey, Record<string, string>>>(initializeCsvState);
  const [mappingsByTool, setMappingsByTool] = useState<Record<ToolKey, FieldMappings>>(initializeMappingState);
  const [importStatus, setImportStatus] = useState<ImportStatus>({
    state: "idle",
    message: "Choose a tool, upload or paste CSV data, map fields, and validate the dataset before import."
  });

  const schema = TOOL_IMPORT_SCHEMAS.find((item) => item.tool === selectedTool) ?? TOOL_IMPORT_SCHEMAS[0];
  const csvByObject = csvByTool[selectedTool];
  const mappingsByObject = mappingsByTool[selectedTool];

  const parsedByObject = useMemo(
    () => Object.fromEntries(schema.objects.map((object) => [
      object.key,
      parseMappedCsvObject(csvByObject[object.key] ?? "", object, mappingsByObject[object.key] ?? {})
    ])) as Record<string, ParsedMappedRows>,
    [csvByObject, mappingsByObject, schema]
  );

  const totalRows = summarizeRows(schema, parsedByObject);
  const totalErrors = summarizeErrors(schema, parsedByObject);
  const importReady = totalRows > 0 && totalErrors === 0 && schema.objects.every((object) => parsedByObject[object.key]?.rows.length > 0);
  const persistentImportReady = ["lifecycle", "pricing", "retention"].includes(selectedTool) && importReady;

  function selectTool(tool: ToolKey) {
    setSelectedTool(tool);
    setImportStatus({
      state: "idle",
      message: tool === "lifecycle"
        ? "Lifecycle CSV data can be imported into the workspace database after validation."
        : `${TOOL_IMPORT_SCHEMAS.find((item) => item.tool === tool)?.label ?? "Tool"} CSV validation is ready. Persistence is the next implementation step.`
    });
  }

  function updateCsv(objectKey: string, value: string) {
    const objectSchema = schema.objects.find((object) => object.key === objectKey);
    if (!objectSchema) return;
    const parsed = parseSourceCsv(value);
    setCsvByTool((current) => ({
      ...current,
      [selectedTool]: { ...current[selectedTool], [objectKey]: value }
    }));
    setMappingsByTool((current) => ({
      ...current,
      [selectedTool]: {
        ...current[selectedTool],
        [objectKey]: Object.fromEntries(objectSchema.fields.map((field) => [
          field,
          current[selectedTool][objectKey]?.[field] && parsed.headers.includes(current[selectedTool][objectKey][field])
            ? current[selectedTool][objectKey][field]
            : inferMapping(parsed.headers, field, objectSchema)
        ]))
      }
    }));
  }

  function updateMapping(objectKey: string, field: string, sourceHeader: string) {
    setMappingsByTool((current) => ({
      ...current,
      [selectedTool]: {
        ...current[selectedTool],
        [objectKey]: { ...current[selectedTool][objectKey], [field]: sourceHeader }
      }
    }));
  }

  async function loadFile(objectKey: string, file: File | null) {
    if (!file) return;
    updateCsv(objectKey, await file.text());
  }

  function loadSamples() {
    setCsvByTool((current) => ({
      ...current,
      [selectedTool]: Object.fromEntries(schema.objects.map((object) => [object.key, object.sample]))
    }));
    setMappingsByTool((current) => {
      const nextMappings = createEmptyMappings(schema);
      schema.objects.forEach((object) => {
        const parsed = parseSourceCsv(object.sample);
        nextMappings[object.key] = Object.fromEntries(object.fields.map((field) => [
          field,
          inferMapping(parsed.headers, field, object)
        ]));
      });
      return { ...current, [selectedTool]: nextMappings };
    });
    setImportStatus({ state: "idle", message: `Loaded sample ${schema.label.toLowerCase()} CSV data.` });
  }

  async function importDataset() {
    if (!persistentImportReady || importStatus.state === "loading") return;
    setImportStatus({
      state: "loading",
      message: `Importing validated ${schema.label.toLowerCase()} CSV rows into the workspace database...`
    });

    try {
      const endpoint = selectedTool === "pricing"
        ? "/api/pricing/import"
        : selectedTool === "retention"
          ? "/api/retention/import"
          : "/api/lifecycle/import";
      const sharedPayload = {
        sourceName: datasetName,
        sourceMetadata: {
          sourceFlow: "workspace_csv",
          mappings: mappingsByObject,
          headers: Object.fromEntries(schema.objects.map((object) => [object.key, parsedByObject[object.key].headers])),
          rowCounts: Object.fromEntries(schema.objects.map((object) => [object.key, parsedByObject[object.key].rows.length]))
        }
      };
      const body = selectedTool === "pricing"
        ? {
            ...sharedPayload,
            segments: parsedByObject.segments.rows,
            variants: parsedByObject.variants.rows,
            experiments: parsedByObject.experiments.rows,
            guardrails: parsedByObject.guardrails.rows
          }
        : selectedTool === "retention"
          ? {
              ...sharedPayload,
              accounts: parsedByObject.accounts.rows,
              playbooks: parsedByObject.playbooks.rows,
              policy: parsedByObject.policy.rows
            }
          : {
              ...sharedPayload,
              users: parsedByObject.users.rows,
              entities: parsedByObject.entities.rows,
              interestEdges: parsedByObject.interestEdges.rows,
              changeEvents: parsedByObject.changeEvents.rows
            };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const serverErrors = payload?.error?.details?.errors;
        const detail = Array.isArray(serverErrors) && serverErrors.length > 0 ? ` ${serverErrors.slice(0, 3).join(" ")}` : "";
        throw new Error(`${payload?.error?.message ?? "Import failed."}${detail}`);
      }
      const imported = payload.import ?? {};
      const message = selectedTool === "pricing"
        ? `Imported ${imported.segmentsImported ?? 0} segments, ${imported.variantsImported ?? 0} variants, ${imported.experimentsImported ?? 0} experiments, and ${imported.guardrailsImported ?? 0} guardrail rows.`
        : selectedTool === "retention"
          ? `Imported ${imported.accountsImported ?? 0} accounts, ${imported.playbooksImported ?? 0} playbooks, and ${imported.policiesImported ?? 0} policies.`
          : `Imported ${imported.usersImported ?? 0} users, ${imported.entitiesImported ?? 0} entities, ${imported.interestEdgesImported ?? 0} interest edges, and ${imported.changeEventsImported ?? 0} change events.`;
      setImportStatus({ state: "success", message });
    } catch (error) {
      setImportStatus({
        state: "error",
        message: error instanceof Error ? error.message : "Import failed."
      });
    }
  }

  return (
    <div className="lifecycleCsvScaffold workspaceCsvFlow">
      <div className="card">
        <div className="editorHeader">
          <div>
            <p className="editorKicker">Shared CSV connector</p>
            <h3>{schema.label} data mapping</h3>
          </div>
          <p className={`statusPill ${importReady ? "live" : "progress"}`}>{importReady ? "Ready" : "Draft"}</p>
        </div>
        <p>
          This flow uses one schema registry for every tool. CSV rows are mapped into tool objects, validated against required
          fields and ranges, and previewed before import.
        </p>
        <div className="csvPresetControls">
          <label>
            Target tool
            <select value={selectedTool} onChange={(event) => selectTool(event.target.value as ToolKey)}>
              {TOOL_IMPORT_SCHEMAS.map((toolSchema) => (
                <option key={toolSchema.tool} value={toolSchema.tool}>{toolSchema.label}</option>
              ))}
            </select>
          </label>
          <label>
            Dataset name
            <input value={datasetName} onChange={(event) => setDatasetName(event.target.value)} />
          </label>
        </div>
        <div className="ctaRow csvPresetActions">
          <button type="button" onClick={loadSamples}>Load sample dataset</button>
          <button type="button" disabled={!persistentImportReady || importStatus.state === "loading"} onClick={() => void importDataset()}>
            {importStatus.state === "loading" ? `Importing ${schema.label.toLowerCase()} data...` : persistentImportReady ? `Import ${schema.label.toLowerCase()} dataset` : "Import endpoint pending"}
          </button>
          <Link className="btn" href="/workspace/datasets">Review datasets</Link>
        </div>
        <p className="small">Rows parsed: {totalRows} · validation issues: {totalErrors}</p>
        <p className={`small lifecycleImportStatus lifecycleImportStatus--${importStatus.state}`}>{importStatus.message}</p>
        {!["lifecycle", "pricing", "retention"].includes(selectedTool) && importReady ? (
          <p className="small bandText--healthy">
            {schema.label} rows validate successfully. The next backlog item will wire these normalized rows into the tool database tables.
          </p>
        ) : null}
        {importStatus.state === "success" ? (
          <div className="ctaRow lifecycleImportNextSteps">
            <Link className="btn primary" href={selectedTool === "pricing" ? "/pricing/inputs?imported=1" : selectedTool === "retention" ? "/retention/inputs?imported=1" : "/lifecycle/inputs?imported=1"}>Review imported inputs</Link>
            <Link className="btn" href={selectedTool === "pricing" ? "/pricing/simulations?imported=1" : selectedTool === "retention" ? "/retention/simulations?imported=1" : "/lifecycle/simulations?imported=1"}>Run simulation</Link>
          </div>
        ) : null}
      </div>

      <div className="grid grid-2">
        {schema.objects.map((object) => {
          const parsed = parsedByObject[object.key];
          return (
            <div className="card editorCard" key={`${selectedTool}-${object.key}`}>
              <div className="editorHeader">
                <div>
                  <p className="editorKicker">{object.title}</p>
                  <h3>{parsed.rows.length} rows parsed</h3>
                </div>
                <button type="button" onClick={() => updateCsv(object.key, object.sample)}>Load sample</button>
              </div>
              <p>{object.description}</p>
              <p className="small">Required app fields: <code>{object.requiredFields.join(", ")}</code></p>
              <label>
                CSV data
                <textarea
                  rows={7}
                  value={csvByObject[object.key] ?? ""}
                  onChange={(event) => updateCsv(object.key, event.target.value)}
                  placeholder={object.sample}
                />
              </label>
              <label>
                Upload CSV file
                <input type="file" accept=".csv,text/csv" onChange={(event) => void loadFile(object.key, event.target.files?.[0] ?? null)} />
              </label>

              {parsed.headers.length > 0 ? (
                <div className="csvMappingPanel">
                  <div className="editorHeader">
                    <div>
                      <p className="editorKicker">Field mapping</p>
                      <h3>Map source columns to {schema.label.toLowerCase()} fields</h3>
                    </div>
                    <p className="small">{parsed.headers.length} source columns detected</p>
                  </div>
                  <div className="csvMappingGrid">
                    {object.fields.map((field) => (
                      <label key={field}>
                        {field}{object.requiredFields.includes(field) ? " *" : ""}
                        <select
                          value={mappingsByObject[object.key]?.[field] ?? ""}
                          onChange={(event) => updateMapping(object.key, field, event.target.value)}
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
                    {parsed.errors.slice(0, 6).map((error) => <li className="small bandText--unhealthy" key={error}>{error}</li>)}
                  </ul>
                </div>
              ) : parsed.rows.length > 0 ? (
                <p className="small bandText--healthy">Headers and preview rows look valid.</p>
              ) : null}

              {parsed.rows.length > 0 ? (
                <div className="tableScroll">
                  <table className="table">
                    <thead>
                      <tr>{object.fields.slice(0, 5).map((field) => <th key={field}>{field}</th>)}</tr>
                    </thead>
                    <tbody>
                      {parsed.rows.slice(0, 3).map((row, rowIndex) => (
                        <tr key={`${object.key}-${rowIndex}`}>
                          {object.fields.slice(0, 5).map((field) => <td key={field}>{row[field]}</td>)}
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
