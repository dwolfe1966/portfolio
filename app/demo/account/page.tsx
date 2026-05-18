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
  recordWorkspaceMembershipAuditEvent,
  workspaceMembershipAuditDetail,
  workspaceMembershipAuditProvider,
  workspaceMembershipAuditTitle
} from "@/lib/workspace-membership-audit-events";
import { deliverWorkspaceInviteEmail } from "@/lib/workspace-invite-mailer";
import { createWorkspaceInviteToken, workspaceInviteTokenHash } from "@/lib/workspace-invite-tokens";
import {
  buildWorkspaceInviteMailDeliveryConfig,
  buildWorkspaceInviteDraft,
  buildWorkspaceMemberRemovalReadiness,
  buildWorkspaceMemberRoleChangeReadiness,
  buildWorkspaceMembershipSummary,
  canManageWorkspaceInvites,
  canManageWorkspaceMembers
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

type MembershipAuditItem = {
  id: string;
  title: string;
  detail: string;
  actor: string;
  occurredAtLabel: string;
};

function formatAuditDate(value: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(value);
}

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

    const inviteToken = createWorkspaceInviteToken();
    const tokenPreviewPath = `/workspace/invite/${inviteToken}`;
    await db.workspaceInvite.create({
      data: {
        workspaceId: membershipSummary.workspaceId,
        invitedByAccountUserId: accountUser.id,
        email: inviteDraft.email,
        role: inviteDraft.role,
        status: "pending",
        tokenHash: workspaceInviteTokenHash(inviteToken),
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        draftPayload: {
          subject: inviteDraft.subject,
          roleLabel: inviteDraft.roleLabel,
          auditSummary: inviteDraft.auditSummary,
          tokenPreviewPath,
          source: "workspace_account_pending_invite"
        }
      }
    });
    await recordWorkspaceMembershipAuditEvent({
      workspaceId: membershipSummary.workspaceId,
      accountUserId: accountUser.id,
      action: "invite_created",
      objectKey: inviteDraft.email,
      metadata: {
        recipientEmail: inviteDraft.email,
        role: inviteDraft.role,
        roleLabel: inviteDraft.roleLabel,
        actorEmail: accountUser.email
      }
    });
  } catch (error) {
    if (!isMissingDemoTableError(error)) throw error;
    redirect(`/workspace/account?${redirectQuery}&error=invite`);
  }

  redirect("/workspace/account?saved=invite");
}

function asDraftPayloadRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

