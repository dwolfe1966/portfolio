import { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { DemoWorkspaceTabs } from "@/components/demo-shell/DemoWorkspaceTabs";
import { Section } from "@/components/site/Section";
import { ACCOUNT_SESSION_COOKIE, verifyAccountSessionToken } from "@/lib/account-session";
import { db } from "@/lib/db";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { buildMetadata } from "@/lib/seo";
import { loadWorkspaceDatasetReadiness, summarizeDatasetReadiness } from "@/lib/workspace-datasets";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  title: "Tools | David Wolfe",
  description: "Workspace dashboard for Tools: AI revenue tools, datasets, connections, activity, and settings.",
  path: "/workspace/dashboard"
});

const toolReadiness = [
  {
    name: "Lifecycle Engine",
    readiness: "Workspace-enabled",
    data: "CSV and Sheets source configs, imports, editable lifecycle data",
    workflow: "/lifecycle/overview",
    simulate: "/lifecycle/simulations",
    docs: "/lifecycle/docs"
  },
  {
    name: "Acquisition Agent",
    readiness: "Connected-data ready",
    data: "Google Ads OAuth, simulated accounts, campaign policy data",
    workflow: "/acquisition/campaigns",
    simulate: "/acquisition/simulations",
    docs: "/acquisition/docs"
  },
  {
    name: "Pricing Control Tower",
    readiness: "Tool",
    data: "Editable variants, segments, experiments, guardrails",
    workflow: "/pricing/inputs",
    simulate: "/pricing/simulations",
    docs: "/pricing/docs"
  },
  {
    name: "Retention Command Center",
    readiness: "Tool",
    data: "Editable accounts, playbooks, interventions, policy settings",
    workflow: "/retention/accounts",
    simulate: "/retention/simulations",
    docs: "/retention/docs"
  },
  {
    name: "Expansion Command Center",
    readiness: "Tool",
    data: "Editable accounts, offers, expansion policy settings",
    workflow: "/expansion/accounts",
    simulate: "/expansion/simulations",
    docs: "/expansion/docs"
  },
  {
    name: "Auction Desk",
    readiness: "Tool",
    data: "Editable advertisers, slots, bids, reserve settings",
    workflow: "/auction/inputs",
    simulate: "/auction/simulations",
    docs: "/auction/docs"
  }
];

async function currentAccountUserId() {
  const cookieStore = await cookies();
  return verifyAccountSessionToken(cookieStore.get(ACCOUNT_SESSION_COOKIE)?.value)?.userId ?? null;
}

async function loadToolsetSummary(accountUserId: string | null) {
  try {
    const [workspace, sourceConfigs, imports, lifecycleRuns, datasetSnapshots, activeSelections, recentDatasets, datasetReadiness] = await Promise.all([
      db.workspace.findUnique({ where: { slug: "default-demo-workspace" } }),
      db.lifecycleMappingPreset.count({ where: { accountUserId } }),
      db.lifecycleImportLog.count({ where: { accountUserId } }),
      db.campaignRun.count({ where: { accountUserId } }),
      db.workspaceDataset.count({ where: { accountUserId } }),
      db.appDataSourceSelection.findMany({
        where: { accountUserId },
        orderBy: [{ app: "asc" }, { updatedAt: "desc" }],
        take: 12,
        include: { dataset: { select: { name: true, sourceType: true } } }
      }),
      db.workspaceDataset.findMany({
        where: { accountUserId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          app: true,
          sourceType: true,
          name: true,
          rowCounts: true,
          createdAt: true
        }
      }),
      loadWorkspaceDatasetReadiness()
    ]);

    return { workspace, sourceConfigs, imports, lifecycleRuns, datasetSnapshots, activeSelections, recentDatasets, datasetReadiness, compatibilityMode: false };
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      return {
        workspace: null,
        sourceConfigs: 0,
        imports: 0,
        lifecycleRuns: 0,
        datasetSnapshots: 0,
        activeSelections: [],
        recentDatasets: [],
        datasetReadiness: [],
        compatibilityMode: true
      };
    }
    throw error;
  }
}

function metadataRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function rowCountTotal(value: unknown) {
  return Object.values(metadataRecord(value)).reduce<number>((sum, count) => sum + (typeof count === "number" ? count : 0), 0);
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(value);
}

function sourceTypeLabel(sourceType: string | null | undefined) {
  if (sourceType === "google_sheets") return "Google Sheets";
  if (sourceType === "csv") return "CSV";
  if (sourceType === "sample") return "Sample";
  return sourceType ? sourceType.toUpperCase() : "Sample";
}

function toolLabel(app: string) {
  return toolReadiness.find((tool) => tool.workflow.startsWith(`/${app}/`) || tool.simulate.startsWith(`/${app}/`))?.name ?? app;
}

export default async function DemoDashboardPage() {
  const accountUserId = await currentAccountUserId();
  const summary = await loadToolsetSummary(accountUserId);
  const datasetSummary = summarizeDatasetReadiness(summary.datasetReadiness);
  const workspaceFlow = ["Connect source", "Import snapshot", "Choose source in tool", "Run and review"];
  const activeSelectionsByApp = new Map<string, (typeof summary.activeSelections)[number]>();
  summary.activeSelections.forEach((selection) => {
    if (!activeSelectionsByApp.has(selection.app)) activeSelectionsByApp.set(selection.app, selection);
  });
  const activeSelections = [...activeSelectionsByApp.values()];
  const nextActions = [
    {
      label: "Review usable data",
      detail: "Inspect saved source configs, imported snapshots, readiness gaps, and delete old snapshots.",
      href: "/workspace/datasets",
      primary: true
    },
    {
      label: "Connect or refresh data",
      detail: "Open CSV, Google Sheets, OAuth, or future live datasource connection flows.",
      href: "/workspace/connections",
      primary: false
    },
    {
      label: "Audit workspace activity",
      detail: "See imports, source config updates, model runs, and connector events in chronological order.",
      href: "/workspace/activity",
      primary: false
    }
  ];

  return (
    <>
      <DemoWorkspaceTabs />
      <Section eyebrow="Workspace" title="Workspace command center">
        <p>
          The workspace is the account control plane for sources, imported dataset snapshots, selected tool data, and
          operating activity. Tools still run with sample data by default; the workspace lets you bring your own data
          into the same product flows.
        </p>
        <div className="workspaceFlowDiagram" aria-label="Workspace operating flow">
          {workspaceFlow.map((step, index) => (
            <div className="workspaceFlowStep" key={step}>
              <span>{index + 1}</span>
              <strong>{step}</strong>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Workspace status">
        <div className="grid grid-4 workspaceCompactMetricGrid">
          <div className="card workspaceCompactMetric"><p className="small">Workspace</p><div className="kpi">{summary.workspace ? "Active" : "Setup"}</div></div>
          <div className="card workspaceCompactMetric"><p className="small">Source configs</p><div className="kpi">{summary.sourceConfigs.toLocaleString()}</div></div>
          <div className="card workspaceCompactMetric"><p className="small">My snapshots</p><div className="kpi">{summary.datasetSnapshots.toLocaleString()}</div></div>
          <div className="card workspaceCompactMetric"><p className="small">Model runs</p><div className="kpi">{summary.lifecycleRuns.toLocaleString()}</div></div>
        </div>
        {summary.compatibilityMode ? (
          <p className="small">Run the latest Prisma migrations to enable workspace persistence.</p>
        ) : null}
      </Section>

      <Section title="Recommended next actions">
        <div className="workspaceActionGrid">
          {nextActions.map((action) => (
            <div className="card workspaceActionCard" key={action.label}>
              <h3>{action.label}</h3>
              <p>{action.detail}</p>
              <Link className={`btn smallBtn ${action.primary ? "primary" : ""}`} href={action.href}>Open</Link>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Active tool data">
        {activeSelections.length === 0 ? (
          <div className="card">
            <p>No active workspace data selections have been saved yet. Each tool can still run with self-contained sample data.</p>
            <Link className="btn smallBtn" href="/workspace/datasets">Review imported snapshots</Link>
          </div>
        ) : (
          <div className="workspaceActiveSourceList">
            {activeSelections.map((selection) => (
              <div className="workspaceActiveSourceRow" key={selection.id}>
                <div>
                  <p className="editorKicker">{toolLabel(selection.app)}</p>
                  <h3>{selection.label}</h3>
                  <p className="small">
                    {selection.mode === "sample" ? "Sample data" : `${sourceTypeLabel(selection.sourceType)} snapshot`}
                    {selection.dataset?.name ? ` · ${selection.dataset.name}` : ""}
                  </p>
                </div>
                <div className="workspaceActiveSourceMeta">
                  <span className={`statusPill ${selection.mode === "sample" ? "progress" : "live"}`}>{selection.mode}</span>
                  <strong>{rowCountTotal(selection.rowCounts).toLocaleString()} rows</strong>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Tool data readiness">
        <p>
          Readiness shows which tools have enough structured data to run against the current workspace instead of only
          relying on default sample data.
        </p>
        <div className="grid grid-4 workspaceCompactMetricGrid">
          <div className="card workspaceCompactMetric"><p className="small">Available</p><div className="kpi">{datasetSummary.available}</div></div>
          <div className="card workspaceCompactMetric"><p className="small">Partial</p><div className="kpi">{datasetSummary.partial}</div></div>
          <div className="card workspaceCompactMetric"><p className="small">Missing</p><div className="kpi">{datasetSummary.missing}</div></div>
          <div className="card workspaceCompactMetric"><p className="small">Imported</p><div className="kpi">{datasetSummary.imported}</div></div>
        </div>
      </Section>

      <Section title="Recent imported snapshots">
        {summary.recentDatasets.length === 0 ? (
          <div className="card">
            <p>No imported dataset snapshots yet. Create one from CSV or Google Sheets, then select it inside a tool.</p>
            <Link className="btn smallBtn primary" href="/workspace/connections">Connect data</Link>
          </div>
        ) : (
          <div className="tableScroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Snapshot</th>
                  <th>Tool</th>
                  <th>Source</th>
                  <th>Rows</th>
                  <th>Created</th>
                  <th>Use</th>
                </tr>
              </thead>
              <tbody>
                {summary.recentDatasets.map((dataset) => (
                  <tr key={dataset.id}>
                    <td><strong>{dataset.name}</strong></td>
                    <td>{toolLabel(dataset.app)}</td>
                    <td>{sourceTypeLabel(dataset.sourceType)}</td>
                    <td>{rowCountTotal(dataset.rowCounts).toLocaleString()}</td>
                    <td>{formatDate(dataset.createdAt)}</td>
                    <td><Link className="btn smallBtn" href={`/${dataset.app}/inputs?imported=1`}>Open inputs</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <div id="workspace-tools">
        <Section title="Tools">
          <div className="toolReadinessList">
            {toolReadiness.map((tool) => (
              <div className="toolReadinessRow" key={tool.name}>
                <div>
                  <p className={`statusPill ${tool.readiness === "Tool" ? "progress" : "live"}`}>{tool.readiness}</p>
                  <h3>{tool.name}</h3>
                  <p>{tool.data}</p>
                </div>
                <div className="toolReadinessActions">
                  <Link className="btn smallBtn primary" href={tool.workflow}>Open tool</Link>
                  <Link className="btn smallBtn" href={tool.simulate}>Simulate</Link>
                  <Link className="btn smallBtn" href={tool.docs}>Docs</Link>
                </div>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </>
  );
}
