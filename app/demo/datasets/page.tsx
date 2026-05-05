import { Metadata } from "next";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { DemoWorkspaceTabs } from "@/components/demo-shell/DemoWorkspaceTabs";
import { Section } from "@/components/site/Section";
import { db } from "@/lib/db";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { isDemoMutationAllowed } from "@/lib/env-guard";
import { buildMetadata } from "@/lib/seo";
import { getDefaultWorkspace } from "@/lib/workspace";
import { loadWorkspaceDatasetReadiness, summarizeDatasetReadiness } from "@/lib/workspace-datasets";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  title: "Tools Datasets | David Wolfe",
  description: "Dataset inventory for Tools saved mappings, imports, and recent model runs.",
  path: "/workspace/datasets"
});

async function loadDatasetInventory() {
  try {
    const [presets, imports, runs, readiness] = await Promise.all([
      db.lifecycleMappingPreset.findMany({
        orderBy: [{ updatedAt: "desc" }],
        take: 40,
        include: { workspace: true }
      }),
      db.lifecycleImportLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 8
      }),
      db.campaignRun.findMany({
        orderBy: { createdAt: "desc" },
        take: 6
      }),
      loadWorkspaceDatasetReadiness()
    ]);

    return { presets, imports, runs, readiness, compatibilityMode: false };
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      return { presets: [], imports: [], runs: [], readiness: [], compatibilityMode: true };
    }
    throw error;
  }
}

type PageProps = {
  searchParams?: Promise<{ q?: string; tool?: string; source?: string }>;
};

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(value);
}

function importedRows(log: Awaited<ReturnType<typeof loadDatasetInventory>>["imports"][number]) {
  return log.usersImported + log.entitiesImported + log.interestEdgesImported + log.changeEventsImported;
}

function metadataRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function sourceRowCount(value: unknown) {
  const metadata = metadataRecord(value);
  const rowCounts = metadataRecord(metadata.rowCounts);
  return Object.values(rowCounts).reduce<number>((sum, count) => sum + (typeof count === "number" ? count : 0), 0);
}

function sourceDetail(value: unknown) {
  const metadata = metadataRecord(value);
  const sheetId = typeof metadata.sheetId === "string" ? metadata.sheetId : "";
  const lastPreviewedAt = typeof metadata.lastPreviewedAt === "string" ? metadata.lastPreviewedAt : "";
  const lastValidatedAt = typeof metadata.lastValidatedAt === "string" ? metadata.lastValidatedAt : "";
  const lastImportedAt = typeof metadata.lastImportedAt === "string" ? metadata.lastImportedAt : "";
  const lastImportedRowsTotal = typeof metadata.lastImportedRowsTotal === "number" ? metadata.lastImportedRowsTotal : 0;
  return { sheetId, lastPreviewedAt, lastValidatedAt, lastImportedAt, lastImportedRowsTotal };
}

function formatOptionalDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : formatDate(date);
}

function sourceActivityTime(value: unknown) {
  const detail = sourceDetail(value);
  const candidates = [detail.lastImportedAt, detail.lastPreviewedAt, detail.lastValidatedAt]
    .map((item) => new Date(item).getTime())
    .filter((time) => Number.isFinite(time));
  return candidates.length > 0 ? Math.max(...candidates) : 0;
}

function toolPageHref(app: string, page: "inputs" | "simulations") {
  const safeApp = ["lifecycle", "acquisition", "pricing", "retention", "expansion", "auction"].includes(app) ? app : "lifecycle";
  return `/${safeApp}/${page}?imported=1`;
}

function sourceConfigHref(sourceType: string, app: string, id: string, action?: "refresh" | "map" | "import") {
  const encodedApp = encodeURIComponent(app);
  const encodedId = encodeURIComponent(id);
  const actionParam = action ? `&action=${action}` : "";
  if (sourceType === "google_sheets") return `/workspace/connections/google-sheets?tool=${encodedApp}&config=${encodedId}${actionParam}`;
  return `/workspace/connections/csv?tool=${encodedApp}&config=${encodedId}${actionParam}`;
}

function sourceDetailHref(id: string) {
  return `/workspace/datasets/${encodeURIComponent(id)}`;
}

function sourceTypeLabel(sourceType: string) {
  if (sourceType === "google_sheets") return "Google Sheets";
  if (sourceType === "csv") return "CSV";
  return sourceType.toUpperCase();
}

function cleanFilter(value: string | undefined) {
  return String(value ?? "").trim().slice(0, 80);
}

