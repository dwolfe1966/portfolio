import assert from "node:assert/strict";
import test from "node:test";
import {
  buildWorkspaceMembershipSummary,
  buildWorkspaceInviteDraft,
  buildWorkspaceInviteAcceptanceActionReadiness,
  buildWorkspaceInviteAcceptancePreview,
  buildWorkspaceInviteMailDeliveryConfig,
  buildWorkspaceInviteReadiness,
  buildWorkspaceInviteSendReadiness,
  buildWorkspacePendingInviteSummaries,
  canManageWorkspaceInvites,
  labelWorkspaceRole,
  workspaceRolePoliciesForRoster,
  workspaceRolePolicy
} from "@/lib/workspace-membership-summary";

test("buildWorkspaceMembershipSummary summarizes members and prioritizes the signed-in user", () => {
  const summary = buildWorkspaceMembershipSummary({
    currentUserId: "user_2",
    memberships: [
      {
        id: "member_1",
        role: "owner",
        createdAt: "2026-05-01T12:00:00.000Z",
        updatedAt: "2026-05-02T12:00:00.000Z",
        accountUser: { id: "user_1", name: "Alex Owner", email: "alex@example.com", company: "Acme", title: "CEO" },
        workspace: { id: "workspace_1", name: "Acme", slug: "default" }
      },
      {
        id: "member_2",
        role: "viewer",
        createdAt: "2026-05-03T12:00:00.000Z",
        updatedAt: "2026-05-04T12:00:00.000Z",
        accountUser: { id: "user_2", name: "Jordan Viewer", email: "jordan@example.com", company: null, title: null },
        workspace: { id: "workspace_1", name: "Acme", slug: "default" }
      }
    ],
    pendingInvites: [
      {
        id: "invite_1",
        email: "Sam@Example.com",
        role: "operator",
        status: "pending",
        tokenHash: "hash",
        draftPayload: { tokenPreviewPath: "/workspace/invite/token_abc" },
        expiresAt: "2026-06-01T12:00:00.000Z",
        createdAt: "2026-05-16T12:00:00.000Z",
        invitedByAccountUser: { name: "Alex Owner", email: "alex@example.com" }
      }
    ]
  });

  assert.equal(summary.available, true);
  assert.equal(summary.workspaceName, "Acme");
  assert.equal(summary.memberCount, 2);
  assert.equal(summary.ownerCount, 1);
  assert.equal(summary.viewerCount, 1);
  assert.equal(summary.currentUserRoleLabel, "Viewer");
  assert.equal(summary.currentUserCanManageInvites, false);
  assert.equal(summary.governanceLabel, "1 owner assigned");
  assert.equal(summary.inviteMailDelivery.status, "blocked");
  assert.equal(summary.inviteReadiness.status, "blocked");
  assert.match(summary.inviteReadiness.nextAction, /Only owners and admins/);
  assert.deepEqual(summary.rolePolicies.map((policy) => policy.role), ["owner", "viewer"]);
  assert.equal(summary.pendingInvites[0].email, "sam@example.com");
  assert.equal(summary.pendingInvites[0].roleLabel, "Operator");
  assert.equal(summary.pendingInvites[0].previewHref, "/workspace/invite/token_abc");
  assert.equal(summary.pendingInvites[0].sendReadiness.status, "blocked");
  assert.equal(summary.members[0].email, "jordan@example.com");
  assert.equal(summary.members[0].statusLabel, "Signed in");
});

test("buildWorkspaceMembershipSummary handles empty membership state", () => {
  const summary = buildWorkspaceMembershipSummary({ memberships: [], currentUserId: "missing" });

  assert.equal(summary.available, false);
  assert.equal(summary.workspaceName, "No workspace membership");
  assert.equal(summary.memberCount, 0);
  assert.equal(summary.currentUserRoleLabel, "No current membership");
  assert.equal(summary.governanceLabel, "Owner assignment needed");
  assert.equal(summary.inviteReadiness.status, "blocked");
});

