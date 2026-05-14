import { Prisma } from "@prisma/client";
import type { AdProviderSandboxWriteResult } from "@/lib/ad-connectors/sandbox-write";

export type ProviderWriteRollbackStatus = "pending_review" | "reviewed" | "blocked" | "not_reversible";
export type ProviderWriteReversalStatus = "not_started" | "approved" | "rejected" | "applied" | "failed";
export type ProviderWriteRollbackReviewDecision = "approve_reversal" | "reject_reversal" | "mark_reviewed" | "mark_reversed" | "mark_failed";

export type ProviderWriteRollbackRecordInput = {
  workspaceId: string;
  accountUserId?: string | null;
  providerWriteDryRunId: string;
  mutationResult: AdProviderSandboxWriteResult;
  retentionDays?: number | null;
  now?: Date;
};

export type ProviderWriteRollbackReviewInput = {
  decision: ProviderWriteRollbackReviewDecision;
  reviewedByAccountUserId?: string | null;
  reversalProviderOperationId?: string | null;
  now?: Date;
};

const DEFAULT_RETENTION_DAYS = 180;
const MIN_RETENTION_DAYS = 30;
const MAX_RETENTION_DAYS = 730;

function jsonInput(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
}

function clean(value: string | null | undefined, max = 500) {
  return String(value ?? "").trim().slice(0, max);
}

function clampRetentionDays(value: number | null | undefined) {
  const days = Number(value ?? DEFAULT_RETENTION_DAYS);
  if (!Number.isFinite(days)) return DEFAULT_RETENTION_DAYS;
  return Math.max(MIN_RETENTION_DAYS, Math.min(MAX_RETENTION_DAYS, Math.round(days)));
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function objectState(
  providerObjects: AdProviderSandboxWriteResult["providerObjects"],
  key: "before" | "after"
) {
  return providerObjects.map((object) => ({
    resourceType: object.resourceType,
    resourceId: object.resourceId,
    state: object[key]
  }));
}

export function rollbackStatusForMutationResult(result: AdProviderSandboxWriteResult): ProviderWriteRollbackStatus {
  if (result.status === "blocked") return "blocked";
  if (!result.rollback.supported) return "not_reversible";
  return "pending_review";
}

export function buildProviderWriteRollbackRecord(input: ProviderWriteRollbackRecordInput) {
  const result = input.mutationResult;
  if (result.mode !== "sandbox_mutation") return null;
  if (!clean(result.providerOperationId, 240)) return null;

  const now = input.now ?? new Date();
  const retentionDays = clampRetentionDays(input.retentionDays);

  return {
    workspaceId: input.workspaceId,
    accountUserId: input.accountUserId ?? null,
    providerWriteDryRunId: input.providerWriteDryRunId,
    provider: clean(result.provider, 80),
    operationType: clean(result.operationType, 120),
    externalAccountId: clean(result.externalAccountId, 160) || null,
    externalCampaignId: clean(result.externalCampaignId, 220) || null,
    mutationIdempotencyKey: clean(result.idempotencyKey, 240),
    providerOperationId: clean(result.providerOperationId, 240),
    rollbackProviderOperationId: clean(result.rollback.providerOperationId, 240) || null,
    status: rollbackStatusForMutationResult(result),
    reversalStatus: "not_started" as ProviderWriteReversalStatus,
    beforeState: jsonInput(objectState(result.providerObjects, "before")),
    afterState: jsonInput(objectState(result.providerObjects, "after")),
    rollbackPlan: clean(result.rollback.plan, 1200) || null,
    retentionExpiresAt: addDays(now, retentionDays),
    reviewedByAccountUserId: null,
    reviewedAt: null,
    reviewDecision: null,
    reversalProviderOperationId: null,
    reversedAt: null,
    rawMutationResult: jsonInput(result)
  };
}

export function buildProviderWriteRollbackReviewUpdate(input: ProviderWriteRollbackReviewInput) {
  const now = input.now ?? new Date();
  const reviewedByAccountUserId = clean(input.reviewedByAccountUserId, 120) || null;
  const reversalProviderOperationId = clean(input.reversalProviderOperationId, 240) || null;

  if (input.decision === "approve_reversal") {
    return {
      status: "reviewed" as ProviderWriteRollbackStatus,
      reversalStatus: "approved" as ProviderWriteReversalStatus,
      reviewedByAccountUserId,
      reviewedAt: now,
      reviewDecision: input.decision,
      reversalProviderOperationId: null,
      reversedAt: null
    };
  }

  if (input.decision === "reject_reversal") {
    return {
      status: "reviewed" as ProviderWriteRollbackStatus,
      reversalStatus: "rejected" as ProviderWriteReversalStatus,
      reviewedByAccountUserId,
      reviewedAt: now,
      reviewDecision: input.decision,
      reversalProviderOperationId: null,
      reversedAt: null
    };
  }

  if (input.decision === "mark_reversed") {
    return {
      status: "reviewed" as ProviderWriteRollbackStatus,
      reversalStatus: "applied" as ProviderWriteReversalStatus,
      reviewedByAccountUserId,
      reviewedAt: now,
      reviewDecision: input.decision,
      reversalProviderOperationId,
      reversedAt: now
    };
  }

  if (input.decision === "mark_failed") {
    return {
      status: "reviewed" as ProviderWriteRollbackStatus,
      reversalStatus: "failed" as ProviderWriteReversalStatus,
      reviewedByAccountUserId,
      reviewedAt: now,
      reviewDecision: input.decision,
      reversalProviderOperationId,
      reversedAt: null
    };
  }

  return {
    status: "reviewed" as ProviderWriteRollbackStatus,
    reversalStatus: "not_started" as ProviderWriteReversalStatus,
    reviewedByAccountUserId,
    reviewedAt: now,
    reviewDecision: input.decision,
    reversalProviderOperationId: null,
    reversedAt: null
  };
}
