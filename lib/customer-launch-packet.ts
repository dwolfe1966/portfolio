import type { BillableExecutionGateDecision } from "@/lib/billable-execution-gates";
import type { CustomerBaselineSnapshotDecision } from "@/lib/customer-baseline-snapshots";
import type { CustomerDataQualityGateDecision } from "@/lib/customer-data-quality-gates";
import type { CustomerLaunchMode, CustomerOnboardingOwner, CustomerOnboardingReadiness, CustomerOnboardingRisk } from "@/lib/customer-onboarding-readiness";
import type { RevenueProofDashboard, RevenueProofExportLink } from "@/lib/revenue-proof-dashboard";

export type CustomerLaunchPacketStatus = "ready" | "warning" | "blocked";

export type CustomerLaunchPacketConnectedSystem = {
  name: string;
  systemType?: "warehouse" | "crm" | "billing" | "analytics" | "esp" | "ad_platform" | "spreadsheet" | string | null;
  provider?: string | null;
  accountId?: string | null;
  readReady?: boolean | null;
  writeReady?: boolean | null;
  credentialGrantId?: string | null;
};

export type CustomerLaunchPacketMapping = {
  objectName: string;
  mappingVersion?: string | null;
  approved?: boolean | null;
  sourceOfTruth?: string | null;
};

export type CustomerLaunchPacketPolicy = {
  policyVersion?: string | null;
  approved?: boolean | null;
  consentApproved?: boolean | null;
  spendCapsApproved?: boolean | null;
  emergencyStopReady?: boolean | null;
  rollbackReady?: boolean | null;
};

export type CustomerLaunchPacketDecision = {
  launchMode: CustomerLaunchMode;
  decidedBy?: string | null;
  decidedAt?: Date | string | null;
  nextReviewAt?: Date | string | null;
  notes?: string | null;
};

export type CustomerLaunchPacketInput = {
  packetId?: string | null;
  customerName?: string | null;
  workspaceId?: string | null;
  generatedAt?: Date | string | null;
  owners?: CustomerOnboardingOwner[];
  connectedSystems?: CustomerLaunchPacketConnectedSystem[];
  mappings?: CustomerLaunchPacketMapping[];
  policy?: CustomerLaunchPacketPolicy | null;
  onboarding?: CustomerOnboardingReadiness | null;
  dataQuality?: CustomerDataQualityGateDecision | null;
  baseline?: CustomerBaselineSnapshotDecision | null;
  revenueProof?: RevenueProofDashboard | null;
  billableGate?: BillableExecutionGateDecision | null;
  unresolvedRisks?: CustomerOnboardingRisk[];
  evidenceExports?: RevenueProofExportLink[];
  launchDecision?: CustomerLaunchPacketDecision | null;
};

export type CustomerLaunchPacket = {
  packetId: string;
  customerName: string;
  workspaceId: string;
  generatedAt: string;
  status: CustomerLaunchPacketStatus;
  exportable: boolean;
  blockers: string[];
  warnings: string[];
  sections: {
    owners: CustomerOnboardingOwner[];
    connectedSystems: CustomerLaunchPacketConnectedSystem[];
    mappings: CustomerLaunchPacketMapping[];
    policy: CustomerLaunchPacketPolicy | null;
    onboarding: CustomerOnboardingReadiness | null;
    dataQuality: CustomerDataQualityGateDecision | null;
    baseline: CustomerBaselineSnapshotDecision | null;
    revenueProof: RevenueProofDashboard | null;
    billableGate: BillableExecutionGateDecision | null;
    unresolvedRisks: CustomerOnboardingRisk[];
    evidenceExports: RevenueProofExportLink[];
    launchDecision: CustomerLaunchPacketDecision | null;
  };
  markdown: string;
};

