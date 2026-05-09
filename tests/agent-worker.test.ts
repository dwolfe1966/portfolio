import assert from "node:assert/strict";
import test from "node:test";
import { executeAgentJob, runAgentWorkerBatch, runAgentWorkerOnce, type AgentJobForExecution, type AgentWorkerClient } from "@/lib/agent-worker";

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
  const previousAdapter = process.env.ACQUISITION_PROVIDER_DRY_RUN_ADAPTER;
  delete process.env.ACQUISITION_PROVIDER_DRY_RUN_ADAPTER;

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

  if (previousAdapter === undefined) {
    delete process.env.ACQUISITION_PROVIDER_DRY_RUN_ADAPTER;
  } else {
    process.env.ACQUISITION_PROVIDER_DRY_RUN_ADAPTER = previousAdapter;
  }
});

test("executeAgentJob uses configured acquisition dry-run adapter without provider mutation", () => {
  const previousAdapter = process.env.ACQUISITION_PROVIDER_DRY_RUN_ADAPTER;
  process.env.ACQUISITION_PROVIDER_DRY_RUN_ADAPTER = "simulated";

  const result = executeAgentJob({
    ...BASE_JOB,
    app: "acquisition",
    queueName: "acquisition:provider_write",
    jobType: "provider_write",
    payload: {
      approvalRequestId: "approval_1",
      idempotencyKey: "approval:approval_1:provider_write",
      proposedAction: {
        provider: "google_ads",
        operationType: "update_budget",
        campaignId: "camp_1",
        previousBudgetCents: 10000,
        nextBudgetCents: 11000,
        shiftAmountCents: 1000
      }
    }
  });

  assert.equal(result.executor, "acquisition.provider_write.simulated.dry_run");
  assert.equal(result.providerMutation, "dry_run");
  assert.equal(result.output.approvalRequestId, "approval_1");
  assert.equal((result.output.dryRun as { spendExposureCents: number }).spendExposureCents, 1000);

  if (previousAdapter === undefined) {
    delete process.env.ACQUISITION_PROVIDER_DRY_RUN_ADAPTER;
  } else {
    process.env.ACQUISITION_PROVIDER_DRY_RUN_ADAPTER = previousAdapter;
  }
});

test("executeAgentJob can use Google Ads dry-run adapter without provider mutation", () => {
  const previousAdapter = process.env.ACQUISITION_PROVIDER_DRY_RUN_ADAPTER;
  process.env.ACQUISITION_PROVIDER_DRY_RUN_ADAPTER = "google_ads";

  const result = executeAgentJob({
    ...BASE_JOB,
    app: "acquisition",
    queueName: "acquisition:provider_write",
    jobType: "provider_write",
    payload: {
      idempotencyKey: "approval:approval_2:provider_write",
      proposedAction: {
        provider: "google_ads",
        operationType: "update_budget",
        externalAccountId: "1234567890",
        externalCampaignId: "987654321",
        previousBudgetCents: 10000,
        nextBudgetCents: 12500,
        shiftAmountCents: 2500
      }
    }
  });

  assert.equal(result.executor, "acquisition.provider_write.google_ads.dry_run");
  assert.equal(result.providerMutation, "dry_run");
  assert.equal((result.output.dryRun as { externalCampaignId: string }).externalCampaignId, "customers/1234567890/campaigns/987654321");

  if (previousAdapter === undefined) {
    delete process.env.ACQUISITION_PROVIDER_DRY_RUN_ADAPTER;
  } else {
    process.env.ACQUISITION_PROVIDER_DRY_RUN_ADAPTER = previousAdapter;
  }
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

test("runAgentWorkerBatch drains a bounded number of jobs across queues", async () => {
  const claimedByQueue = new Map<string, number>();
  const client: AgentWorkerClient = {
    async claimNext(input) {
      const claimed = claimedByQueue.get(input.queueName) ?? 0;
      claimedByQueue.set(input.queueName, claimed + 1);
      if (input.queueName === "lifecycle:generation" && claimed < 2) {
        return { ...BASE_JOB, id: `lifecycle_job_${claimed + 1}` };
      }
      if (input.queueName === "acquisition:provider_write" && claimed < 1) {
        return {
          ...BASE_JOB,
          id: "acquisition_job_1",
          app: "acquisition",
          jobType: "provider_write",
          queueName: "acquisition:provider_write"
        };
      }
      return null;
    },
    async complete() {
      return {};
    },
    async fail() {
      return { status: "queued" };
    }
  };

  const result = await runAgentWorkerBatch({
    workspaceId: "workspace_1",
    workerId: "batch_worker",
    queueNames: ["lifecycle:generation", "acquisition:provider_write"],
    maxJobs: 3
  }, client);

  assert.equal(result.claimed, 3);
  assert.equal(result.completed, 3);
  assert.equal(result.failed, 0);
  assert.deepEqual(result.results.filter((item) => item.claimed).map((item) => item.queueName), [
    "lifecycle:generation",
    "acquisition:provider_write",
    "lifecycle:generation"
  ]);
});

test("runAgentWorkerBatch stops after one idle pass through every queue", async () => {
  const client: AgentWorkerClient = {
    async claimNext() {
      return null;
    },
    async complete() {
      throw new Error("should not complete");
    },
    async fail() {
      throw new Error("should not fail");
    }
  };

  const result = await runAgentWorkerBatch({
    workspaceId: "workspace_1",
    workerId: "batch_worker",
    queueNames: ["lifecycle:generation", "lifecycle:generation", "  "],
    maxJobs: 10
  }, client);

  assert.equal(result.claimed, 0);
  assert.equal(result.attempted, 1);
  assert.deepEqual(result.queueNames, ["lifecycle:generation"]);
  assert.deepEqual(result.emptyQueues, ["lifecycle:generation"]);
});

test("runAgentWorkerBatch skips disallowed queue names", async () => {
  const seenQueues: string[] = [];
  const client: AgentWorkerClient = {
    async claimNext(input) {
      seenQueues.push(input.queueName);
      return null;
    },
    async complete() {
      throw new Error("should not complete");
    },
    async fail() {
      throw new Error("should not fail");
    }
  };

  const result = await runAgentWorkerBatch({
    workspaceId: "workspace_1",
    workerId: "batch_worker",
    queueNames: ["lifecycle:generation", "pricing:provider_write", "lifecycle:generation"],
    maxJobs: 10
  }, client);

  assert.deepEqual(result.queueNames, ["lifecycle:generation"]);
  assert.deepEqual(result.skippedQueueNames, ["pricing:provider_write"]);
  assert.deepEqual(seenQueues, ["lifecycle:generation"]);
});

test("runAgentWorkerBatch does not fallback to defaults when every explicit queue is disallowed", async () => {
  const client: AgentWorkerClient = {
    async claimNext() {
      throw new Error("should not claim");
    },
    async complete() {
      throw new Error("should not complete");
    },
    async fail() {
      throw new Error("should not fail");
    }
  };

  const result = await runAgentWorkerBatch({
    workspaceId: "workspace_1",
    workerId: "batch_worker",
    queueNames: ["pricing:provider_write", "retention:generation"],
    maxJobs: 10
  }, client);

  assert.equal(result.attempted, 0);
  assert.equal(result.claimed, 0);
  assert.deepEqual(result.queueNames, []);
  assert.deepEqual(result.skippedQueueNames, ["pricing:provider_write", "retention:generation"]);
});