test("labelWorkspaceRole formats custom role keys", () => {
  assert.equal(labelWorkspaceRole("channel_operator"), "Channel Operator");
  assert.equal(labelWorkspaceRole("finance-owner"), "Finance Owner");
});

test("canManageWorkspaceInvites allows only owner and admin roles", () => {
  assert.equal(canManageWorkspaceInvites("owner"), true);
  assert.equal(canManageWorkspaceInvites("admin"), true);
  assert.equal(canManageWorkspaceInvites("operator"), false);
  assert.equal(canManageWorkspaceInvites("viewer"), false);
});

test("workspaceRolePolicy defines enterprise capabilities by role", () => {
  const ownerPolicy = workspaceRolePolicy("owner");
  const viewerPolicy = workspaceRolePolicy("viewer");

  assert.equal(ownerPolicy.accessLevel, "full");
  assert.ok(ownerPolicy.capabilities.some((capability) => capability.key === "credential_grants"));
  assert.equal(viewerPolicy.accessLevel, "read_only");
  assert.equal(viewerPolicy.capabilityCount, 1);
});

test("workspaceRolePoliciesForRoster dedupes and orders role policies", () => {
  const policies = workspaceRolePoliciesForRoster(["viewer", "owner", "admin", "viewer", "finance_owner"]);

  assert.deepEqual(policies.map((policy) => policy.role), ["owner", "admin", "viewer", "finance_owner"]);
  assert.equal(policies.find((policy) => policy.role === "finance_owner")?.accessLevel, "custom");
});

test("buildWorkspaceInviteReadiness allows owner/admin actors after governance is ready", () => {
  const readiness = buildWorkspaceInviteReadiness({
    available: true,
    ownerCount: 1,
    currentUserRole: "admin"
  });

  assert.equal(readiness.status, "ready");
  assert.equal(readiness.canInvite, true);
  assert.equal(readiness.actorRoleLabel, "Admin");
  assert.deepEqual(readiness.blockers, []);
});

test("buildWorkspaceInviteReadiness requires review for custom role rosters", () => {
  const readiness = buildWorkspaceInviteReadiness({
    available: true,
    ownerCount: 1,
    currentUserRole: "owner",
    hasCustomRoles: true
  });

  assert.equal(readiness.status, "review");
  assert.equal(readiness.canInvite, false);
  assert.match(readiness.nextAction, /custom role/);
});

test("buildWorkspaceInviteDraft validates email, duplicate membership, and readiness", () => {
  const readiness = buildWorkspaceInviteReadiness({
    available: true,
    ownerCount: 1,
    currentUserRole: "owner"
  });

  const invalid = buildWorkspaceInviteDraft({
    readiness,
    email: "not-an-email",
    role: "viewer",
    workspaceName: "Acme"
  });
  const duplicate = buildWorkspaceInviteDraft({
    readiness,
    email: "alex@example.com",
    role: "viewer",
    existingMemberEmails: ["alex@example.com"]
  });
  const pendingDuplicate = buildWorkspaceInviteDraft({
    readiness,
    email: "sam@example.com",
    role: "viewer",
    existingPendingInviteEmails: ["sam@example.com"]
  });

  assert.equal(invalid.status, "invalid");
  assert.equal(invalid.canCreate, false);
  assert.match(invalid.nextAction, /valid collaborator email/);
  assert.equal(duplicate.status, "blocked");
  assert.match(duplicate.nextAction, /already has workspace membership/);
  assert.equal(pendingDuplicate.status, "blocked");
  assert.match(pendingDuplicate.nextAction, /pending workspace invitation/);
});

