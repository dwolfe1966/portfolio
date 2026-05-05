"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  TOOL_IMPORT_SCHEMAS,
  createEmptyMappings,
  inferMapping,
  parseMappedCsvObject,
  type FieldMappings,
  type ParsedMappedRows,
  type ToolImportSchema,
  type ToolKey
} from "@/lib/tool-data-imports";

type PreviewStatus =
  | { state: "idle"; message: string }
  | { state: "loading"; message: string }
  | { state: "success"; message: string }
  | { state: "error"; message: string };

type ImportStatus = PreviewStatus;

type SheetPreviewObject = {
  range: string;
  headers: string[];
  rows: Record<string, string>[];
  rowCount: number;
};

type SheetPreview = {
  sheetId: string;
  objects: Record<string, SheetPreviewObject>;
};

const toolOrder = TOOL_IMPORT_SCHEMAS.map((schema) => schema.tool);

function isToolKey(value: string | undefined): value is ToolKey {
  return Boolean(value && toolOrder.includes(value as ToolKey));
}

function defaultRange(objectTitle: string) {
  return `${objectTitle}!A:Z`;
}

function createDefaultRanges(schema: ToolImportSchema) {
  return Object.fromEntries(schema.objects.map((object) => [object.key, defaultRange(object.title)])) as Record<string, string>;
}

function initializeRangeState() {
  return Object.fromEntries(TOOL_IMPORT_SCHEMAS.map((schema) => [schema.tool, createDefaultRanges(schema)])) as Record<ToolKey, Record<string, string>>;
}

function initializeMappingState() {
  return Object.fromEntries(TOOL_IMPORT_SCHEMAS.map((schema) => [schema.tool, createEmptyMappings(schema)])) as Record<ToolKey, FieldMappings>;
}

