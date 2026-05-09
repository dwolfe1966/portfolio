export type AgentTenantRole = "owner" | "admin" | "operator" | "viewer";
export type AgentComplianceStatus = "ready" | "warning" | "blocked";

export type AgentTenantAccessInput = {
  actorWorkspaceId?: string | null;
  resourceWorkspaceId?: string | null;
  actorAccountUserId?: string | null;
  resourceAccountUserId?: string | null;
  role?: AgentTenantRole | string | null;
  requireAccountOwner?: boolean;
  allowedRoles?: AgentTenantRole[];
};

export type AgentTenantAccessDecision = {
  allowed: boolean;
  reason: "workspace_match" | "workspace_missing" | "workspace_mismatch" | "account_missing" | "account_mismatch" | "role_not_allowed";
};

export type SecretPostureInput = {
  encryptionAvailable: boolean;
  tokenPresent: boolean;
  rotatedAt?: Date | null;
  now?: Date;
  rotationWindowDays?: number;
};

export type SecretPosture = {
  status: AgentComplianceStatus;
  reasons: string[];
  rotationDueAt: Date | null;
};

export type AgentAuditExportRecord = {
  id: string;
  workspaceId: string;
  app: string;
  action: string;
  status: string;
  evidenceType?: string | null;
  actorAccountUserId?: string | null;
  createdAt: Date;
  decidedAt?: Date | null;
  completedAt?: Date | null;
  riskLevel?: string | null;
  errorCode?: string | null;
  provider?: string | null;
  operationType?: string | null;
  externalAccountId?: string | null;
  externalCampaignId?: string | null;
  spendExposureCents?: number | null;
  rollbackSupported?: boolean | null;
  rollbackPlan?: string | null;
  relatedJobId?: string | null;
};

export type AgentAuditExportRow = {
  id: string;
  workspaceId: string;
  app: string;
  action: string;
  status: string;
  evidenceType: string;
  actorAccountUserId: string;
  createdAt: string;
  terminalAt: string;
  riskLevel: string;
  errorCode: string;
  provider: string;
  operationType: string;
  externalAccountId: string;
  externalCampaignId: string;
  spendExposureCents: string;
  rollbackSupported: string;
  rollbackPlan: string;
  relatedJobId: string;
};

export type AgentCompliancePostureInput = {
  tenantIsolationEnforced: boolean;
  secretPosture: SecretPosture;
  auditExportEnabled: boolean;
  approvalQueueEnabled: boolean;
  deadLetterReviewEnabled: boolean;
};

export type AgentCompliancePosture = {
  status: AgentComplianceStatus;
  blockers: string[];
  warnings: string[];
};

const SECRET_KEY_PATTERN = /token|secret|password|credential|authorization|apiKey|refreshToken|accessToken/i;
const DEFAULT_ROTATION_WINDOW_DAYS = 90;

function clean(value: string, max = 160) {
  return value.trim().slice(0, max);
}

function normalizeRole(role?: string | null): AgentTenantRole | null {
  const normalized = clean(String(role || "").toLowerCase(), 40) as AgentTenantRole;
  return ["owner", "admin", "operator", "viewer"].includes(normalized) ? normalized : null;
}

export function evaluateAgentTenantAccess(input: AgentTenantAccessInput): AgentTenantAccessDecision {
  if (!input.actorWorkspaceId || !input.resourceWorkspaceId) {
    return { allowed: false, reason: "workspace_missing" };
  }

  if (input.actorWorkspaceId !== input.resourceWorkspaceId) {
    return { allowed: false, reason: "workspace_mismatch" };
  }

  if (input.requireAccountOwner && !input.actorAccountUserId) {
    return { allowed: false, reason: "account_missing" };
  }

  if (
    input.requireAccountOwner &&
    input.resourceAccountUserId &&
    input.actorAccountUserId !== input.resourceAccountUserId
  ) {
    return { allowed: false, reason: "account_mismatch" };
  }

  const allowedRoles = input.allowedRoles ?? ["owner", "admin", "operator"];
  const role = normalizeRole(input.role);
  if (role && !allowedRoles.includes(role)) {
    return { allowed: false, reason: "role_not_allowed" };
  }

  return { allowed: true, reason: "workspace_match" };
}

