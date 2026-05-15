import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  buildDefaultWorkspaceLaunchBaselineEvidence,
  normalizeWorkspaceLaunchBaselineEvidence
} from "@/lib/workspace-launch-baseline-evidence";
import { normalizeWorkspaceLaunchConnectedSystems } from "@/lib/workspace-launch-connected-systems";
import { normalizeWorkspaceLaunchOwners } from "@/lib/workspace-launch-owner-roster";
import { buildWorkspaceLaunchReadiness, type WorkspaceLaunchReadinessInput } from "@/lib/workspace-launch-readiness";

export type WorkspaceLaunchReadinessRecordInput = WorkspaceLaunchReadinessInput & {
  workspaceId: string;
  accountUserId?: string | null;
};

function jsonInput(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}

function clean(value: string | null | undefined, fallback: string) {
  const trimmed = String(value ?? "").trim();
  return trimmed || fallback;
}

function scopeKey(accountUserId: string | null | undefined) {
  return accountUserId ? `account:${accountUserId}` : "workspace";
}

export async function upsertWorkspaceLaunchReadinessRecord(input: WorkspaceLaunchReadinessRecordInput) {
  const recordScopeKey = scopeKey(input.accountUserId);
  const existing = await db.workspaceLaunchReadinessRecord.findFirst({
    where: {
      workspaceId: input.workspaceId,
      scopeKey: recordScopeKey
    },
    select: {
      id: true,
      owners: true,
      connectedSystems: true,
      baselineEvidence: true,
      revenueProofEvidence: true
    }
  });
  const owners = input.owners ?? (existing?.owners ? normalizeWorkspaceLaunchOwners(existing.owners) : undefined);
  const connectedSystems = input.connectedSystems
    ?? (existing?.connectedSystems ? normalizeWorkspaceLaunchConnectedSystems(existing.connectedSystems) : undefined);
  const defaultBaselineEvidence = buildDefaultWorkspaceLaunchBaselineEvidence({
    workspaceId: input.workspaceId,
    timestamp: new Date().toISOString(),
    auditExportHref: input.auditExportHref ?? "/api/workspace/agents/audit-export"
  });
  const baselineEvidence = input.baselineEvidence ?? (
    existing?.baselineEvidence || existing?.revenueProofEvidence
      ? normalizeWorkspaceLaunchBaselineEvidence({
          baseline: existing.baselineEvidence,
          revenueProof: existing.revenueProofEvidence
        }, defaultBaselineEvidence)
      : undefined
  );
  const readiness = buildWorkspaceLaunchReadiness({ ...input, owners, connectedSystems, baselineEvidence });
  const packet = readiness.packet;
  const data = {
    workspaceId: input.workspaceId,
    accountUserId: input.accountUserId ?? null,
    scopeKey: recordScopeKey,
    customerName: clean(input.customerName, packet.customerName),
    requestedLaunchMode: input.requestedLaunchMode ?? packet.sections.onboarding?.requestedLaunchMode ?? "human_approved_execution",
    launchDecisionMode: packet.sections.launchDecision?.launchMode ?? null,
    status: readiness.status,
    maxAllowedLaunchMode: readiness.maxAllowedLaunchMode,
    exportable: readiness.exportable,
    nextRequiredAction: readiness.nextRequiredAction,
    owners: jsonInput(packet.sections.owners),
    connectedSystems: jsonInput(packet.sections.connectedSystems),
    mappings: jsonInput(packet.sections.mappings),
    policy: jsonInput(packet.sections.policy),
    baselineEvidence: jsonInput(baselineEvidence?.baseline ?? null),
    revenueProofEvidence: jsonInput(baselineEvidence?.revenueProof ?? null),
    unresolvedRisks: jsonInput(packet.sections.unresolvedRisks),
    evidenceExports: jsonInput(packet.sections.evidenceExports),
    launchPacket: jsonInput(packet),
    lastEvaluatedAt: new Date(packet.generatedAt)
  };

  const record = existing
    ? await db.workspaceLaunchReadinessRecord.update({
        where: { id: existing.id },
        data
      })
    : await db.workspaceLaunchReadinessRecord.create({
        data
      });

  return { readiness, record };
}
