import assert from "node:assert/strict";
import test from "node:test";
import { buildWorkspaceLaunchReport } from "@/lib/workspace-launch-report";

test("buildWorkspaceLaunchReport summarizes launch posture and implications", () => {
  const report = buildWorkspaceLaunchReport({
    status: "warning",
    exportable: true,
    maxAllowedLaunchMode: "human_approved_execution",
    nextRequiredAction: "Approve channel write grants before execution.",
    updatedAt: new Date("2026-05-16T12:00:00.000Z"),
    launchPacket: {
      customerName: "Acme",
      status: "warning",
      blockers: ["Approve channel write grants before execution."],
      warnings: ["Launch packet includes unresolved risks."],
      sections: {
        owners: [{ approved: true }, { approved: true }],
        connectedSystems: [{ readReady: true, writeReady: false }],
        mappings: [{ approved: true }],
        policy: { approved: true, consentApproved: true, emergencyStopReady: true, rollbackReady: false },
        baseline: { status: "ready", confidence: "high", billingReady: true },
        revenueProof: { status: "warning", incrementalProfitCents: 500000, confidenceFlags: ["directional"] },
        billableGate: { status: "blocked", nextRequiredAction: "Attach rollback evidence before billable execution." },
        unresolvedRisks: [{ resolved: false }],
        evidenceExports: [{ href: "/api/workspace/agents/audit-export" }]
      }
    }
  });

  assert.equal(report.available, true);
  assert.equal(report.customerName, "Acme");
  assert.equal(report.statusLabel, "warning");
  assert.equal(report.launchModeLabel, "human approved execution");
  assert.match(report.executionImplication, /human-approved/);
  assert.match(report.billingImplication, /Performance-fee/);
  assert.equal(report.evidenceSections.find((section) => section.key === "systems")?.status, "warning");
  assert.equal(report.evidenceSections.find((section) => section.key === "systems")?.detail, "1 system ready for reads; 0 approved for writes.");
  assert.equal(report.evidenceSections.find((section) => section.key === "revenue_proof")?.detail, "$5,000 incremental profit; 1 confidence flags.");
  assert.equal(report.evidenceSections.find((section) => section.key === "billable_gate")?.label, "Performance fee gate");
  assert.deepEqual(report.blockers, ["Approve channel write grants before execution."]);
});

test("buildWorkspaceLaunchReport handles missing packets", () => {
  const report = buildWorkspaceLaunchReport(null);

  assert.equal(report.available, false);
  assert.equal(report.customerName, "No customer launch packet");
  assert.equal(report.statusLabel, "not configured");
  assert.equal(report.evidenceSections.length, 0);
});
