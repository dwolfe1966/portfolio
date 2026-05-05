"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { TOOL_IMPORT_SCHEMAS, type ToolImportSchema, type ToolKey } from "@/lib/tool-data-imports";

type PreviewStatus =
  | { state: "idle"; message: string }
  | { state: "loading"; message: string }
  | { state: "success"; message: string }
  | { state: "error"; message: string };

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

export function GoogleSheetsConnectionFlow({ initialTool }: { initialTool?: string }) {
  const [selectedTool, setSelectedTool] = useState<ToolKey>(isToolKey(initialTool) ? initialTool : "lifecycle");
  const [sheetUrlOrId, setSheetUrlOrId] = useState("");
  const [rangesByTool, setRangesByTool] = useState<Record<ToolKey, Record<string, string>>>(initializeRangeState);
  const [preview, setPreview] = useState<SheetPreview | null>(null);
  const [previewStatus, setPreviewStatus] = useState<PreviewStatus>({
    state: "idle",
    message: "Choose a tool, paste a Google Sheet URL or ID, and preview sheet tabs against the tool schema."
  });

  const schema = TOOL_IMPORT_SCHEMAS.find((item) => item.tool === selectedTool) ?? TOOL_IMPORT_SCHEMAS[0];
  const ranges = rangesByTool[selectedTool];
  const previewedObjects = useMemo(
    () => schema.objects.map((object) => ({ schema: object, preview: preview?.objects[object.key] })),
    [preview, schema]
  );

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
      setPreview({ sheetId: payload.sheetId, objects: payload.objects ?? {} });
      setPreviewStatus({
        state: "success",
        message: `Previewed Google Sheet ${payload.sheetId}. Review headers and continue into the shared mapping flow.`
      });
    } catch (error) {
      setPreviewStatus({
        state: "error",
        message: error instanceof Error ? error.message : "Google Sheets preview failed."
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
        </div>
        <div className="ctaRow csvPresetActions">
          <button type="button" disabled={!sheetUrlOrId.trim() || previewStatus.state === "loading"} onClick={() => void previewSheet()}>
            {previewStatus.state === "loading" ? "Previewing sheet..." : "Preview Google Sheet"}
          </button>
          <Link className="btn" href={`/workspace/connections/csv?tool=${selectedTool}`}>Open mapping flow</Link>
          <Link className="btn" href="/workspace/datasets">Review datasets</Link>
        </div>
        <p className={`small lifecycleImportStatus lifecycleImportStatus--${previewStatus.state}`}>{previewStatus.message}</p>
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
