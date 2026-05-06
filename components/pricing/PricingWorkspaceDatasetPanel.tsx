import { cookies } from "next/headers";
import { applyPricingDatasetSnapshotAction } from "@/app/(demo)/pricing/inputs/actions";
import { ACCOUNT_SESSION_COOKIE, verifyAccountSessionToken } from "@/lib/account-session";
import { getActiveDataSourceSelection } from "@/lib/app-data-source-selection";
import { db } from "@/lib/db";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { ToolDataSourceSelector } from "@/components/site/ToolDataSourceSelector";

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
    const [latestSource, snapshots, activeSelection, segments, variants, experiments, runs] = await Promise.all([
      db.lifecycleMappingPreset.findFirst({
        where: {
          app: "pricing",
          OR: session
            ? [{ accountUserId: session.userId }, { accountUserId: null }]
            : [{ accountUserId: null }]
        },
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
      getActiveDataSourceSelection("pricing", session?.userId),
      db.pricingSegment.count(),
      db.pricingVariant.count(),
      db.pricingExperiment.count(),
      db.pricingExperimentRun.count()
    ]);
    return (
      <div className={`card lifecycleDatasetPanel ${compact ? "lifecycleDatasetPanel--compact" : ""}`}>
        <div>
          <p className="editorKicker">Pricing app data</p>
          <h3>Self-contained sample data is ready</h3>
          <p>
            {snapshots.length > 0
              ? "Account-owned imported datasets are available, but this app remains usable as a standalone demo with the current app data below."
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
          <p><strong>Active source:</strong> current pricing app tables. Apply an imported dataset below to replace them, or reset to sample data.</p>
          <p><strong>App data:</strong> current pricing database rows</p>
          <p><strong>Available imported datasets:</strong> {snapshots.length.toLocaleString()}</p>
          <p><strong>Workspace source:</strong> {latestSource?.name ?? "None available"}</p>
        </div>
        <ToolDataSourceSelector
          appLabel="Pricing"
          scope="pricing"
          activeMode={activeSelection?.mode === "imported" ? "imported" : "sample"}
          activeLabel={activeSelection?.label ?? "Pricing sample data"}
          activeDatasetId={activeSelection?.datasetId}
          stats={[
            { label: "Segments", value: segments },
            { label: "Variants", value: variants },
            { label: "Experiments", value: experiments },
            { label: "Runs", value: runs }
          ]}
          datasets={snapshots.map((snapshot) => ({
            id: snapshot.id,
            label: `${snapshot.name} · ${sourceLabel(snapshot.sourceType)} · ${rowCountTotal(snapshot.rowCounts).toLocaleString()} rows · ${formatDate(snapshot.createdAt)}`
          }))}
          applyDatasetAction={applyPricingDatasetSnapshotAction}
        />
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
