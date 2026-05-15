import assert from "node:assert/strict";
import test from "node:test";
import { buildWorkspaceLaunchReadiness } from "@/lib/workspace-launch-readiness";

test("buildWorkspaceLaunchReadiness summarizes a launchable workspace packet", () => {
  const readiness = buildWorkspaceLaunchReadiness({
    customerName: "Acme Inc.",
    workspaceId: "workspace_1",
    generatedAt: "2026-05-14T12:00:00.000Z",
    providerWriteReady: true
  });

  assert.equal(readiness.status, "ready");
  assert.equal(readiness.exportable, true);
  assert.equal(readiness.maxAllowedLaunchMode, "agent_managed_execution");
  assert.equal(readiness.packet.customerName, "Acme Inc.");
  assert.equal(readiness.packet.sections.billableGate?.enabled, true);
  assert.deepEqual(readiness.blockers, []);
  assert.ok(readiness.packet.markdown.includes("Customer Launch Packet: Acme Inc."));
});

test("buildWorkspaceLaunchReadiness downgrades execution when provider writes are not ready", () => {
  const readiness = buildWorkspaceLaunchReadiness({
    customerName: "Acme Inc.",
    workspaceId: "workspace_1",
    generatedAt: "2026-05-14T12:00:00.000Z",
    providerWriteReady: false
  });

  assert.equal(readiness.status, "blocked");
  assert.equal(readiness.exportable, false);
  assert.equal(readiness.maxAllowedLaunchMode, "recommendation_only");
  assert.ok(readiness.blockers.includes("Approve channel write grants before execution."));
  assert.ok(readiness.blockers.includes("Attach rollback evidence before billable execution."));
  assert.ok(readiness.warnings.includes("Launch packet includes unresolved risks."));
});

test("buildWorkspaceLaunchReadiness blocks stale provider inspection evidence", () => {
  const readiness = buildWorkspaceLaunchReadiness({
    customerName: "Acme Inc.",
    workspaceId: "workspace_1",
    generatedAt: "2026-05-14T12:00:00.000Z",
    providerReadReady: false,
    providerWriteReady: true
  });

  assert.equal(readiness.status, "blocked");
  assert.equal(readiness.packet.sections.dataQuality?.readyForExecution, false);
  assert.ok(readiness.blockers.includes("Record last sync time for ad provider read snapshot."));
  assert.ok(readiness.blockers.includes("Confirm credential grants and token health."));
});

test("buildWorkspaceLaunchReadiness uses custom launch owner approvals", () => {
  const readiness = buildWorkspaceLaunchReadiness({
    customerName: "Acme Inc.",
    workspaceId: "workspace_1",
    generatedAt: "2026-05-14T12:00:00.000Z",
    providerWriteReady: true,
    owners: [
      { role: "executive_sponsor", name: "Executive", approved: true },
      { role: "workspace_owner", name: "Workspace", approved: true },
      { role: "data_owner", name: "Data", approved: false },
      { role: "channel_owner", name: "Channel", approved: true },
      { role: "consent_compliance_owner", name: "Compliance", approved: true },
      { role: "finance_owner", name: "Finance", approved: true },
      { role: "operator_approver", name: "Operator", approved: true }
    ]
  });

  assert.equal(readiness.status, "blocked");
  assert.equal(readiness.packet.sections.owners.find((owner) => owner.role === "data_owner")?.approved, false);
  assert.ok(readiness.blockers.includes("Approve owner roles: data_owner."));
});

test("buildWorkspaceLaunchReadiness uses custom connected-system evidence", () => {
  const readiness = buildWorkspaceLaunchReadiness({
    customerName: "Acme Inc.",
    workspaceId: "workspace_1",
    generatedAt: "2026-05-14T12:00:00.000Z",
    connectedSystems: [
      { name: "Workspace source imports", systemType: "warehouse", provider: "workspace", readReady: true, writeReady: false },
      { name: "Google Ads", systemType: "ad_platform", provider: "google_ads", readReady: true, writeReady: false },
      { name: "Meta Ads", systemType: "ad_platform", provider: "meta_ads", readReady: false, writeReady: false }
    ]
  });

  assert.equal(readiness.status, "blocked");
  assert.equal(readiness.maxAllowedLaunchMode, "recommendation_only");
  assert.equal(readiness.packet.sections.connectedSystems.find((system) => system.provider === "google_ads")?.readReady, true);
  assert.ok(readiness.blockers.includes("Approve channel write grants before execution."));
});

test("buildWorkspaceLaunchReadiness uses custom baseline and revenue proof evidence", () => {
  const readiness = buildWorkspaceLaunchReadiness({
    customerName: "Acme Inc.",
    workspaceId: "workspace_1",
    generatedAt: "2026-05-14T12:00:00.000Z",
    providerWriteReady: true,
    baselineEvidence: {
      baseline: {
        baselineId: "baseline_custom",
        workspaceId: "workspace_1",
        app: "acquisition",
        method: "randomized_holdout",
        periodStartAt: "2026-02-01T00:00:00.000Z",
        periodEndAt: "2026-04-30T00:00:00.000Z",
        freezeAt: "2026-05-14T12:00:00.000Z",
        eligiblePopulationName: "Qualified paid traffic",
        eligiblePopulationCount: 10000,
        eligibleRevenueDefinition: "Gross revenue net of spend.",
        currencyCode: "USD",
        metrics: [{ key: "revenue", baselineValue: 5000000, sourceName: "billing warehouse" }],
        sourceSnapshots: [{ sourceName: "billing warehouse", snapshotId: "snap_1", mappingVersion: "v1", rowCount: 10000, frozen: true }],
        confidence: "medium",
        confidenceRationale: "Stable enough for launch.",
        stablePrePeriod: true,
        controlDefinition: "Randomized holdout.",
        approvals: [
          { role: "data_owner", approved: true, approvedBy: "data@example.com", approvedAt: "2026-05-14T12:00:00.000Z" },
          { role: "finance_owner", approved: true, approvedBy: "finance@example.com", approvedAt: "2026-05-14T12:00:00.000Z" }
        ]
      },
      revenueProof: {
        app: "acquisition",
        baselineLabel: "Custom baseline",
        baselinePopulation: 10000,
        baselineConversionRate: 0.04,
        baselineRevenueCents: 5000000,
        treatmentPopulation: 1000,
        controlPopulation: 100,
        observedConversions: 60,
        observedRevenueCents: 650000,
        spendCents: 100000,
        confidence: "medium",
        actions: [{ id: "approval_queue", label: "Approval queue configured", status: "approved" }],
        exportLinks: [{ label: "Audit export", href: "/api/workspace/agents/audit-export", evidenceType: "audit" }]
      }
    }
  });

  assert.equal(readiness.packet.sections.baseline?.confidence, "medium");
  assert.equal(readiness.packet.sections.revenueProof?.baselineLabel, "Custom baseline");
  assert.equal(readiness.packet.sections.revenueProof?.incrementalProfitCents, 50000);
});
