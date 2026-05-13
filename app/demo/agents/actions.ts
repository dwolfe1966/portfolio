"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { ACCOUNT_SESSION_COOKIE, verifyAccountSessionToken } from "@/lib/account-session";
import { canApplyApprovalDecision } from "@/lib/agent-approval-queue";
import { buildAgentJobRetryDecision, evaluateAgentJobManualAction } from "@/lib/agent-job-queue";
import { buildApprovedApprovalContinuationPlan, persistAgentExecutionPlan } from "@/lib/agent-execution-plan";
import { runAgentWorkerBatch, runAgentWorkerOnce } from "@/lib/agent-worker";
import { db } from "@/lib/db";

export async function decideAgentApprovalAction(formData: FormData) {
  const cookieStore = await cookies();
  const accountUserId = verifyAccountSessionToken(cookieStore.get(ACCOUNT_SESSION_COOKIE)?.value)?.userId ?? null;
  if (!accountUserId) return;

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const runAfterApproval = String(formData.get("runAfterApproval") ?? "") === "true";
  if (!id || !["approved", "rejected", "cancelled"].includes(status)) return;

  const workspace = await db.workspace.findUnique({ where: { slug: "default-demo-workspace" } });
  if (!workspace) return;

  const request = await db.agentApprovalRequest.findFirst({
    where: {
      id,
      workspaceId: workspace.id,
      OR: [{ requestedByAccountUserId: accountUserId }, { requestedByAccountUserId: null }]
    }
  });
  if (!request || !canApplyApprovalDecision(request.status)) return;

  const updated = await db.agentApprovalRequest.update({
    where: { id: request.id },
    data: {
      status,
      decidedByAccountUserId: accountUserId,
      decisionReason: status === "approved" ? "Approved from workspace agent operations." : "Closed from workspace agent operations.",
      decidedAt: new Date()
    }
  });

  if (status === "approved" && updated.app === "acquisition") {
    const continuationPlan = buildApprovedApprovalContinuationPlan({
      workspaceId: workspace.id,
      accountUserId,
      app: "acquisition",
      approvalRequestId: updated.id,
      actionType: updated.actionType,
      proposedAction: updated.proposedAction
    });
    await persistAgentExecutionPlan(continuationPlan);
    const providerWriteJob = continuationPlan.jobs[0];
    if (runAfterApproval && providerWriteJob) {
      await runAgentWorkerOnce({
        workspaceId: workspace.id,
        queueName: providerWriteJob.queueName,
        workerId: `workspace:${accountUserId}:approval`
      });
    }
  }

  revalidatePath("/workspace/agents");
  revalidatePath("/demo/agents");
  revalidatePath("/workspace/activity");
}

export async function decideAgentJobAction(formData: FormData) {
  const cookieStore = await cookies();
  const accountUserId = verifyAccountSessionToken(cookieStore.get(ACCOUNT_SESSION_COOKIE)?.value)?.userId ?? null;
  if (!accountUserId) return;

  const id = String(formData.get("id") ?? "");
  const action = String(formData.get("action") ?? "");
  if (!id || !["claim", "complete", "fail", "cancel", "requeue"].includes(action)) return;

  const workspace = await db.workspace.findUnique({ where: { slug: "default-demo-workspace" } });
  if (!workspace) return;

  const job = await db.agentJob.findFirst({
    where: {
      id,
      workspaceId: workspace.id,
      OR: [{ accountUserId }, { accountUserId: null }]
    }
  });
  if (!job) return;

  const decision = evaluateAgentJobManualAction({ status: job.status, action });
  if (!decision.allowed) return;

  const now = new Date();
  if (action === "claim") {
    await db.agentJob.update({
      where: { id: job.id },
      data: {
        status: "running",
        lockedAt: now,
        lockedBy: accountUserId,
        errorCode: null,
        errorMessage: null
      }
    });
  } else if (action === "complete") {
    await db.agentJob.update({
      where: { id: job.id },
      data: {
        status: "completed",
        result: { completedFrom: "workspace_agent_operations" },
        completedAt: now,
        lockedAt: null,
        lockedBy: null
      }
    });
  } else if (action === "fail") {
    const retry = buildAgentJobRetryDecision({
      attemptCount: job.attemptCount,
      maxAttempts: job.maxAttempts,
      errorCode: "MANUAL_JOB_FAILURE",
      errorMessage: "Failed from workspace agent operations.",
      now
    });
    await db.agentJob.update({
      where: { id: job.id },
      data: {
        status: retry.status,
        attemptCount: retry.attemptCount,
        runAfter: retry.runAfter ?? undefined,
        deadLetteredAt: retry.deadLetteredAt,
        failedAt: retry.status === "dead_lettered" ? retry.deadLetteredAt : now,
        errorCode: retry.errorCode,
        errorMessage: retry.errorMessage,
        lockedAt: null,
        lockedBy: null
      }
    });
  } else if (action === "cancel") {
    await db.agentJob.update({
      where: { id: job.id },
      data: {
        status: "cancelled",
        failedAt: now,
        errorCode: "MANUAL_CANCEL",
        errorMessage: "Cancelled from workspace agent operations.",
        lockedAt: null,
        lockedBy: null
      }
    });
  } else if (action === "requeue") {
    await db.agentJob.update({
      where: { id: job.id },
      data: {
        status: "queued",
        runAfter: now,
        lockedAt: null,
        lockedBy: null,
        completedAt: null,
        failedAt: null,
        deadLetteredAt: null,
        errorCode: null,
        errorMessage: null
      }
    });
  }

  revalidatePath("/workspace/agents");
  revalidatePath("/demo/agents");
}

export async function runAgentJobOnceAction(formData: FormData) {
  const cookieStore = await cookies();
  const accountUserId = verifyAccountSessionToken(cookieStore.get(ACCOUNT_SESSION_COOKIE)?.value)?.userId ?? null;
  if (!accountUserId) return;

  const id = String(formData.get("id") ?? "");
  const returnPath = String(formData.get("returnPath") ?? "");
  if (!id) return;

  const workspace = await db.workspace.findUnique({ where: { slug: "default-demo-workspace" } });
  if (!workspace) return;

  const job = await db.agentJob.findFirst({
    where: {
      id,
      workspaceId: workspace.id,
      status: "queued",
      OR: [{ accountUserId }, { accountUserId: null }]
    },
    select: { queueName: true }
  });
  if (!job) return;

  await runAgentWorkerOnce({
    workspaceId: workspace.id,
    queueName: job.queueName,
    workerId: `workspace:${accountUserId}`
  });

  revalidatePath("/workspace/agents");
  revalidatePath("/demo/agents");
  if (returnPath.startsWith("/workspace/agents/dry-runs/") || returnPath.startsWith("/demo/agents/dry-runs/")) {
    revalidatePath(returnPath);
  }
}

export async function runAgentWorkerBatchAction() {
  const cookieStore = await cookies();
  const accountUserId = verifyAccountSessionToken(cookieStore.get(ACCOUNT_SESSION_COOKIE)?.value)?.userId ?? null;
  if (!accountUserId) return;

  const workspace = await db.workspace.findUnique({ where: { slug: "default-demo-workspace" } });
  if (!workspace) return;

  await runAgentWorkerBatch({
    workspaceId: workspace.id,
    workerId: `workspace:${accountUserId}`,
    maxJobs: 10
  });

  revalidatePath("/workspace/agents");
  revalidatePath("/demo/agents");
}
