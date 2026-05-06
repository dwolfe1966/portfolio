import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { DemoWorkspaceTabs } from "@/components/demo-shell/DemoWorkspaceTabs";
import { Section } from "@/components/site/Section";
import { ACCOUNT_SESSION_COOKIE, getAccountSessionUser } from "@/lib/account-session";
import { db } from "@/lib/db";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { isDemoMutationAllowed } from "@/lib/env-guard";
import { buildMetadata } from "@/lib/seo";
import {
  DEFAULT_WORKSPACE,
  getDefaultWorkspace,
  normalizeWorkspaceName,
  updateDefaultWorkspaceName
} from "@/lib/workspace";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  title: "Tools Settings | David Wolfe",
  description: "Workspace identity, access, session, and saved configuration settings for Tools.",
  path: "/workspace/settings"
});

async function loadWorkspaceSettings(accountUserId: string | null) {
  try {
    await getDefaultWorkspace();
    const workspace = await db.workspace.findUnique({
      where: { slug: DEFAULT_WORKSPACE.slug },
      include: {
        mappingPresets: {
          where: { accountUserId },
          orderBy: [{ app: "asc" }, { updatedAt: "desc" }]
        }
      }
    });
    const workspacePresets = await db.workspacePreset.count({ where: { accountUserId } });

    return { workspace, workspacePresets, compatibilityMode: false };
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      return { workspace: null, workspacePresets: 0, compatibilityMode: true };
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
  cookieStore.delete(ACCOUNT_SESSION_COOKIE);
  redirect("/workspace/login");
}

async function saveWorkspaceIdentity(formData: FormData) {
  "use server";

  if (!isDemoMutationAllowed()) {
    redirect("/workspace/settings?error=mutations");
  }

  const name = normalizeWorkspaceName(formData.get("workspaceName"));
  await updateDefaultWorkspaceName(name);
  redirect("/workspace/settings?saved=identity");
}

type SettingsSearchParams = {
  saved?: string;
  error?: string;
};

export default async function DemoSettingsPage({
  searchParams
}: {
  searchParams?: Promise<SettingsSearchParams>;
}) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const accountUser = await getAccountSessionUser(cookieStore.get(ACCOUNT_SESSION_COOKIE)?.value);
  const settings = await loadWorkspaceSettings(accountUser?.id ?? null);
  const sourceConfigs = settings.workspace?.mappingPresets ?? [];
  const uniqueApps = new Set(sourceConfigs.map((config) => config.app));

  return (
    <>
      <DemoWorkspaceTabs />
      <Section eyebrow="Account" title="Workspace settings">
        <p>
          Settings control workspace identity and session state. Connections handle source setup; datasets show imported
          snapshots and tool readiness.
        </p>
      </Section>

      <Section title="Workspace identity">
        {params?.saved === "identity" ? (
          <p className="small bandText--healthy">Workspace identity saved.</p>
        ) : null}
        {params?.error === "mutations" ? (
          <p className="small bandText--unhealthy">Workspace editing is disabled in this environment.</p>
        ) : null}
        <div className="workspaceSettingsPanel">
          <div className="card workspaceSettingsFormCard">
            <p className="small">Editable identity</p>
            <form action={saveWorkspaceIdentity} className="demoLoginForm">
              <label>
                <span>Workspace name</span>
                <input
                  name="workspaceName"
                  type="text"
                  defaultValue={settings.workspace?.name ?? DEFAULT_WORKSPACE.name}
                  maxLength={80}
                  required
                />
              </label>
              <button className="btn primary" type="submit">Save workspace name</button>
            </form>
          </div>
          <div className="workspaceSettingsFacts">
            <div className="workspaceSettingsFact">
              <p className="small">Workspace</p>
              <strong>{settings.workspace?.name ?? "Default Workspace"}</strong>
            </div>
            <div className="workspaceSettingsFact">
              <p className="small">Slug</p>
              <strong>{settings.workspace?.slug ?? "default-demo-workspace"}</strong>
            </div>
            <div className="workspaceSettingsFact">
              <p className="small">Created</p>
              <strong>{formatDate(settings.workspace?.createdAt)}</strong>
            </div>
            <div className="workspaceSettingsFact">
              <p className="small">Last updated</p>
              <strong>{formatDate(settings.workspace?.updatedAt)}</strong>
            </div>
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
            <div className="workspaceSettingValue">Account based</div>
            <p>Workspace pages use account registration and login instead of a shared workspace password.</p>
          </div>
          <div className="card">
            <p className="small">Current session</p>
            <div className="workspaceSettingValue">{accountUser?.email ?? "Not signed in"}</div>
            <p>Account access is stored in an HTTP-only browser cookie. Tools remain public with sample data.</p>
          </div>
          <div className="card accessSessionCard">
            <p className="small">Session controls</p>
            <form action={leaveDemoWorkspace}>
              <button className="btn" type="submit">Sign out</button>
            </form>
            <Link className="btn smallBtn" href="/workspace/login">Open login page</Link>
          </div>
        </div>
      </Section>

      <Section title="Configuration inventory">
        <div className="workspaceInventoryStrip">
          <div className="workspaceInventoryItem">
            <p className="small">Source configs</p>
            <strong>{sourceConfigs.length.toLocaleString()}</strong>
            <span>Reusable CSV and Google Sheets mappings.</span>
            <Link className="btn smallBtn" href="/workspace/datasets">Review datasets</Link>
          </div>
          <div className="workspaceInventoryItem">
            <p className="small">Configured apps</p>
            <strong>{(uniqueApps.size + (settings.workspacePresets > 0 ? 1 : 0)).toLocaleString()}</strong>
            <span>Tools with saved workspace configuration.</span>
            <Link className="btn smallBtn" href="/workspace/connections">Review connections</Link>
          </div>
          <div className="workspaceInventoryItem">
            <p className="small">Tool presets</p>
            <strong>{settings.workspacePresets.toLocaleString()}</strong>
            <span>Scenario and configuration presets.</span>
          </div>
        </div>
      </Section>

      <Section title="Account readiness">
        <div className="card sourceMetadataDisclosure">
          <p>
            Account management is intentionally lightweight for now. The next layer is user identity, workspace membership,
            and per-workspace credentials.
          </p>
          <details>
            <summary>Implemented</summary>
            <ul>
              <li>Account profile and signed account session.</li>
              <li>Workspace membership linking account users to workspace ownership.</li>
              <li>Default workspace record for shared tool configuration.</li>
              <li>Workspace source configs for CSV and Google Sheets mappings.</li>
              <li>Recent import and model-run activity counts.</li>
            </ul>
          </details>
          <details>
            <summary>Next account layer</summary>
            <ul>
              <li>Attach imported dataset snapshots to account users and workspaces.</li>
              <li>Per-tool selected datasets and connector credentials scoped to each workspace.</li>
              <li>Workspace-level activity and billing boundaries.</li>
            </ul>
          </details>
        </div>
      </Section>
    </>
  );
}
