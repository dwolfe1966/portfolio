import assert from "node:assert/strict";
import test from "node:test";
import { resolveWorkspaceVisibility, workspaceVisibilityLabel } from "@/lib/workspace-visibility";

test("workspace visibility identifies shared sample rows without an owner", () => {
  assert.equal(resolveWorkspaceVisibility(null, "acct_123"), "shared_sample");
  assert.equal(resolveWorkspaceVisibility(undefined, null), "shared_sample");
  assert.equal(workspaceVisibilityLabel(null, "acct_123").label, "Shared sample");
});

test("workspace visibility identifies personal account-owned rows", () => {
  assert.equal(resolveWorkspaceVisibility("acct_123", "acct_123"), "personal");
  assert.deepEqual(workspaceVisibilityLabel("acct_123", "acct_123"), {
    label: "Personal",
    detail: "Owned by your account",
    statusClass: "live"
  });
});

test("workspace visibility leaves room for future shared workspace rows", () => {
  assert.equal(resolveWorkspaceVisibility("acct_other", "acct_123"), "shared_workspace");
  assert.equal(resolveWorkspaceVisibility("acct_other", null), "shared_workspace");
  assert.equal(workspaceVisibilityLabel("acct_other", "acct_123").label, "Team/shared");
});
