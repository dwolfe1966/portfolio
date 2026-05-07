import Link from "next/link";
import { cookies } from "next/headers";
import { Section } from "@/components/site/Section";
import { ACCOUNT_SESSION_COOKIE, verifyAccountSessionToken } from "@/lib/account-session";
import { accountOwnedImportWhere } from "@/lib/account-data-scope";
import { db } from "@/lib/db";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { workspaceVisibilityLabel } from "@/lib/workspace-visibility";

export const dynamic = "force-dynamic";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(value);
}

function formatMetadata(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") return "No metadata recorded.";
  return JSON.stringify(metadata, null, 2);
}

export default async function LifecycleConnectionsPage() {
  const cookieStore = await cookies();
  const session = verifyAccountSessionToken(cookieStore.get(ACCOUNT_SESSION_COOKIE)?.value);
  const importLogs = await db.lifecycleImportLog.findMany({
    where: accountOwnedImportWhere(session?.userId),
    orderBy: { createdAt: "desc" },
    take: 8
  }).catch((error) => {
    if (isMissingDemoTableError(error)) return [];
    throw error;
  });

  return (
    <>
      <Section eyebrow="Operations" title="Import history">
        <p>
          Lifecycle is designed to run as a self-contained app with sample data. If workspace imports have been created,
          this page only records their history; source setup is handled in the workspace connection flow.
        </p>
        <Link className="btn" href="/lifecycle/inputs">Open current app data</Link>
      </Section>

      <Section title="Recent import history">
        {importLogs.length === 0 ? (
          <div className="card">
            <p>No lifecycle imports have been recorded yet.</p>
          </div>
        ) : (
          <div className="tableScroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Dataset</th>
                  <th>Visibility</th>
                  <th>Status</th>
                  <th>Rows imported</th>
                  <th>Validation issues</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {importLogs.map((log) => {
                  const rows =
                    log.usersImported +
                    log.entitiesImported +
                    log.interestEdgesImported +
                    log.changeEventsImported;
                  const visibility = workspaceVisibilityLabel(log.accountUserId, session?.userId);
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
                        {rows.toLocaleString()}
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
                        <details className="importMetadataDetails">
                          <summary>Import details</summary>
                          <pre>{formatMetadata(log.metadata)}</pre>
                        </details>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </>
  );
}
