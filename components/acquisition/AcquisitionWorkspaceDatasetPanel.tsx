import { cookies } from "next/headers";
import { applyAcquisitionDatasetSnapshotAction } from "@/app/(demo)/acquisition/inputs/actions";
import { ACCOUNT_SESSION_COOKIE, verifyAccountSessionToken } from "@/lib/account-session";
import { accountOwnedImportWhere, canUseImportedData, resolveActiveDataSourceMode } from "@/lib/account-data-scope";
import { getActiveDataSourceSelection } from "@/lib/app-data-source-selection";
import { db } from "@/lib/db";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { workspaceVisibilityLabel } from "@/lib/workspace-visibility";
import { acquisitionProviderSnapshotScopeLabel } from "@/lib/acquisition-provider-snapshots";
import { ToolDataSourceSelector } from "@/components/site/ToolDataSourceSelector";

type AcquisitionWorkspaceDatasetPanelProps = {
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
  if (value === "google_ads") return "Google Ads";
  if (value === "meta_ads") return "Meta Ads";
  if (value === "csv") return "CSV";
  return value.replaceAll("_", " ");
}

function datasetConnectionId(metadata: unknown) {
  const record = metadataRecord(metadata);
  return typeof record.connectionId === "string" ? record.connectionId : null;
}

function providerSnapshotDetail(snapshot: {
  sourceType: string;
  rowCounts: unknown;
  metadata: unknown;
  createdAt: Date;
}) {
  const connectionId = datasetConnectionId(snapshot.metadata);
  const parts = [
    sourceLabel(snapshot.sourceType),
    acquisitionProviderSnapshotScopeLabel(snapshot.metadata),
    `${rowCountTotal(snapshot.rowCounts).toLocaleString()} rows`,
    formatDate(snapshot.createdAt),
    connectionId ? `connection ${connectionId.slice(0, 8)}` : null
  ].filter(Boolean);
  return parts.join(" · ");
}