async function sendPendingWorkspaceInvite(formData: FormData) {
  "use server";

  const inviteId = String(formData.get("inviteId") ?? "");
  if (!isDemoMutationAllowed()) redirect("/workspace/account?error=mutations");
  if (!inviteId) redirect("/workspace/account?error=inviteSend");

  try {
    const cookieStore = await cookies();
    const accountUser = await getAccountSessionUser(cookieStore.get(ACCOUNT_SESSION_COOKIE)?.value);
    if (!accountUser) redirect("/workspace/account?error=session");
    const workspaceId = accountUser.memberships[0]?.workspaceId;
    const role = accountUser.memberships.find((membership) => membership.workspaceId === workspaceId)?.role;
    if (!workspaceId || !canManageWorkspaceInvites(role)) redirect("/workspace/account?error=inviteSend");

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
    const mailDelivery = buildWorkspaceInviteMailDeliveryConfig();
    const membershipSummary = buildWorkspaceMembershipSummary({
      memberships: workspaceMemberships,
      pendingInvites,
      currentUserId: accountUser.id,
      inviteMailDelivery: mailDelivery
    });
    const inviteSummary = membershipSummary.pendingInvites.find((invite) => invite.id === inviteId);
    const inviteRecord = pendingInvites.find((invite) => invite.id === inviteId);
    if (!inviteSummary?.sendReadiness.canSend || !inviteRecord) redirect("/workspace/account?error=inviteSend");

    const sentAt = new Date().toISOString();
    const delivery = await deliverWorkspaceInviteEmail({
      config: mailDelivery,
      apiKey: process.env.RESEND_API_KEY,
      payload: {
        to: inviteSummary.email,
        workspaceName: membershipSummary.workspaceName,
        roleLabel: inviteSummary.roleLabel,
        invitedByLabel: inviteSummary.invitedByLabel,
        inviteUrl: `${mailDelivery.publicAppUrl}${inviteSummary.previewHref}`,
        expiresAtLabel: inviteSummary.expiresAtLabel
      }
    });
    if (!delivery.ok) redirect("/workspace/account?error=inviteSend");

    await db.workspaceInvite.update({
      where: { id: inviteId },
      data: {
        draftPayload: {
          ...asDraftPayloadRecord(inviteRecord.draftPayload),
          mailDelivery: {
            provider: mailDelivery.providerLabel,
            status: "sent",
            sentAt,
            sentByAccountUserId: accountUser.id,
            sentByEmail: accountUser.email,
            providerStatus: delivery.status
          }
        }
      }
    });
    await recordWorkspaceMembershipAuditEvent({
      workspaceId,
      accountUserId: accountUser.id,
      action: "invite_sent",
      objectKey: inviteSummary.email,
      metadata: {
        inviteId,
        recipientEmail: inviteSummary.email,
        role: inviteSummary.role,
        roleLabel: inviteSummary.roleLabel,
        actorEmail: accountUser.email,
        provider: mailDelivery.providerLabel,
        providerStatus: delivery.status
      }
    });
  } catch (error) {
    if (!isMissingDemoTableError(error)) throw error;
    redirect("/workspace/account?error=inviteSend");
  }

  redirect("/workspace/account?saved=inviteSent");
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
    await recordWorkspaceMembershipAuditEvent({
      workspaceId,
      accountUserId: accountUser.id,
      action: "invite_canceled",
      objectKey: inviteId,
      metadata: {
        inviteId,
        actorEmail: accountUser.email
      }
    });
  } catch (error) {
    if (!isMissingDemoTableError(error)) throw error;
    redirect("/workspace/account?error=inviteCancel");
  }

  redirect("/workspace/account?saved=inviteCanceled");
}

async function updateWorkspaceMemberRole(formData: FormData) {
  "use server";

  const membershipId = String(formData.get("membershipId") ?? "");
  const targetRole = String(formData.get("role") ?? "viewer").trim().toLowerCase();
  if (!isDemoMutationAllowed()) redirect("/workspace/account?error=mutations");
  if (!membershipId) redirect("/workspace/account?error=memberRole");

  try {
    const cookieStore = await cookies();
    const accountUser = await getAccountSessionUser(cookieStore.get(ACCOUNT_SESSION_COOKIE)?.value);
    if (!accountUser) redirect("/workspace/account?error=session");
    const workspaceId = accountUser.memberships[0]?.workspaceId;
    const actorRole = accountUser.memberships.find((membership) => membership.workspaceId === workspaceId)?.role;
    if (!workspaceId || !canManageWorkspaceMembers(actorRole)) redirect("/workspace/account?error=memberRole");

    const targetMembership = await db.workspaceMembership.findFirst({
      where: { id: membershipId, workspaceId },
      include: { accountUser: true }
    });
    if (!targetMembership) redirect("/workspace/account?error=memberRole");
    const ownerCount = await db.workspaceMembership.count({ where: { workspaceId, role: "owner" } });
    const roleChangeReadiness = buildWorkspaceMemberRoleChangeReadiness({
      actorRole,
      memberRole: targetMembership.role,
      targetRole,
      isSelf: targetMembership.accountUserId === accountUser.id,
      ownerCount
    });
    if (!roleChangeReadiness.canChange) redirect("/workspace/account?error=memberRole");

    await db.workspaceMembership.update({
      where: { id: targetMembership.id },
      data: { role: targetRole }
    });
    await recordWorkspaceMembershipAuditEvent({
      workspaceId,
      accountUserId: accountUser.id,
      action: "member_role_changed",
      objectKey: targetMembership.accountUser.email,
      metadata: {
        membershipId: targetMembership.id,
        memberEmail: targetMembership.accountUser.email,
        memberName: targetMembership.accountUser.name,
        fromRole: targetMembership.role,
        toRole: targetRole,
        actorEmail: accountUser.email
      }
    });
  } catch (error) {
    if (!isMissingDemoTableError(error)) throw error;
    redirect("/workspace/account?error=memberRole");
  }

  redirect("/workspace/account?saved=memberRole");
}

