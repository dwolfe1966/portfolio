import assert from "node:assert/strict";
import test from "node:test";
import {
  workspaceInviteEmailSubject,
  workspaceInviteEmailText
} from "@/lib/workspace-invite-mailer";

test("workspace invite mailer renders stable subject and text body", () => {
  const payload = {
    to: "sam@example.com",
    workspaceName: "Acme",
    roleLabel: "Operator",
    invitedByLabel: "Alex Owner",
    inviteUrl: "https://example.com/workspace/invite/token",
    expiresAtLabel: "Jun 1, 2026"
  };
  const text = workspaceInviteEmailText(payload);

  assert.equal(workspaceInviteEmailSubject(payload), "Invitation to Acme");
  assert.match(text, /You have been invited to Acme/);
  assert.match(text, /Role: Operator/);
  assert.match(text, /https:\/\/example.com\/workspace\/invite\/token/);
});