function normalizedDate(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function clean(value: string | null | undefined) {
  return String(value ?? "").trim();
}

function lineItems(items: string[]) {
  return items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : "- None";
}

function ownerLabel(owner: CustomerOnboardingOwner) {
  const contact = owner.email || owner.name || "unassigned";
  return `${owner.role}: ${contact}${owner.approved ? " (approved)" : " (not approved)"}`;
}

function systemLabel(system: CustomerLaunchPacketConnectedSystem) {
  const readiness = [
    system.readReady ? "read ready" : "read pending",
    system.writeReady ? "write ready" : "write pending"
  ].join(", ");
  return `${system.name}${system.provider ? ` (${system.provider})` : ""}: ${readiness}`;
}

function mappingLabel(mapping: CustomerLaunchPacketMapping) {
  return `${mapping.objectName}: ${mapping.mappingVersion || "unversioned"}${mapping.approved ? " (approved)" : " (not approved)"}`;
}

function statusFor(blockers: string[], warnings: string[]): CustomerLaunchPacketStatus {
  if (blockers.length > 0) return "blocked";
  if (warnings.length > 0) return "warning";
  return "ready";
}

function buildMarkdown(input: {
  packetId: string;
  customerName: string;
  workspaceId: string;
  generatedAt: string;
  status: CustomerLaunchPacketStatus;
  blockers: string[];
  warnings: string[];
  owners: CustomerOnboardingOwner[];
  connectedSystems: CustomerLaunchPacketConnectedSystem[];
  mappings: CustomerLaunchPacketMapping[];
  policy: CustomerLaunchPacketPolicy | null;
  baseline: CustomerBaselineSnapshotDecision | null;
  revenueProof: RevenueProofDashboard | null;
  billableGate: BillableExecutionGateDecision | null;
  unresolvedRisks: CustomerOnboardingRisk[];
  evidenceExports: RevenueProofExportLink[];
  launchDecision: CustomerLaunchPacketDecision | null;
}) {
  return [
    `# Customer Launch Packet: ${input.customerName}`,
    "",
    `Packet: ${input.packetId}`,
    `Workspace: ${input.workspaceId}`,
    `Generated: ${input.generatedAt}`,
    `Status: ${input.status}`,
    "",
    "## Decision",
    `Launch mode: ${input.launchDecision?.launchMode ?? "not recorded"}`,
    `Decided by: ${input.launchDecision?.decidedBy ?? "not recorded"}`,
    `Next review: ${normalizedDate(input.launchDecision?.nextReviewAt) ?? "not recorded"}`,
    "",
    "## Owners",
    lineItems(input.owners.map(ownerLabel)),
    "",
    "## Connected Systems",
    lineItems(input.connectedSystems.map(systemLabel)),
    "",
    "## Mappings",
    lineItems(input.mappings.map(mappingLabel)),
    "",
    "## Policy",
    lineItems([
      `Policy version: ${input.policy?.policyVersion || "not recorded"}`,
      `Policy approved: ${input.policy?.approved === true ? "yes" : "no"}`,
      `Consent approved: ${input.policy?.consentApproved === true ? "yes" : "no"}`,
      `Emergency stop ready: ${input.policy?.emergencyStopReady === true ? "yes" : "no"}`,
      `Rollback ready: ${input.policy?.rollbackReady === true ? "yes" : "no"}`
    ]),
    "",
    "## Baseline And Revenue Proof",
    lineItems([
      `Baseline status: ${input.baseline?.status ?? "missing"}`,
      `Baseline billing ready: ${input.baseline?.billingReady === true ? "yes" : "no"}`,
      `Revenue proof status: ${input.revenueProof?.status ?? "missing"}`,
      `Billable gate status: ${input.billableGate?.status ?? "missing"}`
    ]),
    "",
    "## Unresolved Risks",
    lineItems(input.unresolvedRisks.filter((risk) => !risk.resolved).map((risk) => `${risk.id}: ${risk.severity ?? "unknown"}${risk.ownerRole ? ` owned by ${risk.ownerRole}` : " unowned"}`)),
    "",
    "## Evidence Exports",
    lineItems(input.evidenceExports.map((link) => `${link.label}: ${link.href}`)),
    "",
    "## Blockers",
    lineItems(input.blockers),
    "",
    "## Warnings",
    lineItems(input.warnings)
  ].join("\n");
}

export function buildCustomerLaunchPacket(input: CustomerLaunchPacketInput): CustomerLaunchPacket {
  const owners = input.owners ?? [];
  const connectedSystems = input.connectedSystems ?? [];
  const mappings = input.mappings ?? [];
  const unresolvedRisks = input.unresolvedRisks ?? [];
  const evidenceExports = input.evidenceExports ?? input.revenueProof?.exportLinks ?? [];
  const blockers: string[] = [];
  const warnings: string[] = [];
  const packetId = clean(input.packetId) || `launch_packet_${Date.now()}`;
  const customerName = clean(input.customerName) || "Unnamed customer";
  const workspaceId = clean(input.workspaceId);
  const generatedAt = normalizedDate(input.generatedAt) ?? new Date().toISOString();

  if (!clean(input.customerName)) blockers.push("Record customer name.");
  if (!workspaceId) blockers.push("Attach launch packet to a workspace.");
  if (owners.length === 0) blockers.push("Attach owner roster.");
  if (connectedSystems.length === 0) blockers.push("Attach connected systems inventory.");
  if (mappings.length === 0) blockers.push("Attach approved mappings.");
  if (!input.policy) blockers.push("Attach policy constraints.");
  if (!input.baseline) blockers.push("Attach baseline snapshot decision.");
  if (!input.revenueProof) blockers.push("Attach revenue proof evidence.");
  if (!input.billableGate) blockers.push("Attach billable execution gate decision.");
  if (!input.launchDecision) blockers.push("Record launch decision.");

  const unapprovedOwners = owners.filter((owner) => owner.approved !== true);
  if (unapprovedOwners.length > 0) blockers.push(`Approve owner roles: ${unapprovedOwners.map((owner) => owner.role).join(", ")}.`);
  const unmapped = mappings.filter((mapping) => mapping.approved !== true);
  if (unmapped.length > 0) blockers.push(`Approve mappings: ${unmapped.map((mapping) => mapping.objectName).join(", ")}.`);
  if (input.policy && input.policy.approved !== true) blockers.push("Approve launch policy.");
  if (input.policy && input.policy.consentApproved !== true) blockers.push("Approve consent policy.");
  if (input.onboarding?.status === "blocked") blockers.push(...input.onboarding.blockers);
  if (input.dataQuality?.status === "blocked") blockers.push(...input.dataQuality.blockers);
  if (input.baseline && !input.baseline.reportable) blockers.push("Make baseline reportable before launch packet export.");
  if (input.billableGate?.status === "blocked") blockers.push(...input.billableGate.blockers);
  if (unresolvedRisks.some((risk) => !risk.resolved && !risk.ownerRole)) blockers.push("Assign owners to unresolved launch risks.");
  if (evidenceExports.length === 0) blockers.push("Attach evidence export links.");

  if (input.onboarding?.status === "warning") warnings.push(...input.onboarding.warnings);
  if (input.dataQuality?.status === "warning") warnings.push(...input.dataQuality.warnings);
  if (input.baseline?.status === "warning") warnings.push(...input.baseline.warnings);
  if (input.revenueProof?.status === "warning") warnings.push(...input.revenueProof.warnings);
  if (input.billableGate?.status === "warning") warnings.push(...input.billableGate.warnings);
  if (unresolvedRisks.some((risk) => !risk.resolved)) warnings.push("Launch packet includes unresolved risks.");

  const status = statusFor(blockers, warnings);
  const markdown = buildMarkdown({
    packetId,
    customerName,
    workspaceId,
    generatedAt,
    status,
    blockers,
    warnings,
    owners,
    connectedSystems,
    mappings,
    policy: input.policy ?? null,
    baseline: input.baseline ?? null,
    revenueProof: input.revenueProof ?? null,
    billableGate: input.billableGate ?? null,
    unresolvedRisks,
    evidenceExports,
    launchDecision: input.launchDecision ?? null
  });

  return {
    packetId,
    customerName,
    workspaceId,
    generatedAt,
    status,
    exportable: status !== "blocked",
    blockers,
    warnings,
    sections: {
      owners,
      connectedSystems,
      mappings,
      policy: input.policy ?? null,
      onboarding: input.onboarding ?? null,
      dataQuality: input.dataQuality ?? null,
      baseline: input.baseline ?? null,
      revenueProof: input.revenueProof ?? null,
      billableGate: input.billableGate ?? null,
      unresolvedRisks,
      evidenceExports,
      launchDecision: input.launchDecision ?? null
    },
    markdown
  };
}
