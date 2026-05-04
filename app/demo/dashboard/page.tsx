import Link from "next/link";
import { DemoAppLaunchCard, type DemoAppLaunchTarget } from "@/components/site/DemoAppLaunchCard";
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