async function removeWorkspaceMember(formData: FormData) {
  "use server";

  const membershipId = String(formData.get("membershipId") ?? "");
  if (!isDemoMutationAllowed()) redirect("/workspace/account?error=mutations");
  if (!membershipId) redirect("/workspace/account?error=memberRemove");

  try {
    const cookieStore = await cookies();
    const accountUser = await getAccountSessionUser(cookieStore.get(ACCOUNT_SESSION_COOKIE)?.value);
    if (!accountUser) redirect("/workspace/account?error=session");
    const workspaceId = accountUser.memberships[0]?.workspaceId;
    const actorRole = accountUser.memberships.find((membership) => membership.workspaceId === workspaceId)?.role;
    if (!workspaceId || !canManageWorkspaceMembers(actorRole)) redirect("/workspace/account?error=memberRemove");

    const targetMembership = await db.workspaceMembership.findFirst({
      where: { id: membershipId, workspaceId },
      include: { accountUser: true }
    });
    if (!targetMembership) redirect("/workspace/account?error=memberRemove");
    const ownerCount = await db.workspaceMembership.count({ where: { workspaceId, role: "owner" } });
    const removalReadiness = buildWorkspaceMemberRemovalReadiness({
      actorRole,
      memberRole: targetMembership.role,
      isSelf: targetMembership.accountUserId === accountUser.id,
      ownerCount
    });
    if (!removalReadiness.canRemove) redirect("/workspace/account?error=memberRemove");

    await db.workspaceMembership.delete({
      where: { id: targetMembership.id }
    });
    await recordWorkspaceMembershipAuditEvent({
      workspaceId,
      accountUserId: accountUser.id,
      action: "member_removed",
      objectKey: targetMembership.accountUser.email,
      metadata: {
        membershipId: targetMembership.id,
        memberEmail: targetMembership.accountUser.email,
        memberName: targetMembership.accountUser.name,
        role: targetMembership.role,
        actorEmail: accountUser.email
      }
    });
  } catch (error) {
    if (!isMissingDemoTableError(error)) throw error;
    redirect("/workspace/account?error=memberRemove");
  }

  redirect("/workspace/account?saved=memberRemoved");
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
    let membershipAuditEvents: Awaited<ReturnType<typeof db.lifecycleConnectorAuditEvent.findMany>> = [];
    if (workspaceId) {
      try {
        pendingInvites = await db.workspaceInvite.findMany({
          where: { workspaceId, status: "pending" },
          include: { invitedByAccountUser: true },
          orderBy: { createdAt: "desc" }
        });
        membershipAuditEvents = await db.lifecycleConnectorAuditEvent.findMany({
          where: {
            workspaceId,
            provider: workspaceMembershipAuditProvider()
          },
          orderBy: { occurredAt: "desc" },
          take: 8
        });
      } catch (error) {
        if (!isMissingDemoTableError(error)) throw error;
      }
    }
    return { accountUser, workspaceMemberships, pendingInvites, membershipAuditEvents, compatibilityMode: false };
  } catch (error) {
    if (isMissingDemoTableError(error)) return { accountUser: null, workspaceMemberships: [], pendingInvites: [], membershipAuditEvents: [], compatibilityMode: true };
    throw error;
  }
}

