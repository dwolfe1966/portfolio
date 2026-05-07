import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAgentJobRetryDecision,
  calculateAgentJobBackoffMs,
  evaluateAgentJobManualAction,
  normalizeAgentJobInput
} from "@/lib/agent-job-queue";

test("normalizeAgentJobInput clamps priority, attempts, queue, and idempotency fields", () => {
  const input = normalizeAgentJobInput({
    workspaceId: "workspace_1",
    app: "lifecycle",
    queueName: "  lifecycle-delivery  ",
    jobType: "delivery",
    payload: { messageId: "msg_1" },
    priority: -20,
    maxAttempts: 99,
    idempotencyKey: "  delivery-key  "
  });

  assert.equal(input.queueName, "lifecycle-delivery");
  assert.equal(input.priority, 0);
  assert.equal(input.maxAttempts, 25);
  assert.equal(input.idempotencyKey, "delivery-key");
});

test("calculateAgentJobBackoffMs grows exponentially with a cap", () => {
  assert.equal(calculateAgentJobBackoffMs(1), 30_000);
  assert.equal(calculateAgentJobBackoffMs(2), 60_000);
  assert.equal(calculateAgentJobBackoffMs(20), 900_000);
});

test("buildAgentJobRetryDecision requeues before max attempts", () => {
  const now = new Date("2026-05-07T12:00:00.000Z");
  const decision = buildAgentJobRetryDecision({
    attemptCount: 1,
    maxAttempts: 3,
    errorCode: "PROVIDER_TIMEOUT",
    errorMessage: "Provider timed out.",
    now
  });

  assert.equal(decision.status, "queued");
  assert.equal(decision.attemptCount, 2);
  assert.equal(decision.errorCode, "PROVIDER_TIMEOUT");
  assert.equal(decision.runAfter?.toISOString(), "2026-05-07T12:01:00.000Z");
  assert.equal(decision.deadLetteredAt, null);
});

test("buildAgentJobRetryDecision dead-letters at max attempts", () => {
  const now = new Date("2026-05-07T12:00:00.000Z");
  const decision = buildAgentJobRetryDecision({
    attemptCount: 2,
    maxAttempts: 3,
    now
  });

  assert.equal(decision.status, "dead_lettered");
  assert.equal(decision.attemptCount, 3);
  assert.equal(decision.runAfter, null);
  assert.equal(decision.deadLetteredAt?.toISOString(), "2026-05-07T12:00:00.000Z");
});

test("evaluateAgentJobManualAction allows worker-safe transitions", () => {
  assert.deepEqual(evaluateAgentJobManualAction({ status: "queued", action: "claim" }), {
    allowed: true,
    nextStatus: "running",
    reason: "queued_job_claimable"
  });
  assert.deepEqual(evaluateAgentJobManualAction({ status: "running", action: "complete" }), {
    allowed: true,
    nextStatus: "completed",
    reason: "running_job_completable"
  });
  assert.deepEqual(evaluateAgentJobManualAction({ status: "running", action: "fail" }), {
    allowed: true,
    nextStatus: "failed",
    reason: "running_job_failable"
  });
  assert.deepEqual(evaluateAgentJobManualAction({ status: "dead_lettered", action: "requeue" }), {
    allowed: true,
    nextStatus: "queued",
    reason: "terminal_job_requeueable"
  });
});

test("evaluateAgentJobManualAction blocks invalid transitions", () => {
  assert.deepEqual(evaluateAgentJobManualAction({ status: "completed", action: "claim" }), {
    allowed: false,
    nextStatus: "completed",
    reason: "job_must_be_queued"
  });
  assert.deepEqual(evaluateAgentJobManualAction({ status: "queued", action: "complete" }), {
    allowed: false,
    nextStatus: "queued",
    reason: "job_must_be_running"
  });
  assert.deepEqual(evaluateAgentJobManualAction({ status: "completed", action: "requeue" }), {
    allowed: false,
    nextStatus: "completed",
    reason: "job_must_be_terminal_or_failed"
  });
});
