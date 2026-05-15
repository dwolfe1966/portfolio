import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeWorkspaceLaunchOwners,
  WORKSPACE_LAUNCH_OWNER_ROLES
} from "@/lib/workspace-launch-owner-roster";

test("normalizeWorkspaceLaunchOwners returns every required launch role", () => {
  const owners = normalizeWorkspaceLaunchOwners([
    { role: "finance_owner", name: "  Finance Lead  ", email: " FINANCE@EXAMPLE.COM ", approved: true },
    { role: "unknown", name: "Ignored", approved: true }
  ]);

  assert.equal(owners.length, WORKSPACE_LAUNCH_OWNER_ROLES.length);
  assert.deepEqual(owners.map((owner) => owner.role), WORKSPACE_LAUNCH_OWNER_ROLES.map((item) => item.role));
  assert.deepEqual(
    owners.find((owner) => owner.role === "finance_owner"),
    { role: "finance_owner", name: "Finance Lead", email: "finance@example.com", approved: true }
  );
  assert.equal(owners.find((owner) => owner.role === "data_owner")?.approved, false);
});

test("normalizeWorkspaceLaunchOwners falls back to role labels for missing names", () => {
  const owners = normalizeWorkspaceLaunchOwners([{ role: "workspace_owner", name: "", approved: true }]);
  const workspaceOwner = owners.find((owner) => owner.role === "workspace_owner");

  assert.equal(workspaceOwner?.name, "Workspace owner");
  assert.equal(workspaceOwner?.email, null);
  assert.equal(workspaceOwner?.approved, true);
});