export function redactAgentSecretPayload<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => redactAgentSecretPayload(item)) as T;
  }

  if (!value || typeof value !== "object" || value instanceof Date) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      SECRET_KEY_PATTERN.test(key) ? "[redacted]" : redactAgentSecretPayload(item)
    ])
  ) as T;
}

export function evaluateSecretPosture(input: SecretPostureInput): SecretPosture {
  const now = input.now ?? new Date();
  const rotationWindowDays = Math.max(1, Math.round(Number(input.rotationWindowDays ?? DEFAULT_ROTATION_WINDOW_DAYS)));
  const reasons: string[] = [];

  if (!input.encryptionAvailable) reasons.push("encryption_unavailable");
  if (!input.tokenPresent) reasons.push("secret_missing");

  const rotationDueAt = input.rotatedAt
    ? new Date(input.rotatedAt.getTime() + rotationWindowDays * 24 * 60 * 60 * 1000)
    : null;
  if (rotationDueAt && rotationDueAt <= now) reasons.push("rotation_overdue");

  if (reasons.includes("encryption_unavailable") || reasons.includes("secret_missing")) {
    return { status: "blocked", reasons, rotationDueAt };
  }

  if (reasons.length > 0) return { status: "warning", reasons, rotationDueAt };
  return { status: "ready", reasons, rotationDueAt };
}

export function buildAgentAuditExportRows(records: AgentAuditExportRecord[]): AgentAuditExportRow[] {
  return records
    .map((record) => ({
      id: clean(record.id, 120),
      workspaceId: clean(record.workspaceId, 120),
      app: clean(record.app, 80),
      action: clean(record.action, 160),
      status: clean(record.status, 80),
      evidenceType: record.evidenceType ? clean(record.evidenceType, 80) : "agent_event",
      actorAccountUserId: record.actorAccountUserId ? clean(record.actorAccountUserId, 120) : "",
      createdAt: record.createdAt.toISOString(),
      terminalAt: (record.decidedAt ?? record.completedAt ?? record.createdAt).toISOString(),
      riskLevel: record.riskLevel ? clean(record.riskLevel, 40) : "",
      errorCode: record.errorCode ? clean(record.errorCode, 80) : "",
      provider: record.provider ? clean(record.provider, 80) : "",
      operationType: record.operationType ? clean(record.operationType, 80) : "",
      externalAccountId: record.externalAccountId ? clean(record.externalAccountId, 160) : "",
      externalCampaignId: record.externalCampaignId ? clean(record.externalCampaignId, 220) : "",
      spendExposureCents: Number.isFinite(record.spendExposureCents) ? String(Math.round(Number(record.spendExposureCents))) : "",
      rollbackSupported: typeof record.rollbackSupported === "boolean" ? String(record.rollbackSupported) : "",
      rollbackPlan: record.rollbackPlan ? clean(record.rollbackPlan, 500) : "",
      relatedJobId: record.relatedJobId ? clean(record.relatedJobId, 120) : ""
    }))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
}

export function evaluateAgentCompliancePosture(input: AgentCompliancePostureInput): AgentCompliancePosture {
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (!input.tenantIsolationEnforced) blockers.push("tenant_isolation_not_enforced");
  if (input.secretPosture.status === "blocked") blockers.push(...input.secretPosture.reasons);
  if (!input.auditExportEnabled) warnings.push("audit_export_disabled");
  if (!input.approvalQueueEnabled) warnings.push("approval_queue_disabled");
  if (!input.deadLetterReviewEnabled) warnings.push("dead_letter_review_disabled");
  if (input.secretPosture.status === "warning") warnings.push(...input.secretPosture.reasons);

  return {
    status: blockers.length > 0 ? "blocked" : warnings.length > 0 ? "warning" : "ready",
    blockers,
    warnings
  };
}
