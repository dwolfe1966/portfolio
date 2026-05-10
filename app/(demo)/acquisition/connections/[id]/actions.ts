"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  buildProviderWriteApprovalContext,
  createAgentApprovalRequest
} from "@/lib/agent-approval-queue";
import { ACCOUNT_SESSION_COOKIE, verifyAccountSessionToken } from "@/lib/account-session";
import { db } from "@/lib/db";
import { getDefaultWorkspace } from "@/lib/workspace";

function optionalString(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || null;
}

function numericCents(value: FormDataEntryValue | null) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount) : 0;
}

export async function requestProviderWriteDryRunApprovalAction(formData: FormData) {
  const cookieStore = await cookies();
  const accountUserId = verifyAccountSessionToken(cookieStore.get(ACCOUNT_SESSION_COOKIE)?.value)?.userId ?? null;
  if (!accountUserId) return;

  const connectionId = optionalString(formData.get("connectionId"));
  const provider = optionalString(formData.get("provider"));
  const externalAccountId = optionalString(formData.get("externalAccountId"));
  const externalCampaignId = optionalString(formData.get("externalCampaignId"));
  if (!connectionId || !provider || !externalAccountId || !externalCampaignId) return;

  const connection = await db.adAccountConnection.findFirst({
    where: {
      id: connectionId,
      provider,
      externalAccountId,
      OR: [{ accountUserId }, { accountUserId: null }]
    },
    select: { id: true }
  });
  if (!connection) return;

  const workspace = await getDefaultWorkspace();
  const context = buildProviderWriteApprovalContext({
    provider,
    externalAccountId,
    externalCampaignId,
    campaignName: optionalString(formData.get("campaignName")),
    externalAdGroupId: optionalString(formData.get("externalAdGroupId")),
    externalAdSetId: optionalString(formData.get("externalAdSetId")),
    operationType: optionalString(formData.get("operationType")),
    spendExposureCents: numericCents(formData.get("spendExposureCents"))
  });

  const existing = await db.agentApprovalRequest.findFirst({
    where: {
      workspaceId: workspace.id,
      requestedByAccountUserId: accountUserId,
      app: "acquisition",
      actionType: context.actionType,
      status: { in: ["pending", "escalated"] },
      proposedAction: {
        path: ["externalCampaignId"],
        equals: externalCampaignId
      }
    },
    select: { id: true }
  });

  const approval = existing ?? await createAgentApprovalRequest({
    workspaceId: workspace.id,
    requestedByAccountUserId: accountUserId,
    app: "acquisition",
    actionType: context.actionType,
    riskLevel: context.riskLevel,
    title: context.title,
    summary: context.summary,
    proposedAction: context.proposedAction,
    approvalPolicy: context.approvalPolicy,
    requiredApproverRole: context.requiredApproverRole,
    dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  });

  revalidatePath("/workspace/agents");
  revalidatePath("/demo/agents");
  revalidatePath(`/acquisition/connections/${connectionId}`);
  redirect(`/workspace/agents?approvalId=${approval.id}`);
}
