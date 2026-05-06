"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  TOOL_IMPORT_SCHEMAS,
  createEmptyMappings,
  describeObjectConstraints,
  inferMapping,
  parseMappedCsvObject,
  sourceRowsToCsv,
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
type SaveStatus = PreviewStatus;

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

type SavedSourceConfig = {
  id: string;
  app: string;
  sourceType: string;
  name: string;
  mappings: unknown;
  metadata: unknown;
  updatedAt: string;
};

const toolOrder = TOOL_IMPORT_SCHEMAS.map((schema) => schema.tool);

function isToolKey(value: string | undefined): value is ToolKey {
  return Boolean(value && toolOrder.includes(value as ToolKey));
}

function isConnectorAction(value: string | undefined): value is "refresh" | "map" | "import" {
  return value === "refresh" || value === "map" || value === "import";
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

function previewToCsv(previewObject: SheetPreviewObject | undefined) {
  if (!previewObject || previewObject.headers.length === 0) return "";
  return sourceRowsToCsv(previewObject.headers, previewObject.rows);
}

function summarizeRows(schema: ToolImportSchema, parsedByObject: Record<string, ParsedMappedRows>) {
  return schema.objects.reduce((sum, object) => sum + (parsedByObject[object.key]?.rows.length ?? 0), 0);
}

function summarizeErrors(schema: ToolImportSchema, parsedByObject: Record<string, ParsedMappedRows>) {
  return schema.objects.reduce((sum, object) => sum + (parsedByObject[object.key]?.errors.length ?? 0), 0);
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asStringRecord(value: unknown) {
  const record = asRecord(value);
  return Object.fromEntries(Object.entries(record).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
}

function asFieldMappings(value: unknown, schema: ToolImportSchema) {
  const source = asRecord(value);
  const nextMappings = createEmptyMappings(schema);
  schema.objects.forEach((object) => {
    const objectMappings = asStringRecord(source[object.key]);
    nextMappings[object.key] = Object.fromEntries(object.fields.map((field) => [field, objectMappings[field] ?? ""]));
  });
  return nextMappings;
}

function previewMetadata(
  schema: ToolImportSchema,
  preview: SheetPreview,
  sheetUrlOrId: string,
  ranges: Record<string, string>,
  parsedByObject: Record<string, ParsedMappedRows>,
  authMode: unknown,
  mode: "manual" | "refresh"
) {
  return {
    sheetId: preview.sheetId,
    sheetUrlOrId,
    ranges,
    rowCounts: Object.fromEntries(schema.objects.map((object) => [object.key, parsedByObject[object.key].rows.length])),
    headers: Object.fromEntries(schema.objects.map((object) => [object.key, parsedByObject[object.key].headers])),
    authMode: typeof authMode === "string" ? authMode : undefined,
    lastPreviewedAt: new Date().toISOString(),
    lastRefreshType: mode
  };
}

export function GoogleSheetsConnectionFlow({
  initialTool,
  initialConfigId,
  initialAction
}: {
  initialTool?: string;
  initialConfigId?: string;
  initialAction?: string;
}) {
  const [selectedTool, setSelectedTool] = useState<ToolKey>(isToolKey(initialTool) ? initialTool : "lifecycle");
  const [datasetName, setDatasetName] = useState("Workspace Google Sheets import");
  const [sheetUrlOrId, setSheetUrlOrId] = useState("");
  const [rangesByTool, setRangesByTool] = useState<Record<ToolKey, Record<string, string>>>(initializeRangeState);
  const [mappingsByTool, setMappingsByTool] = useState<Record<ToolKey, FieldMappings>>(initializeMappingState);
  const [savedConfigs, setSavedConfigs] = useState<SavedSourceConfig[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState("");
  const [preview, setPreview] = useState<SheetPreview | null>(null);
  const [previewStatus, setPreviewStatus] = useState<PreviewStatus>({
    state: "idle",
    message: "Choose a tool, paste a Google Sheet URL or ID, and preview sheet tabs against the tool schema."
  });
  const [importStatus, setImportStatus] = useState<ImportStatus>({
    state: "idle",
    message: "Preview a Google Sheet to validate and import rows."
  });
  const [saveStatus, setSaveStatus] = useState<SaveStatus>({
    state: "idle",
    message: "Save the source config after preview to make this Sheet reusable."
  });
  const [configStatus, setConfigStatus] = useState<SaveStatus>({
    state: "idle",
    message: "Saved Google Sheets source configs will appear here."
  });
  const [refreshStatus, setRefreshStatus] = useState<SaveStatus>({
    state: "idle",
    message: "Load a saved config to refresh live Sheet rows."
  });
  const autoActionRef = useRef("");
  const connectorAction = isConnectorAction(initialAction) ? initialAction : undefined;

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
  const filteredConfigs = savedConfigs.filter((config) => config.app === selectedTool && config.sourceType === "google_sheets");

  async function loadSourceConfigs() {
    setConfigStatus({ state: "loading", message: "Loading saved Google Sheets source configs..." });
    try {
      const response = await fetch("/api/workspace/source-configs?sourceType=google_sheets");
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error?.message ?? "Saved source configs could not be loaded.");
      setSavedConfigs(Array.isArray(payload.configs) ? payload.configs : []);
      setConfigStatus({ state: "success", message: `Loaded ${(payload.configs ?? []).length} saved Google Sheets source configs.` });
    } catch (error) {
      setConfigStatus({
        state: "error",
        message: error instanceof Error ? error.message : "Saved source configs could not be loaded."
      });
    }
  }

  async function patchSelectedSourceConfig(
    metadataPatch: Record<string, unknown>,
    options: { mappings?: FieldMappings; successMessage: string; failureMessage: string }
  ) {
    if (!selectedConfigId) return false;
    try {
      const response = await fetch("/api/workspace/source-configs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedConfigId,
          metadataPatch,
          ...(options.mappings ? { mappings: options.mappings } : {})
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error?.message ?? options.failureMessage);
      setSaveStatus({ state: "success", message: options.successMessage });
      await loadSourceConfigs();
      return true;
    } catch (error) {
      setSaveStatus({
        state: "error",
        message: error instanceof Error ? `${options.failureMessage} ${error.message}` : options.failureMessage
      });
      return false;
    }
  }

  function updateRange(objectKey: string, range: string) {
    setRangesByTool((current) => ({
      ...current,
      [selectedTool]: { ...current[selectedTool], [objectKey]: range }
    }));
  }

  function selectTool(tool: ToolKey) {
    setSelectedTool(tool);
    setSelectedConfigId("");
    setPreview(null);
    setPreviewStatus({
      state: "idle",
      message: `Ready to preview ${TOOL_IMPORT_SCHEMAS.find((item) => item.tool === tool)?.label ?? "tool"} sheet ranges.`
    });
    setImportStatus({ state: "idle", message: "Preview a Google Sheet to validate and import rows." });
    setSaveStatus({ state: "idle", message: "Save the source config after preview to make this Sheet reusable." });
  }

  const applySourceConfig = useCallback(function applySourceConfig(configId: string) {
    const config = savedConfigs.find((item) => item.id === configId);
    if (!config || !isToolKey(config.app)) return;
    const configSchema = TOOL_IMPORT_SCHEMAS.find((item) => item.tool === config.app) ?? TOOL_IMPORT_SCHEMAS[0];
    const metadata = asRecord(config.metadata);
    const storedRanges = asStringRecord(metadata.ranges);
    const nextRanges = { ...createDefaultRanges(configSchema), ...storedRanges };
    const sheetValue = typeof metadata.sheetUrlOrId === "string"
      ? metadata.sheetUrlOrId
      : typeof metadata.sheetId === "string"
        ? metadata.sheetId
        : "";

    setSelectedTool(config.app);
    setSelectedConfigId(config.id);
    setDatasetName(config.name);
    setSheetUrlOrId(sheetValue);
    setPreview(null);
    setRangesByTool((current) => ({ ...current, [config.app as ToolKey]: nextRanges }));
    setMappingsByTool((current) => ({ ...current, [config.app as ToolKey]: asFieldMappings(config.mappings, configSchema) }));
    setPreviewStatus({
      state: "idle",
      message: connectorAction === "refresh"
        ? `Loaded "${config.name}". Click Refresh saved Sheet to pull the latest rows.`
        : connectorAction === "import"
          ? `Loaded "${config.name}". Refreshing the live Sheet before import.`
          : `Loaded "${config.name}". Preview the Sheet to refresh rows before import.`
    });
    setImportStatus({
      state: "idle",
      message: connectorAction === "import"
        ? "Refreshing the saved Sheet first. Import will be available after mappings validate."
        : "Preview the saved source config before import."
    });
    setSaveStatus({
      state: "idle",
      message: connectorAction === "map"
        ? "Saved config loaded for mapping updates. Preview rows after you adjust ranges or mappings."
        : "Saved config loaded. Preview, adjust, then save updates if needed."
    });
    setRefreshStatus({
      state: "idle",
      message: connectorAction === "refresh"
        ? "Ready to refresh this saved Google Sheet source."
        : "Saved config loaded. Refresh live Sheet rows when ready."
    });
  }, [connectorAction, savedConfigs]);

  useEffect(() => {
    void loadSourceConfigs();
  }, []);

  useEffect(() => {
    if (!initialConfigId || savedConfigs.length === 0 || selectedConfigId === initialConfigId) return;
    applySourceConfig(initialConfigId);
  }, [applySourceConfig, initialConfigId, savedConfigs, selectedConfigId]);

  function updateMapping(objectKey: string, field: string, sourceHeader: string) {
    setMappingsByTool((current) => ({
      ...current,
      [selectedTool]: {
        ...current[selectedTool],
        [objectKey]: { ...current[selectedTool][objectKey], [field]: sourceHeader }
      }
    }));
  }

  function updatePreviewCell(objectKey: string, rowIndex: number, header: string, value: string) {
    setPreview((current) => {
      const previewObject = current?.objects[objectKey];
      if (!current || !previewObject?.rows[rowIndex]) return current;
      return {
        ...current,
        objects: {
          ...current.objects,
          [objectKey]: {
            ...previewObject,
            rows: previewObject.rows.map((row, index) => (
              index === rowIndex ? { ...row, [header]: value } : row
            ))
          }
        }
      };
    });
    setSaveStatus({ state: "idle", message: "Source preview edited locally. Save the source config to keep mappings, then import when validation is ready." });
  }

  function addPreviewRow(objectKey: string) {
    setPreview((current) => {
      const previewObject = current?.objects[objectKey];
      if (!current || !previewObject || previewObject.headers.length === 0) return current;
      return {
        ...current,
        objects: {
          ...current.objects,
          [objectKey]: {
            ...previewObject,
            rowCount: previewObject.rowCount + 1,
            rows: [
              ...previewObject.rows,
              Object.fromEntries(previewObject.headers.map((header) => [header, ""]))
            ]
          }
        }
      };
    });
    setSaveStatus({ state: "idle", message: "Added a local source row for import preview. This does not write back to Google Sheets." });
  }

  async function previewSheet(mode: "manual" | "refresh" = "manual") {
    if (!sheetUrlOrId.trim() || previewStatus.state === "loading") return;
    setPreview(null);
    setPreviewStatus({
      state: "loading",
      message: mode === "refresh"
        ? `Refreshing ${schema.label.toLowerCase()} rows from saved Google Sheets ranges...`
        : `Reading ${schema.label.toLowerCase()} tabs from Google Sheets...`
    });
    if (mode === "refresh") {
      setRefreshStatus({ state: "loading", message: `Refreshing "${datasetName}" from Google Sheets...` });
    }

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
      const nextMappings = createEmptyMappings(schema);
      schema.objects.forEach((object) => {
        const headers = nextPreview.objects[object.key]?.headers ?? [];
        nextMappings[object.key] = Object.fromEntries(object.fields.map((field) => [
          field,
          mappingsByObject[object.key]?.[field] && headers.includes(mappingsByObject[object.key][field])
            ? mappingsByObject[object.key][field]
            : inferMapping(headers, field, object)
        ]));
      });
      setMappingsByTool((current) => {
        return { ...current, [selectedTool]: nextMappings };
      });
      const nextParsedByObject = Object.fromEntries(schema.objects.map((object) => [
        object.key,
        parseMappedCsvObject(previewToCsv(nextPreview.objects[object.key]), object, nextMappings[object.key] ?? {})
      ])) as Record<string, ParsedMappedRows>;
      setPreviewStatus({
        state: "success",
        message: mode === "refresh"
          ? `Refreshed Google Sheet ${payload.sheetId}. Validate rows, then import the latest data.`
          : `Previewed Google Sheet ${payload.sheetId}. Review field mappings, validate rows, and import the dataset.`
      });
      setImportStatus({ state: "idle", message: "Preview loaded. Complete field mapping before import." });
      setSaveStatus({ state: "idle", message: "Preview loaded. Save this Sheet config for reuse or refresh." });
      await patchSelectedSourceConfig(
        previewMetadata(schema, nextPreview, sheetUrlOrId, ranges, nextParsedByObject, payload.authMode, mode),
        {
          mappings: nextMappings,
          successMessage: "Saved source config metadata updated with the latest Sheet preview.",
          failureMessage: "Preview succeeded, but saved config metadata could not be updated."
        }
      );
      if (mode === "refresh") {
        setRefreshStatus({
          state: "success",
          message: `Refreshed ${schema.objects.reduce((sum, object) => sum + (nextPreview.objects[object.key]?.rowCount ?? 0), 0).toLocaleString()} source rows from saved ranges.`
        });
      }
    } catch (error) {
      setPreviewStatus({
        state: "error",
        message: error instanceof Error ? error.message : "Google Sheets preview failed."
      });
      setImportStatus({ state: "idle", message: "Preview a Google Sheet to validate and import rows." });
      setSaveStatus({ state: "idle", message: "Save the source config after preview to make this Sheet reusable." });
      if (mode === "refresh") {
        setRefreshStatus({
          state: "error",
          message: error instanceof Error ? error.message : "Saved Sheet refresh failed."
        });
      }
    }
  }

  useEffect(() => {
    if (!connectorAction || !["refresh", "import"].includes(connectorAction) || !initialConfigId || selectedConfigId !== initialConfigId || !sheetUrlOrId.trim()) return;
    const actionKey = `${initialConfigId}:${connectorAction}:${sheetUrlOrId}`;
    if (autoActionRef.current === actionKey || previewStatus.state === "loading") return;
    autoActionRef.current = actionKey;
    setRefreshStatus({
      state: "loading",
      message: connectorAction === "import"
        ? `Refreshing "${datasetName}" before import...`
        : `Auto-refreshing "${datasetName}" from Google Sheets...`
    });
    if (connectorAction === "import") {
      setImportStatus({ state: "loading", message: "Refreshing source rows and validating mappings before import." });
    }
    void previewSheet("refresh");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectorAction, datasetName, initialConfigId, previewStatus.state, selectedConfigId, sheetUrlOrId]);

  useEffect(() => {
    if (connectorAction !== "import" || !preview) return;
    if (importReady) {
      setImportStatus({ state: "success", message: "Source refreshed and validated. Import is ready." });
    } else if (previewStatus.state === "success") {
      setImportStatus({
        state: "idle",
        message: totalErrors > 0
          ? `Source refreshed, but ${totalErrors} validation issue${totalErrors === 1 ? "" : "s"} must be fixed before import.`
          : "Source refreshed. Complete all required mappings before import."
      });
    }
  }, [connectorAction, importReady, preview, previewStatus.state, totalErrors]);

  async function saveSourceConfig() {
    if (!preview || saveStatus.state === "loading") return;
    setSaveStatus({
      state: "loading",
      message: `Saving ${schema.label.toLowerCase()} Google Sheets source configuration...`
    });

    try {
      const response = await fetch("/api/workspace/source-configs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          app: selectedTool,
          sourceType: "google_sheets",
          name: datasetName,
          mappings: mappingsByObject,
          metadata: {
            ...previewMetadata(schema, preview, sheetUrlOrId, ranges, parsedByObject, undefined, "manual")
          }
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error?.message ?? "Source config save failed.");
      }
      setSaveStatus({
        state: "success",
        message: `Saved source config "${payload.config?.name ?? datasetName}".`
      });
      await loadSourceConfigs();
      if (typeof payload.config?.id === "string") setSelectedConfigId(payload.config.id);
    } catch (error) {
      setSaveStatus({
        state: "error",
        message: error instanceof Error ? error.message : "Source config save failed."
      });
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
      if (preview) {
        const rowCounts = Object.fromEntries(schema.objects.map((object) => [object.key, parsedByObject[object.key].rows.length]));
        await patchSelectedSourceConfig(
          {
            lastImportedAt: new Date().toISOString(),
            lastImportStatus: "success",
            lastImportedRowCounts: rowCounts,
            lastImportedRowsTotal: Object.values(rowCounts).reduce((sum, count) => sum + count, 0),
            lastImportSummary: message
          },
          {
            successMessage: "Import complete. Saved source config metadata updated.",
            failureMessage: "Import complete, but saved config metadata could not be updated."
          }
        );
        if (!selectedConfigId) {
          setSaveStatus({ state: "idle", message: "Import complete. Save or update this source config if you want to reuse it." });
        }
      }
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
        <div className="csvPresetPanel">
          <div className="editorHeader">
            <div>
              <p className="editorKicker">Saved source configs</p>
              <h3>{filteredConfigs.length} reusable {schema.label.toLowerCase()} Sheets configs</h3>
            </div>
            <button type="button" onClick={() => void loadSourceConfigs()}>Refresh</button>
          </div>
          <div className="csvPresetControls">
            <label>
              Saved config
              <select value={selectedConfigId} onChange={(event) => applySourceConfig(event.target.value)}>
                <option value="">Start from scratch</option>
                {filteredConfigs.map((config) => (
                  <option key={config.id} value={config.id}>{config.name}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="ctaRow csvPresetActions">
            <button type="button" disabled={!selectedConfigId || !sheetUrlOrId.trim() || previewStatus.state === "loading"} onClick={() => void previewSheet("refresh")}>
              {refreshStatus.state === "loading" ? "Refreshing saved Sheet..." : "Refresh saved Sheet"}
            </button>
          </div>
          <p className={`small lifecycleImportStatus lifecycleImportStatus--${configStatus.state}`}>{configStatus.message}</p>
          <p className={`small lifecycleImportStatus lifecycleImportStatus--${refreshStatus.state}`}>{refreshStatus.message}</p>
        </div>
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
            {importStatus.state === "loading"
              ? connectorAction === "import" && previewStatus.state === "loading"
                ? "Refreshing before import..."
                : `Importing ${schema.label.toLowerCase()} data...`
              : importReady
                ? connectorAction === "import"
                  ? `Import refreshed ${schema.label.toLowerCase()} dataset`
                  : `Import ${schema.label.toLowerCase()} dataset`
                : "Import after validation"}
          </button>
          <button type="button" disabled={!preview || saveStatus.state === "loading"} onClick={() => void saveSourceConfig()}>
            {saveStatus.state === "loading" ? "Saving source..." : preview ? "Save source config" : "Save after preview"}
          </button>
          <Link className="btn" href="/workspace/datasets">Review datasets</Link>
        </div>
        <p className="small">Rows parsed: {totalRows} · validation issues: {totalErrors}</p>
        <p className={`small lifecycleImportStatus lifecycleImportStatus--${previewStatus.state}`}>{previewStatus.message}</p>
        <p className={`small lifecycleImportStatus lifecycleImportStatus--${importStatus.state}`}>{importStatus.message}</p>
        <p className={`small lifecycleImportStatus lifecycleImportStatus--${saveStatus.state}`}>{saveStatus.message}</p>
        {importStatus.state === "success" ? (
          <div className="ctaRow lifecycleImportNextSteps">
            <Link className="btn primary" href={selectedTool === "pricing" ? "/pricing/inputs?imported=1" : selectedTool === "retention" ? "/retention/inputs?imported=1" : selectedTool === "expansion" ? "/expansion/inputs?imported=1" : selectedTool === "auction" ? "/auction/inputs?imported=1" : selectedTool === "acquisition" ? "/acquisition/inputs?imported=1" : "/lifecycle/inputs?imported=1"}>Review imported inputs</Link>
            <Link className="btn" href={selectedTool === "pricing" ? "/pricing/simulations?imported=1" : selectedTool === "retention" ? "/retention/simulations?imported=1" : selectedTool === "expansion" ? "/expansion/simulations?imported=1" : selectedTool === "auction" ? "/auction/simulations?imported=1" : selectedTool === "acquisition" ? "/acquisition/simulations?imported=1" : "/lifecycle/simulations?imported=1"}>Run simulation</Link>
          </div>
        ) : null}
      </div>

      <div className="connectorObjectStack">
        {previewedObjects.map(({ schema: object, preview: objectPreview }) => (
          <div className="card editorCard connectorEntityCard" key={`${selectedTool}-${object.key}`}>
            <div className="editorHeader connectorEntityHeader connectorSubPanel--title">
              <div>
                <p className="editorKicker">Entity</p>
                <h3>{object.title}</h3>
              </div>
              <p className={`statusPill ${objectPreview ? "live" : "progress"}`}>
                {objectPreview ? `${objectPreview.rowCount} rows` : "Range setup"}
              </p>
            </div>
            <div className="connectorEntityIntro connectorSubPanel--title">
              <p>{object.description}</p>
              <p className="small">{object.maxRows.toLocaleString()} row max · expected fields: <code>{object.fields.join(", ")}</code></p>
            </div>
            <div className="connectorSubPanel connectorSubPanel--rules">
              <div className="connectorSubPanelHeader">
                <div>
                  <p className="editorKicker">Validation rules</p>
                  <h4>Import constraints</h4>
                </div>
              </div>
              <ul className="connectorRuleList">
                {describeObjectConstraints(object).map((rule) => <li key={rule}>{rule}</li>)}
              </ul>
            </div>
            <div className="connectorSubPanel connectorSubPanel--action">
              <div className="connectorSubPanelHeader">
                <div>
                  <p className="editorKicker">Actions</p>
                  <h4>Sheet range</h4>
                </div>
              </div>
              <label>
                Sheet tab or range
                <input
                  value={ranges[object.key] ?? ""}
                  onChange={(event) => updateRange(object.key, event.target.value)}
                  placeholder={defaultRange(object.title)}
                />
              </label>
            </div>
            {objectPreview ? (
              <>
                {objectPreview.headers.length > 0 ? (
                  <div className="connectorSubPanel connectorSubPanel--data">
                    <div className="connectorSubPanelHeader">
                      <div>
                        <p className="editorKicker">Field mapping</p>
                        <h4>Map source columns to {schema.label.toLowerCase()} fields</h4>
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
                  <div className="connectorSubPanel connectorSubPanel--message connectorMessagePanel">
                    <p className="small bandText--unhealthy">Validation issues</p>
                    <ul>
                      {parsedByObject[object.key].errors.slice(0, 6).map((error) => (
                        <li className="small bandText--unhealthy" key={error}>{error}</li>
                      ))}
                    </ul>
                  </div>
                ) : parsedByObject[object.key]?.rows.length > 0 ? (
                  <div className="connectorSubPanel connectorSubPanel--message connectorMessagePanel">
                    <p className="small bandText--healthy">Mapped rows validate successfully.</p>
                  </div>
                ) : null}
                {objectPreview.rows.length > 0 ? (
                  <div className="connectorSubPanel connectorSubPanel--data">
                    <div className="connectorSubPanelHeader">
                      <div>
                        <p className="editorKicker">Source preview</p>
                        <h4>Edit preview rows inline</h4>
                      </div>
                      <button type="button" onClick={() => addPreviewRow(object.key)}>Add row</button>
                    </div>
                    <div className="tableScroll editableDataGrid">
                      <table className="table">
                        <thead>
                          <tr>{objectPreview.headers.slice(0, 6).map((header) => <th key={header}>{header}</th>)}</tr>
                        </thead>
                        <tbody>
                          {objectPreview.rows.slice(0, 8).map((row, rowIndex) => (
                            <tr key={`${object.key}-source-${rowIndex}`}>
                              {objectPreview.headers.slice(0, 6).map((header) => (
                                <td key={header}>
                                  <input
                                    aria-label={`${object.title} row ${rowIndex + 1} ${header}`}
                                    value={row[header] ?? ""}
                                    onChange={(event) => updatePreviewCell(object.key, rowIndex, header, event.target.value)}
                                  />
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="small">
                      Showing {Math.min(objectPreview.rows.length, 8)} of {objectPreview.rows.length} source rows
                      {objectPreview.headers.length > 6 ? ` and ${objectPreview.headers.length - 6} hidden columns` : ""}.
                    </p>
                  </div>
                ) : null}
                {parsedByObject[object.key]?.rows.length > 0 ? (
                  <div className="connectorSubPanel connectorSubPanel--data">
                    <div className="connectorSubPanelHeader">
                      <div>
                        <p className="editorKicker">Dataset preview</p>
                        <h4>Imported {object.title.toLowerCase()} shape</h4>
                      </div>
                    </div>
                    <div className="tableScroll">
                      <table className="table">
                        <thead>
                          <tr>{object.fields.slice(0, 6).map((field) => <th key={field}>{field}</th>)}</tr>
                        </thead>
                        <tbody>
                          {parsedByObject[object.key].rows.slice(0, 8).map((row, rowIndex) => (
                            <tr key={`${object.key}-dataset-${rowIndex}`}>
                              {object.fields.slice(0, 6).map((field) => <td key={field}>{row[field]}</td>)}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="small">
                      Showing {Math.min(parsedByObject[object.key].rows.length, 8)} of {parsedByObject[object.key].rows.length} normalized dataset rows
                      {object.fields.length > 6 ? ` and ${object.fields.length - 6} hidden fields` : ""}.
                    </p>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="connectorSubPanel connectorSubPanel--message connectorMessagePanel">
                <p className="small">Preview will show detected headers and rows before this source moves into mapping and import.</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