async function deleteSourceConfig(formData: FormData) {
  "use server";

  if (!isDemoMutationAllowed()) return;
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  const workspace = await getDefaultWorkspace();
  await db.lifecycleMappingPreset.deleteMany({ where: { id, workspaceId: workspace.id } });
  revalidatePath("/workspace/datasets");
  revalidatePath("/demo/datasets");
}

export default async function DemoDatasetsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const sourceQuery = cleanFilter(params?.q).toLowerCase();
  const sourceToolFilter = cleanFilter(params?.tool);
  const sourceTypeFilter = cleanFilter(params?.source);
  const inventory = await loadDatasetInventory();
  const totalRows = inventory.imports.reduce((sum, log) => sum + importedRows(log), 0);
  const activeWorkspace = inventory.presets[0]?.workspace?.name ?? "Default Workspace";
  const readinessSummary = summarizeDatasetReadiness(inventory.readiness);
  const filteredPresets = inventory.presets.filter((preset) => {
    const detail = sourceDetail(preset.metadata);
    const matchesTool = !sourceToolFilter || preset.app === sourceToolFilter;
    const matchesSource = !sourceTypeFilter || preset.sourceType === sourceTypeFilter;
    const searchable = [
      preset.name,
      preset.app,
      preset.sourceType,
      preset.workspace.name,
      detail.sheetId
    ].join(" ").toLowerCase();
    return matchesTool && matchesSource && (!sourceQuery || searchable.includes(sourceQuery));
  });
  const savedSourceToolsList = [...new Set(inventory.presets.map((preset) => preset.app))].sort((a, b) => a.localeCompare(b));
  const savedSourceTypesList = [...new Set(inventory.presets.map((preset) => preset.sourceType))].sort((a, b) => a.localeCompare(b));
  const hasSourceFilters = Boolean(sourceQuery || sourceToolFilter || sourceTypeFilter);
  const savedSourceGroups = Object.values(filteredPresets.reduce<Record<string, {
    key: string;
    app: string;
    sourceType: string;
    presets: typeof inventory.presets;
  }>>((groups, preset) => {
    const key = `${preset.app}:${preset.sourceType}`;
    groups[key] ??= { key, app: preset.app, sourceType: preset.sourceType, presets: [] };
    groups[key].presets.push(preset);
    return groups;
  }, {})).sort((a, b) => a.app.localeCompare(b.app) || a.sourceType.localeCompare(b.sourceType));
  const sourceTypeCounts = inventory.presets.reduce<Record<string, number>>((counts, preset) => {
    counts[preset.sourceType] = (counts[preset.sourceType] ?? 0) + 1;
    return counts;
  }, {});
  const savedSourceRows = inventory.presets.reduce((sum, preset) => sum + sourceRowCount(preset.metadata), 0);
  const savedSourceImported = inventory.presets.filter((preset) => sourceDetail(preset.metadata).lastImportedAt).length;
  const savedSourceTools = new Set(inventory.presets.map((preset) => preset.app)).size;
  const latestSourceActivity = Math.max(...inventory.presets.map((preset) => sourceActivityTime(preset.metadata)), 0);
  const sourceSummary = [
    { label: "Saved configs", value: inventory.presets.length.toLocaleString(), detail: `${savedSourceTools} tool${savedSourceTools === 1 ? "" : "s"}` },
    { label: "Google Sheets", value: (sourceTypeCounts.google_sheets ?? 0).toLocaleString(), detail: "live spreadsheet sources" },
    { label: "CSV", value: (sourceTypeCounts.csv ?? 0).toLocaleString(), detail: "mapping presets" },
    { label: "Mapped rows", value: savedSourceRows.toLocaleString(), detail: `${savedSourceImported} imported config${savedSourceImported === 1 ? "" : "s"}` },
    {
      label: "Latest activity",
      value: latestSourceActivity > 0 ? formatOptionalDate(new Date(latestSourceActivity).toISOString()) : "None",
      detail: "preview, validate, or import"
    }
  ];

  return (
    <>
      <DemoWorkspaceTabs />
      <Section eyebrow="Workspace" title="Datasets and presets">
        <p>
          This page inventories the reusable data assets behind Tools: field mapping presets, imported datasets,
          and model runs that can become saved workspace history as the apps mature into tools.
        </p>
      </Section>

      <Section title="Dataset status">
        <div className="grid grid-4">
          <div className="card">
            <p className="small">Workspace</p>
            <div className="workspaceSettingValue">{activeWorkspace}</div>
          </div>
          <div className="card">
            <p className="small">Ready tools</p>
            <div className="kpi">{readinessSummary.available.toLocaleString()}</div>
          </div>
          <div className="card">
            <p className="small">Imported rows</p>
            <div className="kpi">{totalRows.toLocaleString()}</div>
          </div>
          <div className="card">
            <p className="small">Imported tools</p>
            <div className="kpi">{readinessSummary.imported.toLocaleString()}</div>
          </div>
        </div>
        {inventory.compatibilityMode ? (
          <p className="small">Run the latest Prisma migrations to enable workspace dataset inventory.</p>
        ) : null}
      </Section>

      <Section title="Imported data readiness by tool">
        {inventory.readiness.length === 0 ? (
          <div className="card">
            <p>Dataset readiness is unavailable until workspace tables are migrated.</p>
          </div>
        ) : (
          <div className="tableScroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Tool</th>
                  <th>Status</th>
                  <th>Required objects</th>
                  <th>Records</th>
                  <th>Imports/connectors</th>
                  <th>Gap</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {inventory.readiness.map((tool) => (
                  <tr key={tool.app}>
                    <td>
                      <strong>{tool.label}</strong>
                      <p className="small">{tool.objects.map((object) => object.label).join(" · ")}</p>
                    </td>
                    <td><span className={`statusPill ${tool.status === "available" ? "live" : "progress"}`}>{tool.status}</span></td>
                    <td>{tool.availableObjects} / {tool.requiredObjects}</td>
                    <td>{tool.recordCount.toLocaleString()}</td>
                    <td>{tool.importCount.toLocaleString()}</td>
                    <td>{tool.gap}</td>
                    <td><Link className="btn smallBtn" href={tool.importPath}>{tool.primaryAction}</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Saved source configs">
        {inventory.presets.length === 0 ? (
          <div className="card">
            <p>No saved source configs or mapping presets yet. Start with CSV import or Google Sheets preview.</p>
          </div>
        ) : (
          <div className="savedSourceGroupList">
            <div className="savedSourceSummaryGrid">
              {sourceSummary.map((item) => (
                <div className="card savedSourceSummaryCard" key={item.label}>
                  <p className="small">{item.label}</p>
                  <div className="workspaceSettingValue">{item.value}</div>
                  <p className="small">{item.detail}</p>
                </div>
              ))}
            </div>
            <form className="card savedSourceFilters" action="/workspace/datasets">
              <label>
                Search
                <input name="q" defaultValue={cleanFilter(params?.q)} placeholder="Source name, Sheet ID, workspace" />
              </label>
              <label>
                Tool
                <select name="tool" defaultValue={sourceToolFilter}>
                  <option value="">All tools</option>
                  {savedSourceToolsList.map((tool) => <option key={tool} value={tool}>{tool}</option>)}
                </select>
              </label>
              <label>
                Source
                <select name="source" defaultValue={sourceTypeFilter}>
                  <option value="">All sources</option>
                  {savedSourceTypesList.map((sourceType) => (
                    <option key={sourceType} value={sourceType}>{sourceTypeLabel(sourceType)}</option>
                  ))}
                </select>
              </label>
              <div className="savedSourceFilterActions">
                <button type="submit">Apply filters</button>
                {hasSourceFilters ? <Link className="btn" href="/workspace/datasets">Clear</Link> : null}
              </div>
              <p className="small">{filteredPresets.length.toLocaleString()} of {inventory.presets.length.toLocaleString()} saved configs shown.</p>
            </form>
            {savedSourceGroups.length === 0 ? (
              <div className="card">
                <p>No saved source configs match the current filters.</p>
              </div>
            ) : savedSourceGroups.map((group) => (
              <div className="card savedSourceGroup" key={group.key}>
                <div className="editorHeader">
                  <div>
                    <p className="editorKicker">{sourceTypeLabel(group.sourceType)}</p>
                    <h3>{group.app} sources</h3>
                  </div>
                  <p className="statusPill progress">{group.presets.length} config{group.presets.length === 1 ? "" : "s"}</p>
                </div>
                <div className="tableScroll">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Rows</th>
                        <th>Source detail</th>
                        <th>Updated</th>
                        <th>Manage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.presets.map((preset) => {
                        const detail = sourceDetail(preset.metadata);
                        return (
                          <tr key={preset.id}>
                            <td>
                              <Link href={sourceDetailHref(preset.id)}><strong>{preset.name}</strong></Link>
                              <p className="small">{preset.workspace.name}</p>
                            </td>
                            <td>{sourceRowCount(preset.metadata).toLocaleString()}</td>
                            <td>
                              {detail.sheetId ? (
                                <>
                                  <code>{detail.sheetId}</code>
                                  {detail.lastPreviewedAt ? <p className="small">Previewed {formatOptionalDate(detail.lastPreviewedAt)}</p> : null}
                                  {detail.lastImportedAt ? (
                                    <p className="small">
                                      Imported {formatOptionalDate(detail.lastImportedAt)}
                                      {detail.lastImportedRowsTotal > 0 ? ` · ${detail.lastImportedRowsTotal.toLocaleString()} rows` : ""}
                                    </p>
                                  ) : null}
                                </>
                              ) : (
                                <>
                                  <span className="small">Mapping preset</span>
                                  {detail.lastValidatedAt ? <p className="small">Validated {formatOptionalDate(detail.lastValidatedAt)}</p> : null}
                                  {detail.lastImportedAt ? (
                                    <p className="small">
                                      Imported {formatOptionalDate(detail.lastImportedAt)}
                                      {detail.lastImportedRowsTotal > 0 ? ` · ${detail.lastImportedRowsTotal.toLocaleString()} rows` : ""}
                                    </p>
                                  ) : null}
                                </>
                              )}
                            </td>
                            <td>{formatDate(preset.updatedAt)}</td>
                            <td>
                              <div className="importHistoryActions">
                                {preset.sourceType === "google_sheets" ? (
                                  <Link className="btn smallBtn primary" href={sourceConfigHref(preset.sourceType, preset.app, preset.id, "refresh")}>Refresh</Link>
                                ) : null}
                                <Link className="btn smallBtn" href={sourceConfigHref(preset.sourceType, preset.app, preset.id, "map")}>Map</Link>
                                <Link className="btn smallBtn" href={sourceConfigHref(preset.sourceType, preset.app, preset.id, "import")}>Import</Link>
                                <Link className="btn smallBtn" href={sourceDetailHref(preset.id)}>Details</Link>
                                <Link className="btn smallBtn" href={toolPageHref(preset.app, "inputs")}>Inputs</Link>
                                <Link className="btn smallBtn" href={toolPageHref(preset.app, "simulations")}>Simulate</Link>
                                <form action={deleteSourceConfig}>
                                  <input type="hidden" name="id" value={preset.id} />
                                  <button className="smallBtn" type="submit">Delete</button>
                                </form>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Imported datasets">
        {inventory.imports.length === 0 ? (
          <div className="card">
            <p>No imported datasets have been recorded yet.</p>
          </div>
        ) : (
          <div className="tableScroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Dataset</th>
                  <th>Status</th>
                  <th>Rows</th>
                  <th>Validation issues</th>
                  <th>Created</th>
                  <th>Use</th>
                </tr>
              </thead>
              <tbody>
                {inventory.imports.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <strong>{log.sourceName}</strong>
                      <p className="small">{log.sourceType.toUpperCase()}</p>
                    </td>
                    <td><span className={`statusPill ${log.status === "imported" ? "live" : "progress"}`}>{log.status}</span></td>
                    <td>
                      {importedRows(log).toLocaleString()}
                      <p className="small">
                        {log.usersImported} users · {log.entitiesImported} entities · {log.interestEdgesImported} edges · {log.changeEventsImported} events
                      </p>
                    </td>
                    <td>{log.validationErrors}</td>
                    <td>{formatDate(log.createdAt)}</td>
                    <td>
                      <div className="importHistoryActions">
                        <Link className="btn smallBtn" href="/lifecycle/inputs?imported=1">Inputs</Link>
                        <Link className="btn smallBtn primary" href="/lifecycle/simulations?imported=1">Simulate</Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Recent model runs">
        <div className="grid grid-3">
          {inventory.runs.length === 0 ? (
            <div className="card">
              <p>No lifecycle runs recorded yet.</p>
            </div>
          ) : (
            inventory.runs.map((run) => (
              <div className="card datasetRunCard" key={run.id}>
                <p className="editorKicker">{formatDate(run.createdAt)}</p>
                <h3>{run.runName}</h3>
                <p className="small">{run.totalHighPriority.toLocaleString()} high-priority candidates</p>
                <div className="workspaceSettingValue">${Math.round(run.estimatedRevenue).toLocaleString()} estimated revenue</div>
                <Link className="btn smallBtn" href="/lifecycle/outputs">View outputs</Link>
              </div>
            ))
          )}
        </div>
      </Section>
    </>
  );
}
