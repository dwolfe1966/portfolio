import Link from "next/link";
import { Section } from "@/components/site/Section";
import { db } from "@/lib/db";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";

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
  const importLogs = await db.lifecycleImportLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 8
  }).catch((error) => {
    if (isMissingDemoTableError(error)) return [];
    throw error;
  });

  return (
    <>
      <Section eyebrow="Operations" title="Use your own data">
        <p>
          Lifecycle data connections now run through the shared Workspace source layer. Use this page for lifecycle import
          history; use Workspace Connections and Datasets to create, manage, refresh, and import sources.
        </p>
        <div className="ctaRow">
          <Link className="btn primary" href="/workspace/connections">Workspace connections</Link>
          <Link className="btn" href="/workspace/datasets?tool=lifecycle">Lifecycle sources</Link>
          <Link className="btn" href="/lifecycle/inputs">Open current data</Link>
        </div>
      </Section>

      <Section title="Lifecycle source actions">
        <div className="grid grid-3">
          <div className="card">
            <p className="editorKicker">Create source</p>
            <h3>CSV upload</h3>
            <p>Map users, entities, interest edges, and change events from CSV rows.</p>
            <Link className="btn smallBtn" href="/workspace/connections/csv?tool=lifecycle">Open CSV connector</Link>
          </div>
          <div className="card">
            <p className="editorKicker">Create source</p>
            <h3>Google Sheets</h3>
            <p>Preview live Sheet ranges, map fields, refresh rows, and import the latest lifecycle data.</p>
            <Link className="btn smallBtn" href="/workspace/connections/google-sheets?tool=lifecycle">Open Sheets connector</Link>
          </div>
          <div className="card">
            <p className="editorKicker">Manage sources</p>
            <h3>Workspace datasets</h3>
            <p>Review saved lifecycle source configs, object coverage, mappings, and recommended next actions.</p>
            <Link className="btn smallBtn primary" href="/workspace/datasets?tool=lifecycle">Manage lifecycle sources</Link>
          </div>
        </div>
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
                  return (
                    <tr key={log.id}>
                      <td>
                        <strong>{log.sourceName}</strong>
                        <p className="small">{log.sourceType.toUpperCase()}</p>
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
