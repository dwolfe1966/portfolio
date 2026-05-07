import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAgentAuditExportRows,
  evaluateAgentCompliancePosture,
  evaluateAgentTenantAccess,
  evaluateSecretPosture,
  redactAgentSecretPayload
} from "@/lib/agent-platform-governance";

test("evaluateAgentTenantAccess allows matching workspace operators", () => {
  const decision = evaluateAgentTenantAccess({
    actorWorkspaceId: "workspace_1",
    resourceWorkspaceId: "workspace_1",
    role: "operator"
  });

  assert.deepEqual(decision, { allowed: true, reason: "workspace_match" });
});

test("evaluateAgentTenantAccess blocks workspace and account boundary violations", () => {
  assert.deepEqual(
    evaluateAgentTenantAccess({
      actorWorkspaceId: "workspace_1",
      resourceWorkspaceId: "workspace_2",
      role: "owner"
    }),
    { allowed: false, reason: "workspace_mismatch" }
  );

  assert.deepEqual(
    evaluateAgentTenantAccess({
      actorWorkspaceId: "workspace_1",
      resourceWorkspaceId: "workspace_1",
      actorAccountUserId: "acct_1",
      resourceAccountUserId: "acct_2",
      requireAccountOwner: true,
      role: "owner"
    }),
    { allowed: false, reason: "account_mismatch" }
  );
});

test("evaluateAgentTenantAccess blocks viewer writes when role policy excludes viewers", () => {
  const decision = evaluateAgentTenantAccess({
    actorWorkspaceId: "workspace_1",
    resourceWorkspaceId: "workspace_1",
    role: "viewer",
    allowedRoles: ["owner", "admin", "operator"]
  });

  assert.deepEqual(decision, { allowed: false, reason: "role_not_allowed" });
});

test("redactAgentSecretPayload redacts nested secret-shaped fields", () => {
  const redacted = redactAgentSecretPayload({
    provider: "google",
    refreshToken: "refresh-token",
    nested: {
      apiKey: "api-key",
      safe: "visible",
      values: [{ password: "secret" }]
    }
  });

  assert.deepEqual(redacted, {
    provider: "google",
    refreshToken: "[redacted]",
    nested: {
      apiKey: "[redacted]",
      safe: "visible",
      values: [{ password: "[redacted]" }]
    }
  });
});

test("evaluateSecretPosture blocks missing encryption or tokens", () => {
  const posture = evaluateSecretPosture({
    encryptionAvailable: false,
    tokenPresent: false,
    now: new Date("2026-05-07T12:00:00.000Z")
  });

  assert.equal(posture.status, "blocked");
  assert.deepEqual(posture.reasons, ["encryption_unavailable", "secret_missing"]);
});

test("evaluateSecretPosture warns when rotation is overdue", () => {
  const posture = evaluateSecretPosture({
    encryptionAvailable: true,
    tokenPresent: true,
    rotatedAt: new Date("2026-01-01T00:00:00.000Z"),
    now: new Date("2026-05-07T12:00:00.000Z"),
    rotationWindowDays: 90
  });

  assert.equal(posture.status, "warning");
  assert.deepEqual(posture.reasons, ["rotation_overdue"]);
  assert.equal(posture.rotationDueAt?.toISOString(), "2026-04-01T00:00:00.000Z");
});

test("buildAgentAuditExportRows emits stable chronological export rows", () => {
  const rows = buildAgentAuditExportRows([
    {
      id: "approval_2",
      workspaceId: "workspace_1",
      app: "acquisition",
      action: "budget_increase",
      status: "approved",
      actorAccountUserId: "acct_1",
      riskLevel: "high",
      createdAt: new Date("2026-05-07T12:05:00.000Z"),
      decidedAt: new Date("2026-05-07T12:07:00.000Z")
    },
    {
      id: "job_1",
      workspaceId: "workspace_1",
      app: "lifecycle",
      action: "delivery",
      status: "completed",
      createdAt: new Date("2026-05-07T12:00:00.000Z"),
      completedAt: new Date("2026-05-07T12:01:00.000Z")
    }
  ]);

  assert.deepEqual(rows.map((row) => row.id), ["job_1", "approval_2"]);
  assert.equal(rows[0].terminalAt, "2026-05-07T12:01:00.000Z");
  assert.equal(rows[1].riskLevel, "high");
});

test("evaluateAgentCompliancePosture promotes blockers over warnings", () => {
  const posture = evaluateAgentCompliancePosture({
    tenantIsolationEnforced: false,
    secretPosture: { status: "warning", reasons: ["rotation_overdue"], rotationDueAt: null },
    auditExportEnabled: false,
    approvalQueueEnabled: true,
    deadLetterReviewEnabled: false
  });

  assert.equal(posture.status, "blocked");
  assert.deepEqual(posture.blockers, ["tenant_isolation_not_enforced"]);
  assert.deepEqual(posture.warnings, ["audit_export_disabled", "dead_letter_review_disabled", "rotation_overdue"]);
});
