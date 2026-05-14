import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCustomerBaselineSnapshotDecision,
  type CustomerBaselineSnapshotInput
} from "@/lib/customer-baseline-snapshots";

const READY: CustomerBaselineSnapshotInput = {
  baselineId: "base_1",
  workspaceId: "workspace_1",
  app: "lifecycle",
  method: "randomized_holdout",
  periodStartAt: "2026-02-01T00:00:00.000Z",
  periodEndAt: "2026-04-30T00:00:00.000Z",
  freezeAt: "2026-05-01T00:00:00.000Z",
  eligiblePopulationName: "Active US lifecycle audience",
  eligiblePopulationCount: 12500,
  treatmentDefinition: "Users eligible for approved lifecycle actions",
  eligibleRevenueDefinition: "Net recognized USD revenue excluding refunds, fraud, taxes, and internal accounts",
  currencyCode: "USD",
  metrics: [
    { key: "conversion_rate", label: "Conversion rate", baselineValue: 0.08, unit: "rate", sourceName: "warehouse" },
    { key: "revenue_per_user", label: "Revenue per user", baselineValue: 42.5, unit: "currency", sourceName: "billing" }
  ],
  exclusions: [
    {
      id: "outage_2026_03_12",
      reason: "Tracking outage",
      startAt: "2026-03-12T00:00:00.000Z",
      endAt: "2026-03-14T00:00:00.000Z",
      approved: true
    }
  ],
  sourceSnapshots: [
    { sourceName: "warehouse", snapshotId: "snap_warehouse_1", mappingVersion: "map_v1", rowCount: 12500, rejectedRowCount: 0, frozen: true },
    { sourceName: "billing", snapshotId: "snap_billing_1", mappingVersion: "map_v1", rowCount: 9800, rejectedRowCount: 0, frozen: true }
  ],
  confidence: "high",
  confidenceRationale: "Random holdout with stable pre-period and clean revenue source.",
  stablePrePeriod: true,
  controlDefinition: "10% randomized holdout",
  approvals: [
    { role: "data_owner", approved: true, approvedBy: "data@example.com", approvedAt: "2026-05-01T12:00:00.000Z" },
    { role: "finance_owner", approved: true, approvedBy: "finance@example.com", approvedAt: "2026-05-01T13:00:00.000Z" }
  ]
};

test("buildCustomerBaselineSnapshotDecision marks a frozen approved baseline billing-ready", () => {
  const decision = buildCustomerBaselineSnapshotDecision(READY);

  assert.equal(decision.status, "ready");
  assert.equal(decision.frozen, true);
  assert.equal(decision.reportable, true);
  assert.equal(decision.billingReady, true);
  assert.deepEqual(decision.blockers, []);
  assert.deepEqual(decision.warnings, []);
  assert.equal(decision.nextRequiredAction, "Record baseline freeze decision and attach it to the customer launch packet.");
});

test("buildCustomerBaselineSnapshotDecision blocks incomplete period, population, metrics, and sources", () => {
  const decision = buildCustomerBaselineSnapshotDecision({
    ...READY,
    workspaceId: "",
    periodStartAt: "2026-04-30T00:00:00.000Z",
    periodEndAt: "2026-04-01T00:00:00.000Z",
    eligiblePopulationCount: 0,
    metrics: [{ key: "conversion_rate", baselineValue: 1.2, unit: "rate", sourceName: "" }],
    sourceSnapshots: [{ sourceName: "warehouse", snapshotId: "", mappingVersion: "", rowCount: 0, frozen: false }]
  });

  assert.equal(decision.status, "blocked");
  assert.equal(decision.frozen, false);
  assert.equal(decision.billingReady, false);
  assert.ok(decision.blockers.includes("Attach baseline to a workspace."));
  assert.ok(decision.blockers.includes("Set baseline period end after start."));
  assert.ok(decision.blockers.includes("Record positive eligible population count."));
  assert.ok(decision.blockers.includes("Complete baseline metric conversion_rate."));
  assert.ok(decision.blockers.includes("Keep rate metric conversion_rate between 0 and 1."));
  assert.ok(decision.blockers.includes("Freeze source snapshot warehouse."));
});

test("buildCustomerBaselineSnapshotDecision requires approval for exclusions and baseline owners", () => {
  const decision = buildCustomerBaselineSnapshotDecision({
    ...READY,
    exclusions: [
      { id: "promo", approved: false, startAt: "2026-03-20T00:00:00.000Z", endAt: "2026-03-19T00:00:00.000Z" }
    ],
    approvals: [{ role: "data_owner", approved: true, approvedBy: "data@example.com", approvedAt: "2026-05-01T12:00:00.000Z" }]
  });

  assert.equal(decision.status, "blocked");
  assert.deepEqual(decision.missingApprovals, ["finance_owner"]);
  assert.ok(decision.blockers.includes("Explain baseline exclusion promo."));
  assert.ok(decision.blockers.includes("Approve baseline exclusion promo."));
  assert.ok(decision.blockers.includes("Set exclusion promo end after start."));
  assert.ok(decision.blockers.includes("Missing baseline approvals: finance_owner."));
});

test("buildCustomerBaselineSnapshotDecision treats pre/post baselines as reportable but not billing-ready without stronger confidence", () => {
  const decision = buildCustomerBaselineSnapshotDecision({
    ...READY,
    method: "pre_post",
    controlDefinition: null,
    confidence: "low",
    lowConfidenceManualApprovalRequired: true
  });

  assert.equal(decision.status, "warning");
  assert.equal(decision.frozen, true);
  assert.equal(decision.reportable, true);
  assert.equal(decision.billingReady, false);
  assert.ok(decision.warnings.includes("Pre/post baseline requires manual payout approval."));
  assert.ok(decision.warnings.includes("Low-confidence baseline requires stricter payout approval."));
});

test("buildCustomerBaselineSnapshotDecision blocks stronger methods without a control definition", () => {
  const decision = buildCustomerBaselineSnapshotDecision({
    ...READY,
    method: "matched_cohort",
    controlDefinition: ""
  });

  assert.equal(decision.status, "blocked");
  assert.equal(decision.billingReady, false);
  assert.ok(decision.blockers.includes("Define control or holdout population."));
});

test("buildCustomerBaselineSnapshotDecision warns on small population, rejected rows, long period, and missing rationale", () => {
  const decision = buildCustomerBaselineSnapshotDecision({
    ...READY,
    periodStartAt: "2025-12-01T00:00:00.000Z",
    eligiblePopulationCount: 80,
    confidence: "medium",
    confidenceRationale: "",
    stablePrePeriod: false,
    sourceSnapshots: [
      { sourceName: "warehouse", snapshotId: "snap_1", mappingVersion: "map_v1", rowCount: 80, rejectedRowCount: 2, frozen: true }
    ]
  });

  assert.equal(decision.status, "warning");
  assert.equal(decision.billingReady, false);
  assert.ok(decision.warnings.includes("Baseline period is longer than 120 days; confirm seasonality assumptions."));
  assert.ok(decision.warnings.includes("Eligible population is small; confidence may be limited."));
  assert.ok(decision.warnings.includes("warehouse baseline snapshot has 2 rejected rows."));
  assert.ok(decision.warnings.includes("Confirm stable pre-period performance before billing."));
  assert.ok(decision.warnings.includes("Record baseline confidence rationale."));
});
