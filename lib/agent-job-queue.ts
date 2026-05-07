import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export type AgentJobApp = "lifecycle" | "acquisition" | "auction" | "pricing" | "retention" | "expansion" | "platform";
export type AgentJobType =
  | "ingestion"
  | "scoring"
  | "generation"
  | "delivery"
  | "provider_write"
  | "observation"
  | "audit"
  | "measurement";
export type AgentJobStatus = "queued" | "running" | "completed" | "failed" | "dead_lettered" | "cancelled";

export type AgentJobQueueInput = {
  workspaceId: string;
  accountUserId?: string | null;
  app: AgentJobApp;
  queueName: string;
  jobType: AgentJobType;
  payload: unknown;
  priority?: number;
  idempotencyKey?: string | null;
  maxAttempts?: number;
  runAfter?: Date;
};

export type AgentJobRetryDecision = {
  status: AgentJobStatus;
  attemptCount: number;
  runAfter: Date | null;
  deadLetteredAt: Date | null;
  errorCode: string;
  errorMessage: string;
};

export type AgentJobManualAction = "claim" | "complete" | "fail" | "cancel" | "requeue";

export type AgentJobManualActionDecision = {
  allowed: boolean;
  nextStatus: AgentJobStatus;
  reason: string;
};

const DEFAULT_MAX_ATTEMPTS = 3;
const MAX_PRIORITY = 1000;
const MIN_PRIORITY = 0;
const BASE_BACKOFF_MS = 30_000;
const MAX_BACKOFF_MS = 15 * 60_000;

function jsonInput(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
}

function clean(value: string, max = 120) {
  return value.trim().slice(0, max);
}

export function normalizeAgentJobInput(input: AgentJobQueueInput): AgentJobQueueInput {
  return {
    ...input,
    queueName: clean(input.queueName || `${input.app}:${input.jobType}`),
    priority: Math.max(MIN_PRIORITY, Math.min(MAX_PRIORITY, Math.round(Number(input.priority ?? 100)))),
    idempotencyKey: input.idempotencyKey ? clean(input.idempotencyKey, 180) : null,
    maxAttempts: Math.max(1, Math.min(25, Math.round(Number(input.maxAttempts ?? DEFAULT_MAX_ATTEMPTS)))),
    runAfter: input.runAfter ?? new Date()
  };
}

export function calculateAgentJobBackoffMs(attemptCount: number) {
  const attempts = Math.max(1, Math.round(Number(attemptCount)));
  return Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * 2 ** (attempts - 1));
}

export function buildAgentJobRetryDecision(input: {
  attemptCount: number;
  maxAttempts: number;
  errorCode?: string | null;
  errorMessage?: string | null;
  now?: Date;
}): AgentJobRetryDecision {
  const now = input.now ?? new Date();
  const attemptCount = Math.max(0, Math.round(Number(input.attemptCount))) + 1;
  const maxAttempts = Math.max(1, Math.round(Number(input.maxAttempts)));
  const errorCode = clean(input.errorCode || "JOB_FAILED", 80);
  const errorMessage = clean(input.errorMessage || "Agent job failed.", 500);

  if (attemptCount >= maxAttempts) {
    return {
      status: "dead_lettered",
      attemptCount,
      runAfter: null,
      deadLetteredAt: now,
      errorCode,
      errorMessage
    };
  }

  return {
    status: "queued",
    attemptCount,
    runAfter: new Date(now.getTime() + calculateAgentJobBackoffMs(attemptCount)),
    deadLetteredAt: null,
    errorCode,
    errorMessage
  };
}

