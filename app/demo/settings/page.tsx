import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { DemoWorkspaceTabs } from "@/components/demo-shell/DemoWorkspaceTabs";
import { Section } from "@/components/site/Section";
import { ACCOUNT_SESSION_COOKIE, getAccountSessionUser } from "@/lib/account-session";
import {
  acquisitionProviderDryRunAdapterAvailable,
  buildAcquisitionProviderWriteReadiness
} from "@/lib/acquisition-agent-generalization";
import { db } from "@/lib/db";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { isDemoMutationAllowed } from "@/lib/env-guard";
import { buildMetadata } from "@/lib/seo";
import { buildWorkspaceLaunchEvidenceSettings } from "@/lib/workspace-launch-evidence-settings";
import {
  normalizeWorkspaceLaunchConnectedSystems,
  WORKSPACE_LAUNCH_CONNECTED_SYSTEMS
} from "@/lib/workspace-launch-connected-systems";
import {
  normalizeWorkspaceLaunchOwners,
  WORKSPACE_LAUNCH_OWNER_ROLES
} from "@/lib/workspace-launch-owner-roster";
import { buildWorkspaceLaunchReadiness } from "@/lib/workspace-launch-readiness";
import { upsertWorkspaceLaunchReadinessRecord } from "@/lib/workspace-launch-readiness-records";
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

function loadAcquisitionProviderWriteReadiness() {
  return buildAcquisitionProviderWriteReadiness({
    providerDryRunAdapterAvailable: acquisitionProviderDryRunAdapterAvailable(),
    rollbackMetadataAvailable: Boolean(process.env.ACQUISITION_PROVIDER_ROLLBACK_METADATA_READY?.trim()),
    approvalPolicyConfigured: true,
    measurementConfigured: Boolean(process.env.ACQUISITION_PROVIDER_MEASUREMENT_READY?.trim()),
    protectedCampaignChecksEnabled: true,
    emergencyStopConfigured: true
  });
}

function evidenceStatusClass(status: "ready" | "needs_evidence" | "incomplete") {
  return status === "ready" ? "live" : "progress";
}

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
    const providerWriteReadiness = loadAcquisitionProviderWriteReadiness();
    const launchRecord = workspace
      ? await db.workspaceLaunchReadinessRecord.findFirst({
          where: {
            workspaceId: workspace.id,
            scopeKey: accountUserId ? `account:${accountUserId}` : "workspace"
          },
          select: { owners: true, connectedSystems: true }
        })
      : null;
    const owners = launchRecord?.owners ? normalizeWorkspaceLaunchOwners(launchRecord.owners) : undefined;
    const connectedSystems = launchRecord?.connectedSystems
      ? normalizeWorkspaceLaunchConnectedSystems(launchRecord.connectedSystems)
      : undefined;
    const launchReadiness = buildWorkspaceLaunchReadiness({
      customerName: workspace?.name ?? DEFAULT_WORKSPACE.name,
      workspaceId: workspace?.id ?? DEFAULT_WORKSPACE.slug,
      owners,
      connectedSystems,
      providerReadReady: true,
      providerWriteReady: providerWriteReadiness.readyForApprovedMutation,
      auditExportHref: "/api/workspace/agents/audit-export"
    });
    const launchEvidence = buildWorkspaceLaunchEvidenceSettings(launchReadiness);

    return { workspace, workspacePresets, compatibilityMode: false, launchEvidence };
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      return { workspace: null, workspacePresets: 0, compatibilityMode: true, launchEvidence: null };
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

async function saveWorkspaceIdentity(formData: FormData) {
  "use server";

  if (!isDemoMutationAllowed()) {
    redirect("/workspace/settings?error=mutations");
  }

  const name = normalizeWorkspaceName(formData.get("workspaceName"));
  await updateDefaultWorkspaceName(name);
  redirect("/workspace/settings?saved=identity");
}

