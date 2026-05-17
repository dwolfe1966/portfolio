import { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DemoWorkspaceTabs } from "@/components/demo-shell/DemoWorkspaceTabs";
import { Section } from "@/components/site/Section";
import {
  ACCOUNT_SESSION_COOKIE,
  getAccountSessionUser,
  updateAccountUserProfile
} from "@/lib/account-session";
import { db } from "@/lib/db";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { isDemoMutationAllowed } from "@/lib/env-guard";
import { buildMetadata } from "@/lib/seo";
import {
  buildWorkspaceInviteDraft,
  buildWorkspaceMembershipSummary,
  canManageWorkspaceInvites
} from "@/lib/workspace-membership-summary";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  title: "Workspace Account | David Wolfe",
  description: "Account profile and workspace membership for Tools.",
  path: "/workspace/account"
});

type AccountSearchParams = {
  saved?: string;
  error?: string;
  inviteEmail?: string;
  inviteRole?: string;
};

async function saveSignedInAccountProfile(formData: FormData) {
  "use server";

  if (!isDemoMutationAllowed()) redirect("/workspace/account?error=mutations");

  const cookieStore = await cookies();
  const accountUser = await getAccountSessionUser(cookieStore.get(ACCOUNT_SESSION_COOKIE)?.value);
  if (!accountUser) redirect("/workspace/account?error=session");
  await updateAccountUserProfile({
    userId: accountUser.id,
    name: String(formData.get("name") ?? ""),
    zipCode: String(formData.get("zipCode") ?? ""),
    company: String(formData.get("company") ?? ""),
    title: String(formData.get("title") ?? "")
  });
  redirect("/workspace/account?saved=profile");
}

async function createPendingWorkspaceInvite(formData: FormData) {
  "use server";

  const inviteEmail = String(formData.get("inviteEmail") ?? "");
  const inviteRole = String(formData.get("inviteRole") ?? "viewer");
  const redirectQuery = `inviteEmail=${encodeURIComponent(inviteEmail)}&inviteRole=${encodeURIComponent(inviteRole)}`;
  if (!isDemoMutationAllowed()) redirect(`/workspace/account?${redirectQuery}&error=mutations`);

  try {
    const cookieStore = await cookies();
    const accountUser = await getAccountSessionUser(cookieStore.get(ACCOUNT_SESSION_COOKIE)?.value);
    if (!accountUser) redirect(`/workspace/account?${redirectQuery}&error=session`);
    const workspaceId = accountUser.memberships[0]?.workspaceId;
    if (!workspaceId) redirect(`/workspace/account?${redirectQuery}&error=invite`);

    const workspaceMemberships = await db.workspaceMembership.findMany({
      where: { workspaceId },
      include: { accountUser: true, workspace: true },
      orderBy: [{ role: "asc" }, { updatedAt: "desc" }]
    });
    const pendingInvites = await db.workspaceInvite.findMany({
      where: { workspaceId, status: "pending" },
      include: { invitedByAccountUser: true },
      orderBy: { createdAt: "desc" }
    });
    const membershipSummary = buildWorkspaceMembershipSummary({
      memberships: workspaceMemberships,
      pendingInvites,
      currentUserId: accountUser.id
    });
    const inviteDraft = buildWorkspaceInviteDraft({
      readiness: membershipSummary.inviteReadiness,
      email: inviteEmail,
      role: inviteRole,
      workspaceName: membershipSummary.workspaceName,
      existingMemberEmails: membershipSummary.members.map((member) => member.email),
      existingPendingInviteEmails: membershipSummary.pendingInvites.map((invite) => invite.email)
    });

    if (!inviteDraft.canCreate || !membershipSummary.workspaceId) redirect(`/workspace/account?${redirectQuery}&error=invite`);

    await db.workspaceInvite.create({
      data: {
        workspaceId: membershipSummary.workspaceId,
        invitedByAccountUserId: accountUser.id,
        email: inviteDraft.email,
        role: inviteDraft.role,
        status: "pending",
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        draftPayload: {
          subject: inviteDraft.subject,
          roleLabel: inviteDraft.roleLabel,
          auditSummary: inviteDraft.auditSummary,
          source: "workspace_account_pending_invite"
        }
      }
    });
  } catch (error) {
    if (!isMissingDemoTableError(error)) throw error;
    redirect(`/workspace/account?${redirectQuery}&error=invite`);
  }

  redirect("/workspace/account?saved=invite");
}

