import Link from "next/link";
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

export async function PricingWorkspaceDatasetPanel({ compact = false }: PricingWorkspaceDatasetPanelProps) {
  try {
    const [latestImport, latestSource, segments, variants, experiments, runs] = await Promise.all([
      db.pricingAuditLog.findFirst({ where: { action: "pricing_import" }, orderBy: { createdAt: "desc" } }),
      db.lifecycleMappingPreset.findFirst({
        where: { app: "pricing" },
        orderBy: { updatedAt: "desc" }
      }),
      db.pricingSegment.count(),
      db.pricingVariant.count(),
      db.pricingExperiment.count(),
      db.pricingExperimentRun.count()
    ]);
    const usingImportedData = Boolean(latestImport);
    const rows = importedRows(latestImport?.metadata);

    return (
      <div className={`card lifecycleDatasetPanel ${compact ? "lifecycleDatasetPanel--compact" : ""}`}>
        <div>
          <p className="editorKicker">Current pricing data mode</p>
          <h3>{usingImportedData ? "Workspace dataset active" : "Built-in sample data active"}</h3>
          <p>
            {usingImportedData
              ? `Using the latest imported pricing dataset: ${sourceName(latestImport?.metadata)}.`
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
          <p><strong>Source:</strong> {latestSource?.sourceType === "google_sheets" ? "Google Sheets" : latestSource?.sourceType?.toUpperCase() ?? "Sample workspace data"}</p>
          <p><strong>Last import:</strong> {formatDate(latestImport?.createdAt)}{rows > 0 ? ` · ${rows.toLocaleString()} rows` : ""}</p>
          <p><strong>Saved config:</strong> {latestSource?.name ?? "None yet"}</p>
        </div>
        <div className="ctaRow">
          <Link className="btn smallBtn primary" href="/pricing/simulations">Run with current data</Link>
          <Link className="btn smallBtn" href="/workspace/datasets?tool=pricing">Manage datasets</Link>
          <Link className="btn smallBtn" href="/workspace/connections/csv?tool=pricing">Use your own data</Link>
        </div>
      </div>
    );
  } catch (error) {
    if (!isMissingDemoTableError(error)) throw error;
    return (
      <div className="card lifecycleDatasetPanel lifecycleDatasetPanel--compact">
        <div>
          <p className="editorKicker">Current pricing data mode</p>
          <h3>Sample data available</h3>
          <p>Pricing tables are not available yet, but the app remains usable after database setup with its self-supporting sample flow.</p>
        </div>
      </div>
    );
  }
}
