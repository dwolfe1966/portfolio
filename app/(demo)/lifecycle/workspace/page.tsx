import Link from "next/link";
import { Section } from "@/components/site/Section";
import { db } from "@/lib/db";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";

export const dynamic = "force-dynamic";

async function loadWorkspaceSummary() {
  try {
    const workspace = await db.workspace.findUnique({
      where: { slug: "default-demo-workspace" },
      include: {
        mappingPresets: {
          where: { app: "lifecycle", sourceType: "csv" },
          orderBy: { updatedAt: "desc" },
          take: 5
        }
      }
    });
    const [imports, users, entities, edges, events, runs] = await Promise.all([
      db.lifecycleImportLog.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
      db.user.count(),
      db.entity.count(),
      db.interestEdge.count(),
      db.entityDelta.count(),
      db.campaignRun.count()
    ]);

    return { workspace, imports, counts: { users, entities, edges, events, runs }, compatibilityMode: false };
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      return { workspace: null, imports: [], counts: { users: 0, entities: 0, edges: 0, events: 0, runs: 0 }, compatibilityMode: true };
    }
    throw error;
  }
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(value);
}

export default async function LifecycleWorkspacePage() {
  const summary = await loadWorkspaceSummary();
  const totalImportedRows = summary.imports.reduce(
    (sum, item) => sum + item.usersImported + item.entitiesImported + item.interestEdgesImported + item.changeEventsImported,
    0
  );

  return (
    <>
      <Section eyebrow="Workspace" title={summary.workspace?.name ?? "Default Workspace"}>
        <p>
          This is the early workspace layer for saved lifecycle configuration: imports, mapping presets, datasets, and model runs.
          Full account ownership can attach to this structure later.
        </p>
        <div className="ctaRow">
          <Link className="btn primary" href="/workspace/connections/csv?tool=lifecycle">Import CSV data</Link>
          <Link className="btn" href="/workspace/connections/google-sheets?tool=lifecycle">Import Sheet data</Link>
          <Link className="btn" href="/workspace/connections">Manage workspace connections</Link>
          <Link className="btn" href="/lifecycle/simulations">Run simulation</Link>
        </div>
      </Section>

      {summary.compatibilityMode ? (
        <Section title="Workspace setup needed">
          <div className="card">
            <p>Workspace tables are not available yet. Run the latest Prisma migration to enable saved presets.</p>
          </div>
        </Section>
      ) : null}

      <Section title="Workspace summary">
        <div className="grid grid-4">
          <div className="card"><p className="small">Users</p><div className="kpi">{summary.counts.users.toLocaleString()}</div></div>
          <div className="card"><p className="small">Entities</p><div className="kpi">{summary.counts.entities.toLocaleString()}</div></div>
          <div className="card"><p className="small">Interest edges</p><div className="kpi">{summary.counts.edges.toLocaleString()}</div></div>
          <div className="card"><p className="small">Campaign runs</p><div className="kpi">{summary.counts.runs.toLocaleString()}</div></div>
        </div>
      </Section>

      <Section title="Saved connector configuration">
        <div className="grid grid-2">
          <div className="card">
            <div className="editorHeader">
              <div>
                <p className="editorKicker">CSV presets</p>
                <h3>{summary.workspace?.mappingPresets.length ?? 0} saved mappings</h3>
              </div>
              <Link className="btn smallBtn" href="/workspace/connections/csv?tool=lifecycle">Open</Link>
            </div>
            {summary.workspace?.mappingPresets.length ? (
              <ul>
                {summary.workspace.mappingPresets.map((preset) => (
                  <li key={preset.id}>
                    <strong>{preset.name}</strong>
                    <p className="small">Updated {formatDate(preset.updatedAt)}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No saved mapping presets yet.</p>
            )}
          </div>
          <div className="card">
            <div className="editorHeader">
              <div>
                <p className="editorKicker">Imports</p>
                <h3>{summary.imports.length} recent imports</h3>
              </div>
              <Link className="btn smallBtn" href="/lifecycle/connections">History</Link>
            </div>
            <p className="kpi">{totalImportedRows.toLocaleString()}</p>
            <p>Rows imported across the most recent lifecycle uploads.</p>
          </div>
        </div>
      </Section>
    </>
  );
}