export async function AcquisitionWorkspaceDatasetPanel({ compact = false }: AcquisitionWorkspaceDatasetPanelProps) {
  try {
    const cookieStore = await cookies();
    const session = verifyAccountSessionToken(cookieStore.get(ACCOUNT_SESSION_COOKIE)?.value);
    const [latestSource, snapshots, activeSelection, campaigns, audiences, creatives, performance] = await Promise.all([
      db.lifecycleMappingPreset.findFirst({
        where: {
          app: "acquisition",
          OR: session
            ? [{ accountUserId: session.userId }, { accountUserId: null }]
            : [{ accountUserId: null }]
        },
        orderBy: { updatedAt: "desc" }
      }),
      db.workspaceDataset.findMany({
        where: {
          app: "acquisition",
          ...accountOwnedImportWhere(session?.userId)
        },
        orderBy: { createdAt: "desc" },
        take: 12
      }),
      getActiveDataSourceSelection("acquisition", session?.userId),
      db.acquisitionCampaign.count(),
      db.audienceSegment.count(),
      db.adCreative.count(),
      db.adPerformance.count()
    ]);
    const activeMode = resolveActiveDataSourceMode(session?.userId, activeSelection?.mode);
    const activeDataset = activeSelection?.datasetId
      ? snapshots.find((snapshot) => snapshot.id === activeSelection.datasetId)
      : null;
    const providerSnapshots = snapshots.filter((snapshot) => snapshot.sourceType === "google_ads" || snapshot.sourceType === "meta_ads");
    const activeSourceLabel = activeMode === "imported"
      ? `${activeSelection?.label ?? activeDataset?.name ?? "Imported dataset"}${activeSelection?.sourceType ? ` · ${sourceLabel(activeSelection.sourceType)}` : ""}`
      : "Acquisition sample data";

    return (
      <div className={`card lifecycleDatasetPanel ${compact ? "lifecycleDatasetPanel--compact" : ""}`}>
        <div>
          <p className="editorKicker">Acquisition app data</p>
          <h3>{activeMode === "imported" ? "Imported acquisition data is active" : "Self-contained sample data is ready"}</h3>
          <p>
            {activeMode === "imported"
              ? "The acquisition tables are currently populated from a workspace dataset snapshot."
              : snapshots.length > 0
                ? "Imported datasets are available. Apply one below to replace the sample app rows."
                : "Acquisition can run immediately with campaign briefs, audiences, creatives, and simulated performance data."}
          </p>
        </div>
        <div className="lifecycleDatasetStats">
          <div><span>Campaigns</span><strong>{campaigns.toLocaleString()}</strong></div>
          <div><span>Audiences</span><strong>{audiences.toLocaleString()}</strong></div>
          <div><span>Creatives</span><strong>{creatives.toLocaleString()}</strong></div>
          <div><span>Performance</span><strong>{performance.toLocaleString()}</strong></div>
        </div>
        <div className="lifecycleDatasetMeta">
          <p><strong>Active source:</strong> {session ? activeSourceLabel : "current acquisition sample app tables. Sign in to apply imported workspace data."}</p>
          <p><strong>Current table rows:</strong> {campaigns.toLocaleString()} campaigns, {audiences.toLocaleString()} audiences, {creatives.toLocaleString()} creatives, {performance.toLocaleString()} performance rows</p>
          <p><strong>Available imported datasets:</strong> {snapshots.length.toLocaleString()}</p>
          <p><strong>Provider snapshots:</strong> {providerSnapshots.length.toLocaleString()}</p>
          <p><strong>Workspace source:</strong> {latestSource?.name ?? "None available"}</p>
        </div>
        {providerSnapshots.length > 0 ? (
          <div className="grid grid-3" style={{ marginTop: 12 }}>
            {providerSnapshots.slice(0, 3).map((snapshot) => {
              const isActive = activeSelection?.datasetId === snapshot.id;
              const visibility = workspaceVisibilityLabel(snapshot.accountUserId, session?.userId);
              return (
                <div className="card compact" key={snapshot.id}>
                  <p className={`statusPill ${isActive ? "live" : "progress"}`}>
                    {isActive ? "active" : sourceLabel(snapshot.sourceType)}
                  </p>
                  <h3 style={{ marginTop: 10 }}>{snapshot.name}</h3>
                  <p className="small">{providerSnapshotDetail(snapshot)}</p>
                  <p className="small">{visibility.label}</p>
                </div>
              );
            })}
          </div>
        ) : null}
        <ToolDataSourceSelector
          appLabel="Acquisition"
          scope="acquisition"
          activeMode={activeMode}
          activeLabel={activeSourceLabel}
          activeDatasetId={activeSelection?.datasetId}
          stats={[
            { label: "Campaigns", value: campaigns },
            { label: "Audiences", value: audiences },
            { label: "Creatives", value: creatives },
            { label: "Performance", value: performance }
          ]}
          datasets={snapshots.map((snapshot) => {
            const visibility = workspaceVisibilityLabel(snapshot.accountUserId, session?.userId);
            return {
              id: snapshot.id,
              label: `${visibility.label} · ${snapshot.name} · ${sourceLabel(snapshot.sourceType)} · ${acquisitionProviderSnapshotScopeLabel(snapshot.metadata)} · ${rowCountTotal(snapshot.rowCounts).toLocaleString()} rows · ${formatDate(snapshot.createdAt)}`
            };
          })}
          canUseImportedData={canUseImportedData(session?.userId)}
          applyDatasetAction={applyAcquisitionDatasetSnapshotAction}
        />
      </div>
    );
  } catch (error) {
    if (!isMissingDemoTableError(error)) throw error;
    return (
      <div className="card lifecycleDatasetPanel lifecycleDatasetPanel--compact">
        <div>
          <p className="editorKicker">Acquisition app data</p>
          <h3>Sample data available</h3>
          <p>Acquisition tables are not available yet, but the app remains usable after database setup with its self-supporting sample flow.</p>
        </div>
      </div>
    );
  }
}
