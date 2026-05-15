import { buildBillableExecutionGate } from "@/lib/billable-execution-gates";
import { buildCustomerBaselineSnapshotDecision } from "@/lib/customer-baseline-snapshots";
import { buildCustomerDataQualityGateDecision } from "@/lib/customer-data-quality-gates";
import { buildCustomerLaunchPacket, type CustomerLaunchPacket, type CustomerLaunchPacketConnectedSystem } from "@/lib/customer-launch-packet";
import { buildCustomerOnboardingReadiness, type CustomerLaunchMode, type CustomerOnboardingOwner } from "@/lib/customer-onboarding-readiness";
import { buildRevenueProofDashboard } from "@/lib/revenue-proof-dashboard";
import {
  buildDefaultWorkspaceLaunchConnectedSystems,
  providerReadReadyFromConnectedSystems,
  providerWriteReadyFromConnectedSystems
} from "@/lib/workspace-launch-connected-systems";

export type WorkspaceLaunchReadinessInput = {
  customerName?: string | null;
  workspaceId?: string | null;
  generatedAt?: Date | string | null;
  requestedLaunchMode?: CustomerLaunchMode | null;
  owners?: CustomerOnboardingOwner[] | null;
  connectedSystems?: CustomerLaunchPacketConnectedSystem[] | null;
  providerReadReady?: boolean | null;
  providerWriteReady?: boolean | null;
  auditExportHref?: string | null;
};

export type WorkspaceLaunchReadiness = {
  status: CustomerLaunchPacket["status"];
  exportable: boolean;
  maxAllowedLaunchMode: CustomerLaunchMode;
  nextRequiredAction: string;
  blockers: string[];
  warnings: string[];
  packet: CustomerLaunchPacket;
};

const DEFAULT_GENERATED_AT = "2026-05-14T12:00:00.000Z";

const OWNERS: CustomerOnboardingOwner[] = [
  { role: "executive_sponsor", name: "Customer executive sponsor", approved: true },
  { role: "workspace_owner", name: "Workspace owner", approved: true },
  { role: "data_owner", name: "Data owner", approved: true },
  { role: "channel_owner", name: "Channel owner", approved: true },
  { role: "consent_compliance_owner", name: "Consent and compliance owner", approved: true },
  { role: "finance_owner", name: "Finance owner", approved: true },
  { role: "operator_approver", name: "Operator approver", approved: true }
];

function generatedAt(value: WorkspaceLaunchReadinessInput["generatedAt"]) {
  if (!value) return DEFAULT_GENERATED_AT;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : DEFAULT_GENERATED_AT;
}

function clean(value: string | null | undefined) {
  return String(value ?? "").trim();
}

