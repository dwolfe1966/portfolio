import Link from "next/link";
import { cookies } from "next/headers";
import { applyPricingDatasetSnapshotAction } from "@/app/(demo)/pricing/inputs/actions";
import { ACCOUNT_SESSION_COOKIE, verifyAccountSessionToken } from "@/lib/account-session";
import { db } from "@/lib/db";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";

type PricingWorkspaceDatasetPanelProps = {
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

function metadataRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function sourceName(value: unknown) {
  const metadata = metadataRecord(value);
  return typeof metadata.sourceName === "string" && metadata.sourceName.trim() ? metadata.sourceName : "Latest pricing import";
}

function importedRows(value: unknown) {
  const rowCounts = metadataRecord(metadataRecord(value).rowCounts);
  return Object.values(rowCounts).reduce<number>((sum, count) => sum + (typeof count === "number" ? count : 0), 0);
}

function rowCountTotal(value: unknown) {
  const rowCounts = metadataRecord(value);
  return Object.values(rowCounts).reduce<number>((sum, count) => sum + (typeof count === "number" ? count : 0), 0);
}

function sourceLabel(value: string | null | undefined) {
  if (!value) return "Imported data";
  if (value === "google_sheets") return "Google Sheets";
  if (value === "csv") return "CSV";
  return value.replaceAll("_", " ");
}

export async function PricingWorkspaceDatasetPanel({ compact = false }: PricingWorkspaceDatasetPanelProps) {
  try {
    const cookieStore = await cookies();
    const session = verifyAccountSessionToken(cookieStore.get(ACCOUNT_SESSION_COOKIE)?.value);
    const [latestImport, latestSource, snapshots, segments, variants, experiments, runs] = await Promise.all([
      db.pricingAuditLog.findFirst({ where: { action: "pricing_import" }, orderBy: { createdAt: "desc" } }),
      db.lifecycleMappingPreset.findFirst({
        where: { app: "pricing" },
        orderBy: { updatedAt: "desc" }
      }),
      db.workspaceDataset.findMany({
        where: {
          app: "pricing",
          OR: session
            ? [{ accountUserId: session.userId }, { accountUserId: null }]
            : [{ accountUserId: null }]
        },
        orderBy: { createdAt: "desc" },
        take: 12
      }),
      db.pricingSegment.count(),
      db.pricingVariant.count(),
      db.pricingExperiment.count(),
      db.pricingExperimentRun.count()
    ]);
    const hasWorkspaceImport = Boolean(latestImport);
    const rows = importedRows(latestImport?.metadata);

    return (
      <div className={`card lifecycleDatasetPanel ${compact ? "lifecycleDatasetPanel--compact" : ""}`}>
        <div>
          <p className="editorKicker">Pricing app data</p>
          <h3>Self-contained sample data is ready</h3>
          <p>
            {hasWorkspaceImport
              ? `A workspace import exists (${sourceName(latestImport?.metadata)}), but this app remains usable as a standalone demo with the current app data below.`
              : "Pricing can run immediately with seeded sample segments, variants, experiments, and guardrails."}
          </p>
        </div>
        <div className="lifecycleDatasetStats">
          <div><span>Segments</span><strong>{segments.toLocaleString()}</strong></div>
          <div><span>Variants</span><strong>{variants.toLocaleString()}</strong></div>
          <div><span>Experiments</span><strong>{experiments.toLocaleString()}</strong></div>
          <div><span>Runs</span><strong>{runs.toLocaleString()}</strong></div>
        </div>
        <div className="lifecycleDatasetMeta">
          <p><strong>App data:</strong> current pricing database rows</p>
          <p><strong>Workspace import:</strong> {formatDate(latestImport?.createdAt)}{rows > 0 ? ` · ${rows.toLocaleString()} rows` : ""}</p>
          <p><strong>Workspace source:</strong> {latestSource?.name ?? "None available"}</p>
        </div>
        {snapshots.length > 0 ? (
          <form className="lifecycleDatasetSelector" action={applyPricingDatasetSnapshotAction}>
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
            <button type="submit">Apply dataset to pricing app</button>
            <p className="small">
              Applying a dataset replaces active pricing segments, variants, experiments, prior runs, decisions, and audit output.
            </p>
          </form>
        ) : (
          <p className="small">No imported pricing dataset snapshots are available for this account yet.</p>
        )}
        <div className="ctaRow">
          <Link className="btn smallBtn primary" href="/pricing/simulations">Run with current data</Link>
          <Link className="btn smallBtn" href="/pricing/inputs">Review app inputs</Link>
        </div>
      </div>
    );
  } catch (error) {
    if (!isMissingDemoTableError(error)) throw error;
    return (
      <div className="card lifecycleDatasetPanel lifecycleDatasetPanel--compact">
        <div>
          <p className="editorKicker">Pricing app data</p>
          <h3>Sample data available</h3>
          <p>Pricing tables are not available yet, but the app remains usable after database setup with its self-supporting sample flow.</p>
        </div>
      </div>
    );
  }
}
