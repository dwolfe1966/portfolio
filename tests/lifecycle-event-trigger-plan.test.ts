import assert from "node:assert/strict";
import test from "node:test";
import { buildLifecycleChangeEventTriggerPlan } from "@/lib/lifecycle-event-trigger-plan";

const NOW = new Date("2026-05-08T12:00:00.000Z");

test("buildLifecycleChangeEventTriggerPlan queues message strategy after a fresh eligible change event", () => {
  const result = buildLifecycleChangeEventTriggerPlan({
    workspaceId: "workspace_1",
    accountUserId: "acct_1",
    eventId: "delta_1",
    entityId: "entity_1",
    entityName: "Acme Corp",
    changeType: "employee_record_added",
    detectedAt: "2026-05-08T10:00:00.000Z",
    user: {
      id: "user_1",
      email: "jordan@example.com",
      segment: "TRIAL",
      geography: "US"
    },
    interestScore: 0.9,
    relationshipResolved: true,
    minPriorityScore: 0.65,
    allowedGeographies: ["US"],
    holdoutAssigned: true,
    holdoutTreatment: "treatment",
    deliveryHealthy: true,
    now: NOW
  });

  assert.equal(result.identityDecision.allowed, true);
  assert.equal(result.runbook.currentStep, "draft_message");
  assert.equal(result.currentRole?.key, "message_strategist");
  assert.equal(result.executionPlan.status, "queued");
  assert.equal(result.executionPlan.jobs.length, 1);
  assert.equal(result.executionPlan.jobs[0].queueName, "lifecycle:generation");
  assert.equal(result.executionPlan.jobs[0].jobType, "generation");
  assert.equal(result.executionPlan.jobs[0].idempotencyKey, "lifecycle-event:delta_1:user_1:draft_message:message.generated");
});

test("buildLifecycleChangeEventTriggerPlan suppresses blocked consent without queueing work", () => {
  const result = buildLifecycleChangeEventTriggerPlan({
    workspaceId: "workspace_1",
    eventId: "delta_2",
    changeType: "legal_record_added",
    detectedAt: "2026-05-08T10:00:00.000Z",
    user: {
      id: "user_2",
      email: "lee@example.com",
      segment: "LAPSED"
    },
    interestScore: 0.95,
    relationshipResolved: true,
    minPriorityScore: 0.65,
    providerSuppressed: true,
    holdoutAssigned: true,
    holdoutTreatment: "treatment",
    now: NOW
  });

  assert.equal(result.identityDecision.outcome, "suppressed");
  assert.equal(result.runbook.currentStep, "resolve_identity_consent");
  assert.equal(result.currentRole?.key, "identity_consent_resolver");
  assert.equal(result.executionPlan.status, "blocked");
  assert.equal(result.executionPlan.jobs.length, 0);
});

test("buildLifecycleChangeEventTriggerPlan queues delivery after drafted approved message passes gates", () => {
  const result = buildLifecycleChangeEventTriggerPlan({
    workspaceId: "workspace_1",
    accountUserId: "acct_1",
    eventId: "delta_3",
    changeType: "phone added",
    detectedAt: "2026-05-08T11:00:00.000Z",
    user: {
      id: "user_3",
      email: "morgan@example.com",
      segment: "FREE"
    },
    interestScore: 0.8,
    relationshipResolved: true,
    minPriorityScore: 0.5,
    holdoutAssigned: true,
    holdoutTreatment: "treatment",
    messageDrafted: true,
    approvalRequired: true,
    approvalCompleted: true,
    deliveryHealthy: true,
    now: NOW
  });

  assert.equal(result.runbook.currentStep, "trigger_delivery");
  assert.equal(result.currentRole?.key, "delivery_operator");
  assert.equal(result.executionPlan.status, "queued");
  assert.equal(result.executionPlan.jobs[0].queueName, "lifecycle:provider_write");
  assert.equal(result.executionPlan.jobs[0].priority, 20);
});
