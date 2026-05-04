import { Metadata } from "next";
import Link from "next/link";
import { DemoWorkspaceQuickActions } from "@/components/demo-shell/DemoWorkspaceQuickActions";
import { DemoWorkspaceTabs } from "@/components/demo-shell/DemoWorkspaceTabs";
import { Section } from "@/components/site/Section";
import { db } from "@/lib/db";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { buildMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  title: "Tools Datasets | David Wolfe",
  description: "Dataset inventory for Tools saved mappings, imports, and recent model runs.",
  path: "/workspace/datasets"
});

async function loadDatasetInventory() {
  try {
    const [presets, imports, runs] = await Promise.all([
      db.lifecycleMappingPreset.findMany({
        orderBy: [{ updatedAt: "desc" }],
        take: 8,
        include: { workspace: true }
      }),
      db.lifecycleImportLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 8
      }),
      db.campaignRun.findMany({
        orderBy: { createdAt: "desc" },
        take: 6
      })
    ]);

    return { presets, imports, runs, compatibilityMode: false };
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      return { presets: [], imports: [], runs: [], compatibilityMode: true };
    }
    throw error;
  }
}

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

export default async function DemoDatasetsPage() {
  const inventory = await loadDatasetInventory();
  const totalRows = inventory.imports.reduce((sum, log) => sum + importedRows(log), 0);
  const activeWorkspace = inventory.presets[0]?.workspace?.name ?? "Default Workspace";

  return (
    <>
      <DemoWorkspaceTabs />
      <DemoWorkspaceQuickActions />
      <Section eyebrow="Workspace" title="Datasets and presets">
        <p>
          This page inventories the reusable data assets behind Tools: field mapping presets, imported datasets,
          and model runs that can become saved workspace history as the apps mature into tools.
        </p>
        <div className="ctaRow">
          <Link className="btn primary" href="/workspace/connections">Connect data</Link>
          <Link className="btn" href="/lifecycle/connections/csv">Import lifecycle CSV</Link>
          <Link className="btn" href="/workspace/settings">Workspace settings</Link>
        </div>
      </Section>

      <Section title="Dataset status">
        <div className="grid grid-4">
          <div className="card">
            <p className="small">Workspace</p>
            <div className="workspaceSettingValue">{activeWorkspace}</div>
          </div>
          <div className="card">
            <p className="small">Saved presets</p>
            <div className="kpi">{inventory.presets.length.toLocaleString()}</div>
          </div>
          <div className="card">
            <p className="small">Imported rows</p>
            <div className="kpi">{totalRows.toLocaleString()}</div>
          </div>
          <div className="card">
            <p className="small">Recent runs</p>
            <div className="kpi">{inventory.runs.length.toLocaleString()}</div>
          </div>
        </div>
        {inventory.compatibilityMode ? (
          <p className="small">Run the latest Prisma migrations to enable workspace dataset inventory.</p>
        ) : null}
      </Section>

      <Section title="Saved mapping presets">
        {inventory.presets.length === 0 ? (
          <div className="card">
            <p>No saved mapping presets yet. Start with the lifecycle CSV import flow.</p>
          </div>
        ) : (
          <div className="tableScroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>App</th>
                  <th>Source</th>
                  <th>Workspace</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {inventory.presets.map((preset) => (
                  <tr key={preset.id}>
                    <td><strong>{preset.name}</strong></td>
                    <td>{preset.app}</td>
                    <td>{preset.sourceType.toUpperCase()}</td>
                    <td>{preset.workspace.name}</td>
                    <td>{formatDate(preset.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
