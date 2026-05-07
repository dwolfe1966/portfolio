import test from "node:test";
import assert from "node:assert/strict";
import { evaluateLifecycleIdentityConsent } from "@/lib/lifecycle-identity";
import { buildLifecycleAgentRunbook } from "@/lib/lifecycle-runbook";

const NOW = new Date("2026-05-07T12:00:00.000Z");

function eligibleIdentity() {
  return evaluateLifecycleIdentityConsent({
    userId: "user_001",
    email: "jordan@example.com",
    channel: "email",
    channelEligible: true,
    userGeography: "US",
    allowedGeographies: ["US"],
    relationshipResolved: true,
    eventDetectedAt: "2026-05-07T10:00:00.000Z",
    maxEventAgeHours: 24,
    holdoutAssigned: true,
    holdoutTreatment: "treatment"
  }, NOW);
}

test("buildLifecycleAgentRunbook starts with event detection", () => {
  const runbook = buildLifecycleAgentRunbook({
    eventDetected: false,
    opportunityScored: false,
    minPriorityScore: 0.65,
    messageDrafted: false
  });

  assert.equal(runbook.currentStep, "detect_event");
  assert.equal(runbook.readyToDeliver, false);
  assert.equal(runbook.steps[0].auditEvent, "source.ingested");
});

test("buildLifecycleAgentRunbook suppresses when identity or consent fails", () => {
  const identityDecision = evaluateLifecycleIdentityConsent({
    userId: "user_001",
    email: "jordan@example.com",
    channel: "email",
    channelEligible: true,
    providerSuppressed: true,
    relationshipResolved: true,
    eventDetectedAt: "2026-05-07T10:00:00.000Z",
    maxEventAgeHours: 24,
    holdoutAssigned: true,
    holdoutTreatment: "treatment"
  }, NOW);

  const runbook = buildLifecycleAgentRunbook({
    eventDetected: true,
    identityDecision,
    opportunityScored: false,
    minPriorityScore: 0.65,
    messageDrafted: false
  });

  assert.equal(runbook.suppressed, true);
  assert.equal(runbook.currentStep, "resolve_identity_consent");
  assert.equal(runbook.steps.find((step) => step.key === "resolve_identity_consent")?.status, "suppressed");
});

test("buildLifecycleAgentRunbook blocks low score before drafting", () => {
  const runbook = buildLifecycleAgentRunbook({
    eventDetected: true,
    identityDecision: eligibleIdentity(),
    opportunityScored: true,
    priorityScore: 0.4,
    minPriorityScore: 0.65,
    messageDrafted: false
  });

  assert.equal(runbook.readyToDeliver, false);
  assert.equal(runbook.currentStep, "score_opportunity");
  assert.ok(runbook.steps.find((step) => step.key === "score_opportunity")?.reasons[0].includes("Priority score"));
});

test("buildLifecycleAgentRunbook pauses at approval when required", () => {
  const runbook = buildLifecycleAgentRunbook({
    eventDetected: true,
    identityDecision: eligibleIdentity(),
    opportunityScored: true,
    priorityScore: 0.8,
    minPriorityScore: 0.65,
    messageDrafted: true,
    approvalRequired: true,
    approvalCompleted: false,
    deliveryHealthy: true
  });

  assert.equal(runbook.currentStep, "request_approval");
  assert.equal(runbook.readyToDeliver, false);
  assert.equal(runbook.steps.find((step) => step.key === "request_approval")?.status, "approval_required");
});

test("buildLifecycleAgentRunbook marks delivery ready after required gates pass", () => {
  const runbook = buildLifecycleAgentRunbook({
    eventDetected: true,
    identityDecision: eligibleIdentity(),
    opportunityScored: true,
    priorityScore: 0.8,
    minPriorityScore: 0.65,
    messageDrafted: true,
    approvalRequired: true,
    approvalCompleted: true,
    deliveryHealthy: true
  });

  assert.equal(runbook.readyToDeliver, true);
  assert.equal(runbook.currentStep, "trigger_delivery");
  assert.equal(runbook.steps.find((step) => step.key === "trigger_delivery")?.auditEvent, "delivery.test_sent");
});

test("buildLifecycleAgentRunbook observes and attributes after delivery", () => {
  const runbook = buildLifecycleAgentRunbook({
    eventDetected: true,
    identityDecision: eligibleIdentity(),
    opportunityScored: true,
    priorityScore: 0.8,
    minPriorityScore: 0.65,
    messageDrafted: true,
    deliveryHealthy: true,
    deliveryTriggered: true,
    resultObserved: true,
    revenueAttributed: false
  });

  assert.equal(runbook.currentStep, "update_audit");
  assert.equal(runbook.steps.find((step) => step.key === "observe_result")?.status, "completed");
  assert.equal(runbook.steps.find((step) => step.key === "update_audit")?.auditEvent, "revenue.attributed");
});
