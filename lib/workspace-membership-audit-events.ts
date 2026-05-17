import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export type WorkspaceMembershipAuditAction =
  | "invite_created"
  | "invite_sent"
  | "invite_canceled"
  | "invite_accepted"
  | "member_role_changed"
  | "member_removed";

export type WorkspaceMembershipAuditEventLike = {
  id: string;
  workspaceId: string;
  accountUserId?: string | null;
  eventType: string;
  metadata: unknown;
  occurredAt: Date;
};

const PROVIDER = "workspace_membership";

const EVENT_TYPE_BY_ACTION: Record<WorkspaceMembershipAuditAction, string> = {
  invite_created: "membership.invite_created",
  invite_sent: "membership.invite_sent",
  invite_canceled: "membership.invite_canceled",
  invite_accepted: "membership.invite_accepted",
  member_role_changed: "membership.member_role_changed",
  member_removed: "membership.member_removed"
};

const ACTION_BY_EVENT_TYPE = Object.fromEntries(
  Object.entries(EVENT_TYPE_BY_ACTION).map(([action, eventType]) => [eventType, action])
) as Record<string, WorkspaceMembershipAuditAction>;

function jsonInput(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
}

function metadataObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function clean(value: unknown, fallback = "", maxLength = 240) {
  const text = String(value ?? "").trim().replace(/\s+/g, " ").slice(0, maxLength);
  return text || fallback;
}

export function workspaceMembershipAuditProvider() {
  return PROVIDER;
}

export function workspaceMembershipAuditEventType(action: WorkspaceMembershipAuditAction) {
  return EVENT_TYPE_BY_ACTION[action];
}

export function workspaceMembershipAuditTitle(eventType: string) {
  const action = ACTION_BY_EVENT_TYPE[eventType];
  if (action === "invite_created") return "Workspace invite created";
  if (action === "invite_sent") return "Workspace invite sent";
  if (action === "invite_canceled") return "Workspace invite canceled";
  if (action === "invite_accepted") return "Workspace invite accepted";
  if (action === "member_role_changed") return "Workspace member role changed";
  if (action === "member_removed") return "Workspace member removed";
  return clean(eventType, "Workspace membership event");
}

export function workspaceMembershipAuditDetail(event: Pick<WorkspaceMembershipAuditEventLike, "eventType" | "metadata">) {
  const metadata = metadataObject(event.metadata);
  const recipient = clean(metadata.recipientEmail || metadata.memberEmail || metadata.acceptedByEmail, "", 120);
  const role = clean(metadata.role || metadata.toRole, "", 80);
  const fromRole = clean(metadata.fromRole, "", 80);
  const toRole = clean(metadata.toRole, "", 80);

  const action = ACTION_BY_EVENT_TYPE[event.eventType];
  if (action === "invite_created") return `${recipient || "A collaborator"} was invited as ${role || "a workspace member"}.`;
  if (action === "invite_sent") return `Invite email sent to ${recipient || "the collaborator"}.`;
  if (action === "invite_canceled") return `Pending invite canceled for ${recipient || "the collaborator"}.`;
  if (action === "invite_accepted") return `${recipient || "A collaborator"} accepted the workspace invite.`;
  if (action === "member_role_changed") return `${recipient || "A workspace member"} changed from ${fromRole || "previous role"} to ${toRole || "new role"}.`;
  if (action === "member_removed") return `${recipient || "A workspace member"} was removed from the workspace.`;
  return "Workspace membership administration event.";
}

export async function recordWorkspaceMembershipAuditEvent(input: {
  workspaceId: string;
  accountUserId?: string | null;
  action: WorkspaceMembershipAuditAction;
  objectKey?: string | null;
  idempotencyKey?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const eventType = workspaceMembershipAuditEventType(input.action);
  return db.lifecycleConnectorAuditEvent.create({
    data: {
      workspaceId: input.workspaceId,
      accountUserId: input.accountUserId ?? null,
      provider: PROVIDER,
      eventType,
      objectKey: input.objectKey ?? input.action,
      idempotencyKey: input.idempotencyKey ?? `${eventType}:${Date.now()}`,
      occurredAt: new Date(),
      metadata: jsonInput({
        action: input.action,
        ...(input.metadata ?? {})
      })
    }
  });
}
