import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { AgentJobApp } from "@/lib/agent-job-queue";

export type AgentApprovalRiskLevel = "low" | "medium" | "high" | "critical";
export type AgentApprovalStatus = "pending" | "approved" | "rejected" | "expired" | "escalated" | "cancelled";

export type AgentApprovalRequestInput = {
  workspaceId: string;
  requestedByAccountUserId?: string | null;
  agentJobId?: string | null;
  app: AgentJobApp;
  actionType: string;
  riskLevel?: AgentApprovalRiskLevel | string | null;
  title: string;
  summary: string;
  proposedAction: unknown;
  approvalPolicy?: unknown;
  requiredApproverRole?: string | null;
  dueAt?: Date | null;
  expiresAt?: Date | null;
};

type NormalizedAgentApprovalRequestInput = Omit<
  AgentApprovalRequestInput,
  "actionType" | "riskLevel" | "title" | "summary" | "requiredApproverRole" | "dueAt" | "expiresAt"
> & {
  actionType: string;
  riskLevel: AgentApprovalRiskLevel;
  title: string;
  summary: string;
  requiredApproverRole: string | null;
  dueAt: Date | null;
  expiresAt: Date | null;
};

export type AgentApprovalEscalationDecision = {
  status: AgentApprovalStatus;
  shouldEscalate: boolean;
  escalationLevel: number;
  escalatedAt: Date | null;
  reasons: string[];
};

const MAX_ESCALATION_LEVEL = 5;
const RISK_LEVELS: AgentApprovalRiskLevel[] = ["low", "medium", "high", "critical"];
const OPEN_APPROVAL_STATUSES: AgentApprovalStatus[] = ["pending", "escalated"];

function jsonInput(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
}

function clean(value: string, max = 160) {
  return value.trim().slice(0, max);
}

function normalizeRiskLevel(riskLevel?: AgentApprovalRiskLevel | string | null): AgentApprovalRiskLevel {
  const normalized = clean(String(riskLevel || "medium").toLowerCase(), 30) as AgentApprovalRiskLevel;
  return RISK_LEVELS.includes(normalized) ? normalized : "medium";
}

export function canApplyApprovalDecision(status: AgentApprovalStatus | string) {
  return OPEN_APPROVAL_STATUSES.includes(status as AgentApprovalStatus);
}

export function normalizeAgentApprovalInput(input: AgentApprovalRequestInput): NormalizedAgentApprovalRequestInput {
  const dueAt = input.dueAt ?? null;
  const expiresAt = input.expiresAt && dueAt && input.expiresAt < dueAt ? dueAt : input.expiresAt ?? null;

  return {
    ...input,
    requestedByAccountUserId: input.requestedByAccountUserId ?? null,
    agentJobId: input.agentJobId ?? null,
    actionType: clean(input.actionType || "revenue_action", 120),
    riskLevel: normalizeRiskLevel(input.riskLevel),
    title: clean(input.title || "Revenue action approval", 180),
    summary: clean(input.summary || "Review and approve the proposed revenue action.", 800),
    requiredApproverRole: input.requiredApproverRole ? clean(input.requiredApproverRole, 80) : null,
    dueAt,
    expiresAt
  };
}

export function buildApprovalEscalationDecision(input: {
  status: AgentApprovalStatus | string;
  riskLevel: AgentApprovalRiskLevel | string;
  createdAt: Date;
  dueAt?: Date | null;
  expiresAt?: Date | null;
  escalationLevel?: number | null;
  now?: Date;
}): AgentApprovalEscalationDecision {
  const now = input.now ?? new Date();
  const status = input.status as AgentApprovalStatus;
  const riskLevel = normalizeRiskLevel(input.riskLevel);
  const escalationLevel = Math.max(0, Math.min(MAX_ESCALATION_LEVEL, Math.round(Number(input.escalationLevel ?? 0))));
  const reasons: string[] = [];

  if (!canApplyApprovalDecision(status)) {
    return {
      status,
      shouldEscalate: false,
      escalationLevel,
      escalatedAt: null,
      reasons: ["approval_not_open"]
    };
  }

  if (input.expiresAt && input.expiresAt <= now) {
    return {
      status: "expired",
      shouldEscalate: false,
      escalationLevel,
      escalatedAt: null,
      reasons: ["approval_expired"]
    };
  }

  const isOverdue = Boolean(input.dueAt && input.dueAt <= now);
  const isHighRisk = riskLevel === "high" || riskLevel === "critical";
  if (isOverdue) reasons.push("approval_overdue");
  if (isHighRisk) reasons.push(`${riskLevel}_risk_action`);

  if (isOverdue && isHighRisk) {
    return {
      status: "escalated",
      shouldEscalate: true,
      escalationLevel: Math.min(MAX_ESCALATION_LEVEL, escalationLevel + 1),
      escalatedAt: now,
      reasons
    };
  }

  return {
    status,
    shouldEscalate: false,
    escalationLevel,
    escalatedAt: null,
    reasons
  };
}

export async function createAgentApprovalRequest(input: AgentApprovalRequestInput) {
  const normalized = normalizeAgentApprovalInput(input);
  return db.agentApprovalRequest.create({
    data: {
      workspaceId: normalized.workspaceId,
      requestedByAccountUserId: normalized.requestedByAccountUserId,
      agentJobId: normalized.agentJobId,
      app: normalized.app,
      actionType: normalized.actionType,
      riskLevel: normalized.riskLevel,
      title: normalized.title,
      summary: normalized.summary,
      proposedAction: jsonInput(normalized.proposedAction),
      approvalPolicy: normalized.approvalPolicy === undefined ? undefined : jsonInput(normalized.approvalPolicy),
      requiredApproverRole: normalized.requiredApproverRole,
      dueAt: normalized.dueAt,
      expiresAt: normalized.expiresAt
    }
  });
}

export async function decideAgentApprovalRequest(input: {
  id: string;
  status: Extract<AgentApprovalStatus, "approved" | "rejected" | "cancelled">;
  decidedByAccountUserId?: string | null;
  decisionReason?: string | null;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  return db.agentApprovalRequest.update({
    where: { id: input.id },
    data: {
      status: input.status,
      decidedByAccountUserId: input.decidedByAccountUserId ?? null,
      decisionReason: input.decisionReason ? clean(input.decisionReason, 800) : null,
      decidedAt: now
    }
  });
}

export async function escalateAgentApprovalRequest(input: {
  id: string;
  status: AgentApprovalStatus | string;
  riskLevel: AgentApprovalRiskLevel | string;
  createdAt: Date;
  dueAt?: Date | null;
  expiresAt?: Date | null;
  escalationLevel?: number | null;
  now?: Date;
}) {
  const decision = buildApprovalEscalationDecision(input);
  return db.agentApprovalRequest.update({
    where: { id: input.id },
    data: {
      status: decision.status,
      escalationLevel: decision.escalationLevel,
      escalatedAt: decision.escalatedAt ?? undefined
    }
  });
}
