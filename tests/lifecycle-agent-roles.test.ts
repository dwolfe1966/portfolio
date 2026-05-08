import assert from "node:assert/strict";
import test from "node:test";
import {
  getLifecycleAgentRoleForRunbookStep,
  lifecycleAgentRoleReadiness,
  lifecycleAgentRolesByAutomationMode,
  LIFECYCLE_AGENT_ROLES
} from "@/lib/lifecycle-agent-roles";

test("lifecycle agent roles cover every current runbook step", () => {
  const steps = [
    "detect_event",
    "resolve_identity_consent",
    "score_opportunity",
    "draft_message",
    "request_approval",
    "trigger_delivery",
    "observe_result",
    "update_audit"
  ];

  for (const step of steps) {
    assert.ok(getLifecycleAgentRoleForRunbookStep(step), `${step} should have an owning agent role`);
  }
});

test("delivery operator is the only lifecycle role that directly requires execution approval", () => {
  const approvalRequired = LIFECYCLE_AGENT_ROLES.filter((role) => role.requiresApproval).map((role) => role.key);
  assert.deepEqual(approvalRequired, ["delivery_operator"]);
});

test("lifecycle agent roles separate observation from human-approved execution", () => {
  const observeRoles = lifecycleAgentRolesByAutomationMode("observe").map((role) => role.key);
  const humanApprovedRoles = lifecycleAgentRolesByAutomationMode("human_approved").map((role) => role.key);

  assert.deepEqual(observeRoles, [
    "event_watcher",
    "identity_consent_resolver",
    "outcome_observer",
    "revenue_attributor"
  ]);
  assert.deepEqual(humanApprovedRoles, ["approval_coordinator", "delivery_operator"]);
});

test("lifecycleAgentRoleReadiness gates downstream roles on prerequisites", () => {
  const readiness = lifecycleAgentRoleReadiness({
    connectedSources: true,
    identityPolicyReady: true,
    scoringPolicyReady: true,
    generationReady: false,
    approvalQueueReady: true,
    deliveryConnectorReady: false,
    observationReady: false,
    measurementReady: false
  });

  assert.equal(readiness.event_watcher, "ready");
  assert.equal(readiness.opportunity_scorer, "ready");
  assert.equal(readiness.message_strategist, "blocked");
  assert.equal(readiness.approval_coordinator, "ready");
  assert.equal(readiness.delivery_operator, "blocked");
  assert.equal(readiness.revenue_attributor, "blocked");
});
