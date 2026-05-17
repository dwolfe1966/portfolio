import assert from "node:assert/strict";
import test from "node:test";
import {
  workspaceMembershipAuditDetail,
  workspaceMembershipAuditEventType,
  workspaceMembershipAuditProvider,
  workspaceMembershipAuditTitle
} from "@/lib/workspace-membership-audit-events";

test("workspace membership audit helpers label admin events", () => {
  const eventType = workspaceMembershipAuditEventType("member_role_changed");
  const detail = workspaceMembershipAuditDetail({
    eventType,
    metadata: { memberEmail: "sam@example.com", fromRole: "viewer", toRole: "operator" }
  });

  assert.equal(workspaceMembershipAuditProvider(), "workspace_membership");
  assert.equal(eventType, "membership.member_role_changed");
  assert.equal(workspaceMembershipAuditTitle(eventType), "Workspace member role changed");
  assert.match(detail, /sam@example.com/);
  assert.match(detail, /viewer to operator/);
});

test("workspace membership audit helpers summarize invite events", () => {
  const created = workspaceMembershipAuditDetail({
    eventType: workspaceMembershipAuditEventType("invite_created"),
    metadata: { recipientEmail: "lee@example.com", role: "admin" }
  });
  const sent = workspaceMembershipAuditDetail({
    eventType: workspaceMembershipAuditEventType("invite_sent"),
    metadata: { recipientEmail: "lee@example.com" }
  });

  assert.match(created, /invited as admin/);
  assert.match(sent, /Invite email sent/);
});
