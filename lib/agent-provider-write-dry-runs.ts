import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { AgentJobExecutionResult, AgentJobForExecution } from "@/lib/agent-worker";
import type { AdProviderWriteDryRunResult } from "@/lib/ad-connectors/write-dry-run";

function jsonInput(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item ?? "").trim()).filter(Boolean) : [];
}

function dryRunFromResult(result: AgentJobExecutionResult): AdProviderWriteDryRunResult | null {
  const candidate = result.output.dryRun;
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return null;
  const dryRun = candidate as Partial<AdProviderWriteDryRunResult>;
  if (dryRun.mode !== "dry_run") return null;
  if (!dryRun.provider || !dryRun.operationType) return null;
  return dryRun as AdProviderWriteDryRunResult;
}

export function buildAgentProviderWriteDryRunRecord(job: AgentJobForExecution, result: AgentJobExecutionResult) {
  if (job.jobType !== "provider_write" || result.providerMutation !== "dry_run") return null;
  const dryRun = dryRunFromResult(result);
  if (!dryRun) return null;

  return {
    workspaceId: job.workspaceId,
    accountUserId: job.accountUserId ?? null,
    agentJobId: job.id,
    app: job.app,
    provider: dryRun.provider,
    operationType: dryRun.operationType,
    mode: dryRun.mode,
    status: dryRun.blockers.length > 0 ? "blocked" : "ready",
    idempotencyKey: dryRun.idempotencyKey,
    externalAccountId: dryRun.externalAccountId,
    externalCampaignId: dryRun.externalCampaignId,
    permissionChecks: jsonInput(dryRun.permissionChecks),
    providerObjects: jsonInput(dryRun.providerObjects),
    spendExposureCents: dryRun.spendExposureCents,
    rollbackSupported: dryRun.rollbackSupported,
    rollbackPlan: dryRun.rollbackPlan,
    blockers: stringArray(dryRun.blockers),
    warnings: stringArray(dryRun.warnings),
    rawResult: jsonInput(dryRun)
  };
}

export async function persistAgentProviderWriteDryRun(input: {
  job: AgentJobForExecution;
  result: AgentJobExecutionResult;
}) {
  const record = buildAgentProviderWriteDryRunRecord(input.job, input.result);
  if (!record) return null;

  return db.agentProviderWriteDryRun.upsert({
    where: { agentJobId: record.agentJobId },
    update: {
      accountUserId: record.accountUserId,
      app: record.app,
      provider: record.provider,
      operationType: record.operationType,
      mode: record.mode,
      status: record.status,
      idempotencyKey: record.idempotencyKey,
      externalAccountId: record.externalAccountId,
      externalCampaignId: record.externalCampaignId,
      permissionChecks: record.permissionChecks,
      providerObjects: record.providerObjects,
      spendExposureCents: record.spendExposureCents,
      rollbackSupported: record.rollbackSupported,
      rollbackPlan: record.rollbackPlan,
      blockers: record.blockers,
      warnings: record.warnings,
      rawResult: record.rawResult
    },
    create: record
  });
}
