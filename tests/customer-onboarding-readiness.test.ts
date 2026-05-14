import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCustomerOnboardingReadiness,
  type CustomerOnboardingOwner,
  type CustomerOnboardingReadinessInput
} from "@/lib/customer-onboarding-readiness";

const OWNERS: CustomerOnboardingOwner[] = [
  { role: "executive_sponsor", name: "Executive", approved: true },
  { role: "workspace_owner", name: "Workspace", approved: true },
  { role: "data_owner", name: "Data", approved: true },
  { role: "channel_owner", name: "Channel", approved: true },
  { role: "consent_compliance_owner", name: "Compliance", approved: true },
  { role: "finance_owner", name: "Finance", approved: true },
  { role: "operator_approver", name: "Operator", approved: true }
];

const READY: CustomerOnboardingReadinessInput = {
  requestedLaunchMode: "agent_managed_execution",
  owners: OWNERS,
  commercialScopeApproved: true,
  launchModeApproved: true,
  sourceReadGrantsReady: true,
  channelWriteGrantsReady: true,
  credentialRotationOwnerAssigned: true,
  mappingApproved: true,
  mappingVersion: "mapping_v1",
  policyApproved: true,
  consentApproved: true,
  baselineFrozen: true,
  baselineApproved: true,
  auditExportEnabled: true,
  launchConstraintsAccepted: true,
  approvalQueueOwnerAssigned: true,
  approvalSlaDefined: true,
  emergencyStopTested: true,
  rollbackEvidenceReady: true,
  performanceBillingApproved: true,
  unresolvedRisks: []
};

test("buildCustomerOnboardingReadiness allows agent-managed execution only when every launch gate passes", () => {
  const readiness = buildCustomerOnboardingReadiness(READY);

  assert.equal(readiness.status, "ready");
  assert.equal(readiness.maxAllowedLaunchMode, "agent_managed_execution");
  assert.equal(readiness.requestedLaunchAllowed, true);
  assert.deepEqual(readiness.missingOwners, []);
  assert.deepEqual(readiness.blockers, []);
  assert.equal(readiness.nextRequiredAction, "Record launch readiness decision and schedule the next customer review.");
});

test("buildCustomerOnboardingReadiness downgrades to recommendation-only when execution gates are incomplete", () => {
  const readiness = buildCustomerOnboardingReadiness({
    ...READY,
    requestedLaunchMode: "human_approved_execution",
    channelWriteGrantsReady: false,
    baselineApproved: false,
    emergencyStopTested: false,
    rollbackEvidenceReady: false,
    performanceBillingApproved: false
  });

  assert.equal(readiness.status, "blocked");
  assert.equal(readiness.maxAllowedLaunchMode, "recommendation_only");
  assert.equal(readiness.requestedLaunchAllowed, false);
  assert.ok(readiness.blockers.includes("Approve channel write grants before execution."));
  assert.ok(readiness.blockers.includes("Approve baseline with data and finance owners."));
  assert.equal(readiness.nextRequiredAction, "Approve channel write grants before execution.");
});

test("buildCustomerOnboardingReadiness allows recommendation-only with basic ownership, scope, read grants, and audit export", () => {
  const readiness = buildCustomerOnboardingReadiness({
    requestedLaunchMode: "recommendation_only",
    owners: [{ role: "workspace_owner", name: "Workspace", approved: true }],
    commercialScopeApproved: true,
    sourceReadGrantsReady: true,
    auditExportEnabled: true
  });

  assert.equal(readiness.maxAllowedLaunchMode, "recommendation_only");
  assert.equal(readiness.requestedLaunchAllowed, true);
  assert.equal(readiness.status, "blocked");
  assert.ok(readiness.missingOwners.includes("finance_owner"));
});

test("buildCustomerOnboardingReadiness blocks execution for missing owners and unresolved high risks", () => {
  const readiness = buildCustomerOnboardingReadiness({
    ...READY,
    requestedLaunchMode: "human_approved_execution",
    owners: OWNERS.filter((owner) => owner.role !== "finance_owner"),
    unresolvedRisks: [
      { id: "risk_1", severity: "critical", ownerRole: "operator_approver", dueAt: "2026-05-20", resolved: false },
      { id: "risk_2", severity: "medium", resolved: false }
    ]
  });

  assert.equal(readiness.maxAllowedLaunchMode, "recommendation_only");
  assert.equal(readiness.requestedLaunchAllowed, false);
  assert.ok(readiness.missingOwners.includes("finance_owner"));
  assert.ok(readiness.blockers.includes("Resolve high or critical launch risks before execution."));
  assert.ok(readiness.blockers.includes("Assign an owner to every unresolved risk."));
});

test("buildCustomerOnboardingReadiness treats audit-only as preparatory when gates are missing", () => {
  const readiness = buildCustomerOnboardingReadiness({
    requestedLaunchMode: "audit_only"
  });

  assert.equal(readiness.requestedLaunchAllowed, true);
  assert.equal(readiness.maxAllowedLaunchMode, "audit_only");
  assert.equal(readiness.status, "warning");
  assert.ok(readiness.blockers.includes("Approve commercial scope."));
});
