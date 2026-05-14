import assert from "node:assert/strict";
import test from "node:test";
import { buildRevenueProofDashboard } from "@/lib/revenue-proof-dashboard";

test("buildRevenueProofDashboard calculates lifecycle lift against a frozen baseline", () => {
  const proof = buildRevenueProofDashboard({
    app: "lifecycle",
    baselineLabel: "Lifecycle baseline v1",
    baselinePopulation: 1000,
    baselineConversionRate: 0.08,
    baselineRevenueCents: 4000000,
    treatmentPopulation: 250,
    controlPopulation: 100,
    observedConversions: 30,
    observedRevenueCents: 1400000,
    confidence: "high",
    actions: [{ id: "action_1", label: "Lifecycle message send", status: "applied" }],
    exportLinks: [{ label: "Audit export", href: "/api/workspace/agents/audit-export", evidenceType: "audit" }]
  });

  assert.equal(proof.status, "ready");
  assert.equal(proof.expectedRevenueCents, 1000000);
  assert.equal(proof.incrementalRevenueCents, 400000);
  assert.equal(proof.incrementalProfitCents, 400000);
  assert.equal(proof.observedConversionRate, 0.12);
  assert.deepEqual(proof.blockers, []);
});

test("buildRevenueProofDashboard subtracts acquisition spend from incremental profit", () => {
  const proof = buildRevenueProofDashboard({
    app: "acquisition",
    baselineLabel: "Acquisition baseline v1",
    baselinePopulation: 1000,
    baselineConversionRate: 0.05,
    baselineRevenueCents: 5000000,
    treatmentPopulation: 200,
    observedConversions: 15,
    observedRevenueCents: 1300000,
    spendCents: 200000,
    confidence: "medium",
    actions: [{ id: "action_1", label: "Budget shift dry-run", status: "approved" }],
    exportLinks: [{ label: "Provider audit export", href: "/api/workspace/agents/audit-export", evidenceType: "audit" }]
  });

  assert.equal(proof.status, "ready");
  assert.equal(proof.expectedRevenueCents, 1000000);
  assert.equal(proof.incrementalRevenueCents, 300000);
  assert.equal(proof.incrementalProfitCents, 100000);
});

test("buildRevenueProofDashboard blocks when baseline and treatment are missing", () => {
  const proof = buildRevenueProofDashboard({
    app: "lifecycle",
    observedRevenueCents: 0,
    confidence: "low"
  });

  assert.equal(proof.status, "blocked");
  assert.equal(proof.baselineLabel, "Unassigned baseline");
  assert.ok(proof.blockers.includes("Attach a named baseline snapshot."));
  assert.ok(proof.blockers.includes("Record baseline population."));
  assert.ok(proof.blockers.includes("Record treatment population."));
  assert.ok(proof.confidenceFlags.includes("Confidence is low; keep proof directional until reviewed."));
});

test("buildRevenueProofDashboard warns for directional evidence without actions or exports", () => {
  const proof = buildRevenueProofDashboard({
    app: "acquisition",
    baselineLabel: "Directional baseline",
    baselinePopulation: 1000,
    baselineConversionRate: 0.05,
    baselineRevenueCents: 5000000,
    treatmentPopulation: 200,
    observedConversions: 8,
    observedRevenueCents: 900000,
    confidence: "medium"
  });

  assert.equal(proof.status, "warning");
  assert.equal(proof.incrementalRevenueCents, -100000);
  assert.ok(proof.warnings.includes("No agent actions are attached to this proof view."));
  assert.ok(proof.warnings.includes("No evidence exports are linked yet."));
});