export function evaluateAgentJobManualAction(input: {
  status: AgentJobStatus | string;
  action: AgentJobManualAction | string;
}): AgentJobManualActionDecision {
  const status = input.status as AgentJobStatus;
  const action = input.action as AgentJobManualAction;

  if (action === "claim") {
    return status === "queued"
      ? { allowed: true, nextStatus: "running", reason: "queued_job_claimable" }
      : { allowed: false, nextStatus: status, reason: "job_must_be_queued" };
  }

  if (action === "complete") {
    return status === "running"
      ? { allowed: true, nextStatus: "completed", reason: "running_job_completable" }
      : { allowed: false, nextStatus: status, reason: "job_must_be_running" };
  }

  if (action === "fail") {
    return status === "running"
      ? { allowed: true, nextStatus: "failed", reason: "running_job_failable" }
      : { allowed: false, nextStatus: status, reason: "job_must_be_running" };
  }

  if (action === "cancel") {
    return status === "queued" || status === "running"
      ? { allowed: true, nextStatus: "cancelled", reason: "open_job_cancellable" }
      : { allowed: false, nextStatus: status, reason: "job_must_be_open" };
  }

  if (action === "requeue") {
    return status === "dead_lettered" || status === "failed" || status === "cancelled"
      ? { allowed: true, nextStatus: "queued", reason: "terminal_job_requeueable" }
      : { allowed: false, nextStatus: status, reason: "job_must_be_terminal_or_failed" };
  }

  return { allowed: false, nextStatus: status, reason: "unknown_action" };
}

export async function enqueueAgentJob(input: AgentJobQueueInput) {
  const normalized = normalizeAgentJobInput(input);
  const data = {
    workspaceId: normalized.workspaceId,
    accountUserId: normalized.accountUserId ?? null,
    app: normalized.app,
    queueName: normalized.queueName,
    jobType: normalized.jobType,
    status: "queued",
    priority: normalized.priority,
    idempotencyKey: normalized.idempotencyKey,
    payload: jsonInput(normalized.payload),
    maxAttempts: normalized.maxAttempts,
    runAfter: normalized.runAfter
  };

  if (normalized.idempotencyKey) {
    return db.agentJob.upsert({
      where: {
        workspaceId_queueName_idempotencyKey: {
          workspaceId: normalized.workspaceId,
          queueName: normalized.queueName,
          idempotencyKey: normalized.idempotencyKey
        }
      },
      update: {},
      create: data
    });
  }

  return db.agentJob.create({ data });
}

export async function claimNextAgentJob(input: { workspaceId: string; queueName: string; workerId: string; now?: Date }) {
  const now = input.now ?? new Date();
  return db.$transaction(async (tx) => {
    const job = await tx.agentJob.findFirst({
      where: {
        workspaceId: input.workspaceId,
        queueName: input.queueName,
        status: "queued",
        runAfter: { lte: now }
      },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }]
    });
    if (!job) return null;
    return tx.agentJob.update({
      where: { id: job.id },
      data: {
        status: "running",
        lockedAt: now,
        lockedBy: clean(input.workerId, 120)
      }
    });
  });
}

export async function completeAgentJob(input: { id: string; result?: unknown; now?: Date }) {
  const now = input.now ?? new Date();
  return db.agentJob.update({
    where: { id: input.id },
    data: {
      status: "completed",
      result: input.result === undefined ? undefined : jsonInput(input.result),
      completedAt: now,
      lockedAt: null,
      lockedBy: null
    }
  });
}

export async function failAgentJob(input: {
  id: string;
  attemptCount: number;
  maxAttempts: number;
  errorCode?: string | null;
  errorMessage?: string | null;
  now?: Date;
}) {
  const decision = buildAgentJobRetryDecision(input);
  return db.agentJob.update({
    where: { id: input.id },
    data: {
      status: decision.status,
      attemptCount: decision.attemptCount,
      runAfter: decision.runAfter ?? undefined,
      deadLetteredAt: decision.deadLetteredAt,
      failedAt: decision.status === "dead_lettered" ? decision.deadLetteredAt : null,
      errorCode: decision.errorCode,
      errorMessage: decision.errorMessage,
      lockedAt: null,
      lockedBy: null
    }
  });
}
