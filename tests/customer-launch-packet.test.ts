import assert from "node:assert/strict";
import test from "node:test";
import { buildCustomerLaunchPacket, type CustomerLaunchPacketInput } from "@/lib/customer-launch-packet";

const READY: CustomerLaunchPacketInput = {
  packetId: "packet_1",
  customerName: "Acme Inc.",
  workspaceId: "workspace_1",
  generatedAt: "2026-05-14T12:00:00.000Z",
  owners: [
    { role: "executive_sponsor", name: "Exec", approved: true },
    { role: "workspace_owner", name: "Workspace", approved: true },
    { role: "data_owner", name: "Data", approved: true },
    { role: "channel_owner", name: "Channel", approved: true },
    { role: "consent_compliance_owner", name: "Compliance", approved: true },
    { role: "finance_owner", name: "Finance", approved: true },
    { role: "operator_approver", name: "Operator", approved: true }
  ],
  connectedSystems: [
    { name: "Warehouse", systemType: "warehouse", provider: "Snowflake", readReady: true, writeReady: false, credentialGrantId: "grant_1" },
    { name: "Google Ads", systemType: "ad_platform", provider: "google_ads", accountId: "123", readReady: true, writeReady: true, credentialGrantId: "grant_2" }
  ],
  mappings: [
    { objectName: "users", mappingVersion: "map_v1", approved: true, sourceOfTruth: "warehouse" },
    { objectName: "campaigns", mappingVersion: "map_v1", approved: true, sourceOfTruth: "google_ads" }
  ],
  policy: {
    policyVersion: "policy_v1",
    approved: true,
    consentApproved: true,
    spendCapsApproved: true,
    emergencyStopReady: true,
    rollbackReady: true
  },
  onboarding: {
    status: "ready",
    requestedLaunchMode: "agent_managed_execution",
    maxAllowedLaunchMode: "agent_managed_execution",
    requestedLaunchAllowed: true,
    missingOwners: [],
    blockers: [],
    warnings: [],
    phases: [],
    nextRequiredAction: "Record launch readiness decision and schedule the next customer review."
  },
  dataQuality: {
    status: "ready",
    readyForRecommendation: true,
    readyForExecution: true,
    blockers: [],
    warnings: [],
    gates: [],
    nextRequiredAction: "Record data quality approval and attach evidence to the customer launch packet."
  },
  baseline: {
    status: "ready",
    frozen: true,
    billingReady: true,
    reportable: true,
    confidence: "high",
    method: "randomized_holdout",
    blockers: [],
    warnings: [],
    missingApprovals: [],
    nextRequiredAction: "Record baseline freeze decision and attach it to the customer launch packet."
  },
  revenueProof: {
    app: "acquisition",
    status: "ready",
    confidence: "high",
    baselineLabel: "Acquisition baseline",
    baselineRevenueCents: 1000000,
    expectedRevenueCents: 100000,
    observedRevenueCents: 150000,
    incrementalRevenueCents: 50000,
    spendCents: 10000,
    incrementalProfitCents: 40000,
    treatmentPopulation: 100,
    controlPopulation: 20,
    observedConversions: 10,
    baselineConversionRate: 0.05,
    observedConversionRate: 0.1,
    actions: [],
    exportLinks: [{ label: "Agent audit export", href: "/api/workspace/agents/audit-export", evidenceType: "audit" }],
    confidenceFlags: [],
    blockers: [],
    warnings: [],
    metrics: []
  },
  billableGate: {
    enabled: true,
    status: "ready",
    requestedMode: "agent_managed_execution",
    maxAllowedLaunchMode: "agent_managed_execution",
    blockers: [],
    warnings: [],
    checks: [],
    nextRequiredAction: "Record billable execution gate approval and attach evidence to the customer launch packet."
  },
  unresolvedRisks: [],
  evidenceExports: [{ label: "Launch audit export", href: "/api/workspace/agents/audit-export", evidenceType: "audit" }],
  launchDecision: {
    launchMode: "agent_managed_execution",
    decidedBy: "operator@example.com",
    decidedAt: "2026-05-14T12:00:00.000Z",
    nextReviewAt: "2026-06-14T12:00:00.000Z",
    notes: "Approved for launch."
  }
};

test("buildCustomerLaunchPacket creates an exportable launch packet when all sections are ready", () => {
  const packet = buildCustomerLaunchPacket(READY);

  assert.equal(packet.status, "ready");
  assert.equal(packet.exportable, true);
  assert.deepEqual(packet.blockers, []);
  assert.equal(packet.packetId, "packet_1");
  assert.equal(packet.sections.connectedSystems.length, 2);
  assert.ok(packet.markdown.includes("# Customer Launch Packet: Acme Inc."));
  assert.ok(packet.markdown.includes("Launch mode: agent_managed_execution"));
  assert.ok(packet.markdown.includes("Launch audit export: /api/workspace/agents/audit-export"));
});

test("buildCustomerLaunchPacket blocks export when required sections are missing", () => {
  const packet = buildCustomerLaunchPacket({
    customerName: "",
    workspaceId: ""
  });

  assert.equal(packet.status, "blocked");
  assert.equal(packet.exportable, false);
  assert.ok(packet.blockers.includes("Record customer name."));
  assert.ok(packet.blockers.includes("Attach launch packet to a workspace."));
  assert.ok(packet.blockers.includes("Attach owner roster."));
  assert.ok(packet.blockers.includes("Record launch decision."));
});

test("buildCustomerLaunchPacket carries downstream readiness blockers", () => {
  const packet = buildCustomerLaunchPacket({
    ...READY,
    dataQuality: {
      ...READY.dataQuality!,
      status: "blocked",
      readyForExecution: false,
      blockers: ["Refresh stale source billing."]
    },
    billableGate: {
      ...READY.billableGate!,
      enabled: false,
      status: "blocked",
      blockers: ["Approve performance billing evidence and fee trigger."]
    }
  });

  assert.equal(packet.status, "blocked");
  assert.ok(packet.blockers.includes("Refresh stale source billing."));
  assert.ok(packet.blockers.includes("Approve performance billing evidence and fee trigger."));
});

test("buildCustomerLaunchPacket blocks unowned unresolved risks", () => {
  const packet = buildCustomerLaunchPacket({
    ...READY,
    unresolvedRisks: [{ id: "risk_1", severity: "high", resolved: false }]
  });

  assert.equal(packet.status, "blocked");
  assert.equal(packet.exportable, false);
  assert.ok(packet.blockers.includes("Assign owners to unresolved launch risks."));
  assert.ok(packet.warnings.includes("Launch packet includes unresolved risks."));
});

test("buildCustomerLaunchPacket allows warning-only packets to be exported", () => {
  const packet = buildCustomerLaunchPacket({
    ...READY,
    baseline: {
      ...READY.baseline!,
      status: "warning",
      warnings: ["Baseline period is longer than 120 days; confirm seasonality assumptions."]
    },
    unresolvedRisks: [{ id: "risk_2", severity: "medium", ownerRole: "operator_approver", resolved: false }]
  });

  assert.equal(packet.status, "warning");
  assert.equal(packet.exportable, true);
  assert.ok(packet.warnings.includes("Baseline period is longer than 120 days; confirm seasonality assumptions."));
  assert.ok(packet.warnings.includes("Launch packet includes unresolved risks."));
});