export default async function WorkspaceAccountPage({
  searchParams
}: {
  searchParams?: Promise<AccountSearchParams>;
}) {
  const params = await searchParams;
  const { accountUser, workspaceMemberships, pendingInvites, membershipAuditEvents, compatibilityMode } = await loadAccountPage();
  if (!compatibilityMode && !accountUser) redirect("/workspace/login?next=/workspace/account");
  const membershipSummary = buildWorkspaceMembershipSummary({
    memberships: workspaceMemberships,
    pendingInvites,
    currentUserId: accountUser?.id,
    inviteMailDelivery: buildWorkspaceInviteMailDeliveryConfig()
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
  const membershipAuditItems: MembershipAuditItem[] = membershipAuditEvents.map((event) => ({
    id: event.id,
    title: workspaceMembershipAuditTitle(event.eventType),
    detail: workspaceMembershipAuditDetail(event),
    actor: event.accountUserId ? "workspace user" : "workspace",
    occurredAtLabel: formatAuditDate(event.occurredAt)
  }));
  return (
    <>
      <DemoWorkspaceTabs />
      <Section eyebrow="Account" title="Workspace account">
        <p>
          Manage your profile, workspace members, invitations, role policy, and membership audit trail.
        </p>
        <div className="workspacePageGuide" aria-label="Workspace account sections">
          <a href="#profile">Profile</a>
          <a href="#members">Members</a>
          <a href="#invites">Invites</a>
          <a href="#membership-audit">Audit</a>
        </div>
      </Section>

      <Section title="Profile" id="profile">
        {params?.saved === "profile" ? <p className="small bandText--healthy">Account profile saved.</p> : null}
        {params?.saved === "invite" ? <p className="small bandText--healthy">Pending workspace invite created.</p> : null}
        {params?.saved === "inviteSent" ? <p className="small bandText--healthy">Workspace invitation email sent.</p> : null}
        {params?.saved === "inviteCanceled" ? <p className="small bandText--healthy">Pending workspace invite canceled.</p> : null}
        {params?.saved === "memberRole" ? <p className="small bandText--healthy">Workspace member role saved.</p> : null}
        {params?.saved === "memberRemoved" ? <p className="small bandText--healthy">Workspace member removed.</p> : null}
        {params?.error === "session" ? <p className="small bandText--unhealthy">Sign in before editing your account.</p> : null}
        {params?.error === "mutations" ? <p className="small bandText--unhealthy">Account editing is disabled in this environment.</p> : null}
        {params?.error === "invite" ? <p className="small bandText--unhealthy">Resolve invite blockers before creating a pending invitation.</p> : null}
        {params?.error === "inviteSend" ? <p className="small bandText--unhealthy">Resolve send blockers before emailing this invitation.</p> : null}
        {params?.error === "inviteCancel" ? <p className="small bandText--unhealthy">Only owners and admins can cancel pending invitations.</p> : null}
        {params?.error === "memberRole" ? <p className="small bandText--unhealthy">Resolve role-change blockers before saving this member role.</p> : null}
        {params?.error === "memberRemove" ? <p className="small bandText--unhealthy">Resolve removal blockers before removing this workspace member.</p> : null}
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
        <Section title="Workspace members" id="members">
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
                  {membershipSummary.currentUserCanManageMembers ? (
                    <form action={updateWorkspaceMemberRole} className="workspaceMemberRoleForm">
                      <input name="membershipId" type="hidden" value={member.id} />
                      <label>
                        <span className="small">Role</span>
                        <select name="role" defaultValue={member.role} disabled={member.isCurrentUser}>
                          <option value="owner">Owner</option>
                          <option value="admin">Admin</option>
                          <option value="operator">Operator</option>
                          <option value="viewer">Viewer</option>
                        </select>
                      </label>
                      <button className="btn smallBtn" type="submit" disabled={member.isCurrentUser}>Save role</button>
                    </form>
                  ) : null}
                  {member.removalReadiness.canRemove ? (
                    <form action={removeWorkspaceMember} className="workspaceMemberRemoveForm">
                      <input name="membershipId" type="hidden" value={member.id} />
                      <button className="btn smallBtn" type="submit">Remove member</button>
                    </form>
                  ) : null}
                  {member.roleChangeReadiness.blockers.length || member.removalReadiness.blockers.length ? (
                    <div className="workspaceInviteSendBlockers">
                      {[...member.roleChangeReadiness.blockers, ...member.removalReadiness.blockers].map((blocker) => (
                        <span key={blocker}>{blocker}</span>
                      ))}
                    </div>
                  ) : null}
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
          <details className="workspaceImplementationNotes">
            <summary>View role policy details</summary>
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
          </details>
        </Section>
      ) : null}
      {!compatibilityMode && accountUser ? (
        <Section title="Membership audit" id="membership-audit">
          {membershipAuditItems.length ? (
            <div className="workspaceMembershipAuditList">
              {membershipAuditItems.map((event) => (
                <article className="card workspaceMembershipAuditCard" key={event.id}>
                  <div>
                    <p className="small">{event.occurredAtLabel} · {event.actor}</p>
                    <strong>{event.title}</strong>
                    <span>{event.detail}</span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="card">
              <p>No membership administration events have been recorded yet.</p>
            </div>
          )}
        </Section>
      ) : null}
      {!compatibilityMode && accountUser ? (
        <Section title="Invites" id="invites">
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
          <div className={`workspaceInviteReadiness workspaceInviteReadiness--${membershipSummary.inviteMailDelivery.status}`}>
            <div>
              <p className="small">Mail delivery</p>
              <strong>{membershipSummary.inviteMailDelivery.statusLabel}</strong>
              <span>{membershipSummary.inviteMailDelivery.providerLabel}</span>
            </div>
            <div>
              <p className="small">Sender</p>
              <strong>{membershipSummary.inviteMailDelivery.fromEmail}</strong>
              <span>{membershipSummary.inviteMailDelivery.publicAppUrl}</span>
            </div>
            <div>
              <p className="small">Next action</p>
              <strong>{membershipSummary.inviteMailDelivery.nextAction}</strong>
            </div>
          </div>
          {membershipSummary.inviteMailDelivery.blockers.length ? (
            <div className="workspaceInviteReadinessGrid">
              {membershipSummary.inviteMailDelivery.blockers.map((blocker) => (
                <div className="card workspaceInviteReadinessItem workspaceInviteReadinessItem--blocked" key={`mail-${blocker}`}>
                  <p className="small">Mail blocked</p>
                  <strong>{blocker}</strong>
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
                      <span>Send {invite.sendReadiness.statusLabel}</span>
                      {invite.lastSentAtLabel ? <span>Sent {invite.lastSentAtLabel}</span> : null}
                      <a className="btn smallBtn" href={invite.previewHref}>Preview</a>
                      {invite.sendReadiness.canSend ? (
                        <form action={sendPendingWorkspaceInvite} className="workspaceInviteInlineForm">
                          <input name="inviteId" type="hidden" value={invite.id} />
                          <button className="btn smallBtn" type="submit">Send</button>
                        </form>
                      ) : null}
                      {membershipSummary.currentUserCanManageInvites && !invite.isExpired ? (
                        <form action={cancelPendingWorkspaceInvite} className="workspaceInviteInlineForm">
                          <input name="inviteId" type="hidden" value={invite.id} />
                          <button className="btn smallBtn" type="submit">Cancel</button>
                        </form>
                      ) : null}
                    </div>
                    {invite.sendReadiness.blockers.length ? (
                      <div className="workspaceInviteSendBlockers">
                        {invite.sendReadiness.blockers.map((blocker) => (
                          <span key={blocker}>{blocker}</span>
                        ))}
                      </div>
                    ) : null}
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
