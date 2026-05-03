import assert from "node:assert/strict";
import test from "node:test";

import {
  recommendRetentionIntervention,
  scoreRetentionRisk,
  simulateRetentionPortfolio,
  validateRetentionInterventionInput,
  type RetentionAccountInput,
  type RetentionPlaybookInput,
  type RetentionPolicyInput
} from "@/lib/retention-engine";

const policy: RetentionPolicyInput = {
  id: "policy",
  highRiskThreshold: 0.72,
  mediumRiskThreshold: 0.46,
  maxDiscountPct: 0.1,
  minPaybackRatio: 2.5,
  slaHoursHighRisk: 24
};

const account: RetentionAccountInput = {
  id: "acct_1",
  name: "At-risk account",
  segment: "Enterprise",
  mrrCents: 500000,
  usageScore: 0.28,
  supportTicketCount: 7,
  npsScore: -8,
  renewalDays: 22,
  paymentRiskScore: 0.32,
  executiveSponsor: false,
  lastTouchedDays: 48,
  healthTrend: "declining"
};

const playbooks: RetentionPlaybookInput[] = [
  {
    id: "relationship",
    name: "Sponsor reset",
    riskDriver: "relationship",
    saveRateLift: 0.16,
    costCents: 22000,
    maxDiscountPct: 0.05,
    slaHours: 24
  },
  {
    id: "usage",
    name: "Usage recovery",
    riskDriver: "usage",
    saveRateLift: 0.18,
    costCents: 20000,
    maxDiscountPct: 0.08,
    slaHours: 48
  },
  {
    id: "support",
    name: "Support room",
    riskDriver: "support",
    saveRateLift: 0.14,
    costCents: 18000,
    maxDiscountPct: 0.03,
    slaHours: 12
  }
];

test("scoreRetentionRisk classifies high-risk accounts with a primary driver", () => {
  const scored = scoreRetentionRisk(account, policy);
  assert.equal(scored.riskBand, "high");
  assert.equal(scored.primaryDriver, "relationship");
  assert.ok(scored.riskScore >= policy.highRiskThreshold);
});

test("recommendRetentionIntervention selects the matching playbook and computes economics", () => {
  const recommendation = recommendRetentionIntervention(account, playbooks, policy);
  assert.equal(recommendation.playbookId, "relationship");
  assert.equal(recommendation.slaHours, 24);
  assert.ok(recommendation.expectedSavedRevenueCents > recommendation.interventionCostCents);
  assert.ok(recommendation.paybackRatio > 1);
});

test("simulateRetentionPortfolio aggregates account recommendations", () => {
  const simulation = simulateRetentionPortfolio([account], playbooks, policy);
  assert.equal(simulation.highRiskAccounts, 1);
  assert.equal(simulation.rows.length, 1);
  assert.ok(simulation.preventableChurnCents > 0);
  assert.ok(["accelerate", "monitor", "redesign"].includes(simulation.recommendation));
});

test("validateRetentionInterventionInput rejects incomplete interventions", () => {
  const result = validateRetentionInterventionInput({ accountId: "", playbookId: "p" });
  assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.errors.length >= 2);
});