async function saveLaunchOwnerRoster(formData: FormData) {
  "use server";

  if (!isDemoMutationAllowed()) {
    redirect("/workspace/settings?error=mutations");
  }

  const cookieStore = await cookies();
  const accountUser = await getAccountSessionUser(cookieStore.get(ACCOUNT_SESSION_COOKIE)?.value);
  const workspace = await db.workspace.findUnique({ where: { slug: DEFAULT_WORKSPACE.slug } });
  if (!workspace) {
    redirect("/workspace/settings?error=workspace");
  }

  const owners = normalizeWorkspaceLaunchOwners(WORKSPACE_LAUNCH_OWNER_ROLES.map(({ role }) => ({
    role,
    name: formData.get(`${role}:name`),
    email: formData.get(`${role}:email`),
    approved: formData.get(`${role}:approved`) === "on"
  })));

  await upsertWorkspaceLaunchReadinessRecord({
    customerName: workspace.name,
    workspaceId: workspace.id,
    accountUserId: accountUser?.id ?? null,
    owners,
    providerReadReady: true,
    providerWriteReady: loadAcquisitionProviderWriteReadiness().readyForApprovedMutation,
    auditExportHref: "/api/workspace/agents/audit-export"
  });

  revalidatePath("/workspace/settings");
  revalidatePath("/demo/settings");
  revalidatePath("/workspace/agents");
  revalidatePath("/demo/agents");
  redirect("/workspace/settings?saved=launch-owners");
}

