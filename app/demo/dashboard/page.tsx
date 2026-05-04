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
    data: "CSV import, mapping presets, editable lifecycle data",
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
    const [workspace, presets, workspacePresets, imports, lifecycleRuns, datasetReadiness] = await Promise.all([
      db.workspace.findUnique({ where: { slug: "default-demo-workspace" } }),
      db.lifecycleMappingPreset.count({ where: { app: "lifecycle", sourceType: "csv" } }),
      db.workspacePreset.count(),
      db.lifecycleImportLog.count(),
      db.campaignRun.count(),
      loadWorkspaceDatasetReadiness()
    ]);

    return { workspace, presets, workspacePresets, imports, lifecycleRuns, datasetReadiness, compatibilityMode: false };
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      return { workspace: null, presets: 0, workspacePresets: 0, imports: 0, lifecycleRuns: 0, datasetReadiness: [], compatibilityMode: true };
    }
    throw error;
  }
}

export default async function DemoDashboardPage() {
  const summary = await loadToolsetSummary();
  const datasetSummary = summarizeDatasetReadiness(summary.datasetReadiness);

  return (
    <>
      <DemoWorkspaceTabs />
      <Section eyebrow="Tools" title="Revenue systems workspace">
        <p>
          This dashboard is the early account surface for Tools: one place to launch tools, inspect saved
          configuration, and move from tool workflows toward reusable operating systems.
        </p>
      </Section>

      <Section title="Workspace status">
        <div className="grid grid-4">
          <div className="card"><p className="small">Workspace</p><div className="kpi">{summary.workspace ? "Active" : "Setup"}</div></div>
          <div className="card"><p className="small">Mapping presets</p><div className="kpi">{summary.presets.toLocaleString()}</div></div>
          <div className="card"><p className="small">Tool presets</p><div className="kpi">{summary.workspacePresets.toLocaleString()}</div></div>
          <div className="card"><p className="small">Imported-data tools</p><div className="kpi">{datasetSummary.imported.toLocaleString()}</div></div>
        </div>
        {summary.compatibilityMode ? (
          <p className="small">Run the latest Prisma migrations to enable workspace persistence.</p>
        ) : null}
      </Section>

      <Section title="Imported data readiness">
        <div className="grid grid-4">
          <div className="card"><p className="small">Available</p><div className="kpi">{datasetSummary.available}</div><p>Tools with required objects present.</p></div>
          <div className="card"><p className="small">Partial</p><div className="kpi">{datasetSummary.partial}</div><p>Tools with some required data but gaps.</p></div>
          <div className="card"><p className="small">Missing</p><div className="kpi">{datasetSummary.missing}</div><p>Tools without usable data objects yet.</p></div>
          <div className="card"><p className="small">Imported</p><div className="kpi">{datasetSummary.imported}</div><p>Tools with an import or connector path used.</p></div>
        </div>
        <div className="ctaRow">
          <Link className="btn primary" href="/workspace/datasets">Review datasets</Link>
          <Link className="btn" href="/workspace/connections">Connect data</Link>
        </div>
      </Section>

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
                <Link className="btn smallBtn primary" href={tool.workflow}>Open</Link>
                <Link className="btn smallBtn" href={tool.simulate}>Simulate</Link>
                <Link className="btn smallBtn" href={tool.docs}>Docs</Link>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
