import Link from "next/link";
import { DemoAppLaunchCard, type DemoAppLaunchTarget } from "@/components/site/DemoAppLaunchCard";
import { DemoWorkspaceQuickActions } from "@/components/demo-shell/DemoWorkspaceQuickActions";
import { DemoWorkspaceTabs } from "@/components/demo-shell/DemoWorkspaceTabs";
import { Section } from "@/components/site/Section";
import { db } from "@/lib/db";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";

export const dynamic = "force-dynamic";

const apps: Array<{ app: DemoAppLaunchTarget; href: string; status: string }> = [
  { app: "lifecycle", href: "/lifecycle/workspace", status: "Workspace-enabled" },
  { app: "acquisition", href: "/acquisition/overview", status: "Demo app" },
  { app: "pricing", href: "/pricing/overview", status: "Demo app" },
  { app: "retention", href: "/retention/overview", status: "Demo app" },
  { app: "expansion", href: "/expansion/overview", status: "Demo app" },
  { app: "auction", href: "/auction/overview", status: "Demo app" }
];

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
    readiness: "Demo tool",
    data: "Editable variants, segments, experiments, guardrails",
    workflow: "/pricing/inputs",
    simulate: "/pricing/simulations",
    docs: "/pricing/docs"
  },
  {
    name: "Retention Command Center",
    readiness: "Demo tool",
    data: "Editable accounts, playbooks, interventions, policy settings",
    workflow: "/retention/accounts",
    simulate: "/retention/simulations",
    docs: "/retention/docs"
  },
  {
    name: "Expansion Command Center",
    readiness: "Demo tool",
    data: "Editable accounts, offers, expansion policy settings",
    workflow: "/expansion/accounts",
    simulate: "/expansion/simulations",
    docs: "/expansion/docs"
  },
  {
    name: "Auction Desk",
    readiness: "Demo tool",
    data: "Editable advertisers, slots, bids, reserve settings",
    workflow: "/auction/inputs",
    simulate: "/auction/simulations",
    docs: "/auction/docs"
  }
];

const workspaceModules = [
  {
    href: "/demo/activity",
    label: "Activity",
    title: "Workspace operating history",
    detail: "Recent imports, model runs, connector events, and app audit logs in one shared feed."
  },
  {
    href: "/demo/connections",
    label: "Connections",
    title: "Bring your own data",
    detail: "CSV, spreadsheet, OAuth, and planned live datasource paths into the toolset."
  },
  {
    href: "/demo/datasets",
    label: "Datasets",
    title: "Reusable data assets",
    detail: "Saved mappings, imported datasets, and recent model runs attached to the workspace."
  },
  {
    href: "/demo/settings",
    label: "Settings",
    title: "Account and workspace layer",
    detail: "Workspace identity, persistence state, and the next account-management surface."
  }
];

async function loadToolsetSummary() {
  try {
    const [workspace, presets, imports, lifecycleRuns] = await Promise.all([
      db.workspace.findUnique({ where: { slug: "default-demo-workspace" } }),
      db.lifecycleMappingPreset.count({ where: { app: "lifecycle", sourceType: "csv" } }),
      db.lifecycleImportLog.count(),
      db.campaignRun.count()
    ]);

    return { workspace, presets, imports, lifecycleRuns, compatibilityMode: false };
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      return { workspace: null, presets: 0, imports: 0, lifecycleRuns: 0, compatibilityMode: true };
    }
    throw error;
  }
}

export default async function DemoDashboardPage() {
  const summary = await loadToolsetSummary();

  return (
    <>
      <DemoWorkspaceTabs />
      <DemoWorkspaceQuickActions />
      <Section eyebrow="Toolset" title="Revenue systems workspace">
        <p>
          This dashboard is the early account surface for the demo apps: one place to launch tools, inspect saved
          configuration, and move from demo workflows toward reusable operating systems.
        </p>
        <div className="ctaRow">
          <Link className="btn primary" href="/lifecycle/workspace">Open lifecycle workspace</Link>
          <Link className="btn" href="/demo/activity">Activity</Link>
          <Link className="btn" href="/demo/connections">Connect data</Link>
          <Link className="btn" href="/demo/datasets">Datasets</Link>
          <Link className="btn" href="/demo/settings">Workspace settings</Link>
          <Link className="btn" href="/lifecycle/connections/csv">Import lifecycle data</Link>
        </div>
      </Section>

      <Section title="Workspace status">
        <div className="grid grid-4">
          <div className="card"><p className="small">Workspace</p><div className="kpi">{summary.workspace ? "Active" : "Setup"}</div></div>
          <div className="card"><p className="small">Mapping presets</p><div className="kpi">{summary.presets.toLocaleString()}</div></div>
          <div className="card"><p className="small">Lifecycle imports</p><div className="kpi">{summary.imports.toLocaleString()}</div></div>
          <div className="card"><p className="small">Lifecycle runs</p><div className="kpi">{summary.lifecycleRuns.toLocaleString()}</div></div>
        </div>
        {summary.compatibilityMode ? (
          <p className="small">Run the latest Prisma migrations to enable workspace persistence.</p>
        ) : null}
      </Section>

      <Section title="Workspace modules">
        <div className="grid grid-4">
          {workspaceModules.map((module) => (
            <Link className="workspaceModuleCard" href={module.href} key={module.href}>
              <p className="editorKicker">{module.label}</p>
              <h3>{module.title}</h3>
              <p>{module.detail}</p>
              <span>Open {module.label.toLowerCase()}</span>
            </Link>
          ))}
        </div>
      </Section>

      <Section title="Tool readiness">
        <div className="toolReadinessList">
          {toolReadiness.map((tool) => (
            <div className="toolReadinessRow" key={tool.name}>
              <div>
                <p className={`statusPill ${tool.readiness === "Demo tool" ? "progress" : "live"}`}>{tool.readiness}</p>
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

      <Section title="Tool launcher">
        <div className="grid grid-3">
          {apps.map((item) => (
            <div className="demoToolCard" key={item.app}>
              <p className={`statusPill ${item.status === "Workspace-enabled" ? "live" : "progress"}`}>{item.status}</p>
              <DemoAppLaunchCard app={item.app} href={item.href} />
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