async function saveLaunchConnectedSystems(formData: FormData) {
  "use server";

  if (!isDemoMutationAllowed()) {
    redirect("/workspace/settings?error=mutations");
  }

  const cookieStore = await cookies();
  const accountUser = await getAccountSessionUser(cookieStore.get(ACCOUNT_SESSION_COOKIE)?.value);
  const workspace = await db.workspace.findUnique({ where: { slug: DEFAULT_WORKSPACE.slug } });
  if (!workspace) {
    redirect("/workspace/settings?error=workspace");
  }

  const connectedSystems = normalizeWorkspaceLaunchConnectedSystems(WORKSPACE_LAUNCH_CONNECTED_SYSTEMS.map((system) => {
    const key = system.provider || system.name;
    return {
      ...system,
      accountId: formData.get(`${key}:accountId`),
      credentialGrantId: formData.get(`${key}:credentialGrantId`),
      readReady: formData.get(`${key}:readReady`) === "on",
      writeReady: formData.get(`${key}:writeReady`) === "on"
    };
  }));

  await upsertWorkspaceLaunchReadinessRecord({
    customerName: workspace.name,
    workspaceId: workspace.id,
    accountUserId: accountUser?.id ?? null,
    connectedSystems,
    auditExportHref: "/api/workspace/agents/audit-export"
  });

  revalidatePath("/workspace/settings");
  revalidatePath("/demo/settings");
  revalidatePath("/workspace/agents");
  revalidatePath("/demo/agents");
  redirect("/workspace/settings?saved=launch-systems");
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
          Settings control workspace identity. Connections handle source setup; datasets show imported snapshots and tool readiness.
        </p>
      </Section>

      <Section title="Workspace identity">
        {params?.saved === "identity" ? (
          <p className="small bandText--healthy">Workspace identity saved.</p>
        ) : null}
        {params?.saved === "launch-owners" ? (
          <p className="small bandText--healthy">Launch owner roster saved.</p>
        ) : null}
        {params?.saved === "launch-systems" ? (
          <p className="small bandText--healthy">Connected-system evidence saved.</p>
        ) : null}
        {params?.error === "mutations" ? (
          <p className="small bandText--unhealthy">Workspace editing is disabled in this environment.</p>
        ) : null}
        {params?.error === "workspace" ? (
          <p className="small bandText--unhealthy">Workspace settings are not available yet.</p>
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

      {settings.launchEvidence ? (
        <Section title="Launch evidence settings">
          <div className="activitySummaryGrid">
            <div className="activitySummaryCard">
              <p className="small">Evidence status</p>
              <strong>{settings.launchEvidence.status === "ready" ? "Ready" : "Incomplete"}</strong>
              <span className={`statusPill ${evidenceStatusClass(settings.launchEvidence.status)}`}>
                {settings.launchEvidence.status === "ready" ? "ready" : "needs evidence"}
              </span>
            </div>
            <div className="activitySummaryCard">
              <p className="small">Reviewers</p>
              <strong>
                {settings.launchEvidence.approvedReviewerCount.toLocaleString()} / {settings.launchEvidence.reviewerCount.toLocaleString()}
              </strong>
              <span>Approved launch owners.</span>
            </div>
            <div className="activitySummaryCard">
              <p className="small">Systems</p>
              <strong>
                {settings.launchEvidence.readReadySystemsCount.toLocaleString()} read / {settings.launchEvidence.writeReadySystemsCount.toLocaleString()} write
              </strong>
              <span>{settings.launchEvidence.connectedSystemsCount.toLocaleString()} connected systems tracked.</span>
            </div>
            <div className="activitySummaryCard">
              <p className="small">Exports</p>
              <strong>{settings.launchEvidence.evidenceExportsCount.toLocaleString()}</strong>
              <span>Launch packet and audit evidence links.</span>
            </div>
          </div>
          <div className="workspaceInventoryStrip">
            {settings.launchEvidence.editableSections.map((section) => (
              <div className="workspaceInventoryItem" key={section.key}>
                <p className="small">{section.label}</p>
                <span className={`statusPill ${evidenceStatusClass(section.status)}`}>
                  {section.status === "ready" ? "ready" : "needs evidence"}
                </span>
                <span>{section.detail}</span>
                <Link className="btn smallBtn" href={section.href}>Open</Link>
              </div>
            ))}
          </div>
          <div className="card sourceMetadataDisclosure">
            <p className="small">Reviewer roster</p>
            <form action={saveLaunchOwnerRoster} className="demoLoginForm">
              {WORKSPACE_LAUNCH_OWNER_ROLES.map(({ role, label }) => {
                const owner = settings.launchEvidence?.owners.find((item) => item.role === role);
                return (
                  <div className="workspaceSettingsPanel" key={role}>
                    <label>
                      <span>{label}</span>
                      <input
                        name={`${role}:name`}
                        type="text"
                        defaultValue={owner?.name ?? label}
                        maxLength={120}
                        required
                      />
                    </label>
                    <label>
                      <span>Email</span>
                      <input
                        name={`${role}:email`}
                        type="email"
                        defaultValue={owner?.email ?? ""}
                        maxLength={160}
                        placeholder="owner@example.com"
                      />
                    </label>
                    <label className="workspaceInlineControl">
                      <input
                        name={`${role}:approved`}
                        type="checkbox"
                        defaultChecked={owner?.approved === true}
                      />
                      <span>Approved</span>
                    </label>
                  </div>
                );
              })}
              <button className="btn primary" type="submit">Save reviewer roster</button>
            </form>
          </div>
          <div className="card sourceMetadataDisclosure">
            <p className="small">Connected-system evidence</p>
            <form action={saveLaunchConnectedSystems} className="demoLoginForm">
              {settings.launchEvidence.connectedSystems.map((system) => {
                const key = system.provider || system.name;
                return (
                  <div className="workspaceSettingsPanel" key={key}>
                    <label>
                      <span>{system.name}</span>
                      <input
                        name={`${key}:accountId`}
                        type="text"
                        defaultValue={system.accountId ?? ""}
                        maxLength={120}
                        placeholder="Account or source id"
                      />
                    </label>
                    <label>
                      <span>Credential evidence</span>
                      <input
                        name={`${key}:credentialGrantId`}
                        type="text"
                        defaultValue={system.credentialGrantId ?? ""}
                        maxLength={160}
                        placeholder="Credential grant id"
                      />
                    </label>
                    <div className="workspaceInlineStack">
                      <label className="workspaceInlineControl">
                        <input
                          name={`${key}:readReady`}
                          type="checkbox"
                          defaultChecked={system.readReady === true}
                        />
                        <span>Read ready</span>
                      </label>
                      <label className="workspaceInlineControl">
                        <input
                          name={`${key}:writeReady`}
                          type="checkbox"
                          defaultChecked={system.writeReady === true}
                        />
                        <span>Write ready</span>
                      </label>
                    </div>
                  </div>
                );
              })}
              <button className="btn primary" type="submit">Save connected systems</button>
            </form>
          </div>
          <p className="small">Next action: {settings.launchEvidence.nextRequiredAction}</p>
        </Section>
      ) : null}

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
