import type { AgentApprovalRiskLevel } from "@/lib/agent-approval-queue";
import type { AgentJobApp, AgentJobType } from "@/lib/agent-job-queue";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export type AgentRunbookStepForPlanning = {
  key: string;
  status: string;
  auditEvent: string;
  summary: string;
  reasons: string[];
};

export type AgentExecutionPlanInput = {
  workspaceId: string;
  accountUserId?: string | null;
  app: AgentJobApp;
  runbookId: string;
  currentStep: string;
  steps: AgentRunbookStepForPlanning[];
  payload?: unknown;
  proposedAction?: unknown;
  approvalPolicy?: unknown;
  riskLevel?: AgentApprovalRiskLevel;
  requiredApproverRole?: string | null;
  now?: Date;
};

export type PlannedAgentJob = {
  workspaceId: string;
  accountUserId: string | null;
  app: AgentJobApp;
  queueName: string;
  jobType: AgentJobType;
  idempotencyKey: string;
  payload: unknown;
  priority: number;
  runAfter: Date;
};

export type PlannedAgentApprovalRequest = {
  workspaceId: string;
  requestedByAccountUserId: string | null;
  app: AgentJobApp;
  actionType: string;
  riskLevel: AgentApprovalRiskLevel;
  title: string;
  summary: string;
  proposedAction: unknown;
  approvalPolicy: unknown;
  requiredApproverRole: string | null;
  dueAt: Date;
  expiresAt: Date;
};

export type AgentExecutionPlan = {
  status: "queued" | "approval_required" | "waiting" | "blocked" | "complete";
  currentStep: AgentRunbookStepForPlanning | null;
  jobs: PlannedAgentJob[];
  approvals: PlannedAgentApprovalRequest[];
  blockedReasons: string[];
};

export type AgentApprovalContinuationInput = {
  workspaceId: string;
  accountUserId?: string | null;
  app: AgentJobApp;
  approvalRequestId: string;
  actionType: string;
  proposedAction: unknown;
  now?: Date;
};

export type PersistedAgentExecutionPlan = {
  jobsCreated: number;
  approvalsCreated: number;
};

type AgentExecutionPlanClient = Pick<typeof db, "agentJob" | "agentApprovalRequest"> | Prisma.TransactionClient;

const JOB_TYPE_BY_AUDIT_PREFIX: Array<[RegExp, AgentJobType]> = [
  [/source\.|performance\.synced|sync/i, "ingestion"],
  [/candidate\.scored|score/i, "scoring"],
  [/message\.generated|action\.recommended|draft|generate/i, "generation"],
  [/delivery\.|provider\./i, "provider_write"],
  [/outcome\.observed|observe/i, "observation"],
  [/revenue\.attributed|measurement/i, "measurement"],
  [/audit|policy\.checked|consent\.checked/i, "audit"]
];

function clean(value: string, max = 160) {
  return value.trim().slice(0, max);
}

function jsonInput(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
}

function classifyJobType(step: AgentRunbookStepForPlanning): AgentJobType {
  const target = `${step.auditEvent} ${step.key} ${step.summary}`;
  return JOB_TYPE_BY_AUDIT_PREFIX.find(([pattern]) => pattern.test(target))?.[1] ?? "audit";
}

function actionTypeFromStep(step: AgentRunbookStepForPlanning) {
  return clean(step.key || step.auditEvent || "agent_action", 120);
}

function queueNameFor(app: AgentJobApp, jobType: AgentJobType) {
  return `${app}:${jobType}`;
}

