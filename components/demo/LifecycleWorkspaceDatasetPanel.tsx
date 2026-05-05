import { cookies } from "next/headers";
import { applyLifecycleDatasetSnapshotAction } from "@/app/(demo)/lifecycle/inputs/actions";
import { ACCOUNT_SESSION_COOKIE, verifyAccountSessionToken } from "@/lib/account-session";
import { db } from "@/lib/db";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { ResetDemoDataCard } from "@/components/site/ResetDemoDataCard";

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

function rowCountTotal(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return 0;
  return Object.values(value as Record<string, unknown>).reduce<number>((sum, count) => (
    sum + (typeof count === "number" ? count : 0)
  ), 0);
}

export async function LifecycleWorkspaceDatasetPanel({ compact = false }: LifecycleWorkspaceDatasetPanelProps) {
  try {
    const cookieStore = await cookies();
    const session = verifyAccountSessionToken(cookieStore.get(ACCOUNT_SESSION_COOKIE)?.value);
    const [latestImport, latestSource, snapshots, users, entities, interestEdges, events] = await Promise.all([
      db.lifecycleImportLog.findFirst({ orderBy: { createdAt: "desc" } }),
      db.lifecycleMappingPreset.findFirst({
        where: { app: "lifecycle" },
        orderBy: { updatedAt: "desc" }
      }),
      db.workspaceDataset.findMany({
        where: {
          app: "lifecycle",
          OR: session
            ? [{ accountUserId: session.userId }, { accountUserId: null }]
            : [{ accountUserId: null }]
        },
        orderBy: { createdAt: "desc" },
        take: 12
      }),
      db.user.count(),
      db.entity.count(),
      db.interestEdge.count(),
      db.entityDelta.count()
    ]);
    const importedRows = latestImport
      ? latestImport.usersImported + latestImport.entitiesImported + latestImport.interestEdgesImported + latestImport.changeEventsImported
      : 0;
    const hasWorkspaceImport = Boolean(latestImport);

    return (
      <div className={`card lifecycleDatasetPanel ${compact ? "lifecycleDatasetPanel--compact" : ""}`}>
        <div>
          <p className="editorKicker">Lifecycle app data</p>
          <h3>Self-contained sample data is ready</h3>
          <p>
            {hasWorkspaceImport
              ? `A workspace import exists (${latestImport?.sourceName}), but this app remains usable as a standalone demo with the current app data below.`
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
          <p><strong>Active source:</strong> current lifecycle app tables. Apply an imported dataset below to replace them, or reset to sample data.</p>
          <p><strong>App data:</strong> current lifecycle database rows</p>
          <p><strong>Workspace import:</strong> {formatDate(latestImport?.createdAt)}{importedRows > 0 ? ` · ${importedRows.toLocaleString()} rows` : ""}</p>
          <p><strong>Workspace source:</strong> {latestSource ? `${latestSource.name} (${sourceLabel(latestSource.sourceType)})` : "None available"}</p>
        </div>
        <div className="dataSourceModeGrid">
          <div className="dataSourceModePanel">
            <h3>Option A Use Sample Data</h3>
            <details className="dataSourceDetails">
              <summary>What this means</summary>
              <p className="small">Use the seeded lifecycle dataset that ships with the product. To switch back to sample data after applying an import, use the reset control below.</p>
            </details>
          </div>
          <div className="dataSourceModePanel">
            <h3>Option B Use Imported Data</h3>
            <details className="dataSourceDetails">
              <summary>What this means</summary>
              <p className="small">Choose a persisted workspace dataset and apply it to this tool. Applying an imported dataset replaces the active lifecycle tables.</p>
            </details>
        {snapshots.length > 0 ? (
          <form className="lifecycleDatasetSelector" action={applyLifecycleDatasetSnapshotAction}>
            <label>
              Use imported dataset
              <select name="datasetId" defaultValue={snapshots[0]?.id}>
                {snapshots.map((snapshot) => (
                  <option key={snapshot.id} value={snapshot.id}>
                    {snapshot.name} · {sourceLabel(snapshot.sourceType)} · {rowCountTotal(snapshot.rowCounts).toLocaleString()} rows · {formatDate(snapshot.createdAt)}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit">Apply dataset to lifecycle app</button>
          </form>
        ) : (
          <p className="small">No imported lifecycle dataset snapshots are available for this account yet.</p>
        )}
          </div>
        </div>
        <ResetDemoDataCard appLabel="Lifecycle" scope="lifecycle" variant="embedded" />
      </div>
    );
  } catch (error) {
    if (!isMissingDemoTableError(error)) throw error;
    return (
      <div className="card lifecycleDatasetPanel lifecycleDatasetPanel--compact">
        <div>
          <p className="editorKicker">Lifecycle app data</p>
          <h3>Sample data available</h3>
          <p>Workspace dataset tables are not available yet, but the lifecycle app remains usable with its self-supporting sample flow.</p>
        </div>
      </div>
    );
  }
}
