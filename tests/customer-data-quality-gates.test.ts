import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCustomerDataQualityGateDecision,
  type CustomerDataQualityGateInput
} from "@/lib/customer-data-quality-gates";

const READY: CustomerDataQualityGateInput = {
  requiredFields: [
    { objectName: "users", fieldName: "email", present: true, coverageRate: 1 },
    { objectName: "orders", fieldName: "amount", present: true, coverageRate: 1, minCoverageRate: 0.99 }
  ],
  rowReconciliations: [
    { objectName: "users", sourceRowCount: 1000, importedRowCount: 1000, rejectedRowCount: 0 },
    { objectName: "orders", sourceRowCount: 500, importedRowCount: 500 }
  ],
  timestampFields: [
    { objectName: "orders", fieldName: "createdAt", validRate: 1, invalidCount: 0, timezoneKnown: true }
  ],
  currencyFields: [
    { objectName: "orders", fieldName: "amount", invalidCount: 0, currencyCode: "USD", mixedCurrencyCodes: ["USD"] }
  ],
  identityMatchRate: 0.98,
  freshness: [
    { sourceName: "crm", lastSyncedAt: "2026-05-14T08:00:00.000Z", maxAgeHours: 24 },
    { sourceName: "billing", lastSyncedAt: "2026-05-14T10:00:00.000Z", maxAgeHours: 24 }
  ],
  duplicateGroups: [
    { objectName: "users", duplicateRowCount: 0 }
  ],
  rejectedRows: [
    { objectName: "users", totalRows: 1000, rejectedRowCount: 0, maxRejectedRows: 10, maxRejectedRate: 0.01 }
  ],
  sourceOfTruthOrder: [
    { entityName: "customer_profile", observedSources: ["crm", "billing"], approvedPrecedence: ["crm", "billing"], primarySource: "crm" }
  ],
  now: "2026-05-14T12:00:00.000Z"
};

test("buildCustomerDataQualityGateDecision marks clean evidence ready for execution", () => {
  const decision = buildCustomerDataQualityGateDecision(READY);

  assert.equal(decision.status, "ready");
  assert.equal(decision.readyForRecommendation, true);
  assert.equal(decision.readyForExecution, true);
  assert.deepEqual(decision.blockers, []);
  assert.deepEqual(decision.warnings, []);
  assert.equal(decision.nextRequiredAction, "Record data quality approval and attach evidence to the customer launch packet.");
});

test("buildCustomerDataQualityGateDecision blocks missing fields and unreconciled rows", () => {
  const decision = buildCustomerDataQualityGateDecision({
    ...READY,
    requiredFields: [
      { objectName: "users", fieldName: "email", present: false },
      { objectName: "orders", fieldName: "amount", present: true, coverageRate: 0.8, minCoverageRate: 0.99 }
    ],
    rowReconciliations: [
      { objectName: "users", sourceRowCount: 1000, importedRowCount: 950, rejectedRowCount: 10 }
    ]
  });

  assert.equal(decision.status, "blocked");
  assert.equal(decision.readyForRecommendation, false);
  assert.equal(decision.readyForExecution, false);
  assert.ok(decision.blockers.includes("Map required field users.email."));
  assert.ok(decision.blockers.includes("Raise orders.amount coverage to at least 99%."));
  assert.ok(decision.blockers.includes("Reconcile 40 unaccounted users rows."));
  assert.equal(decision.nextRequiredAction, "Map required field users.email.");
});

test("buildCustomerDataQualityGateDecision blocks semantic and freshness failures", () => {
  const decision = buildCustomerDataQualityGateDecision({
    ...READY,
    timestampFields: [
      { objectName: "events", fieldName: "occurredAt", validRate: 0.9, minValidRate: 0.99, invalidCount: 25, timezoneKnown: false }
    ],
    currencyFields: [
      { objectName: "orders", fieldName: "amount", invalidCount: 2, currencyCode: null, mixedCurrencyCodes: ["USD", "EUR"] }
    ],
    freshness: [
      { sourceName: "billing", lastSyncedAt: "2026-05-12T12:00:00.000Z", maxAgeHours: 24 }
    ]
  });

  assert.equal(decision.status, "blocked");
  assert.ok(decision.blockers.includes("Fix timestamp parsing for events.occurredAt."));
  assert.ok(decision.blockers.includes("Set currency code for orders.amount."));
  assert.ok(decision.blockers.includes("Fix 2 invalid currency values in orders.amount."));
  assert.ok(decision.blockers.includes("Normalize mixed currencies for orders.amount."));
  assert.ok(decision.blockers.includes("Refresh stale source billing."));
  assert.ok(decision.warnings.includes("Confirm timezone semantics for events.occurredAt."));
});

test("buildCustomerDataQualityGateDecision warns for near-threshold but usable evidence", () => {
  const decision = buildCustomerDataQualityGateDecision({
    ...READY,
    requiredFields: [
      { objectName: "orders", fieldName: "discountCode", present: true, coverageRate: 0.98, minCoverageRate: 0.95 }
    ],
    identityMatchRate: 0.94,
    freshness: [
      { sourceName: "crm", lastSyncedAt: "2026-05-13T16:00:00.000Z", maxAgeHours: 24 }
    ],
    duplicateGroups: [
      { objectName: "users", duplicateRowCount: 1, maxDuplicateRows: 1 }
    ],
    rejectedRows: [
      { objectName: "users", totalRows: 1000, rejectedRowCount: 1, maxRejectedRows: 1, maxRejectedRate: 0.01 }
    ]
  });

  assert.equal(decision.status, "warning");
  assert.equal(decision.readyForRecommendation, true);
  assert.equal(decision.readyForExecution, false);
  assert.ok(decision.warnings.includes("orders.discountCode has partial coverage."));
  assert.ok(decision.warnings.includes("Identity match rate is below 97%."));
  assert.ok(decision.warnings.includes("crm is near its freshness limit."));
  assert.ok(decision.warnings.includes("users has 1 tolerated duplicate rows."));
  assert.ok(decision.warnings.includes("users has 1 tolerated rejected rows."));
});

test("buildCustomerDataQualityGateDecision blocks unresolved source-of-truth ordering", () => {
  const decision = buildCustomerDataQualityGateDecision({
    ...READY,
    sourceOfTruthOrder: [
      { entityName: "customer_profile", observedSources: ["crm", "billing", "sheet"], approvedPrecedence: ["crm", "billing"], primarySource: "billing" },
      { entityName: "subscription", observedSources: ["billing"], approvedPrecedence: [] }
    ]
  });

  assert.equal(decision.status, "blocked");
  assert.ok(decision.blockers.includes("Approve source ordering for customer_profile: sheet."));
  assert.ok(decision.blockers.includes("Make crm the primary source for customer_profile."));
  assert.ok(decision.blockers.includes("Define source-of-truth precedence for subscription."));
});