export function buildAgentExecutionPlan(input: AgentExecutionPlanInput): AgentExecutionPlan {
  const now = input.now ?? new Date();
  const currentStep = input.steps.find((step) => step.key === input.currentStep) ?? null;
  if (!currentStep) {
    return {
      status: "blocked",
      currentStep: null,
      jobs: [],
      approvals: [],
      blockedReasons: ["Current runbook step was not found."]
    };
  }

  if (currentStep.status === "completed") {
    return {
      status: "complete",
      currentStep,
      jobs: [],
      approvals: [],
      blockedReasons: []
    };
  }

  if (currentStep.status === "blocked" || currentStep.status === "suppressed") {
    return {
      status: "blocked",
      currentStep,
      jobs: [],
      approvals: [],
      blockedReasons: currentStep.reasons.length > 0 ? currentStep.reasons : ["Current runbook step is blocked."]
    };
  }

  if (currentStep.status === "waiting") {
    return {
      status: "waiting",
      currentStep,
      jobs: [],
      approvals: [],
      blockedReasons: []
    };
  }

  if (currentStep.status === "approval_required") {
    const actionType = actionTypeFromStep(currentStep);
    const dueAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    return {
      status: "approval_required",
      currentStep,
      jobs: [],
      approvals: [
        {
          workspaceId: input.workspaceId,
          requestedByAccountUserId: input.accountUserId ?? null,
          app: input.app,
          actionType,
          riskLevel: input.riskLevel ?? "high",
          title: clean(`${input.app} approval: ${actionType} (${input.runbookId})`, 180),
          summary: clean(currentStep.summary, 800),
          proposedAction: input.proposedAction ?? input.payload ?? {},
          approvalPolicy: input.approvalPolicy ?? { reasons: currentStep.reasons },
          requiredApproverRole: input.requiredApproverRole ?? "owner",
          dueAt,
          expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
        }
      ],
      blockedReasons: []
    };
  }

  const jobType = classifyJobType(currentStep);
  return {
    status: "queued",
    currentStep,
    jobs: [
      {
        workspaceId: input.workspaceId,
        accountUserId: input.accountUserId ?? null,
        app: input.app,
        queueName: queueNameFor(input.app, jobType),
        jobType,
        idempotencyKey: clean(`${input.runbookId}:${currentStep.key}:${currentStep.auditEvent}`, 180),
        payload: {
          runbookId: input.runbookId,
          stepKey: currentStep.key,
          auditEvent: currentStep.auditEvent,
          input: input.payload ?? {}
        },
        priority: jobType === "provider_write" ? 20 : 100,
        runAfter: now
      }
    ],
    approvals: [],
    blockedReasons: []
  };
}

export function buildApprovedApprovalContinuationPlan(input: AgentApprovalContinuationInput): AgentExecutionPlan {
  const now = input.now ?? new Date();
  const jobType: AgentJobType = "provider_write";

  return {
    status: "queued",
    currentStep: {
      key: "apply_approved_action",
      status: "ready",
      auditEvent: "provider.write_approved",
      summary: "Apply the approved provider write with the original approval payload.",
      reasons: []
    },
    jobs: [
      {
        workspaceId: input.workspaceId,
        accountUserId: input.accountUserId ?? null,
        app: input.app,
        queueName: queueNameFor(input.app, jobType),
        jobType,
        idempotencyKey: clean(`approval:${input.approvalRequestId}:provider_write`, 180),
        payload: {
          approvalRequestId: input.approvalRequestId,
          actionType: input.actionType,
          proposedAction: input.proposedAction
        },
        priority: 20,
        runAfter: now
      }
    ],
    approvals: [],
    blockedReasons: []
  };
}

export async function persistAgentExecutionPlan(
  plan: AgentExecutionPlan,
  client: AgentExecutionPlanClient = db
): Promise<PersistedAgentExecutionPlan> {
  let jobsCreated = 0;
  let approvalsCreated = 0;

  for (const job of plan.jobs) {
    await client.agentJob.upsert({
      where: {
        workspaceId_queueName_idempotencyKey: {
          workspaceId: job.workspaceId,
          queueName: job.queueName,
          idempotencyKey: job.idempotencyKey
        }
      },
      update: {},
      create: {
        workspaceId: job.workspaceId,
        accountUserId: job.accountUserId,
        app: job.app,
        queueName: job.queueName,
        jobType: job.jobType,
        status: "queued",
        priority: job.priority,
        idempotencyKey: job.idempotencyKey,
        payload: jsonInput(job.payload),
        runAfter: job.runAfter
      }
    });
    jobsCreated++;
  }

  for (const approval of plan.approvals) {
    const existing = await client.agentApprovalRequest.findFirst({
      where: {
        workspaceId: approval.workspaceId,
        app: approval.app,
        actionType: approval.actionType,
        status: { in: ["pending", "escalated"] },
        title: approval.title
      }
    });
    if (existing) continue;

    await client.agentApprovalRequest.create({
      data: {
        workspaceId: approval.workspaceId,
        requestedByAccountUserId: approval.requestedByAccountUserId,
        app: approval.app,
        actionType: approval.actionType,
        riskLevel: approval.riskLevel,
        title: approval.title,
        summary: approval.summary,
        proposedAction: jsonInput(approval.proposedAction),
        approvalPolicy: jsonInput(approval.approvalPolicy),
        requiredApproverRole: approval.requiredApproverRole,
        dueAt: approval.dueAt,
        expiresAt: approval.expiresAt
      }
    });
    approvalsCreated++;
  }

  return { jobsCreated, approvalsCreated };
}
