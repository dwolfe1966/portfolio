import assert from "node:assert/strict";
import test from "node:test";

import {
  inferExpansionMotion,
  recommendExpansionOffer,
  scoreExpansionReadiness,
  simulateExpansionPortfolio,
  type ExpansionAccountInput,
  type ExpansionOfferInput,
  type ExpansionPolicyInput
} from "@/lib/expansion-engine";

const policy: ExpansionPolicyInput = {
  id: "policy",
  highReadinessThreshold: 0.72,
  mediumReadinessThreshold: 0.48,
  minMarginPercent: 0.65,
  minPaybackRatio: 3,
  maxSlaDays: 21
};

const account: ExpansionAccountInput = {
  id: "acct_1",
  name: "Expansion-ready account",
  segment: "Enterprise",
  currentArrCents: 9000000,
  seatsPurchased: 50,
  seatsActive: 48,
  usageGrowthRate: 0.24,
  productQualifiedScore: 0.8,
  supportHealthScore: 0.88,
  renewalDays: 90,
  executiveSponsor: true,
  openExpansionSignals: 5,
  trend: "accelerating"
};

const offers: ExpansionOfferInput[] = [
  {
    id: "seat",
    name: "Seat expansion",
    motion: "seat_expansion",
    targetSegment: "Enterprise",
    expectedLiftPercent: 0.22,
    costCents: 40000,
    marginPercent: 0.78,
    slaDays: 14
  }
];

test("inferExpansionMotion favors seat expansion for high utilization and growth", () => {
  assert.equal(inferExpansionMotion(account), "seat_expansion");
});

test("scoreExpansionReadiness classifies strong accounts as high readiness", () => {
  const scored = scoreExpansionReadiness(account, policy);
  assert.equal(scored.readinessBand, "high");
  assert.ok(scored.readinessScore >= policy.highReadinessThreshold);
});

test("recommendExpansionOffer computes ARR economics and pursue decision", () => {
  const recommendation = recommendExpansionOffer(account, offers, policy);
  assert.equal(recommendation.offerId, "seat");
  assert.equal(recommendation.decision, "pursue");
  assert.ok(recommendation.expectedExpansionArrCents > 0);
  assert.ok(recommendation.paybackRatio >= policy.minPaybackRatio);
});

test("simulateExpansionPortfolio aggregates portfolio output", () => {
  const simulation = simulateExpansionPortfolio([account], offers, policy);
  assert.equal(simulation.highReadinessAccounts, 1);
  assert.equal(simulation.rows.length, 1);
  assert.ok(simulation.expectedExpansionArrCents > 0);
  assert.ok(["scale", "sequence", "rebuild"].includes(simulation.recommendation));
});
