export type WorkspaceLaunchReportRecord = {
  status?: string | null;
  exportable?: boolean | null;
  maxAllowedLaunchMode?: string | null;
  launchDecisionMode?: string | null;
  nextRequiredAction?: string | null;
  launchPacket?: unknown;
  updatedAt?: Date | null;
};

export type WorkspaceLaunchReport = {
  available: boolean;
  customerName: string;
  statusLabel: string;
  launchModeLabel: string;
  exportableLabel: string;
  executionImplication: string;
  billingImplication: string;
  nextAction: string;
  updatedAt: Date | null;
  evidenceSections: Array<{
    key: string;
    label: string;
    status: "ready" | "warning" | "blocked" | "missing";
    detail: string;
  }>;
  blockers: string[];
  warnings: string[];
};

function record(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function array(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function clean(value: unknown, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function label(value: unknown, fallback: string) {
  return clean(value, fallback).replace(/_/g, " ");
}

function bool(value: unknown) {
  return value === true;
}

function status(value: unknown): WorkspaceLaunchReport["evidenceSections"][number]["status"] {
  return value === "ready" || value === "warning" || value === "blocked" ? value : "missing";
}

function money(cents: unknown) {
  const value = typeof cents === "number" && Number.isFinite(cents) ? cents : 0;
  return `$${Math.round(value / 100).toLocaleString()}`;
}

function sectionStatus(ready: boolean, warning = false): WorkspaceLaunchReport["evidenceSections"][number]["status"] {
  if (ready) return warning ? "warning" : "ready";
  return "blocked";
}

export function buildWorkspaceLaunchReport(recordValue: WorkspaceLaunchReportRecord | null | undefined): WorkspaceLaunchReport {
  const packet = record(recordValue?.launchPacket);
  const sections = record(packet.sections);
  const owners = array(sections.owners);
  const connectedSystems = array(sections.connectedSystems);
  const mappings = array(sections.mappings);
  const policy = record(sections.policy);
  const baseline = record(sections.baseline);
  const revenueProof = record(sections.revenueProof);
  const billableGate = record(sections.billableGate);
  const risks = array(sections.unresolvedRisks);
  const evidenceExports = array(sections.evidenceExports);
  const blockers = array(packet.blockers).map((item) => clean(item)).filter(Boolean);
  const warnings = array(packet.warnings).map((item) => clean(item)).filter(Boolean);

  if (!recordValue || !Object.keys(packet).length) {
    return {
      available: false,
      customerName: "No customer launch packet",
      statusLabel: "not configured",
      launchModeLabel: "not set",
      exportableLabel: "not exportable",
      executionImplication: "No customer action should be recommended or executed until launch evidence is complete.",
      billingImplication: "Performance-fee review is unavailable until baseline, revenue proof, and approval evidence are attached.",
      nextAction: "Configure launch readiness evidence.",
      updatedAt: null,
      evidenceSections: [],
      blockers: [],
      warnings: []
    };
  }

  const approvedOwners = owners.filter((owner) => bool(record(owner).approved)).length;
  const readReadySystems = connectedSystems.filter((system) => bool(record(system).readReady)).length;
  const writeReadySystems = connectedSystems.filter((system) => bool(record(system).writeReady)).length;
  const approvedMappings = mappings.filter((mapping) => bool(record(mapping).approved)).length;
  const openRisks = risks.filter((risk) => !bool(record(risk).resolved));
  const launchMode = clean(recordValue.launchDecisionMode) || clean(recordValue.maxAllowedLaunchMode);
  const packetStatus = clean(packet.status, clean(recordValue.status, "missing"));

  return {
    available: true,
    customerName: clean(packet.customerName, "Unnamed customer"),
    statusLabel: label(packetStatus, "missing"),
    launchModeLabel: label(launchMode, "not set"),
    exportableLabel: recordValue.exportable ? "exportable" : "not exportable",
    executionImplication: launchMode === "agent_managed_execution"
      ? "Agent-managed execution can be considered if approval controls and channel access remain ready."
      : launchMode === "human_approved_execution"
        ? "Execution should remain human-approved; autonomous channel changes are not cleared by current evidence."
        : "Use recommendation-only or audit-only operation until launch evidence improves.",
    billingImplication: status(billableGate.status) === "ready"
      ? "Performance-fee evidence is ready for customer review."
      : "Performance-fee review should remain blocked until approval evidence is ready.",
    nextAction: clean(recordValue.nextRequiredAction, "Review launch readiness evidence."),
    updatedAt: recordValue.updatedAt ?? null,
    evidenceSections: [
      {
        key: "owners",
        label: "Owner approvals",
        status: sectionStatus(owners.length > 0 && approvedOwners === owners.length),
        detail: `${approvedOwners} of ${owners.length} launch owners approved.`
      },
      {
        key: "systems",
        label: "Connected systems",
        status: sectionStatus(connectedSystems.length > 0 && readReadySystems > 0, writeReadySystems === 0),
        detail: `${readReadySystems} system${readReadySystems === 1 ? "" : "s"} ready for reads; ${writeReadySystems} approved for writes.`
      },
      {
        key: "mappings",
        label: "Mappings",
        status: sectionStatus(mappings.length > 0 && approvedMappings === mappings.length),
        detail: `${approvedMappings} of ${mappings.length} source mappings approved.`
      },
      {
        key: "policy",
        label: "Policy controls",
        status: sectionStatus(bool(policy.approved) && bool(policy.consentApproved) && bool(policy.emergencyStopReady), !bool(policy.rollbackReady)),
        detail: `Policy ${bool(policy.approved) ? "approved" : "pending"}; emergency stop ${bool(policy.emergencyStopReady) ? "ready" : "pending"}.`
      },
      {
        key: "baseline",
        label: "Baseline",
        status: status(baseline.status),
        detail: `${label(baseline.confidence, "unknown")} confidence; billing-ready ${bool(baseline.billingReady) ? "yes" : "no"}.`
      },
      {
        key: "revenue_proof",
        label: "Revenue proof",
        status: status(revenueProof.status),
        detail: `${money(revenueProof.incrementalProfitCents)} incremental profit; ${array(revenueProof.confidenceFlags).length} confidence flags.`
      },
      {
        key: "billable_gate",
        label: "Performance fee gate",
        status: status(billableGate.status),
        detail: clean(billableGate.nextRequiredAction, "Performance-fee approval is not attached.")
      },
      {
        key: "risks",
        label: "Unresolved risks",
        status: openRisks.length === 0 ? "ready" : "warning",
        detail: openRisks.length === 0 ? "No unresolved launch risks." : `${openRisks.length} unresolved launch risk${openRisks.length === 1 ? "" : "s"}.`
      },
      {
        key: "exports",
        label: "Evidence package",
        status: evidenceExports.length > 0 ? "ready" : "blocked",
        detail: `${evidenceExports.length} evidence export${evidenceExports.length === 1 ? "" : "s"} attached.`
      }
    ],
    blockers,
    warnings
  };
}
