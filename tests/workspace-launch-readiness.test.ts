import assert from "node:assert/strict";
import test from "node:test";
import { buildWorkspaceLaunchReadiness } from "@/lib/workspace-launch-readiness";

test("buildWorkspaceLaunchReadiness summarizes a launchable workspace packet", () => {
  const readiness = buildWorkspaceLaunchReadiness({
    customerName: "Acme Inc.",
    workspaceId: "workspace_1",
    generatedAt: "2026-05-14T12:00:00.000Z",
    providerWriteReady: true
  });

  assert.equal(readiness.status, "ready");
  assert.equal(readiness.exportable, true);
  assert.equal(readiness.maxAllowedLaunchMode, "agent_managed_execution");
  assert.equal(readiness.packet.customerName, "Acme Inc.");
  assert.equal(readiness.packet.sections.billableGate?.enabled, true);
  assert.deepEqual(readiness.blockers, []);
  assert.ok(readiness.packet.markdown.includes("Customer Launch Packet: Acme Inc."));
});

test("buildWorkspaceLaunchReadiness downgrades execution when provider writes are not ready", () => {
  const readiness = buildWorkspaceLaunchReadiness({
    customerName: "Acme Inc.",
    workspaceId: "workspace_1",
    generatedAt: "2026-05-14T12:00:00.000Z",
    providerWriteReady: false
  });

  assert.equal(readiness.status, "blocked");
  assert.equal(readiness.exportable, false);
  assert.equal(readiness.maxAllowedLaunchMode, "recommendation_only");
  assert.ok(readiness.blockers.includes("Approve channel write grants before execution."));
  assert.ok(readiness.blockers.includes("Attach rollback evidence before billable execution."));
  assert.ok(readiness.warnings.includes("Launch packet includes unresolved risks."));
});

test("buildWorkspaceLaunchReadiness blocks stale provider inspection evidence", () => {
  const readiness = buildWorkspaceLaunchReadiness({
    customerName: "Acme Inc.",
    workspaceId: "workspace_1",
    generatedAt: "2026-05-14T12:00:00.000Z",
    providerReadReady: false,
    providerWriteReady: true
  });

  assert.equal(readiness.status, "blocked");
  assert.equal(readiness.packet.sections.dataQuality?.readyForExecution, false);
  assert.ok(readiness.blockers.includes("Record last sync time for ad provider read snapshot."));
  assert.ok(readiness.blockers.includes("Confirm credential grants and token health."));
});

test("buildWorkspaceLaunchReadiness uses custom launch owner approvals", () => {
  const readiness = buildWorkspaceLaunchReadiness({
    customerName: "Acme Inc.",
    workspaceId: "workspace_1",
    generatedAt: "2026-05-14T12:00:00.000Z",
    providerWriteReady: true,
    owners: [
      { role: "executive_sponsor", name: "Executive", approved: true },
      { role: "workspace_owner", name: "Workspace", approved: true },
      { role: "data_owner", name: "Data", approved: false },
      { role: "channel_owner", name: "Channel", approved: true },
      { role: "consent_compliance_owner", name: "Compliance", approved: true },
      { role: "finance_owner", name: "Finance", approved: true },
      { role: "operator_approver", name: "Operator", approved: true }
    ]
  });

  assert.equal(readiness.status, "blocked");
  assert.equal(readiness.packet.sections.owners.find((owner) => owner.role === "data_owner")?.approved, false);
  assert.ok(readiness.blockers.includes("Approve owner roles: data_owner."));
});
