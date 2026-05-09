import { claimNextAgentJob, completeAgentJob, failAgentJob } from "@/lib/agent-job-queue";

export type AgentJobForExecution = {
  id: string;
  workspaceId: string;
  accountUserId?: string | null;
  app: string;
  queueName: string;
  jobType: string;
  payload: unknown;
  attemptCount: number;
  maxAttempts: number;
};

export type AgentJobExecutionResult = {
  executor: string;
  action: string;
  providerMutation: "none" | "dry_run" | "simulated";
  summary: string;
  output: Record<string, unknown>;
};

export type AgentWorkerRunResult =
  | { claimed: false; queueName: string; workerId: string }
  | { claimed: true; queueName: string; workerId: string; jobId: string; status: "completed"; result: AgentJobExecutionResult }
  | { claimed: true; queueName: string; workerId: string; jobId: string; status: "failed" | "dead_lettered"; errorCode: string; errorMessage: string };

export type AgentWorkerBatchResult = {
  workspaceId: string;
  workerId: string;
  maxJobs: number;
  queueNames: string[];
  skippedQueueNames: string[];
  attempted: number;
  claimed: number;
  completed: number;
  failed: number;
  deadLettered: number;
  emptyQueues: string[];
  results: AgentWorkerRunResult[];
};

export type AgentWorkerClient = {
  claimNext(input: { workspaceId: string; queueName: string; workerId: string; now?: Date }): Promise<AgentJobForExecution | null>;
  complete(input: { id: string; result?: unknown; now?: Date }): Promise<unknown>;
  fail(input: {
    id: string;
    attemptCount: number;
    maxAttempts: number;
    errorCode?: string | null;
    errorMessage?: string | null;
    now?: Date;
  }): Promise<{ status: string } | unknown>;
};

export const DEFAULT_AGENT_WORKER_QUEUES = [
  "lifecycle:ingestion",
  "lifecycle:scoring",
  "lifecycle:generation",
  "lifecycle:provider_write",
  "lifecycle:observation",
  "lifecycle:measurement",
  "lifecycle:audit",
  "acquisition:provider_write",
  "acquisition:observation",
  "acquisition:measurement",
  "acquisition:audit"
] as const;

export const AGENT_WORKER_QUEUE_ALLOWLIST = new Set<string>(DEFAULT_AGENT_WORKER_QUEUES);

function payloadObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function executionResult(input: Omit<AgentJobExecutionResult, "providerMutation"> & { providerMutation?: AgentJobExecutionResult["providerMutation"] }): AgentJobExecutionResult {
  return {
    providerMutation: "none",
    ...input
  };
}

export function executeAgentJob(job: AgentJobForExecution): AgentJobExecutionResult {
  const payload = payloadObject(job.payload);

  if (job.app === "lifecycle" && job.jobType === "generation") {
    return executionResult({
      executor: "lifecycle.message_strategist.fake",
      action: "draft_message_strategy",
      summary: "Prepared lifecycle message strategy placeholder from queued event context.",
      output: {
        runbookId: payload.runbookId ?? null,
        stepKey: payload.stepKey ?? null,
        candidateInput: payload.input ?? {},
        draftMode: "placeholder"
      }
    });
  }

  if (job.app === "lifecycle" && job.jobType === "provider_write") {
    return executionResult({
      executor: "lifecycle.delivery_operator.fake",
      action: "simulate_delivery_provider_write",
      providerMutation: "simulated",
      summary: "Simulated lifecycle delivery provider write without sending a message.",
      output: {
        runbookId: payload.runbookId ?? null,
        stepKey: payload.stepKey ?? null,
        deliveryMode: "simulated"
      }
    });
  }

  if (job.app === "lifecycle" && job.jobType === "observation") {
    return executionResult({
      executor: "lifecycle.outcome_observer.fake",
      action: "observe_outcome_placeholder",
      summary: "Recorded placeholder lifecycle outcome observation.",
      output: { runbookId: payload.runbookId ?? null, observed: true }
    });
  }

  if (job.app === "lifecycle" && job.jobType === "measurement") {
    return executionResult({
      executor: "lifecycle.revenue_attributor.fake",
      action: "attribute_revenue_placeholder",
      summary: "Recorded placeholder lifecycle revenue attribution.",
      output: { runbookId: payload.runbookId ?? null, attributed: true }
    });
  }

  if (job.app === "acquisition" && job.jobType === "provider_write") {
    return executionResult({
      executor: "acquisition.provider_write.fake",
      action: "simulate_ad_provider_write",
      providerMutation: "simulated",
      summary: "Simulated acquisition provider write without mutating an ad account.",
      output: {
        approvalRequestId: payload.approvalRequestId ?? null,
        proposedAction: payload.proposedAction ?? payload.input ?? {}
      }
    });
  }

  if (["ingestion", "scoring", "audit"].includes(job.jobType)) {
    return executionResult({
      executor: `${job.app}.${job.jobType}.fake`,
      action: "complete_control_checkpoint",
      summary: "Completed a non-mutating agent checkpoint.",
      output: { app: job.app, jobType: job.jobType, queueName: job.queueName }
    });
  }

  throw new Error(`No executor is registered for ${job.app}:${job.jobType}.`);
}