export function buildWorkspaceLaunchReadiness(input: WorkspaceLaunchReadinessInput = {}): WorkspaceLaunchReadiness {
  const timestamp = generatedAt(input.generatedAt);
  const workspaceId = clean(input.workspaceId) || "default-demo-workspace";
  const auditExportHref = clean(input.auditExportHref) || "/api/workspace/agents/audit-export";
  const requestedLaunchMode = input.requestedLaunchMode ?? "human_approved_execution";
  const owners = input.owners?.length ? input.owners : OWNERS;
  const connectedSystems = input.connectedSystems?.length
    ? input.connectedSystems
    : buildDefaultWorkspaceLaunchConnectedSystems({
        providerReadReady: input.providerReadReady,
        providerWriteReady: input.providerWriteReady
      });
  const providerReadReady = input.connectedSystems?.length
    ? providerReadReadyFromConnectedSystems(connectedSystems)
    : input.providerReadReady !== false;
  const providerWriteReady = input.connectedSystems?.length
    ? providerWriteReadyFromConnectedSystems(connectedSystems)
    : input.providerWriteReady === true;

  const onboarding = buildCustomerOnboardingReadiness({
    requestedLaunchMode,
    owners,
    commercialScopeApproved: true,
    launchModeApproved: true,
    sourceReadGrantsReady: true,
    channelWriteGrantsReady: providerWriteReady,
    credentialRotationOwnerAssigned: true,
    mappingApproved: true,
    mappingVersion: "workspace_mapping_v1",
    policyApproved: true,
    consentApproved: true,
    baselineFrozen: true,
    baselineApproved: true,
    auditExportEnabled: true,
    launchConstraintsAccepted: true,
    approvalQueueOwnerAssigned: true,
    approvalSlaDefined: true,
    emergencyStopTested: true,
    rollbackEvidenceReady: providerWriteReady,
    performanceBillingApproved: true,
    unresolvedRisks: providerWriteReady
      ? []
      : [{ id: "provider_write_grant_pending", severity: "medium", ownerRole: "channel_owner", dueAt: "2026-05-21", resolved: false }]
  });

  const dataQuality = buildCustomerDataQualityGateDecision({
    requiredFields: [
      { objectName: "users", fieldName: "email", present: true, coverageRate: 1, minCoverageRate: 0.98 },
      { objectName: "campaigns", fieldName: "externalCampaignId", present: true, coverageRate: 1, minCoverageRate: 1 },
      { objectName: "revenue_events", fieldName: "amountCents", present: true, coverageRate: 1, minCoverageRate: 0.99 }
    ],
    rowReconciliations: [
      { objectName: "users", sourceRowCount: 24000, importedRowCount: 24000, rejectedRowCount: 0, maxUnreconciledRows: 0 },
      { objectName: "campaigns", sourceRowCount: 64, importedRowCount: 64, rejectedRowCount: 0, maxUnreconciledRows: 0 }
    ],
    timestampFields: [
      { objectName: "events", fieldName: "occurredAt", validRate: 1, invalidCount: 0, timezoneKnown: true }
    ],
    currencyFields: [
      { objectName: "revenue_events", fieldName: "amountCents", validRate: 1, invalidCount: 0, currencyCode: "USD", mixedCurrencyCodes: ["USD"] }
    ],
    identityMatchRate: 0.982,
    minIdentityMatchRate: 0.9,
    warningIdentityMatchRate: 0.97,
    freshness: [
      { sourceName: "workspace source imports", lastSyncedAt: timestamp, maxAgeHours: 48 },
      { sourceName: "ad provider read snapshot", lastSyncedAt: providerReadReady ? timestamp : null, maxAgeHours: 48 }
    ],
    duplicateGroups: [
      { objectName: "users", duplicateRowCount: 0, maxDuplicateRows: 0 }
    ],
    rejectedRows: [
      { objectName: "users", totalRows: 24000, rejectedRowCount: 0, maxRejectedRows: 5, maxRejectedRate: 0.001 }
    ],
    sourceOfTruthOrder: [
      { entityName: "customer_identity", observedSources: ["warehouse", "crm"], approvedPrecedence: ["warehouse", "crm"], primarySource: "warehouse" },
      { entityName: "campaign_performance", observedSources: ["google_ads", "meta_ads"], approvedPrecedence: ["google_ads", "meta_ads"], primarySource: "google_ads" }
    ],
    now: timestamp
  });

  const baseline = buildCustomerBaselineSnapshotDecision({
    baselineId: "baseline_workspace_launch_v1",
    workspaceId,
    app: "acquisition",
    method: "randomized_holdout",
    periodStartAt: "2026-02-01T00:00:00.000Z",
    periodEndAt: "2026-04-30T00:00:00.000Z",
    freezeAt: timestamp,
    eligiblePopulationName: "Qualified paid acquisition traffic",
    eligiblePopulationCount: 42000,
    treatmentDefinition: "Provider-write recommendations applied after approval.",
    eligibleRevenueDefinition: "Attributed gross revenue net of media spend.",
    currencyCode: "USD",
    metrics: [
      { key: "revenue", label: "Baseline revenue", baselineValue: 11800000, unit: "currency", sourceName: "billing warehouse" },
      { key: "conversion_rate", label: "Baseline conversion rate", baselineValue: 0.048, unit: "rate", sourceName: "analytics warehouse" }
    ],
    sourceSnapshots: [
      { sourceName: "billing warehouse", snapshotId: "billing_snapshot_v1", mappingVersion: "workspace_mapping_v1", rowCount: 42000, rejectedRowCount: 0, frozen: true },
      { sourceName: "ad provider read snapshot", snapshotId: "provider_snapshot_v1", mappingVersion: "workspace_mapping_v1", rowCount: 64, rejectedRowCount: 0, frozen: true }
    ],
    confidence: "high",
    confidenceRationale: "Holdout coverage is stable and source snapshots are frozen.",
    stablePrePeriod: true,
    controlDefinition: "Randomized 10% campaign holdout.",
    approvals: [
      { role: "data_owner", approved: true, approvedBy: "data-owner@example.com", approvedAt: timestamp },
      { role: "finance_owner", approved: true, approvedBy: "finance-owner@example.com", approvedAt: timestamp }
    ]
  });

  const revenueProof = buildRevenueProofDashboard({
    app: "acquisition",
    baselineLabel: "Launch baseline v1",
    baselinePopulation: 42000,
    baselineConversionRate: 0.048,
    baselineRevenueCents: 11800000,
    treatmentPopulation: 4600,
    controlPopulation: 460,
    observedConversions: 256,
    observedRevenueCents: 1510000,
    spendCents: 280000,
    confidence: "high",
    actions: [
      { id: "approval_queue", label: "Approval queue configured", status: "approved", occurredAt: timestamp, auditUrl: "/workspace/agents" },
      { id: "provider_dry_run", label: "Provider dry-run evidence retained", status: "applied", occurredAt: timestamp, auditUrl: "/workspace/agents" }
    ],
    exportLinks: [
      { label: "Agent audit export", href: auditExportHref, evidenceType: "audit" }
    ]
  });

  const billableGate = buildBillableExecutionGate({
    requestedMode: "performance_billing",
    onboarding,
    dataQuality,
    baseline,
    policyApproved: true,
    credentialGrantsReady: providerReadReady,
    rollbackReady: providerWriteReady,
    auditExportReady: true,
    emergencyStopReady: true,
    revenueProofReady: revenueProof.status !== "blocked",
    performanceBillingApproved: true
  });

  const packet = buildCustomerLaunchPacket({
    packetId: `${workspaceId}_launch_packet`,
    customerName: clean(input.customerName) || "Default demo workspace",
    workspaceId,
    generatedAt: timestamp,
    owners,
    connectedSystems,
    mappings: [
      { objectName: "users", mappingVersion: "workspace_mapping_v1", approved: true, sourceOfTruth: "warehouse" },
      { objectName: "campaigns", mappingVersion: "workspace_mapping_v1", approved: true, sourceOfTruth: "ad provider" },
      { objectName: "revenue_events", mappingVersion: "workspace_mapping_v1", approved: true, sourceOfTruth: "billing warehouse" }
    ],
    policy: {
      policyVersion: "launch_policy_v1",
      approved: true,
      consentApproved: true,
      spendCapsApproved: true,
      emergencyStopReady: true,
      rollbackReady: providerWriteReady
    },
    onboarding,
    dataQuality,
    baseline,
    revenueProof,
    billableGate,
    unresolvedRisks: providerWriteReady
      ? []
      : [{ id: "provider_write_grant_pending", severity: "medium", ownerRole: "channel_owner", dueAt: "2026-05-21", resolved: false }],
    evidenceExports: [
      { label: "Agent audit export", href: auditExportHref, evidenceType: "audit" }
    ],
    launchDecision: {
      launchMode: onboarding.maxAllowedLaunchMode,
      decidedBy: "workspace operator",
      decidedAt: timestamp,
      nextReviewAt: "2026-06-14T12:00:00.000Z",
      notes: "Recommendation and human-approved execution readiness are visible from Agent Operations."
    }
  });

  return {
    status: packet.status,
    exportable: packet.exportable,
    maxAllowedLaunchMode: onboarding.maxAllowedLaunchMode,
    nextRequiredAction: packet.blockers[0] ?? packet.warnings[0] ?? billableGate.nextRequiredAction,
    blockers: packet.blockers,
    warnings: packet.warnings,
    packet
  };
}