function escapeCsvCell(value: string) {
  return /[",\n\r]/.test(value) ? `"${value.replaceAll("\"", "\"\"")}"` : value;
}

function previewToCsv(previewObject: SheetPreviewObject | undefined) {
  if (!previewObject || previewObject.headers.length === 0) return "";
  return [
    previewObject.headers.map(escapeCsvCell).join(","),
    ...previewObject.rows.map((row) => previewObject.headers.map((header) => escapeCsvCell(row[header] ?? "")).join(","))
  ].join("\n");
}

function summarizeRows(schema: ToolImportSchema, parsedByObject: Record<string, ParsedMappedRows>) {
  return schema.objects.reduce((sum, object) => sum + (parsedByObject[object.key]?.rows.length ?? 0), 0);
}

function summarizeErrors(schema: ToolImportSchema, parsedByObject: Record<string, ParsedMappedRows>) {
  return schema.objects.reduce((sum, object) => sum + (parsedByObject[object.key]?.errors.length ?? 0), 0);
}

export function GoogleSheetsConnectionFlow({ initialTool }: { initialTool?: string }) {
  const [selectedTool, setSelectedTool] = useState<ToolKey>(isToolKey(initialTool) ? initialTool : "lifecycle");
  const [datasetName, setDatasetName] = useState("Workspace Google Sheets import");
  const [sheetUrlOrId, setSheetUrlOrId] = useState("");
  const [rangesByTool, setRangesByTool] = useState<Record<ToolKey, Record<string, string>>>(initializeRangeState);
  const [mappingsByTool, setMappingsByTool] = useState<Record<ToolKey, FieldMappings>>(initializeMappingState);
  const [preview, setPreview] = useState<SheetPreview | null>(null);
  const [previewStatus, setPreviewStatus] = useState<PreviewStatus>({
    state: "idle",
    message: "Choose a tool, paste a Google Sheet URL or ID, and preview sheet tabs against the tool schema."
  });
  const [importStatus, setImportStatus] = useState<ImportStatus>({
    state: "idle",
    message: "Preview a Google Sheet to validate and import rows."
  });

  const schema = TOOL_IMPORT_SCHEMAS.find((item) => item.tool === selectedTool) ?? TOOL_IMPORT_SCHEMAS[0];
  const ranges = rangesByTool[selectedTool];
  const mappingsByObject = mappingsByTool[selectedTool];
  const previewedObjects = useMemo(
    () => schema.objects.map((object) => ({ schema: object, preview: preview?.objects[object.key] })),
    [preview, schema]
  );
  const parsedByObject = useMemo(
    () => Object.fromEntries(schema.objects.map((object) => [
      object.key,
      parseMappedCsvObject(previewToCsv(preview?.objects[object.key]), object, mappingsByObject[object.key] ?? {})
    ])) as Record<string, ParsedMappedRows>,
    [mappingsByObject, preview, schema]
  );
  const totalRows = summarizeRows(schema, parsedByObject);
  const totalErrors = summarizeErrors(schema, parsedByObject);
  const importReady = Boolean(preview) && totalRows > 0 && totalErrors === 0 && schema.objects.every((object) => parsedByObject[object.key]?.rows.length > 0);

  function updateRange(objectKey: string, range: string) {
    setRangesByTool((current) => ({
      ...current,
      [selectedTool]: { ...current[selectedTool], [objectKey]: range }
    }));
  }

  function selectTool(tool: ToolKey) {
    setSelectedTool(tool);
    setPreview(null);
    setPreviewStatus({
      state: "idle",
      message: `Ready to preview ${TOOL_IMPORT_SCHEMAS.find((item) => item.tool === tool)?.label ?? "tool"} sheet ranges.`
    });
    setImportStatus({ state: "idle", message: "Preview a Google Sheet to validate and import rows." });
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

  async function previewSheet() {
    if (!sheetUrlOrId.trim() || previewStatus.state === "loading") return;
    setPreview(null);
    setPreviewStatus({
      state: "loading",
      message: `Reading ${schema.label.toLowerCase()} tabs from Google Sheets...`
    });

    try {
      const response = await fetch("/api/workspace/google-sheets/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool: selectedTool,
          sheetUrlOrId,
          ranges
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const missing = payload?.error?.details?.required;
        const suffix = Array.isArray(missing) ? ` Missing: ${missing.join(", ")}.` : "";
        throw new Error(`${payload?.error?.message ?? "Google Sheets preview failed."}${suffix}`);
      }
      const nextPreview = { sheetId: payload.sheetId, objects: payload.objects ?? {} } as SheetPreview;
      setPreview(nextPreview);
      setMappingsByTool((current) => {
        const nextMappings = createEmptyMappings(schema);
        schema.objects.forEach((object) => {
          const headers = nextPreview.objects[object.key]?.headers ?? [];
          nextMappings[object.key] = Object.fromEntries(object.fields.map((field) => [
            field,
            current[selectedTool][object.key]?.[field] && headers.includes(current[selectedTool][object.key][field])
              ? current[selectedTool][object.key][field]
              : inferMapping(headers, field, object)
          ]));
        });
        return { ...current, [selectedTool]: nextMappings };
      });
      setPreviewStatus({
        state: "success",
        message: `Previewed Google Sheet ${payload.sheetId}. Review field mappings, validate rows, and import the dataset.`
      });
      setImportStatus({ state: "idle", message: "Preview loaded. Complete field mapping before import." });
    } catch (error) {
      setPreviewStatus({
        state: "error",
        message: error instanceof Error ? error.message : "Google Sheets preview failed."
      });
      setImportStatus({ state: "idle", message: "Preview a Google Sheet to validate and import rows." });
    }
  }

  async function importDataset() {
    if (!importReady || importStatus.state === "loading") return;
    setImportStatus({
      state: "loading",
      message: `Importing validated ${schema.label.toLowerCase()} Google Sheets rows into the workspace database...`
    });

    try {
      const endpoint = selectedTool === "pricing"
        ? "/api/pricing/import"
        : selectedTool === "retention"
          ? "/api/retention/import"
          : selectedTool === "expansion"
            ? "/api/expansion/import"
            : selectedTool === "auction"
              ? "/api/auction/import"
              : selectedTool === "acquisition"
                ? "/api/acquisition/import"
                : "/api/lifecycle/import";
      const sharedPayload = {
        sourceName: datasetName,
        sourceMetadata: {
          sourceFlow: "workspace_google_sheets",
          sheetId: preview?.sheetId,
          ranges,
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
          : selectedTool === "expansion"
            ? {
                ...sharedPayload,
                accounts: parsedByObject.accounts.rows,
                offers: parsedByObject.offers.rows,
                policy: parsedByObject.policy.rows
              }
            : selectedTool === "auction"
              ? {
                  ...sharedPayload,
                  advertisers: parsedByObject.advertisers.rows,
                  slots: parsedByObject.slots.rows,
                  bids: parsedByObject.bids.rows,
                  reserveSettings: parsedByObject.reserveSettings.rows
                }
              : selectedTool === "acquisition"
                ? {
                    ...sharedPayload,
                    campaigns: parsedByObject.campaigns.rows,
                    audiences: parsedByObject.audiences.rows,
                    creatives: parsedByObject.creatives.rows,
                    performance: parsedByObject.performance.rows
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
          : selectedTool === "expansion"
            ? `Imported ${imported.accountsImported ?? 0} accounts, ${imported.offersImported ?? 0} offers, and ${imported.policiesImported ?? 0} policies.`
            : selectedTool === "auction"
              ? `Imported ${imported.advertisersImported ?? 0} advertisers, ${imported.slotsImported ?? 0} slots, ${imported.bidsImported ?? 0} bids, and ${imported.reserveSettingsImported ?? 0} reserve settings.`
              : selectedTool === "acquisition"
                ? `Imported ${imported.campaignsImported ?? 0} campaigns, ${imported.audiencesImported ?? 0} audiences, ${imported.creativesImported ?? 0} creatives, and ${imported.performanceImported ?? 0} performance rows.`
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
            <p className="editorKicker">Shared Sheets connector</p>
            <h3>{schema.label} sheet preview</h3>
          </div>
          <p className={`statusPill ${previewStatus.state === "success" ? "live" : "progress"}`}>
            {previewStatus.state === "success" ? "Previewed" : "Setup"}
          </p>
        </div>
        <p>
          Use Google Sheets as a live spreadsheet source, map tabs or ranges to tool objects, and reuse the same validated
          entity schemas that power CSV imports.
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
            Google Sheet URL or ID
            <input
              value={sheetUrlOrId}
              onChange={(event) => setSheetUrlOrId(event.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/..."
            />
          </label>
          <label>
            Dataset name
            <input value={datasetName} onChange={(event) => setDatasetName(event.target.value)} />
          </label>
        </div>
        <div className="ctaRow csvPresetActions">
          <button type="button" disabled={!sheetUrlOrId.trim() || previewStatus.state === "loading"} onClick={() => void previewSheet()}>
            {previewStatus.state === "loading" ? "Previewing sheet..." : "Preview Google Sheet"}
          </button>
          <button type="button" disabled={!importReady || importStatus.state === "loading"} onClick={() => void importDataset()}>
            {importStatus.state === "loading" ? `Importing ${schema.label.toLowerCase()} data...` : importReady ? `Import ${schema.label.toLowerCase()} dataset` : "Import after validation"}
          </button>
          <Link className="btn" href="/workspace/datasets">Review datasets</Link>
        </div>
        <p className="small">Rows parsed: {totalRows} · validation issues: {totalErrors}</p>
        <p className={`small lifecycleImportStatus lifecycleImportStatus--${previewStatus.state}`}>{previewStatus.message}</p>
        <p className={`small lifecycleImportStatus lifecycleImportStatus--${importStatus.state}`}>{importStatus.message}</p>
        {importStatus.state === "success" ? (
          <div className="ctaRow lifecycleImportNextSteps">
            <Link className="btn primary" href={selectedTool === "pricing" ? "/pricing/inputs?imported=1" : selectedTool === "retention" ? "/retention/inputs?imported=1" : selectedTool === "expansion" ? "/expansion/inputs?imported=1" : selectedTool === "auction" ? "/auction/inputs?imported=1" : selectedTool === "acquisition" ? "/acquisition/inputs?imported=1" : "/lifecycle/inputs?imported=1"}>Review imported inputs</Link>
            <Link className="btn" href={selectedTool === "pricing" ? "/pricing/simulations?imported=1" : selectedTool === "retention" ? "/retention/simulations?imported=1" : selectedTool === "expansion" ? "/expansion/simulations?imported=1" : selectedTool === "auction" ? "/auction/simulations?imported=1" : selectedTool === "acquisition" ? "/acquisition/simulations?imported=1" : "/lifecycle/simulations?imported=1"}>Run simulation</Link>
          </div>
        ) : null}
      </div>

      <div className="grid grid-2">
        {previewedObjects.map(({ schema: object, preview: objectPreview }) => (
          <div className="card editorCard" key={`${selectedTool}-${object.key}`}>
            <div className="editorHeader">
              <div>
                <p className="editorKicker">{object.title}</p>
                <h3>{objectPreview ? `${objectPreview.rowCount} rows detected` : "Range setup"}</h3>
              </div>
              <p className="small">{object.maxRows.toLocaleString()} row max</p>
            </div>
            <p>{object.description}</p>
            <label>
              Sheet tab or range
              <input
                value={ranges[object.key] ?? ""}
                onChange={(event) => updateRange(object.key, event.target.value)}
                placeholder={defaultRange(object.title)}
              />
            </label>
            <p className="small">Expected fields: <code>{object.fields.join(", ")}</code></p>
            {objectPreview ? (
              <>
                <p className="small bandText--healthy">
                  Headers detected: <code>{objectPreview.headers.join(", ") || "none"}</code>
                </p>
                {objectPreview.headers.length > 0 ? (
                  <div className="csvMappingPanel">
                    <div className="editorHeader">
                      <div>
                        <p className="editorKicker">Field mapping</p>
                        <h3>Map source columns to {schema.label.toLowerCase()} fields</h3>
                      </div>
                      <p className="small">{objectPreview.headers.length} source columns detected</p>
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
                            {objectPreview.headers.map((header) => (
                              <option key={`${field}-${header}`} value={header}>{header}</option>
                            ))}
                          </select>
                        </label>
                      ))}
                    </div>
                  </div>
                ) : null}
                {parsedByObject[object.key]?.errors.length > 0 ? (
                  <div>
                    <p className="small bandText--unhealthy">Validation issues</p>
                    <ul>
                      {parsedByObject[object.key].errors.slice(0, 6).map((error) => (
                        <li className="small bandText--unhealthy" key={error}>{error}</li>
                      ))}
                    </ul>
                  </div>
                ) : parsedByObject[object.key]?.rows.length > 0 ? (
                  <p className="small bandText--healthy">Mapped rows validate successfully.</p>
                ) : null}
                {objectPreview.rows.length > 0 ? (
                  <div className="tableScroll">
                    <table className="table">
                      <thead>
                        <tr>{objectPreview.headers.slice(0, 5).map((header) => <th key={header}>{header}</th>)}</tr>
                      </thead>
                      <tbody>
                        {objectPreview.rows.slice(0, 3).map((row, rowIndex) => (
                          <tr key={`${object.key}-${rowIndex}`}>
                            {objectPreview.headers.slice(0, 5).map((header) => <td key={header}>{row[header]}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </>
            ) : (
              <p className="small">Preview will show detected headers and rows before this source moves into mapping and import.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
