import { Metadata } from "next";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { DemoWorkspaceTabs } from "@/components/demo-shell/DemoWorkspaceTabs";
import { Section } from "@/components/site/Section";
import { ACCOUNT_SESSION_COOKIE, verifyAccountSessionToken } from "@/lib/account-session";
import { db } from "@/lib/db";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { isDemoMutationAllowed } from "@/lib/env-guard";
import { buildMetadata } from "@/lib/seo";
import { getDefaultWorkspace } from "@/lib/workspace";
import { loadWorkspaceDatasetReadiness, summarizeDatasetReadiness } from "@/lib/workspace-datasets";
import { workspaceVisibilityLabel } from "@/lib/workspace-visibility";
import {
  acquisitionProviderSnapshotFacts,
  acquisitionProviderSnapshotSourceLabel
} from "@/lib/acquisition-provider-snapshots";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  title: "Tools Datasets | David Wolfe",
  description: "Dataset inventory for Tools source configs, imports, and recent model runs.",
  path: "/workspace/datasets"
});

async function currentAccountUserId() {
  const cookieStore = await cookies();
  return verifyAccountSessionToken(cookieStore.get(ACCOUNT_SESSION_COOKIE)?.value)?.userId ?? null;
}

async function loadDatasetInventory(accountUserId: string | null) {
  if (!accountUserId) {
    return { presets: [], snapshots: [], imports: [], runs: [], readiness: [], compatibilityMode: false };
  }

  try {
    const [presets, snapshots, imports, runs, readiness] = await Promise.all([
      db.lifecycleMappingPreset.findMany({
        where: { accountUserId },
        orderBy: [{ updatedAt: "desc" }],
        take: 40,
        include: { workspace: true }
      }),
      db.workspaceDataset.findMany({
        where: { accountUserId },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          accountUser: { select: { email: true, name: true } },
          workspace: { select: { name: true } }
        }
      }),
      db.lifecycleImportLog.findMany({
        where: { accountUserId },
        orderBy: { createdAt: "desc" },
        take: 8
      }),
      db.campaignRun.findMany({
        where: { accountUserId },
        orderBy: { createdAt: "desc" },
        take: 6
      }),
      loadWorkspaceDatasetReadiness(accountUserId)
    ]);

    return { presets, snapshots, imports, runs, readiness, compatibilityMode: false };
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      return { presets: [], snapshots: [], imports: [], runs: [], readiness: [], compatibilityMode: true };
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

function persistedDatasetRows(value: unknown) {
  const rowCounts = metadataRecord(value);
  return Object.values(rowCounts).reduce<number>((sum, count) => sum + (typeof count === "number" ? count : 0), 0);
}

function objectRowSummary(value: unknown) {
  const entries = Object.entries(metadataRecord(value))
    .filter((entry): entry is [string, number] => typeof entry[1] === "number")
    .sort((a, b) => a[0].localeCompare(b[0]));
  return entries.length > 0
    ? entries.map(([label, count]) => `${label}: ${count.toLocaleString()}`).join(" · ")
    : "No row counts recorded";
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
  if (sourceType === "google_ads") return "Google Ads";
  if (sourceType === "meta_ads") return "Meta Ads";
  if (sourceType === "csv") return "CSV";
  return sourceType.toUpperCase();
}

function cleanFilter(value: string | undefined) {
  return String(value ?? "").trim().slice(0, 80);
}

function sourceActionState(sourceType: string, metadata: unknown) {
  const detail = sourceDetail(metadata);
  const rows = sourceRowCount(metadata);
  if (sourceType === "google_sheets" && !detail.lastPreviewedAt) {
    return {
      label: "Needs refresh",
      action: "Refresh source",
      detail: "Pull live Sheet rows before import.",
      connectorAction: "refresh" as const
    };
  }
  if (rows === 0 && !detail.lastValidatedAt) {
    return {
      label: "Needs mapping",
      action: "Map source",
      detail: "Add rows and validate field mappings.",
      connectorAction: "map" as const
    };
  }
  if (!detail.lastImportedAt) {
    return {
      label: "Ready to import",
      action: "Import source",
      detail: "Validated rows have not been imported yet.",
      connectorAction: "import" as const
    };
  }
  return {
    label: "Operational",
    action: sourceType === "google_sheets" ? "Refresh source" : "Import source",
    detail: "Imported data is available for tool runs.",
    connectorAction: sourceType === "google_sheets" ? "refresh" as const : "import" as const
  };
}

async function deleteDatasetSnapshot(formData: FormData) {
  "use server";

  if (!isDemoMutationAllowed()) return;
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  const [workspace, accountUserId] = await Promise.all([getDefaultWorkspace(), currentAccountUserId()]);
  await db.$transaction(async (tx) => {
    await tx.appDataSourceSelection.deleteMany({ where: { datasetId: id, accountUserId } });
    await tx.workspaceDataset.deleteMany({ where: { id, workspaceId: workspace.id, accountUserId } });
  });

  revalidatePath("/workspace/datasets");
  revalidatePath("/demo/datasets");
  revalidatePath("/lifecycle/inputs");
  revalidatePath("/acquisition/inputs");
  revalidatePath("/pricing/inputs");
  revalidatePath("/retention/inputs");
  revalidatePath("/expansion/inputs");
  revalidatePath("/auction/inputs");
  redirect("/workspace/datasets");
}

export default async function DemoDatasetsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const sourceQuery = cleanFilter(params?.q).toLowerCase();
  const sourceToolFilter = cleanFilter(params?.tool);
  const sourceTypeFilter = cleanFilter(params?.source);
  const accountUserId = await currentAccountUserId();
  const inventory = await loadDatasetInventory(accountUserId);
  const persistedRows = inventory.snapshots.reduce((sum, dataset) => sum + persistedDatasetRows(dataset.rowCounts), 0);
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
    { label: "CSV", value: (sourceTypeCounts.csv ?? 0).toLocaleString(), detail: "saved file sources" },
    { label: "Mapped rows", value: savedSourceRows.toLocaleString(), detail: `${savedSourceImported} imported config${savedSourceImported === 1 ? "" : "s"}` },
    {
      label: "Latest activity",
      value: latestSourceActivity > 0 ? formatOptionalDate(new Date(latestSourceActivity).toISOString()) : "None",
      detail: "preview, validate, or import"
    }
  ];
  const inventoryMap = [
    {
      label: "1. Source configs",
      title: "Where data comes from",
      detail: "Saved CSV, Sheets, OAuth, and future live-source mappings. Refresh or import from here.",
      value: inventory.presets.length.toLocaleString(),
      href: "/workspace/connections"
    },
    {
      label: "2. Imported snapshots",
      title: "Validated data at a point in time",
      detail: "Persisted rows that tools can select as imported data instead of sample data.",
      value: inventory.snapshots.length.toLocaleString(),
      href: "#imported-snapshots"
    },
    {
      label: "3. Readiness",
      title: "What each tool can run",
      detail: "Required object coverage and gaps across the current workspace data inventory.",
      value: `${readinessSummary.available}/${inventory.readiness.length || 0}`,
      href: "#readiness"
    }
  ];

  return (
    <>
      <DemoWorkspaceTabs />
      <Section eyebrow="Workspace" title="Data sources and readiness">
        <p>
          Datasets are the operating inventory: saved source configs show where data comes from, imported snapshots show
          the validated data owned by your account, and readiness gaps show what each tool still needs.
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
            <p className="small">Persisted rows</p>
            <div className="kpi">{persistedRows.toLocaleString()}</div>
          </div>
          <div className="card">
            <p className="small">My snapshots</p>
            <div className="kpi">{inventory.snapshots.length.toLocaleString()}</div>
          </div>
        </div>
        {inventory.compatibilityMode ? (
          <p className="small">Run the latest Prisma migrations to enable workspace dataset inventory.</p>
        ) : null}
      </Section>

      <Section title="Inventory map">
        <div className="datasetInventoryMap">
          {inventoryMap.map((item) => (
            <div className="card datasetInventoryCard" key={item.label}>
              <p className="editorKicker">{item.label}</p>
              <div className="datasetInventoryCardHeader">
                <h3>{item.title}</h3>
                <strong>{item.value}</strong>
              </div>
              <p>{item.detail}</p>
              <Link className="btn smallBtn" href={item.href}>Open</Link>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Saved sources">
        {inventory.presets.length === 0 ? (
          <div className="card">
            <p>No saved sources yet. Start with CSV import or Google Sheets preview.</p>
            <div className="ctaRow">
              <Link className="btn primary" href="/workspace/connections/csv">Create CSV source</Link>
              <Link className="btn" href="/workspace/connections/google-sheets">Create Sheets source</Link>
            </div>
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
            {filteredPresets.length === 0 ? (
              <div className="card">
                <p>No saved sources match the current filters.</p>
              </div>
            ) : (
              <div className="savedSourceCardGrid">
                {filteredPresets.map((preset) => {
                  const detail = sourceDetail(preset.metadata);
                  const rows = sourceRowCount(preset.metadata);
                  const state = sourceActionState(preset.sourceType, preset.metadata);
                  const latestActivity = sourceActivityTime(preset.metadata);
                  const visibility = workspaceVisibilityLabel(preset.accountUserId, accountUserId);
                  return (
                    <div className="card savedSourceCard" key={preset.id}>
                      <div className="editorHeader">
                        <div>
                          <p className="editorKicker">{preset.app} · {sourceTypeLabel(preset.sourceType)}</p>
                          <h3>{preset.name}</h3>
                        </div>
                        <div className="statusPillStack">
                          <span className={`statusPill ${state.label === "Operational" ? "live" : "progress"}`}>{state.label}</span>
                          <span className={`statusPill ${visibility.statusClass}`}>{visibility.label}</span>
                        </div>
                      </div>
                      <p>{state.detail}</p>
                      <div className="savedSourceCardStats">
                        <div>
                          <span className="small">Rows</span>
                          <strong>{rows.toLocaleString()}</strong>
                        </div>
                        <div>
                          <span className="small">Updated</span>
                          <strong>{formatDate(preset.updatedAt)}</strong>
                        </div>
                        <div>
                          <span className="small">Latest activity</span>
                          <strong>{latestActivity > 0 ? formatOptionalDate(new Date(latestActivity).toISOString()) : "None"}</strong>
                        </div>
                        <div>
                          <span className="small">Visibility</span>
                          <strong>{visibility.detail}</strong>
                        </div>
                      </div>
                      {detail.sheetId ? <p className="small">Sheet ID: <code>{detail.sheetId}</code></p> : null}
                      <div className="importHistoryActions rowActionCluster">
                        <Link className="btn smallBtn primary" href={sourceConfigHref(preset.sourceType, preset.app, preset.id, state.connectorAction)}>{state.action}</Link>
                        <details className="rowActionMenu">
                          <summary className="btn smallBtn">Actions</summary>
                          <div className="rowActionMenuPanel">
                            <Link className="btn smallBtn" href={sourceDetailHref(preset.id)}>Manage source</Link>
                            <Link className="btn smallBtn" href={sourceConfigHref(preset.sourceType, preset.app, preset.id)}>Open connector</Link>
                          </div>
                        </details>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </Section>

      <Section title="Imported dataset snapshots" id="imported-snapshots">
        {inventory.snapshots.length === 0 ? (
          <div className="card">
            <p>No imported dataset snapshots are attached to your account yet.</p>
          </div>
        ) : (
          <div className="datasetSnapshotGrid">
            {inventory.snapshots.map((dataset) => {
              const visibility = workspaceVisibilityLabel(dataset.accountUserId, accountUserId);
              const providerFacts = acquisitionProviderSnapshotFacts(dataset.metadata);
              const isProviderSnapshot = dataset.sourceType === "google_ads" || dataset.sourceType === "meta_ads";
              return (
                <div className="card datasetSnapshotCard" key={dataset.id}>
                  <div className="editorHeader">
                    <div>
                      <p className="editorKicker">{dataset.app} · {sourceTypeLabel(dataset.sourceType)}</p>
                      <h3>{dataset.name}</h3>
                      {isProviderSnapshot ? (
                        <p className={`small ${providerFacts.fallbackSnapshot ? "bandText--watch" : ""}`}>
                          {acquisitionProviderSnapshotSourceLabel(dataset.metadata)}
                        </p>
                      ) : null}
                    </div>
                    <div className="statusPillStack">
                      <span className="statusPill live">{dataset.status}</span>
                      <span className={`statusPill ${visibility.statusClass}`}>{visibility.label}</span>
                    </div>
                  </div>
                  <div className="datasetSnapshotMetric">
                    <span>Rows</span>
                    <strong>{persistedDatasetRows(dataset.rowCounts).toLocaleString()}</strong>
                  </div>
                  <p className="small">{objectRowSummary(dataset.rowCounts)}</p>
                  <div className="datasetSnapshotFacts">
                    <div>
                      <span className="small">Owner</span>
                      <strong>{dataset.accountUser?.email ?? visibility.detail}</strong>
                    </div>
                    <div>
                      <span className="small">Visibility</span>
                      <strong>{visibility.detail}</strong>
                    </div>
                    <div>
                      <span className="small">Workspace</span>
                      <strong>{dataset.workspace.name}</strong>
                    </div>
                    <div>
                      <span className="small">Created</span>
                      <strong>{formatDate(dataset.createdAt)}</strong>
                    </div>
                  </div>
                  <div className="importHistoryActions rowActionCluster">
                    <Link className="btn smallBtn primary" href={toolPageHref(dataset.app, "inputs")}>Open inputs</Link>
                    <details className="rowActionMenu">
                      <summary className="btn smallBtn">Actions</summary>
                      <div className="rowActionMenuPanel">
                        <Link className="btn smallBtn" href={sourceDetailHref(dataset.id)}>Review dataset</Link>
                        <form action={deleteDatasetSnapshot}>
                          <input type="hidden" name="id" value={dataset.id} />
                          <button className="btn smallBtn" type="submit">Delete snapshot</button>
                        </form>
                      </div>
                    </details>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      <Section title="Tool readiness gaps" id="readiness">
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
                  <th>Imports</th>
                  <th>Gap</th>
                  <th>Next</th>
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

      <Section title="Lifecycle import log">
        {inventory.imports.length === 0 ? (
          <div className="card">
            <p>No lifecycle import events have been recorded yet.</p>
          </div>
        ) : (
          <div className="tableScroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Dataset</th>
                  <th>Visibility</th>
                  <th>Status</th>
                  <th>Rows</th>
                  <th>Validation issues</th>
                  <th>Created</th>
                  <th>Use</th>
                </tr>
              </thead>
              <tbody>
                {inventory.imports.map((log) => {
                  const visibility = workspaceVisibilityLabel(log.accountUserId, accountUserId);
                  return (
                    <tr key={log.id}>
                      <td>
                        <strong>{log.sourceName}</strong>
                        <p className="small">{log.sourceType.toUpperCase()}</p>
                      </td>
                      <td>
                        <span className={`statusPill ${visibility.statusClass}`}>{visibility.label}</span>
                        <p className="small">{visibility.detail}</p>
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
                        <div className="importHistoryActions rowActionCluster">
                          <Link className="btn smallBtn primary" href="/lifecycle/simulations?imported=1">Simulate</Link>
                          <details className="rowActionMenu">
                            <summary className="btn smallBtn">Actions</summary>
                            <div className="rowActionMenuPanel">
                              <Link className="btn smallBtn" href="/lifecycle/inputs?imported=1">Inputs</Link>
                            </div>
                          </details>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
