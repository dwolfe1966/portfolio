import { cookies } from "next/headers";
import { applyAuctionDatasetSnapshotAction } from "@/app/(demo)/auction/inputs/actions";
import { ACCOUNT_SESSION_COOKIE, verifyAccountSessionToken } from "@/lib/account-session";
import { db } from "@/lib/db";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { ResetDemoDataCard } from "@/components/site/ResetDemoDataCard";

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
    const [latestImport, latestSource, snapshots, advertisers, slots, bids, runs] = await Promise.all([
      db.auctionAuditLog.findFirst({ where: { action: "auction_import" }, orderBy: { createdAt: "desc" } }),
      db.lifecycleMappingPreset.findFirst({
        where: { app: "auction" },
        orderBy: { updatedAt: "desc" }
      }),
      db.workspaceDataset.findMany({
        where: {
          app: "auction",
          OR: session
            ? [{ accountUserId: session.userId }, { accountUserId: null }]
            : [{ accountUserId: null }]
        },
        orderBy: { createdAt: "desc" },
        take: 12
      }),
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
            {latestImport
              ? "A workspace import exists, but this app remains usable as a standalone demo with the current app data below."
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
          <p><strong>Active source:</strong> current auction app tables. Apply an imported dataset below to replace them, or reset to sample data.</p>
          <p><strong>App data:</strong> current auction database rows</p>
          <p><strong>Workspace import:</strong> {formatDate(latestImport?.createdAt)}</p>
          <p><strong>Workspace source:</strong> {latestSource?.name ?? "None available"}</p>
        </div>
        <div className="dataSourceModeGrid">
          <div className="dataSourceModePanel">
            <h3>Option A Use Sample Data</h3>
            <details className="dataSourceDetails">
              <summary>What this means</summary>
              <p className="small">Use the seeded auction dataset that ships with the product. To switch back to sample data after applying an import, use the reset control below.</p>
            </details>
          </div>
          <div className="dataSourceModePanel">
            <h3>Option B Use Imported Data</h3>
            <details className="dataSourceDetails">
              <summary>What this means</summary>
              <p className="small">Choose a persisted workspace dataset and apply it to this tool. Applying an imported dataset replaces the active auction tables.</p>
            </details>
        {snapshots.length > 0 ? (
          <form className="lifecycleDatasetSelector" action={applyAuctionDatasetSnapshotAction}>
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
            <button type="submit">Apply dataset to auction app</button>
          </form>
        ) : (
          <p className="small">No imported auction dataset snapshots are available for this account yet.</p>
        )}
          </div>
        </div>
        <ResetDemoDataCard appLabel="Auction" scope="auction" variant="embedded" />
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
