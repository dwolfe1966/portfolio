import assert from "node:assert/strict";
import test from "node:test";
import { executeAgentJob, runAgentWorkerOnce, type AgentJobForExecution, type AgentWorkerClient } from "@/lib/agent-worker";

const BASE_JOB: AgentJobForExecution = {
  id: "job_1",
  workspaceId: "workspace_1",
  accountUserId: "acct_1",
  app: "lifecycle",
  queueName: "lifecycle:generation",
  jobType: "generation",
  payload: {
    runbookId: "run_1",
    stepKey: "draft_message",
    input: { eventId: "delta_1" }
  },
  attemptCount: 0,
  maxAttempts: 3
};

test("executeAgentJob handles lifecycle generation as a non-mutating fake executor", () => {
  const result = executeAgentJob(BASE_JOB);

  assert.equal(result.executor, "lifecycle.message_strategist.fake");
  assert.equal(result.action, "draft_message_strategy");
  assert.equal(result.providerMutation, "none");
  assert.equal(result.output.runbookId, "run_1");
});

test("executeAgentJob simulates provider writes without real provider mutation", () => {
  const result = executeAgentJob({
    ...BASE_JOB,
    app: "acquisition",
    queueName: "acquisition:provider_write",
    jobType: "provider_write",
    payload: { approvalRequestId: "approval_1", proposedAction: { campaignId: "camp_1" } }
  });

  assert.equal(result.executor, "acquisition.provider_write.fake");
  assert.equal(result.providerMutation, "simulated");
  assert.deepEqual(result.output.proposedAction, { campaignId: "camp_1" });
});

test("runAgentWorkerOnce claims and completes one queued job", async () => {
  const calls: string[] = [];
  const client: AgentWorkerClient = {
    async claimNext() {
      calls.push("claim");
      return BASE_JOB;
    },
    async complete(input) {
      calls.push(`complete:${input.id}`);
      return {};
    },
    async fail() {
      calls.push("fail");
      return { status: "queued" };
    }
  };

  const result = await runAgentWorkerOnce({
    workspaceId: "workspace_1",
    queueName: "lifecycle:generation",
    workerId: "test_worker"
  }, client);

  assert.equal(result.claimed, true);
  assert.equal(result.status, "completed");
  assert.deepEqual(calls, ["claim", "complete:job_1"]);
});

test("runAgentWorkerOnce fails unsupported jobs through retry policy", async () => {
  const client: AgentWorkerClient = {
    async claimNext() {
      return { ...BASE_JOB, app: "pricing", jobType: "provider_write", queueName: "pricing:provider_write" };
    },
    async complete() {
      throw new Error("should not complete");
    },
    async fail(input) {
      assert.equal(input.errorCode, "AGENT_EXECUTION_FAILED");
      assert.equal(input.id, "job_1");
      return { status: "queued" };
    }
  };

  const result = await runAgentWorkerOnce({
    workspaceId: "workspace_1",
    queueName: "pricing:provider_write",
    workerId: "test_worker"
  }, client);

  assert.equal(result.claimed, true);
  assert.equal(result.status, "failed");
  assert.match(result.errorMessage, /No executor is registered/);
});
