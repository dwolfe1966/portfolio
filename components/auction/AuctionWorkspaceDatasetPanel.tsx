import { cookies } from "next/headers";
import { applyAuctionDatasetSnapshotAction } from "@/app/(demo)/auction/inputs/actions";
import { ACCOUNT_SESSION_COOKIE, verifyAccountSessionToken } from "@/lib/account-session";
import { accountOwnedImportWhere, canUseImportedData, resolveActiveDataSourceMode } from "@/lib/account-data-scope";
import { getActiveDataSourceSelection } from "@/lib/app-data-source-selection";
import { db } from "@/lib/db";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { ToolDataSourceSelector } from "@/components/site/ToolDataSourceSelector";

type AuctionWorkspaceDatasetPanelProps = {
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

export async function AuctionWorkspaceDatasetPanel({ compact = false }: AuctionWorkspaceDatasetPanelProps) {
  try {
    const cookieStore = await cookies();
    const session = verifyAccountSessionToken(cookieStore.get(ACCOUNT_SESSION_COOKIE)?.value);
    const [latestSource, snapshots, activeSelection, advertisers, slots, bids, runs] = await Promise.all([
      db.lifecycleMappingPreset.findFirst({
        where: {
          app: "auction",
          OR: session
            ? [{ accountUserId: session.userId }, { accountUserId: null }]
            : [{ accountUserId: null }]
        },
        orderBy: { updatedAt: "desc" }
      }),
      db.workspaceDataset.findMany({
        where: {
          app: "auction",
          ...accountOwnedImportWhere(session?.userId)
        },
        orderBy: { createdAt: "desc" },
        take: 12
      }),
      getActiveDataSourceSelection("auction", session?.userId),
      db.auctionAdvertiser.count(),
      db.auctionSlot.count(),
      db.auctionBid.count(),
      db.auctionRun.count()
    ]);

    return (
      <div className={`card lifecycleDatasetPanel ${compact ? "lifecycleDatasetPanel--compact" : ""}`}>
        <div>
          <p className="editorKicker">Auction app data</p>
          <h3>Self-contained sample data is ready</h3>
          <p>
            {snapshots.length > 0
              ? "Account-owned imported datasets are available, but this app remains usable as a standalone tool with the current app data below."
              : "Auction can run immediately with seeded advertisers, inventory slots, and bids."}
          </p>
        </div>
        <div className="lifecycleDatasetStats">
          <div><span>Advertisers</span><strong>{advertisers.toLocaleString()}</strong></div>
          <div><span>Slots</span><strong>{slots.toLocaleString()}</strong></div>
          <div><span>Bids</span><strong>{bids.toLocaleString()}</strong></div>
          <div><span>Runs</span><strong>{runs.toLocaleString()}</strong></div>
        </div>
        <div className="lifecycleDatasetMeta">
          <p><strong>Active source:</strong> {session ? "current auction app tables. Apply an imported dataset below to replace them, or reset to sample data." : "current auction sample app tables. Sign in to apply imported workspace data."}</p>
          <p><strong>App data:</strong> current auction database rows</p>
          <p><strong>Available imported datasets:</strong> {snapshots.length.toLocaleString()}</p>
          <p><strong>Workspace source:</strong> {latestSource?.name ?? "None available"}</p>
        </div>
        <ToolDataSourceSelector
          appLabel="Auction"
          scope="auction"
          activeMode={resolveActiveDataSourceMode(session?.userId, activeSelection?.mode)}
          activeLabel={activeSelection?.label ?? "Auction sample data"}
          activeDatasetId={activeSelection?.datasetId}
          stats={[
            { label: "Advertisers", value: advertisers },
            { label: "Slots", value: slots },
            { label: "Bids", value: bids },
            { label: "Runs", value: runs }
          ]}
          datasets={snapshots.map((snapshot) => ({
            id: snapshot.id,
            label: `${snapshot.name} · ${sourceLabel(snapshot.sourceType)} · ${rowCountTotal(snapshot.rowCounts).toLocaleString()} rows · ${formatDate(snapshot.createdAt)}`
          }))}
          canUseImportedData={canUseImportedData(session?.userId)}
          applyDatasetAction={applyAuctionDatasetSnapshotAction}
        />
      </div>
    );
  } catch (error) {
    if (!isMissingDemoTableError(error)) throw error;
    return (
      <div className="card lifecycleDatasetPanel lifecycleDatasetPanel--compact">
        <div>
          <p className="editorKicker">Auction app data</p>
          <h3>Sample data available</h3>
          <p>Auction tables are not available yet, but the app remains usable after database setup with its self-supporting sample flow.</p>
        </div>
      </div>
    );
  }
}
