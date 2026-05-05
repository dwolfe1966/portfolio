import { Metadata } from "next";
import Link from "next/link";
import { DemoWorkspaceTabs } from "@/components/demo-shell/DemoWorkspaceTabs";
import { Section } from "@/components/site/Section";
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
    workflow: "/lifecycle/workspace",
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

async function loadToolsetSummary() {
  try {
    const [workspace, sourceConfigs, imports, lifecycleRuns, datasetReadiness] = await Promise.all([
      db.workspace.findUnique({ where: { slug: "default-demo-workspace" } }),
      db.lifecycleMappingPreset.count(),
      db.lifecycleImportLog.count(),
      db.campaignRun.count(),
      loadWorkspaceDatasetReadiness()
    ]);

    return { workspace, sourceConfigs, imports, lifecycleRuns, datasetReadiness, compatibilityMode: false };
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      return { workspace: null, sourceConfigs: 0, imports: 0, lifecycleRuns: 0, datasetReadiness: [], compatibilityMode: true };
    }
    throw error;
  }
}

export default async function DemoDashboardPage() {
  const summary = await loadToolsetSummary();
  const datasetSummary = summarizeDatasetReadiness(summary.datasetReadiness);
  const workspaceFlow = ["Connect source", "Validate dataset", "Run tool", "Review activity"];

  return (
    <>
      <DemoWorkspaceTabs />
      <Section eyebrow="Workspace" title="Workspace command center">
        <p>
          Start from the operating task: review datasets, connect a source, open a tool, or audit recent activity.
          The workspace is the shared data and configuration layer beneath every revenue tool.
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
          <div className="card workspaceCompactMetric"><p className="small">Imports</p><div className="kpi">{summary.imports.toLocaleString()}</div></div>
          <div className="card workspaceCompactMetric"><p className="small">Model runs</p><div className="kpi">{summary.lifecycleRuns.toLocaleString()}</div></div>
        </div>
        {summary.compatibilityMode ? (
          <p className="small">Run the latest Prisma migrations to enable workspace persistence.</p>
        ) : null}
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
        <div className="ctaRow">
          <Link className="btn primary" href="/workspace/datasets">Review datasets</Link>
          <Link className="btn" href="/workspace/connections">Connect data</Link>
        </div>
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
