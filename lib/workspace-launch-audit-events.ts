import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { AgentAuditExportRecord } from "@/lib/agent-platform-governance";

export type WorkspaceLaunchAuditAction =
  | "owner_roster_saved"
  | "connected_systems_saved"
  | "baseline_evidence_saved";

export type WorkspaceLaunchAuditEventLike = {
  id: string;
  workspaceId: string;
  accountUserId?: string | null;
  eventType: string;
  metadata: unknown;
  occurredAt: Date;
};

const EVENT_TYPE_BY_ACTION: Record<WorkspaceLaunchAuditAction, string> = {
  owner_roster_saved: "launch.owner_roster_saved",
  connected_systems_saved: "launch.connected_systems_saved",
  baseline_evidence_saved: "launch.baseline_evidence_saved"
};

const ACTION_BY_EVENT_TYPE = Object.fromEntries(
  Object.entries(EVENT_TYPE_BY_ACTION).map(([action, eventType]) => [eventType, action])
) as Record<string, WorkspaceLaunchAuditAction>;

function jsonInput(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
}

function clean(value: unknown, fallback = "", maxLength = 240) {
  const text = String(value ?? "").trim().replace(/\s+/g, " ").slice(0, maxLength);
  return text || fallback;
}

export function workspaceLaunchAuditEventType(action: WorkspaceLaunchAuditAction) {
  return EVENT_TYPE_BY_ACTION[action];
}

export function workspaceLaunchAuditTitle(eventType: string) {
  const action = ACTION_BY_EVENT_TYPE[eventType];
  if (action === "owner_roster_saved") return "Launch owner roster saved";
  if (action === "connected_systems_saved") return "Connected-system evidence saved";
  if (action === "baseline_evidence_saved") return "Baseline and revenue proof saved";
  return clean(eventType, "Launch readiness event");
}

export function workspaceLaunchAuditDetail(event: Pick<WorkspaceLaunchAuditEventLike, "eventType" | "metadata">) {
  const metadata = event.metadata && typeof event.metadata === "object" ? event.metadata as Record<string, unknown> : {};
  const status = clean(metadata.status, "", 80);
  const launchMode = clean(metadata.maxAllowedLaunchMode, "", 80);
  const summary = clean(metadata.summary, "", 320);
  if (summary) return summary;
  return [status ? `status ${status}` : "", launchMode ? `max mode ${launchMode}` : ""].filter(Boolean).join(" · ") || "Launch readiness evidence changed.";
}

export function workspaceLaunchAuditRecord(event: WorkspaceLaunchAuditEventLike): AgentAuditExportRecord {
  const metadata = event.metadata && typeof event.metadata === "object" ? event.metadata as Record<string, unknown> : {};
  return {
    id: event.id,
    workspaceId: event.workspaceId,
    app: "workspace",
    action: ACTION_BY_EVENT_TYPE[event.eventType] ?? event.eventType,
    status: clean(metadata.status, "recorded", 80),
    evidenceType: "launch_readiness",
    actorAccountUserId: event.accountUserId ?? null,
    createdAt: event.occurredAt,
    operationType: clean(metadata.evidenceSection, "launch_readiness", 80),
    mutationGateStatus: clean(metadata.maxAllowedLaunchMode, "", 80)
  };
}

export async function recordWorkspaceLaunchAuditEvent(input: {
  workspaceId: string;
  accountUserId?: string | null;
  action: WorkspaceLaunchAuditAction;
  readinessRecordId?: string | null;
  status?: string | null;
  maxAllowedLaunchMode?: string | null;
  summary?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const eventType = workspaceLaunchAuditEventType(input.action);
  return db.lifecycleConnectorAuditEvent.create({
    data: {
      workspaceId: input.workspaceId,
      accountUserId: input.accountUserId ?? null,
      provider: "workspace_launch",
      eventType,
      objectKey: "launch_readiness",
      idempotencyKey: `${eventType}:${Date.now()}`,
      occurredAt: new Date(),
      metadata: jsonInput({
        readinessRecordId: input.readinessRecordId ?? null,
        status: input.status ?? "recorded",
        maxAllowedLaunchMode: input.maxAllowedLaunchMode ?? null,
        summary: input.summary ?? null,
        evidenceSection: input.action,
        ...(input.metadata ?? {})
      })
    }
  });
}