async function cancelPendingWorkspaceInvite(formData: FormData) {
  "use server";

  const inviteId = String(formData.get("inviteId") ?? "");
  if (!isDemoMutationAllowed()) redirect("/workspace/account?error=mutations");
  if (!inviteId) redirect("/workspace/account?error=inviteCancel");

  try {
    const cookieStore = await cookies();
    const accountUser = await getAccountSessionUser(cookieStore.get(ACCOUNT_SESSION_COOKIE)?.value);
    if (!accountUser) redirect("/workspace/account?error=session");
    const workspaceId = accountUser.memberships[0]?.workspaceId;
    const role = accountUser.memberships.find((membership) => membership.workspaceId === workspaceId)?.role;
    if (!workspaceId || !canManageWorkspaceInvites(role)) redirect("/workspace/account?error=inviteCancel");

    const result = await db.workspaceInvite.updateMany({
      where: {
        id: inviteId,
        workspaceId,
        status: "pending"
      },
      data: {
        status: "canceled",
        draftPayload: {
          source: "workspace_account_invite_cancel",
          canceledByAccountUserId: accountUser.id,
          canceledByEmail: accountUser.email,
          canceledAt: new Date().toISOString()
        }
      }
    });
    if (result.count < 1) redirect("/workspace/account?error=inviteCancel");
  } catch (error) {
    if (!isMissingDemoTableError(error)) throw error;
    redirect("/workspace/account?error=inviteCancel");
  }

  redirect("/workspace/account?saved=inviteCanceled");
}

async function loadAccountPage() {
  try {
    const cookieStore = await cookies();
    const accountUser = await getAccountSessionUser(cookieStore.get(ACCOUNT_SESSION_COOKIE)?.value);
    const workspaceId = accountUser?.memberships[0]?.workspaceId;
    const workspaceMemberships = workspaceId
      ? await db.workspaceMembership.findMany({
          where: { workspaceId },
          include: { accountUser: true, workspace: true },
          orderBy: [{ role: "asc" }, { updatedAt: "desc" }]
        })
      : [];
    let pendingInvites: Awaited<ReturnType<typeof db.workspaceInvite.findMany>> = [];
    if (workspaceId) {
      try {
        pendingInvites = await db.workspaceInvite.findMany({
          where: { workspaceId, status: "pending" },
          include: { invitedByAccountUser: true },
          orderBy: { createdAt: "desc" }
        });
      } catch (error) {
        if (!isMissingDemoTableError(error)) throw error;
      }
    }
    return { accountUser, workspaceMemberships, pendingInvites, compatibilityMode: false };
  } catch (error) {
    if (isMissingDemoTableError(error)) return { accountUser: null, workspaceMemberships: [], pendingInvites: [], compatibilityMode: true };
    throw error;
  }
}

