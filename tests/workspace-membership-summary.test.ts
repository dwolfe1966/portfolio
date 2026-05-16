import assert from "node:assert/strict";
import test from "node:test";
import {
  buildWorkspaceMembershipSummary,
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
    ]
  });

  assert.equal(summary.available, true);
  assert.equal(summary.workspaceName, "Acme");
  assert.equal(summary.memberCount, 2);
  assert.equal(summary.ownerCount, 1);
  assert.equal(summary.viewerCount, 1);
  assert.equal(summary.currentUserRoleLabel, "Viewer");
  assert.equal(summary.governanceLabel, "1 owner assigned");
  assert.deepEqual(summary.rolePolicies.map((policy) => policy.role), ["owner", "viewer"]);
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
});

test("labelWorkspaceRole formats custom role keys", () => {
  assert.equal(labelWorkspaceRole("channel_operator"), "Channel Operator");
  assert.equal(labelWorkspaceRole("finance-owner"), "Finance Owner");
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