function normalizeQueueNames(value: readonly string[] | undefined) {
  const hasExplicitQueues = Boolean(value && value.length > 0);
  const source = hasExplicitQueues ? value! : DEFAULT_AGENT_WORKER_QUEUES;
  const seen = new Set<string>();
  const normalized: string[] = [];
  const skipped: string[] = [];

  for (const queue of source) {
    const clean = String(queue ?? "").trim().slice(0, 120);
    if (!clean || seen.has(clean)) continue;
    seen.add(clean);
    if (!AGENT_WORKER_QUEUE_ALLOWLIST.has(clean)) {
      skipped.push(clean);
      continue;
    }
    normalized.push(clean);
  }

  return {
    queueNames: normalized.length > 0 || hasExplicitQueues ? normalized : [...DEFAULT_AGENT_WORKER_QUEUES],
    skippedQueueNames: skipped
  };
}

export async function runAgentWorkerOnce(
  input: { workspaceId: string; queueName: string; workerId: string; now?: Date },
  client: AgentWorkerClient = {
    claimNext: claimNextAgentJob,
    complete: completeAgentJob,
    fail: failAgentJob
  }
): Promise<AgentWorkerRunResult> {
  const now = input.now ?? new Date();
  const job = await client.claimNext({ ...input, now });
  if (!job) return { claimed: false, queueName: input.queueName, workerId: input.workerId };

  try {
    const result = executeAgentJob(job);
    await client.complete({ id: job.id, result, now });
    return { claimed: true, queueName: input.queueName, workerId: input.workerId, jobId: job.id, status: "completed", result };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Agent job execution failed.";
    const updated = await client.fail({
      id: job.id,
      attemptCount: job.attemptCount,
      maxAttempts: job.maxAttempts,
      errorCode: "AGENT_EXECUTION_FAILED",
      errorMessage: message,
      now
    }) as { status?: string };
    const status = updated.status === "dead_lettered" ? "dead_lettered" : "failed";
    return {
      claimed: true,
      queueName: input.queueName,
      workerId: input.workerId,
      jobId: job.id,
      status,
      errorCode: "AGENT_EXECUTION_FAILED",
      errorMessage: message
    };
  }
}

export async function runAgentWorkerBatch(
  input: {
    workspaceId: string;
    workerId: string;
    queueNames?: readonly string[];
    maxJobs?: number;
    now?: Date;
  },
  client?: AgentWorkerClient
): Promise<AgentWorkerBatchResult> {
  const { queueNames, skippedQueueNames } = normalizeQueueNames(input.queueNames);
  const maxJobs = Math.max(1, Math.min(50, Math.round(Number(input.maxJobs ?? queueNames.length))));
  const results: AgentWorkerRunResult[] = [];
  const emptyQueues = new Set<string>();
  let queueIndex = 0;
  let idlePasses = 0;

  while (results.filter((result) => result.claimed).length < maxJobs && idlePasses < queueNames.length) {
    const queueName = queueNames[queueIndex % queueNames.length];
    queueIndex += 1;

    const result = await runAgentWorkerOnce({
      workspaceId: input.workspaceId,
      queueName,
      workerId: input.workerId,
      now: input.now
    }, client);

    results.push(result);

    if (result.claimed) {
      idlePasses = 0;
      emptyQueues.delete(queueName);
    } else {
      idlePasses += 1;
      emptyQueues.add(queueName);
    }
  }

  const claimed = results.filter((result) => result.claimed).length;
  const completed = results.filter((result) => result.claimed && result.status === "completed").length;
  const failed = results.filter((result) => result.claimed && result.status === "failed").length;
  const deadLettered = results.filter((result) => result.claimed && result.status === "dead_lettered").length;

  return {
    workspaceId: input.workspaceId,
    workerId: input.workerId,
    maxJobs,
    queueNames,
    skippedQueueNames,
    attempted: results.length,
    claimed,
    completed,
    failed,
    deadLettered,
    emptyQueues: [...emptyQueues],
    results
  };
}
