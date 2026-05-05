import Link from "next/link";
import { db } from "@/lib/db";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";

type LifecycleWorkspaceDatasetPanelProps = {
  compact?: boolean;
};

function formatDate(value: Date | null | undefined) {
  if (!value) return "Not imported";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(value);
}

function sourceLabel(value: string | null | undefined) {
  if (!value) return "Sample workspace data";
  if (value === "google_sheets") return "Google Sheets";
  if (value === "csv") return "CSV";
  return value.replaceAll("_", " ");
}

export async function LifecycleWorkspaceDatasetPanel({ compact = false }: LifecycleWorkspaceDatasetPanelProps) {
  try {
    const [latestImport, latestSource, users, entities, interestEdges, events] = await Promise.all([
      db.lifecycleImportLog.findFirst({ orderBy: { createdAt: "desc" } }),
      db.lifecycleMappingPreset.findFirst({
        where: { app: "lifecycle" },
        orderBy: { updatedAt: "desc" }
      }),
      db.user.count(),
      db.entity.count(),
      db.interestEdge.count(),
      db.entityDelta.count()
    ]);
    const importedRows = latestImport
      ? latestImport.usersImported + latestImport.entitiesImported + latestImport.interestEdgesImported + latestImport.changeEventsImported
      : 0;
    const usingImportedData = Boolean(latestImport);

    return (
      <div className={`card lifecycleDatasetPanel ${compact ? "lifecycleDatasetPanel--compact" : ""}`}>
        <div>
          <p className="editorKicker">Current lifecycle data mode</p>
          <h3>{usingImportedData ? "Workspace dataset active" : "Built-in sample data active"}</h3>
          <p>
            {usingImportedData
              ? `Using the latest imported lifecycle dataset: ${latestImport?.sourceName}.`
              : "Lifecycle can run immediately with seeded sample users, entities, interest edges, and events."}
          </p>
        </div>
        <div className="lifecycleDatasetStats">
          <div><span>Users</span><strong>{users.toLocaleString()}</strong></div>
          <div><span>Entities</span><strong>{entities.toLocaleString()}</strong></div>
          <div><span>Edges</span><strong>{interestEdges.toLocaleString()}</strong></div>
          <div><span>Events</span><strong>{events.toLocaleString()}</strong></div>
        </div>
        <div className="lifecycleDatasetMeta">
          <p><strong>Source:</strong> {sourceLabel(latestImport?.sourceType ?? latestSource?.sourceType)}</p>
          <p><strong>Last import:</strong> {formatDate(latestImport?.createdAt)}{importedRows > 0 ? ` · ${importedRows.toLocaleString()} rows` : ""}</p>
          <p><strong>Saved config:</strong> {latestSource?.name ?? "None yet"}</p>
        </div>
        <div className="ctaRow">
          <Link className="btn smallBtn primary" href="/lifecycle/simulations">Run with current data</Link>
          <Link className="btn smallBtn" href="/workspace/datasets?tool=lifecycle">Manage datasets</Link>
          <Link className="btn smallBtn" href="/workspace/connections/csv?tool=lifecycle">Use your own data</Link>
        </div>
      </div>
    );
  } catch (error) {
    if (!isMissingDemoTableError(error)) throw error;
    return (
      <div className="card lifecycleDatasetPanel lifecycleDatasetPanel--compact">
        <div>
          <p className="editorKicker">Current lifecycle data mode</p>
          <h3>Sample data available</h3>
          <p>Workspace dataset tables are not available yet, but the lifecycle app remains usable with its self-supporting sample flow.</p>
        </div>
      </div>
    );
  }
}
