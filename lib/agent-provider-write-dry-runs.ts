import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { enqueueAgentJob } from "@/lib/agent-job-queue";
import type { AgentJobExecutionResult, AgentJobForExecution } from "@/lib/agent-worker";
import type { AdProviderWriteDryRunResult } from "@/lib/ad-connectors/write-dry-run";

const ACQUISITION_MEASUREMENT_OUTPUTS = [
  "spend_moved",
  "wasted_spend_avoided",
  "cac_ltv_movement",
  "roas_change",
  "conversion_quality_notes",
  "revenue_impact_attribution"
];

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

export function buildProviderWriteMeasurementPayload(input: {
  dryRunId: string;
  sourceAgentJobId: string;
  app: string;
  provider: string;
  operationType: string;
  idempotencyKey?: string | null;
  externalAccountId?: string | null;
  externalCampaignId?: string | null;
  spendExposureCents: number;
  rollbackSupported: boolean;
  rollbackPlan?: string | null;
  providerObjects: unknown;
}) {
  return {
    providerWriteDryRunId: input.dryRunId,
    sourceAgentJobId: input.sourceAgentJobId,
    app: input.app,
    provider: input.provider,
    operationType: input.operationType,
    idempotencyKey: input.idempotencyKey ?? null,
    externalAccountId: input.externalAccountId ?? null,
    externalCampaignId: input.externalCampaignId ?? null,
    spendExposureCents: input.spendExposureCents,
    rollbackSupported: input.rollbackSupported,
    rollbackPlan: input.rollbackPlan ?? null,
    providerObjects: input.providerObjects,
    measurementOutputs: ACQUISITION_MEASUREMENT_OUTPUTS
  };
}

export function shouldCreateProviderWriteMeasurementHandoff(record: { app: string; status: string; blockers: string[] }) {
  return record.app === "acquisition" && record.status === "ready" && record.blockers.length === 0;
}

export async function persistAgentProviderWriteDryRun(input: {
  job: AgentJobForExecution;
  result: AgentJobExecutionResult;
}) {
  const record = buildAgentProviderWriteDryRunRecord(input.job, input.result);
  if (!record) return null;

  const dryRun = await db.agentProviderWriteDryRun.upsert({
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

  if (!shouldCreateProviderWriteMeasurementHandoff(record)) return dryRun;

  const measurementPayload = buildProviderWriteMeasurementPayload({
    dryRunId: dryRun.id,
    sourceAgentJobId: record.agentJobId,
    app: record.app,
    provider: record.provider,
    operationType: record.operationType,
    idempotencyKey: record.idempotencyKey,
    externalAccountId: record.externalAccountId,
    externalCampaignId: record.externalCampaignId,
    spendExposureCents: record.spendExposureCents,
    rollbackSupported: record.rollbackSupported,
    rollbackPlan: record.rollbackPlan,
    providerObjects: record.providerObjects
  });

  const observationJob = await enqueueAgentJob({
    workspaceId: record.workspaceId,
    accountUserId: record.accountUserId,
    app: "acquisition",
    queueName: "acquisition:observation",
    jobType: "observation",
    priority: 80,
    idempotencyKey: `dry-run:${dryRun.id}:observation`,
    payload: {
      ...measurementPayload,
      handoffStage: "observation"
    }
  });

  const measurementJob = await enqueueAgentJob({
    workspaceId: record.workspaceId,
    accountUserId: record.accountUserId,
    app: "acquisition",
    queueName: "acquisition:measurement",
    jobType: "measurement",
    priority: 90,
    idempotencyKey: `dry-run:${dryRun.id}:measurement`,
    payload: {
      ...measurementPayload,
      handoffStage: "measurement",
      dependsOnJobId: observationJob.id
    }
  });

  await db.agentProviderWriteMeasurementHandoff.upsert({
    where: { providerWriteDryRunId: dryRun.id },
    update: {
      accountUserId: record.accountUserId,
      sourceAgentJobId: record.agentJobId,
      observationJobId: observationJob.id,
      measurementJobId: measurementJob.id,
      app: record.app,
      provider: record.provider,
      operationType: record.operationType,
      status: "queued",
      measurementOutputs: ACQUISITION_MEASUREMENT_OUTPUTS,
      measurementPayload: jsonInput(measurementPayload)
    },
    create: {
      workspaceId: record.workspaceId,
      accountUserId: record.accountUserId,
      providerWriteDryRunId: dryRun.id,
      sourceAgentJobId: record.agentJobId,
      observationJobId: observationJob.id,
      measurementJobId: measurementJob.id,
      app: record.app,
      provider: record.provider,
      operationType: record.operationType,
      status: "queued",
      measurementOutputs: ACQUISITION_MEASUREMENT_OUTPUTS,
      measurementPayload: jsonInput(measurementPayload)
    }
  });

  return dryRun;
}
