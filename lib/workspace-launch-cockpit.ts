import { workspaceLaunchAuditDetail, workspaceLaunchAuditTitle } from "@/lib/workspace-launch-audit-events";

export type WorkspaceLaunchCockpitRecord = {
  status?: string | null;
  exportable?: boolean | null;
  maxAllowedLaunchMode?: string | null;
  launchDecisionMode?: string | null;
  nextRequiredAction?: string | null;
  launchPacket?: unknown;
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
  packetPreview: WorkspaceLaunchPacketPreview;
};

export type WorkspaceLaunchPacketPreview = {
  available: boolean;
  customerName: string;
  generatedAt: string;
  ownerApprovalLabel: string;
  connectedSystemsLabel: string;
  baselineLabel: string;
  revenueProofLabel: string;
  unresolvedRiskLabel: string;
  evidenceExportLabel: string;
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

function record(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function array(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function bool(value: unknown) {
  return value === true;
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function money(cents: unknown) {
  return `$${Math.round(numberValue(cents) / 100).toLocaleString()}`;
}

export function buildWorkspaceLaunchPacketPreview(packetValue: unknown): WorkspaceLaunchPacketPreview {
  const packet = record(packetValue);
  const sections = record(packet.sections);
  const owners = array(sections.owners);
  const connectedSystems = array(sections.connectedSystems);
  const risks = array(sections.unresolvedRisks).filter((risk) => !bool(record(risk).resolved));
  const exports = array(sections.evidenceExports);
  const baseline = record(sections.baseline);
  const revenueProof = record(sections.revenueProof);
  const approvedOwners = owners.filter((owner) => bool(record(owner).approved)).length;
  const readReadySystems = connectedSystems.filter((system) => bool(record(system).readReady)).length;
  const writeReadySystems = connectedSystems.filter((system) => bool(record(system).writeReady)).length;

  if (!Object.keys(packet).length) {
    return {
      available: false,
      customerName: "No launch packet yet",
      generatedAt: "",
      ownerApprovalLabel: "No owners attached",
      connectedSystemsLabel: "No systems attached",
      baselineLabel: "No baseline attached",
      revenueProofLabel: "No revenue proof attached",
      unresolvedRiskLabel: "No risks recorded",
      evidenceExportLabel: "No exports attached"
    };
  }

  return {
    available: true,
    customerName: label(packet.customerName as string | null | undefined, "Unnamed customer"),
    generatedAt: label(packet.generatedAt as string | null | undefined, "not generated"),
    ownerApprovalLabel: `${approvedOwners} of ${owners.length} owners approved`,
    connectedSystemsLabel: `${readReadySystems} read ready · ${writeReadySystems} write ready`,
    baselineLabel: `${label(baseline.status as string | null | undefined, "missing")} baseline`,
    revenueProofLabel: `${label(revenueProof.status as string | null | undefined, "missing")} revenue proof · ${money(revenueProof.incrementalProfitCents)} incremental profit`,
    unresolvedRiskLabel: risks.length === 0 ? "No unresolved risks" : `${risks.length} unresolved risk${risks.length === 1 ? "" : "s"}`,
    evidenceExportLabel: exports.length === 0 ? "No evidence exports" : `${exports.length} evidence export${exports.length === 1 ? "" : "s"}`
  };
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
    })),
    packetPreview: buildWorkspaceLaunchPacketPreview(record?.launchPacket)
  };
}