test("buildWorkspaceInviteDraft creates a non-mutating ready preview", () => {
  const readiness = buildWorkspaceInviteReadiness({
    available: true,
    ownerCount: 1,
    currentUserRole: "admin"
  });

  const draft = buildWorkspaceInviteDraft({
    readiness,
    email: "Jordan@Example.com ",
    role: "operator",
    workspaceName: "Acme"
  });

  assert.equal(draft.status, "ready");
  assert.equal(draft.canCreate, true);
  assert.equal(draft.email, "jordan@example.com");
  assert.equal(draft.roleLabel, "Operator");
  assert.match(draft.auditSummary, /no email sent/);
});

test("buildWorkspacePendingInviteSummaries labels and sorts pending invites", () => {
  const invites = buildWorkspacePendingInviteSummaries({
    now: new Date("2026-05-16T12:00:00.000Z"),
    canManageInvites: true,
    mailerReady: true,
    invites: [
      {
        id: "expired",
        email: "zara@example.com",
        role: "viewer",
        status: "pending",
        expiresAt: "2026-05-15T12:00:00.000Z",
        createdAt: "2026-05-01T12:00:00.000Z",
        invitedByAccountUser: null
      },
      {
        id: "active",
        email: "amy@example.com",
        role: "admin",
        status: "pending",
        draftPayload: {
          tokenPreviewPath: "/workspace/invite/opaque-token",
          mailDelivery: { status: "sent", sentAt: "2026-05-12T12:00:00.000Z" }
        },
        expiresAt: "2026-05-30T12:00:00.000Z",
        createdAt: "2026-05-10T12:00:00.000Z",
        invitedByAccountUser: { name: "", email: "owner@example.com" }
      }
    ]
  });

  assert.equal(invites[0].id, "active");
  assert.equal(invites[0].roleLabel, "Admin");
  assert.equal(invites[0].previewHref, "/workspace/invite/opaque-token");
  assert.equal(invites[0].sendReadiness.status, "ready");
  assert.equal(invites[0].lastSentAtLabel, "May 12, 2026");
  assert.equal(invites[0].invitedByLabel, "owner@example.com");
  assert.equal(invites[1].isExpired, true);
  assert.equal(invites[1].previewHref, "/workspace/invite/expired");
  assert.match(invites[1].sendReadiness.nextAction, /Expired/);
});

test("buildWorkspaceInviteSendReadiness blocks unsafe send states", () => {
  const blocked = buildWorkspaceInviteSendReadiness({
    inviteStatus: "pending",
    isExpired: false,
    previewHref: "/workspace/invite/token",
    canManageInvites: true,
    mailerReady: false
  });
  const ready = buildWorkspaceInviteSendReadiness({
    inviteStatus: "pending",
    isExpired: false,
    previewHref: "/workspace/invite/token",
    canManageInvites: true,
    mailerReady: true
  });

  assert.equal(blocked.status, "blocked");
  assert.equal(blocked.canSend, false);
  assert.match(blocked.nextAction, /email delivery/);
  assert.equal(ready.status, "ready");
  assert.equal(ready.canSend, true);
});

test("buildWorkspaceInviteMailDeliveryConfig requires provider, sender, and public app URL", () => {
  const blocked = buildWorkspaceInviteMailDeliveryConfig({});
  const ready = buildWorkspaceInviteMailDeliveryConfig({
    RESEND_API_KEY: "re_test",
    WORKSPACE_INVITE_FROM_EMAIL: "Workspace <invites@example.com>",
    NEXT_PUBLIC_SITE_URL: "https://example.com/"
  });
  const fallback = buildWorkspaceInviteMailDeliveryConfig({
    RESEND_API_KEY: "re_test",
    CONTACT_FROM_EMAIL: "Portfolio <hello@example.com>",
    VERCEL_URL: "davidwolfe.app"
  });

  assert.equal(blocked.status, "blocked");
  assert.match(blocked.nextAction, /RESEND_API_KEY/);
  assert.equal(ready.status, "ready");
  assert.equal(ready.fromEmail, "Workspace <invites@example.com>");
  assert.equal(ready.publicAppUrl, "https://example.com");
  assert.equal(fallback.status, "ready");
  assert.equal(fallback.publicAppUrl, "https://davidwolfe.app");
});