export default async function WorkspaceAccountPage({
  searchParams
}: {
  searchParams?: Promise<AccountSearchParams>;
}) {
  const params = await searchParams;
  const { accountUser, workspaceMemberships, pendingInvites, compatibilityMode } = await loadAccountPage();
  if (!compatibilityMode && !accountUser) redirect("/workspace/login?next=/workspace/account");
  const membershipSummary = buildWorkspaceMembershipSummary({
    memberships: workspaceMemberships,
    pendingInvites,
    currentUserId: accountUser?.id
  });
  const inviteRole = params?.inviteRole ?? "viewer";
  const inviteEmail = params?.inviteEmail ?? "";
  const inviteDraft = buildWorkspaceInviteDraft({
    readiness: membershipSummary.inviteReadiness,
    email: inviteEmail,
    role: inviteRole,
    workspaceName: membershipSummary.workspaceName,
    existingMemberEmails: membershipSummary.members.map((member) => member.email),
    existingPendingInviteEmails: membershipSummary.pendingInvites.map((invite) => invite.email)
  });
  return (
    <>
      <DemoWorkspaceTabs />
      <Section eyebrow="Account" title="Workspace account">
        <p>
          Manage the profile attached to your workspace data, source configs, selected datasets, and future connector credentials.
        </p>
      </Section>

      <Section title="Profile">
        {params?.saved === "profile" ? <p className="small bandText--healthy">Account profile saved.</p> : null}
        {params?.saved === "invite" ? <p className="small bandText--healthy">Pending workspace invite created.</p> : null}
        {params?.saved === "inviteCanceled" ? <p className="small bandText--healthy">Pending workspace invite canceled.</p> : null}
        {params?.error === "session" ? <p className="small bandText--unhealthy">Sign in before editing your account.</p> : null}
        {params?.error === "mutations" ? <p className="small bandText--unhealthy">Account editing is disabled in this environment.</p> : null}
        {params?.error === "invite" ? <p className="small bandText--unhealthy">Resolve invite blockers before creating a pending invitation.</p> : null}
        {params?.error === "inviteCancel" ? <p className="small bandText--unhealthy">Only owners and admins can cancel pending invitations.</p> : null}
        {compatibilityMode ? (
          <div className="card">
            <p>Account tables are not available yet. Run the latest Prisma migration to enable account ownership.</p>
          </div>
        ) : accountUser ? (
          <div className="workspaceAccountPanel workspaceAccountPanel--profileOnly">
            <div className="workspaceAccountStateCard workspaceAccountStateCard--profile">
              <div>
                <p className="small">Signed in</p>
                <strong>{accountUser.name}</strong>
                <span>{accountUser.email}</span>
              </div>
              <div className="workspaceAccountProfileFacts">
                <div>
                  <span className="small">Company</span>
                  <strong>{accountUser.company || "Not set"}</strong>
                </div>
                <div>
                  <span className="small">Title</span>
                  <strong>{accountUser.title || "Not set"}</strong>
                </div>
                <div>
                  <span className="small">Zipcode</span>
                  <strong>{accountUser.zipCode || "Not set"}</strong>
                </div>
                <div>
                  <span className="small">Workspace</span>
                  <strong>{membershipSummary.workspaceName}</strong>
                </div>
                <div>
                  <span className="small">Role</span>
                  <strong>{membershipSummary.currentUserRoleLabel}</strong>
                </div>
                <div>
                  <span className="small">Members</span>
                  <strong>{membershipSummary.memberCount}</strong>
                </div>
                <div>
                  <span className="small">Governance</span>
                  <strong>{membershipSummary.governanceLabel}</strong>
                </div>
              </div>
              <div className="workspaceAccountActions">
                <a className="btn smallBtn" href="#edit-account">Edit</a>
              </div>
            </div>
            <div className="card workspaceAccountFormCard" id="edit-account">
              <p className="small">Edit profile</p>
              <form action={saveSignedInAccountProfile} className="demoLoginForm">
                <label>
                  <span>Name</span>
                  <input name="name" type="text" defaultValue={accountUser.name} maxLength={80} placeholder="Workspace user" />
                </label>
                <label>
                  <span>Company</span>
                  <input name="company" type="text" defaultValue={accountUser.company ?? ""} maxLength={120} placeholder="Company" />
                </label>
                <label>
                  <span>Title</span>
                  <input name="title" type="text" defaultValue={accountUser.title ?? ""} maxLength={120} placeholder="Title" />
                </label>
                <label>
                  <span>Zipcode</span>
                  <input name="zipCode" type="text" inputMode="numeric" defaultValue={accountUser.zipCode ?? ""} maxLength={20} placeholder="Zipcode" />
                </label>
                <button className="btn primary" type="submit">Save profile</button>
              </form>
            </div>
          </div>
        ) : null}
      </Section>
      {!compatibilityMode && accountUser ? (
        <Section title="Workspace members">
          <div className="workspaceMembershipHeader">
            <div>
              <p className="small">Current workspace</p>
              <strong>{membershipSummary.workspaceName}</strong>
            </div>
            <div className="workspaceMembershipStats" aria-label="Workspace membership summary">
              <span>{membershipSummary.memberCount} members</span>
              <span>{membershipSummary.ownerCount} owners</span>
              <span>{membershipSummary.adminCount} admins</span>
              <span>{membershipSummary.viewerCount} viewers</span>
            </div>
          </div>
          {membershipSummary.members.length ? (
            <div className="workspaceMembershipList">
              {membershipSummary.members.map((member) => (
                <article className="card workspaceMembershipCard" key={member.id}>
                  <div>
                    <p className="small">{member.statusLabel}</p>
                    <strong>{member.name}</strong>
                    <span>{member.email}</span>
                  </div>
                  <div className="workspaceMembershipFacts">
                    <span>{member.roleLabel}</span>
                    <span>{member.company}</span>
                    <span>{member.title}</span>
                    <span>Joined {member.joinedAtLabel}</span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="card">
              <p>No workspace members are attached to this account yet.</p>
            </div>
          )}
        </Section>
      ) : null}
      {!compatibilityMode && accountUser ? (
        <Section title="Role capabilities">
          <div className="workspaceRolePolicyGrid">
            {membershipSummary.rolePolicies.map((policy) => (
              <article className="card workspaceRolePolicyCard" key={policy.role}>
                <div className="workspaceRolePolicyHeader">
                  <div>
                    <p className="small">{policy.accessLevel.replace(/_/g, " ")}</p>
                    <strong>{policy.roleLabel}</strong>
                  </div>
                  <span>{policy.capabilityCount} capabilities</span>
                </div>
                <div className="workspaceRoleCapabilityList">
                  {policy.capabilities.map((capability) => (
                    <div className="workspaceRoleCapability" key={capability.key}>
                      <strong>{capability.label}</strong>
                      <span>{capability.description}</span>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </Section>
      ) : null}
      {!compatibilityMode && accountUser ? (
        <Section title="Invite readiness">
          <div className={`workspaceInviteReadiness workspaceInviteReadiness--${membershipSummary.inviteReadiness.status}`}>
            <div>
              <p className="small">Invitation gate</p>
              <strong>{membershipSummary.inviteReadiness.statusLabel}</strong>
              <span>Current role: {membershipSummary.inviteReadiness.actorRoleLabel}</span>
            </div>
            <div>
              <p className="small">Next action</p>
              <strong>{membershipSummary.inviteReadiness.nextAction}</strong>
            </div>
          </div>
          {membershipSummary.inviteReadiness.blockers.length || membershipSummary.inviteReadiness.warnings.length ? (
            <div className="workspaceInviteReadinessGrid">
              {membershipSummary.inviteReadiness.blockers.map((blocker) => (
                <div className="card workspaceInviteReadinessItem workspaceInviteReadinessItem--blocked" key={blocker}>
                  <p className="small">Blocked</p>
                  <strong>{blocker}</strong>
                </div>
              ))}
              {membershipSummary.inviteReadiness.warnings.map((warning) => (
                <div className="card workspaceInviteReadinessItem workspaceInviteReadinessItem--review" key={warning}>
                  <p className="small">Review</p>
                  <strong>{warning}</strong>
                </div>
              ))}
            </div>
          ) : null}
          <div className="card workspaceInviteDraftCard">
            <div>
              <p className="small">Draft invite preview</p>
              <strong>{inviteDraft.statusLabel}</strong>
              <span>{inviteDraft.auditSummary}</span>
            </div>
            <form action="/workspace/account" className="demoLoginForm workspaceInviteDraftForm" method="get">
              <label>
                <span>Email</span>
                <input name="inviteEmail" type="email" defaultValue={inviteEmail} maxLength={254} placeholder="collaborator@example.com" />
              </label>
              <label>
                <span>Role</span>
                <select name="inviteRole" defaultValue={inviteRole}>
                  <option value="viewer">Viewer</option>
                  <option value="operator">Operator</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
              <button className="btn smallBtn" type="submit">Preview invite</button>
            </form>
            {inviteDraft.canCreate ? (
              <form action={createPendingWorkspaceInvite} className="workspaceInviteCreateForm">
                <input name="inviteEmail" type="hidden" value={inviteDraft.email} />
                <input name="inviteRole" type="hidden" value={inviteDraft.role} />
                <button className="btn primary smallBtn" type="submit">Create pending invite</button>
              </form>
            ) : null}
          </div>
          {inviteEmail ? (
            <div className={`workspaceInviteDraftPreview workspaceInviteDraftPreview--${inviteDraft.status}`}>
              <div>
                <p className="small">Recipient</p>
                <strong>{inviteDraft.email || "Not set"}</strong>
              </div>
              <div>
                <p className="small">Role</p>
                <strong>{inviteDraft.roleLabel}</strong>
              </div>
              <div>
                <p className="small">Subject</p>
                <strong>{inviteDraft.subject}</strong>
              </div>
              <div>
                <p className="small">Next action</p>
                <strong>{inviteDraft.nextAction}</strong>
              </div>
            </div>
          ) : null}
          {inviteDraft.blockers.length || inviteDraft.warnings.length ? (
            <div className="workspaceInviteReadinessGrid">
              {inviteDraft.blockers.map((blocker) => (
                <div className="card workspaceInviteReadinessItem workspaceInviteReadinessItem--blocked" key={`draft-${blocker}`}>
                  <p className="small">Draft blocked</p>
                  <strong>{blocker}</strong>
                </div>
              ))}
              {inviteDraft.warnings.map((warning) => (
                <div className="card workspaceInviteReadinessItem workspaceInviteReadinessItem--review" key={`draft-${warning}`}>
                  <p className="small">Draft review</p>
                  <strong>{warning}</strong>
                </div>
              ))}
            </div>
          ) : null}
          <div className="workspacePendingInviteList">
            <div className="workspaceMembershipHeader">
              <div>
                <p className="small">Pending invitations</p>
                <strong>{membershipSummary.pendingInvites.length}</strong>
              </div>
            </div>
            {membershipSummary.pendingInvites.length ? (
              <div className="workspaceMembershipList">
                {membershipSummary.pendingInvites.map((invite) => (
                  <article className="card workspacePendingInviteCard" key={invite.id}>
                    <div>
                      <p className="small">{invite.isExpired ? "Expired" : invite.statusLabel}</p>
                      <strong>{invite.email}</strong>
                      <span>Invited by {invite.invitedByLabel}</span>
                    </div>
                    <div className="workspaceMembershipFacts">
                      <span>{invite.roleLabel}</span>
                      <span>Created {invite.createdAtLabel}</span>
                      <span>Expires {invite.expiresAtLabel}</span>
                      <a className="btn smallBtn" href={`/workspace/invite/${invite.id}`}>Preview</a>
                      {membershipSummary.currentUserCanManageInvites && !invite.isExpired ? (
                        <form action={cancelPendingWorkspaceInvite} className="workspaceInviteInlineForm">
                          <input name="inviteId" type="hidden" value={invite.id} />
                          <button className="btn smallBtn" type="submit">Cancel</button>
                        </form>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="card workspaceInviteReadinessItem">
                <p className="small">No pending invitations</p>
                <strong>Preview and create a pending invite when the invitation gate is ready.</strong>
              </div>
            )}
          </div>
        </Section>
      ) : null}
    </>
  );
}
