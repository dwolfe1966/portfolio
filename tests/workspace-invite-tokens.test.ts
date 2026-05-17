import assert from "node:assert/strict";
import test from "node:test";
import {
  createWorkspaceInviteToken,
  isPlausibleWorkspaceInviteToken,
  workspaceInviteTokenHash
} from "@/lib/workspace-invite-tokens";

test("createWorkspaceInviteToken returns opaque URL-safe tokens", () => {
  const left = createWorkspaceInviteToken();
  const right = createWorkspaceInviteToken();

  assert.notEqual(left, right);
  assert.equal(isPlausibleWorkspaceInviteToken(left), true);
  assert.equal(left.includes("."), false);
});

test("workspaceInviteTokenHash is stable and does not preserve raw token", () => {
  const token = "abc_123-token";
  const hash = workspaceInviteTokenHash(token);

  assert.equal(hash, workspaceInviteTokenHash(token));
  assert.notEqual(hash, token);
  assert.equal(hash.length, 64);
});

test("isPlausibleWorkspaceInviteToken rejects short or unsafe tokens", () => {
  assert.equal(isPlausibleWorkspaceInviteToken("short"), false);
  assert.equal(isPlausibleWorkspaceInviteToken("contains.dot.value.that-is-long"), false);
});
