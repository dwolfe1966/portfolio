"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  TOOL_IMPORT_SCHEMAS,
  createEmptyMappings,
  describeObjectConstraints,
  inferMapping,
  parseMappedCsvObject,
  parseSourceCsv,
  sourceRowsToCsv,
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

type SaveStatus = ImportStatus;

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

function isConnectorAction(value: string | undefined): value is "map" | "import" {
  return value === "map" || value === "import";
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

export function WorkspaceCsvConnectionFlow({
  initialTool,
  initialConfigId,
  initialAction
}: {
  initialTool?: string;
  initialConfigId?: string;
  initialAction?: string;
}) {
  const [selectedTool, setSelectedTool] = useState<ToolKey>(isToolKey(initialTool) ? initialTool : "lifecycle");
  const [datasetName, setDatasetName] = useState("Workspace CSV upload");
  const [csvByTool, setCsvByTool] = useState<Record<ToolKey, Record<string, string>>>(initializeCsvState);
  const [mappingsByTool, setMappingsByTool] = useState<Record<ToolKey, FieldMappings>>(initializeMappingState);
  const [savedConfigs, setSavedConfigs] = useState<SavedSourceConfig[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState("");
  const [importStatus, setImportStatus] = useState<ImportStatus>({
    state: "idle",
    message: "Choose a tool, upload or paste CSV data, map fields, and validate the dataset before import."
  });
  const [saveStatus, setSaveStatus] = useState<SaveStatus>({
    state: "idle",
    message: "Save the CSV source config after validation to reuse mappings."
  });
  const [configStatus, setConfigStatus] = useState<SaveStatus>({
    state: "idle",
    message: "Saved CSV source configs will appear here."
  });
  const firstCsvInputRef = useRef<HTMLTextAreaElement | null>(null);
  const focusedConfigRef = useRef("");
  const connectorAction = isConnectorAction(initialAction) ? initialAction : undefined;

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
  const persistentImportReady = ["lifecycle", "pricing", "retention", "expansion", "auction", "acquisition"].includes(selectedTool) && importReady;
  const filteredConfigs = savedConfigs.filter((config) => config.app === selectedTool && config.sourceType === "csv");

  async function loadSourceConfigs() {
    setConfigStatus({ state: "loading", message: "Loading saved CSV source configs..." });
    try {
      const response = await fetch("/api/workspace/source-configs?sourceType=csv");
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error?.message ?? "Saved CSV source configs could not be loaded.");
      setSavedConfigs(Array.isArray(payload.configs) ? payload.configs : []);
      setConfigStatus({ state: "success", message: `Loaded ${(payload.configs ?? []).length} saved CSV source configs.` });
    } catch (error) {
      setConfigStatus({
        state: "error",
        message: error instanceof Error ? error.message : "Saved CSV source configs could not be loaded."
      });
    }
  }

  async function patchSelectedSourceConfig(metadataPatch: Record<string, unknown>, successMessage: string, failureMessage: string) {
    if (!selectedConfigId) return false;
    try {
      const response = await fetch("/api/workspace/source-configs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedConfigId,
          metadataPatch,
          mappings: mappingsByObject
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error?.message ?? failureMessage);
      setSaveStatus({ state: "success", message: successMessage });
      await loadSourceConfigs();
      return true;
    } catch (error) {
      setSaveStatus({
        state: "error",
        message: error instanceof Error ? `${failureMessage} ${error.message}` : failureMessage
      });
      return false;
    }
  }

  function selectTool(tool: ToolKey) {
    setSelectedTool(tool);
    setSelectedConfigId("");
    setImportStatus({
      state: "idle",
      message: tool === "lifecycle"
        ? "Lifecycle CSV data can be imported into the workspace database after validation."
        : `${TOOL_IMPORT_SCHEMAS.find((item) => item.tool === tool)?.label ?? "Tool"} CSV validation is ready. Persistence is the next implementation step.`
    });
    setSaveStatus({ state: "idle", message: "Save the CSV source config after validation to reuse mappings." });
  }

  const applySourceConfig = useCallback(function applySourceConfig(configId: string) {
    const config = savedConfigs.find((item) => item.id === configId);
    if (!config || !isToolKey(config.app)) return;
    const configSchema = TOOL_IMPORT_SCHEMAS.find((item) => item.tool === config.app) ?? TOOL_IMPORT_SCHEMAS[0];

    setSelectedTool(config.app);
    setSelectedConfigId(config.id);
    setDatasetName(config.name);
    setMappingsByTool((current) => ({ ...current, [config.app as ToolKey]: asFieldMappings(config.mappings, configSchema) }));
    setImportStatus({
      state: "idle",
      message: connectorAction === "import"
        ? `Loaded "${config.name}". Paste or upload CSV rows into each required object, then import.`
        : `Loaded "${config.name}". Add or paste CSV rows, then validate and import.`
    });
    setSaveStatus({
      state: "idle",
      message: connectorAction === "map"
        ? "Saved mapping loaded. Update source columns or mappings, then save the config."
        : "Saved config loaded. Update CSV data or mappings, then save changes if needed."
    });
  }, [connectorAction, savedConfigs]);

  useEffect(() => {
    void loadSourceConfigs();
  }, []);

  useEffect(() => {
    if (!initialConfigId || savedConfigs.length === 0 || selectedConfigId === initialConfigId) return;
    applySourceConfig(initialConfigId);
  }, [applySourceConfig, initialConfigId, savedConfigs, selectedConfigId]);

  useEffect(() => {
    if (!connectorAction || !selectedConfigId || focusedConfigRef.current === selectedConfigId) return;
    focusedConfigRef.current = selectedConfigId;
    window.setTimeout(() => firstCsvInputRef.current?.focus(), 80);
  }, [connectorAction, selectedConfigId]);

  useEffect(() => {
    if (connectorAction !== "import" || !selectedConfigId || importStatus.state === "loading" || importStatus.state === "success") return;
    if (persistentImportReady) {
      setImportStatus({ state: "success", message: "CSV rows validate successfully. Import is ready." });
    } else if (totalRows > 0 && totalErrors > 0) {
      setImportStatus({
        state: "idle",
        message: `${totalErrors} validation issue${totalErrors === 1 ? "" : "s"} must be fixed before import.`
      });
    } else if (totalRows > 0) {
      setImportStatus({ state: "idle", message: "Rows are present. Complete all required object data before import." });
    }
  }, [connectorAction, importStatus.state, persistentImportReady, selectedConfigId, totalErrors, totalRows]);

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

  function updateSourceCell(objectKey: string, rowIndex: number, header: string, value: string) {
    const parsed = parseSourceCsv(csvByObject[objectKey] ?? "");
    if (!parsed.sourceRows[rowIndex]) return;
    const nextRows = parsed.sourceRows.map((row, index) => (
      index === rowIndex ? { ...row, [header]: value } : row
    ));
    updateCsv(objectKey, sourceRowsToCsv(parsed.headers, nextRows));
  }

  function addSourceRow(objectKey: string) {
    const parsed = parseSourceCsv(csvByObject[objectKey] ?? "");
    if (parsed.headers.length === 0) return;
    updateCsv(objectKey, sourceRowsToCsv(parsed.headers, [
      ...parsed.sourceRows,
      Object.fromEntries(parsed.headers.map((header) => [header, ""]))
    ]));
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

  async function saveSourceConfig() {
    if (!importReady || saveStatus.state === "loading") return;
    setSaveStatus({
      state: "loading",
      message: `Saving ${schema.label.toLowerCase()} CSV source configuration...`
    });

    try {
      const response = await fetch("/api/workspace/source-configs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          app: selectedTool,
          sourceType: "csv",
          name: datasetName,
          mappings: mappingsByObject,
          metadata: {
            rowCounts: Object.fromEntries(schema.objects.map((object) => [object.key, parsedByObject[object.key].rows.length])),
            headers: Object.fromEntries(schema.objects.map((object) => [object.key, parsedByObject[object.key].headers])),
            lastValidatedAt: new Date().toISOString()
          }
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error?.message ?? "Source config save failed.");
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
      const rowCounts = Object.fromEntries(schema.objects.map((object) => [object.key, parsedByObject[object.key].rows.length]));
      await patchSelectedSourceConfig(
        {
          lastImportedAt: new Date().toISOString(),
          lastImportStatus: "success",
          lastImportedRowCounts: rowCounts,
          lastImportedRowsTotal: Object.values(rowCounts).reduce((sum, count) => sum + count, 0),
          lastImportSummary: message
        },
        "Import complete. Saved CSV source config metadata updated.",
        "Import complete, but saved CSV config metadata could not be updated."
      );
      if (!selectedConfigId) {
        setSaveStatus({ state: "idle", message: "Import complete. Save or update this CSV source config if you want to reuse it." });
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
            <p className="editorKicker">Shared CSV connector</p>
            <h3>{schema.label} data mapping</h3>
          </div>
          <p className={`statusPill ${importReady ? "live" : "progress"}`}>{importReady ? "Ready" : "Draft"}</p>
        </div>
        <p>
          This flow uses one schema registry for every tool. CSV rows are mapped into tool objects, validated against required
          fields and ranges, and previewed before import.
        </p>
        <div className="csvPresetPanel">
          <div className="editorHeader">
            <div>
              <p className="editorKicker">Saved source configs</p>
              <h3>{filteredConfigs.length} reusable {schema.label.toLowerCase()} CSV configs</h3>
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
          <p className={`small lifecycleImportStatus lifecycleImportStatus--${configStatus.state}`}>{configStatus.message}</p>
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
            Dataset name
            <input value={datasetName} onChange={(event) => setDatasetName(event.target.value)} />
          </label>
        </div>
        {connectorAction ? (
          <div className="lifecycleImportBanner lifecycleImportStatus lifecycleImportStatus--idle">
            <div>
              <p className="editorKicker">{connectorAction === "import" ? "Import task" : "Mapping task"}</p>
              <p className="small">
                {connectorAction === "import"
                  ? "Saved mappings are loaded. Paste or upload fresh CSV rows for every required object, then import when validation turns ready."
                  : "Saved mappings are loaded. Adjust source columns, paste test rows, then save the updated config."}
              </p>
            </div>
            <Link className="btn smallBtn" href="/workspace/datasets">Back to datasets</Link>
          </div>
        ) : null}
        <div className="ctaRow csvPresetActions">
          <button type="button" onClick={loadSamples}>Load sample dataset</button>
          <button type="button" disabled={!persistentImportReady || importStatus.state === "loading"} onClick={() => void importDataset()}>
            {importStatus.state === "loading"
              ? `Importing ${schema.label.toLowerCase()} data...`
              : persistentImportReady
                ? connectorAction === "import"
                  ? `Import validated ${schema.label.toLowerCase()} CSV`
                  : `Import ${schema.label.toLowerCase()} dataset`
                : connectorAction === "import"
                  ? "Paste rows to import"
                  : "Import endpoint pending"}
          </button>
          <button type="button" disabled={!importReady || saveStatus.state === "loading"} onClick={() => void saveSourceConfig()}>
            {saveStatus.state === "loading" ? "Saving source..." : importReady ? "Save source config" : "Save after validation"}
          </button>
          <Link className="btn" href="/workspace/datasets">Review datasets</Link>
        </div>
        <p className="small">Rows parsed: {totalRows} · validation issues: {totalErrors}</p>
        <p className={`small lifecycleImportStatus lifecycleImportStatus--${importStatus.state}`}>{importStatus.message}</p>
        <p className={`small lifecycleImportStatus lifecycleImportStatus--${saveStatus.state}`}>{saveStatus.message}</p>
        {!["lifecycle", "pricing", "retention", "expansion", "auction", "acquisition"].includes(selectedTool) && importReady ? (
          <p className="small bandText--healthy">
            {schema.label} rows validate successfully. The next backlog item will wire these normalized rows into the tool database tables.
          </p>
        ) : null}
        {importStatus.state === "success" ? (
          <div className="ctaRow lifecycleImportNextSteps">
            <Link className="btn primary" href={selectedTool === "pricing" ? "/pricing/inputs?imported=1" : selectedTool === "retention" ? "/retention/inputs?imported=1" : selectedTool === "expansion" ? "/expansion/inputs?imported=1" : selectedTool === "auction" ? "/auction/inputs?imported=1" : selectedTool === "acquisition" ? "/acquisition/inputs?imported=1" : "/lifecycle/inputs?imported=1"}>Review imported inputs</Link>
            <Link className="btn" href={selectedTool === "pricing" ? "/pricing/simulations?imported=1" : selectedTool === "retention" ? "/retention/simulations?imported=1" : selectedTool === "expansion" ? "/expansion/simulations?imported=1" : selectedTool === "auction" ? "/auction/simulations?imported=1" : selectedTool === "acquisition" ? "/acquisition/simulations?imported=1" : "/lifecycle/simulations?imported=1"}>Run simulation</Link>
          </div>
        ) : null}
      </div>

      <div className="connectorObjectStack">
        {schema.objects.map((object) => {
          const parsed = parsedByObject[object.key];
          return (
            <div className="card editorCard connectorEntityCard" key={`${selectedTool}-${object.key}`}>
              <div className="editorHeader connectorEntityHeader connectorSubPanel--title">
                <div>
                  <p className="editorKicker">Entity</p>
                  <h3>{object.title}</h3>
                </div>
                <p className={`statusPill ${parsed.rows.length > 0 && parsed.errors.length === 0 ? "live" : "progress"}`}>
                  {parsed.rows.length > 0 ? `${parsed.rows.length} rows` : "No rows"}
                </p>
              </div>
              <div className="connectorEntityIntro connectorSubPanel--title">
                <p>{object.description}</p>
                <p className="small">Required app fields: <code>{object.requiredFields.join(", ")}</code></p>
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
                    <h4>Source controls</h4>
                  </div>
                  <button type="button" onClick={() => updateCsv(object.key, object.sample)}>Load sample</button>
                </div>
                <details className="rawSourceDetails">
                  <summary>Raw CSV text</summary>
                  <label>
                    CSV data
                    <textarea
                      ref={object.key === schema.objects[0]?.key ? firstCsvInputRef : undefined}
                      rows={7}
                      value={csvByObject[object.key] ?? ""}
                      onChange={(event) => updateCsv(object.key, event.target.value)}
                      placeholder={object.sample}
                    />
                  </label>
                </details>
                <label>
                  Upload CSV file
                  <input type="file" accept=".csv,text/csv" onChange={(event) => void loadFile(object.key, event.target.files?.[0] ?? null)} />
                </label>
              </div>

              {parsed.headers.length > 0 ? (
                <div className="connectorSubPanel connectorSubPanel--data">
                  <div className="connectorSubPanelHeader">
                    <div>
                      <p className="editorKicker">Field mapping</p>
                      <h4>Map source columns to {schema.label.toLowerCase()} fields</h4>
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

              {parsed.sourceRows.length > 0 ? (
                <div className="connectorSubPanel connectorSubPanel--data">
                  <div className="connectorSubPanelHeader">
                    <div>
                      <p className="editorKicker">Source preview</p>
                      <h4>Edit source rows inline</h4>
                    </div>
                    <button type="button" onClick={() => addSourceRow(object.key)}>Add row</button>
                  </div>
                  <div className="tableScroll editableDataGrid">
                    <table className="table">
                      <thead>
                        <tr>{parsed.headers.slice(0, 6).map((header) => <th key={header}>{header}</th>)}</tr>
                      </thead>
                      <tbody>
                        {parsed.sourceRows.slice(0, 8).map((row, rowIndex) => (
                          <tr key={`${object.key}-source-${rowIndex}`}>
                            {parsed.headers.slice(0, 6).map((header) => (
                              <td key={header}>
                                <input
                                  aria-label={`${object.title} row ${rowIndex + 1} ${header}`}
                                  value={row[header] ?? ""}
                                  onChange={(event) => updateSourceCell(object.key, rowIndex, header, event.target.value)}
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="small">
                    Showing {Math.min(parsed.sourceRows.length, 8)} of {parsed.sourceRows.length} source rows
                    {parsed.headers.length > 6 ? ` and ${parsed.headers.length - 6} hidden columns` : ""}.
                  </p>
                </div>
              ) : null}

              {parsed.errors.length > 0 ? (
                <div className="connectorSubPanel connectorSubPanel--message connectorMessagePanel">
                  <p className="small bandText--unhealthy">Validation issues</p>
                  <ul>
                    {parsed.errors.slice(0, 6).map((error) => <li className="small bandText--unhealthy" key={error}>{error}</li>)}
                  </ul>
                </div>
              ) : parsed.rows.length > 0 ? (
                <div className="connectorSubPanel connectorSubPanel--message connectorMessagePanel">
                  <p className="small bandText--healthy">Headers and preview rows look valid.</p>
                </div>
              ) : null}

              {parsed.rows.length > 0 ? (
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
                        {parsed.rows.slice(0, 8).map((row, rowIndex) => (
                          <tr key={`${object.key}-${rowIndex}`}>
                            {object.fields.slice(0, 6).map((field) => <td key={field}>{row[field]}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="small">
                    Showing {Math.min(parsed.rows.length, 8)} of {parsed.rows.length} normalized dataset rows
                    {object.fields.length > 6 ? ` and ${object.fields.length - 6} hidden fields` : ""}.
                  </p>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
