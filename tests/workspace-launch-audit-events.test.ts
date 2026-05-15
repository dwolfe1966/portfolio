import assert from "node:assert/strict";
import test from "node:test";
import {
  workspaceLaunchAuditDetail,
  workspaceLaunchAuditEventType,
  workspaceLaunchAuditRecord,
  workspaceLaunchAuditTitle
} from "@/lib/workspace-launch-audit-events";

test("workspace launch audit helpers label launch evidence changes", () => {
  assert.equal(workspaceLaunchAuditEventType("owner_roster_saved"), "launch.owner_roster_saved");
  assert.equal(workspaceLaunchAuditTitle("launch.connected_systems_saved"), "Connected-system evidence saved");
  assert.equal(workspaceLaunchAuditDetail({
    eventType: "launch.baseline_evidence_saved",
    metadata: { summary: "Baseline saved with high confidence." }
  }), "Baseline saved with high confidence.");
});

test("workspaceLaunchAuditRecord maps launch evidence events to export rows", () => {
  const record = workspaceLaunchAuditRecord({
    id: "evt_1",
    workspaceId: "workspace_1",
    accountUserId: "acct_1",
    eventType: "launch.baseline_evidence_saved",
    metadata: {
      status: "ready",
      evidenceSection: "baseline_evidence_saved",
      maxAllowedLaunchMode: "agent_managed_execution"
    },
    occurredAt: new Date("2026-05-15T12:00:00.000Z")
  });

  assert.equal(record.app, "workspace");
  assert.equal(record.action, "baseline_evidence_saved");
  assert.equal(record.status, "ready");
  assert.equal(record.evidenceType, "launch_readiness");
  assert.equal(record.actorAccountUserId, "acct_1");
  assert.equal(record.operationType, "baseline_evidence_saved");
  assert.equal(record.mutationGateStatus, "agent_managed_execution");
});
