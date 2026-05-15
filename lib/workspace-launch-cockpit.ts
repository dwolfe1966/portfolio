import { workspaceLaunchAuditDetail, workspaceLaunchAuditTitle } from "@/lib/workspace-launch-audit-events";

export type WorkspaceLaunchCockpitRecord = {
  status?: string | null;
  exportable?: boolean | null;
  maxAllowedLaunchMode?: string | null;
  launchDecisionMode?: string | null;
  nextRequiredAction?: string | null;
  updatedAt?: Date | null;
};

export type WorkspaceLaunchCockpitEvent = {
  id: string;
  eventType: string;
  metadata: unknown;
  occurredAt: Date;
};

export type WorkspaceLaunchCockpitSummary = {
  statusLabel: string;
  statusTone: "live" | "progress" | "warning";
  launchModeLabel: string;
  packetLabel: string;
  nextAction: string;
  nextActionHref: string;
  updatedAt: Date | null;
  recentEvents: Array<{
    id: string;
    title: string;
    detail: string;
    occurredAt: Date;
  }>;
};

function label(value: string | null | undefined, fallback: string) {
  const text = String(value ?? "").trim();
  return text ? text.replace(/_/g, " ") : fallback;
}

function statusTone(status: string | null | undefined): WorkspaceLaunchCockpitSummary["statusTone"] {
  if (status === "ready") return "live";
  if (status === "blocked") return "warning";
  return "progress";
}

function nextActionHref(action: string) {
  const normalized = action.toLowerCase();
  if (normalized.includes("baseline") || normalized.includes("owner") || normalized.includes("evidence")) return "/workspace/settings";
  if (normalized.includes("provider") || normalized.includes("grant") || normalized.includes("credential")) return "/acquisition/connections";
  if (normalized.includes("approval") || normalized.includes("operation")) return "/workspace/agents";
  return "/workspace/settings";
}

export function buildWorkspaceLaunchCockpitSummary(input: {
  record?: WorkspaceLaunchCockpitRecord | null;
  events?: WorkspaceLaunchCockpitEvent[];
}): WorkspaceLaunchCockpitSummary {
  const record = input.record ?? null;
  const nextAction = record?.nextRequiredAction?.trim() || "Configure launch readiness evidence.";

  return {
    statusLabel: label(record?.status, "not configured"),
    statusTone: statusTone(record?.status),
    launchModeLabel: label(record?.launchDecisionMode ?? record?.maxAllowedLaunchMode, "not set"),
    packetLabel: record?.exportable ? "exportable" : "not exportable",
    nextAction,
    nextActionHref: nextActionHref(nextAction),
    updatedAt: record?.updatedAt ?? null,
    recentEvents: (input.events ?? []).slice(0, 3).map((event) => ({
      id: event.id,
      title: workspaceLaunchAuditTitle(event.eventType),
      detail: workspaceLaunchAuditDetail(event),
      occurredAt: event.occurredAt
    }))
  };
}