test("buildWorkspaceInviteAcceptancePreview explains ready and terminal invite states", () => {
  const ready = buildWorkspaceInviteAcceptancePreview({
    id: "invite_1",
    email: "Jordan@Example.com",
    role: "operator",
    status: "pending",
    expiresAt: "2026-06-01T12:00:00.000Z",
    createdAt: "2026-05-16T12:00:00.000Z",
    workspace: { name: "Acme", slug: "default" },
    invitedByAccountUser: { name: "Alex Owner", email: "alex@example.com" }
  }, new Date("2026-05-17T12:00:00.000Z"));
  const expired = buildWorkspaceInviteAcceptancePreview({
    id: "invite_2",
    email: "sam@example.com",
    role: "viewer",
    status: "pending",
    expiresAt: "2026-05-01T12:00:00.000Z",
    createdAt: "2026-04-17T12:00:00.000Z",
    workspace: { name: "Acme", slug: "default" },
    invitedByAccountUser: null
  }, new Date("2026-05-17T12:00:00.000Z"));
  const canceled = buildWorkspaceInviteAcceptancePreview({
    id: "invite_3",
    email: "lee@example.com",
    role: "admin",
    status: "canceled",
    expiresAt: "2026-06-01T12:00:00.000Z",
    createdAt: "2026-05-16T12:00:00.000Z",
    workspace: { name: "Acme", slug: "default" },
    invitedByAccountUser: null
  }, new Date("2026-05-17T12:00:00.000Z"));

  assert.equal(ready.status, "ready");
  assert.equal(ready.canAccept, true);
  assert.equal(ready.email, "jordan@example.com");
  assert.equal(ready.roleLabel, "Operator");
  assert.equal(ready.invitedByLabel, "Alex Owner");
  assert.equal(expired.status, "expired");
  assert.equal(expired.canAccept, false);
  assert.match(expired.nextAction, /fresh invitation/);
  assert.equal(canceled.status, "canceled");
  assert.match(canceled.nextAction, /new invitation/);
});

test("buildWorkspaceInviteAcceptancePreview handles missing invites", () => {
  const preview = buildWorkspaceInviteAcceptancePreview(null);

  assert.equal(preview.available, false);
  assert.equal(preview.status, "missing");
  assert.equal(preview.canAccept, false);
});

test("buildWorkspaceInviteAcceptanceActionReadiness requires matching signed-in recipient", () => {
  const preview = buildWorkspaceInviteAcceptancePreview({
    id: "invite_1",
    email: "Jordan@Example.com",
    role: "operator",
    status: "pending",
    expiresAt: "2026-06-01T12:00:00.000Z",
    createdAt: "2026-05-16T12:00:00.000Z",
    workspace: { name: "Acme", slug: "default" },
    invitedByAccountUser: null
  }, new Date("2026-05-17T12:00:00.000Z"));
  const missingSession = buildWorkspaceInviteAcceptanceActionReadiness({ preview });
  const wrongSession = buildWorkspaceInviteAcceptanceActionReadiness({ preview, sessionEmail: "sam@example.com" });
  const ready = buildWorkspaceInviteAcceptanceActionReadiness({ preview, sessionEmail: "jordan@example.com" });
  const existingMember = buildWorkspaceInviteAcceptanceActionReadiness({ preview, sessionEmail: "jordan@example.com", existingMembership: true });

  assert.equal(missingSession.status, "blocked");
  assert.match(missingSession.nextAction, /Sign in/);
  assert.equal(wrongSession.canAccept, false);
  assert.match(wrongSession.nextAction, /invited email/);
  assert.equal(ready.status, "ready");
  assert.equal(ready.canAccept, true);
  assert.equal(existingMember.status, "blocked");
  assert.match(existingMember.nextAction, /already has workspace membership/);
});
