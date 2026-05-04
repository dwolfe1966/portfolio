import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { DemoWorkspaceQuickActions } from "@/components/demo-shell/DemoWorkspaceQuickActions";
import { DemoWorkspaceTabs } from "@/components/demo-shell/DemoWorkspaceTabs";
import { Section } from "@/components/site/Section";
import { db } from "@/lib/db";
import {
  DEMO_ACCESS_COOKIE,
  isDemoAccessConfigured,
  isValidDemoAccessToken
} from "@/lib/demo-access";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";

export const dynamic = "force-dynamic";

async function loadWorkspaceSettings() {
  try {
    const workspace = await db.workspace.findUnique({
      where: { slug: "default-demo-workspace" },
      include: {
        mappingPresets: {
          orderBy: [{ app: "asc" }, { updatedAt: "desc" }]
        }
      }
    });
    const [imports, lifecycleRuns] = await Promise.all([
      db.lifecycleImportLog.count(),
      db.campaignRun.count()
    ]);

    return { workspace, imports, lifecycleRuns, compatibilityMode: false };
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      return { workspace: null, imports: 0, lifecycleRuns: 0, compatibilityMode: true };
    }
    throw error;
  }
}

function formatDate(value: Date | null | undefined) {
  if (!value) return "Not created";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(value);
}

async function leaveDemoWorkspace() {
  "use server";

  const cookieStore = await cookies();
  cookieStore.delete(DEMO_ACCESS_COOKIE);
  redirect("/demo/login");
}

export default async function DemoSettingsPage() {
  const settings = await loadWorkspaceSettings();
  const presets = settings.workspace?.mappingPresets ?? [];
  const uniqueApps = new Set(presets.map((preset) => preset.app));
  const cookieStore = await cookies();
  const accessConfigured = isDemoAccessConfigured();
  const hasValidSession = await isValidDemoAccessToken(cookieStore.get(DEMO_ACCESS_COOKIE)?.value);

  return (
    <>
      <DemoWorkspaceTabs />
      <DemoWorkspaceQuickActions />
      <Section eyebrow="Account" title="Workspace settings">
        <p>
          This is the first shared settings surface for Wolfe Apps: workspace identity, saved configuration,
          connector state, and the account capabilities that will later sit behind login.
        </p>
        <div className="ctaRow">
          <Link className="btn primary" href="/demo/dashboard">Back to tools dashboard</Link>
          <Link className="btn" href="/lifecycle/connections/csv">Manage lifecycle CSV mapping</Link>
        </div>
      </Section>

      <Section title="Workspace identity">
        <div className="grid grid-4">
          <div className="card">
            <p className="small">Workspace</p>
            <div className="workspaceSettingValue">{settings.workspace?.name ?? "Default Demo Workspace"}</div>
          </div>
          <div className="card">
            <p className="small">Slug</p>
            <div className="workspaceSettingValue">{settings.workspace?.slug ?? "default-demo-workspace"}</div>
          </div>
          <div className="card">
            <p className="small">Created</p>
            <div className="workspaceSettingValue">{formatDate(settings.workspace?.createdAt)}</div>
          </div>
          <div className="card">
            <p className="small">Last updated</p>
            <div className="workspaceSettingValue">{formatDate(settings.workspace?.updatedAt)}</div>
          </div>
        </div>
        {settings.compatibilityMode ? (
          <p className="small">Run the latest Prisma migrations to enable saved workspace settings.</p>
        ) : null}
      </Section>

      <Section title="Access and session">
        <div className="grid grid-3">
          <div className="card">
            <p className="small">Access mode</p>
            <div className="workspaceSettingValue">{accessConfigured ? "Protected" : "Open"}</div>
            <p>{accessConfigured ? "A shared Wolfe Apps password is configured." : "No shared password is configured for this environment."}</p>
          </div>
          <div className="card">
            <p className="small">Current session</p>
            <div className="workspaceSettingValue">{accessConfigured ? (hasValidSession ? "Active" : "Not signed in") : "Not required"}</div>
            <p>{accessConfigured ? "Access is stored in an HTTP-only browser cookie." : "Workspace routes do not require a demo session."}</p>
          </div>
          <div className="card accessSessionCard">
            <p className="small">Session controls</p>
            <form action={leaveDemoWorkspace}>
              <button className="btn" type="submit">Leave workspace</button>
            </form>
            <Link className="btn smallBtn" href="/demo/login">Open login page</Link>
          </div>
        </div>
      </Section>

      <Section title="Saved configuration">
        <div className="grid grid-3">
          <div className="card">
            <p className="small">Mapping presets</p>
            <div className="kpi">{presets.length.toLocaleString()}</div>
            <p>Reusable field maps saved from data import flows.</p>
          </div>
          <div className="card">
            <p className="small">Configured apps</p>
            <div className="kpi">{uniqueApps.size.toLocaleString()}</div>
            <p>Apps with at least one workspace-scoped saved configuration.</p>
          </div>
          <div className="card">
            <p className="small">Lifecycle activity</p>
            <div className="kpi">{(settings.imports + settings.lifecycleRuns).toLocaleString()}</div>
            <p>Imports and campaign runs attached to the current demo data layer.</p>
          </div>
        </div>
      </Section>

      <Section title="Account readiness">
        <div className="grid grid-2">
          <div className="card">
            <p className="editorKicker">Implemented</p>
            <ul>
              <li>Default workspace record for shared tool configuration.</li>
              <li>Server-side lifecycle CSV mapping presets.</li>
              <li>Recent import and model-run activity counts.</li>
            </ul>
          </div>
          <div className="card">
            <p className="editorKicker">Next account layer</p>
            <ul>
              <li>User login and workspace membership.</li>
              <li>Per-tool saved presets beyond lifecycle CSV mappings.</li>
              <li>Connector credentials scoped to a workspace and user.</li>
            </ul>
          </div>
        </div>
      </Section>
    </>
  );
}
