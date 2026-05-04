import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_WORKSPACE, normalizeWorkspaceName } from "@/lib/workspace";

test("normalizeWorkspaceName trims and collapses whitespace", () => {
  assert.equal(normalizeWorkspaceName("  Revenue   Ops   Team  "), "Revenue Ops Team");
});

test("normalizeWorkspaceName falls back to default name for empty values", () => {
  assert.equal(normalizeWorkspaceName("   "), DEFAULT_WORKSPACE.name);
  assert.equal(normalizeWorkspaceName(null), DEFAULT_WORKSPACE.name);
});

test("normalizeWorkspaceName caps names at 80 characters", () => {
  const name = normalizeWorkspaceName("x".repeat(100));
  assert.equal(name.length, 80);
});
