export type RetentionHealthTrend = "improving" | "flat" | "declining";
export type RetentionRiskDriver = "usage" | "support" | "commercial" | "relationship" | "billing";
export type RetentionRiskBand = "low" | "medium" | "high";
export type RetentionInterventionStatus = "recommended" | "queued" | "in_progress" | "saved" | "lost";

export type RetentionAccountInput = {
  id: string;
  name: string;
  segment: string;
  mrrCents: number;
  usageScore: number;
  supportTicketCount: number;
  npsScore: number;
  renewalDays: number;
  paymentRiskScore: number;
  executiveSponsor: boolean;
  lastTouchedDays: number;
  healthTrend: RetentionHealthTrend;
};

export type RetentionPlaybookInput = {
  id: string;
  name: string;
  riskDriver: RetentionRiskDriver;
  saveRateLift: number;
  costCents: number;
  maxDiscountPct: number;
  slaHours: number;
};

export type RetentionPolicyInput = {
  id: string;
  highRiskThreshold: number;
  mediumRiskThreshold: number;
  maxDiscountPct: number;
  minPaybackRatio: number;
  slaHoursHighRisk: number;
};

export type RetentionRiskScore = {
  accountId: string;
  riskScore: number;
  riskBand: RetentionRiskBand;
  primaryDriver: RetentionRiskDriver;
};

export type RetentionRecommendation = RetentionRiskScore & {
  playbookId: string | null;
  expectedSavedRevenueCents: number;
  interventionCostCents: number;
  paybackRatio: number;
  slaHours: number;
};

export type RetentionPortfolioSimulation = {
  averageRiskScore: number;
  highRiskAccounts: number;
  preventableChurnCents: number;
  expectedSavedRevenueCents: number;
  saveRate: number;
  paybackRatio: number;
  recommendation: "accelerate" | "monitor" | "redesign";
  rows: RetentionRecommendation[];
};

const BASE_SAVE_RATE = 0.22;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function round4(value: number) {
  return Math.round(value * 10000) / 10000;
}

function finiteNumber(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return clamp(parsed, min, max);
}

function finiteInteger(value: unknown, fallback: number, min: number, max: number) {
  return Math.round(finiteNumber(value, fallback, min, max));
}

function classifyRiskBand(score: number, policy?: Pick<RetentionPolicyInput, "highRiskThreshold" | "mediumRiskThreshold">): RetentionRiskBand {
  const high = policy?.highRiskThreshold ?? 0.72;
  const medium = policy?.mediumRiskThreshold ?? 0.46;
  if (score >= high) return "high";
  if (score >= medium) return "medium";
  return "low";
}

function maxDriver(drivers: Record<RetentionRiskDriver, number>): RetentionRiskDriver {
  return (Object.entries(drivers) as [RetentionRiskDriver, number][])
    .sort((a, b) => b[1] - a[1])[0][0];
}

export function scoreRetentionRisk(
  account: RetentionAccountInput,
  policy?: Pick<RetentionPolicyInput, "highRiskThreshold" | "mediumRiskThreshold">
): RetentionRiskScore {
  const drivers: Record<RetentionRiskDriver, number> = {
    usage: clamp(1 - account.usageScore, 0, 1),
    support: clamp(account.supportTicketCount / 8, 0, 1),
    commercial: clamp((90 - account.renewalDays) / 90, 0, 1),
    relationship: clamp((account.lastTouchedDays / 60) + (account.executiveSponsor ? -0.18 : 0.16), 0, 1),
    billing: clamp(account.paymentRiskScore, 0, 1)
  };
  const npsPressure = clamp((30 - account.npsScore) / 130, 0, 1);
  const trendPressure = account.healthTrend === "declining" ? 0.14 : account.healthTrend === "improving" ? -0.08 : 0;
  const riskScore = clamp(
    drivers.usage * 0.26 +
    drivers.support * 0.18 +
    drivers.commercial * 0.18 +
    drivers.relationship * 0.16 +
    drivers.billing * 0.12 +
    npsPressure * 0.1 +
    trendPressure,
    0,
    1
  );
  return {
    accountId: account.id,
    riskScore: round4(riskScore),
    riskBand: classifyRiskBand(riskScore, policy),
    primaryDriver: maxDriver(drivers)
  };
}

export function recommendRetentionIntervention(
  account: RetentionAccountInput,
  playbooks: RetentionPlaybookInput[],
  policy: RetentionPolicyInput
): RetentionRecommendation {
  const scored = scoreRetentionRisk(account, policy);
  const matching = playbooks
    .filter((playbook) => playbook.riskDriver === scored.primaryDriver)
    .sort((a, b) => b.saveRateLift - a.saveRateLift)[0] ?? playbooks[0];
  if (!matching) {
    return {
      ...scored,
      playbookId: null,
      expectedSavedRevenueCents: 0,
      interventionCostCents: 0,
      paybackRatio: 0,
      slaHours: scored.riskBand === "high" ? policy.slaHoursHighRisk : 72
    };
  }
  const allowedDiscount = Math.min(policy.maxDiscountPct, matching.maxDiscountPct);
  const annualRevenueAtRisk = account.mrrCents * 12 * scored.riskScore;
  const expectedSaveRate = clamp(BASE_SAVE_RATE + matching.saveRateLift + allowedDiscount * 0.18, 0, 0.85);
  const expectedSavedRevenueCents = Math.round(annualRevenueAtRisk * expectedSaveRate);
  const discountCost = Math.round(account.mrrCents * 12 * allowedDiscount);
  const interventionCostCents = matching.costCents + discountCost;
  const paybackRatio = interventionCostCents > 0 ? expectedSavedRevenueCents / interventionCostCents : 0;
  return {
    ...scored,
    playbookId: matching.id,
    expectedSavedRevenueCents,
    interventionCostCents,
    paybackRatio: round4(paybackRatio),
    slaHours: scored.riskBand === "high" ? Math.min(matching.slaHours, policy.slaHoursHighRisk) : matching.slaHours
  };
}

export function simulateRetentionPortfolio(
  accounts: RetentionAccountInput[],
  playbooks: RetentionPlaybookInput[],
  policy: RetentionPolicyInput
): RetentionPortfolioSimulation {
  const rows = accounts
    .map((account) => recommendRetentionIntervention(account, playbooks, policy))
    .sort((a, b) => b.riskScore - a.riskScore);
  const averageRiskScore = rows.reduce((sum, row) => sum + row.riskScore, 0) / Math.max(rows.length, 1);
  const highRiskAccounts = rows.filter((row) => row.riskBand === "high").length;
  const preventableChurnCents = accounts.reduce((sum, account) => {
    const row = rows.find((item) => item.accountId === account.id);
    return sum + Math.round(account.mrrCents * 12 * (row?.riskScore ?? 0));
  }, 0);
  const expectedSavedRevenueCents = rows.reduce((sum, row) => sum + row.expectedSavedRevenueCents, 0);
  const interventionCostCents = rows.reduce((sum, row) => sum + row.interventionCostCents, 0);
  const saveRate = expectedSavedRevenueCents / Math.max(preventableChurnCents, 1);
  const paybackRatio = expectedSavedRevenueCents / Math.max(interventionCostCents, 1);
  const recommendation = paybackRatio < policy.minPaybackRatio
    ? "redesign"
    : highRiskAccounts > Math.max(accounts.length * 0.3, 1)
      ? "accelerate"
      : "monitor";
  return {
    averageRiskScore: round4(averageRiskScore),
    highRiskAccounts,
    preventableChurnCents,
    expectedSavedRevenueCents,
    saveRate: round4(saveRate),
    paybackRatio: round4(paybackRatio),
    recommendation,
    rows
  };
}

export function validateRetentionInterventionInput(raw: unknown): { ok: true; value: { accountId: string; playbookId: string; status: RetentionInterventionStatus; owner: string; rationale: string } } | { ok: false; errors: string[] } {
  const body = (raw ?? {}) as Record<string, unknown>;
  const accountId = String(body.accountId ?? "").trim();
  const playbookId = String(body.playbookId ?? "").trim();
  const status = String(body.status ?? "queued");
  const owner = String(body.owner ?? "customer-success").trim() || "customer-success";
  const rationale = String(body.rationale ?? "").trim();
  const allowed: RetentionInterventionStatus[] = ["recommended", "queued", "in_progress", "saved", "lost"];
  const errors: string[] = [];
  if (!accountId) errors.push("accountId is required");
  if (!playbookId) errors.push("playbookId is required");
  if (!allowed.includes(status as RetentionInterventionStatus)) errors.push("status must be recommended, queued, in_progress, saved, or lost");
  if (rationale.length < 6) errors.push("rationale must be at least 6 characters");
  if (errors.length) return { ok: false, errors };
  return { ok: true, value: { accountId, playbookId, status: status as RetentionInterventionStatus, owner: owner.slice(0, 80), rationale: rationale.slice(0, 500) } };
}

export function validateRetentionAccountInput(raw: unknown): { ok: true; value: Omit<RetentionAccountInput, "id"> } | { ok: false; errors: string[] } {
  const body = (raw ?? {}) as Record<string, unknown>;
  const name = String(body.name ?? "").trim();
  const segment = String(body.segment ?? "").trim();
  const healthTrend = String(body.healthTrend ?? "flat");
  const allowedTrends: RetentionHealthTrend[] = ["improving", "flat", "declining"];
  const errors: string[] = [];
  if (name.length < 2) errors.push("name must be at least 2 characters");
  if (segment.length < 2) errors.push("segment must be at least 2 characters");
  if (!allowedTrends.includes(healthTrend as RetentionHealthTrend)) errors.push("healthTrend must be improving, flat, or declining");
  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      name: name.slice(0, 120),
      segment: segment.slice(0, 80),
      mrrCents: finiteInteger(body.mrrCents, 0, 0, 5_000_000),
      usageScore: round4(finiteNumber(body.usageScore, 0.5, 0, 1)),
      supportTicketCount: finiteInteger(body.supportTicketCount, 0, 0, 50),
      npsScore: finiteInteger(body.npsScore, 0, -100, 100),
      renewalDays: finiteInteger(body.renewalDays, 90, 0, 730),
      paymentRiskScore: round4(finiteNumber(body.paymentRiskScore, 0, 0, 1)),
      executiveSponsor: Boolean(body.executiveSponsor),
      lastTouchedDays: finiteInteger(body.lastTouchedDays, 30, 0, 365),
      healthTrend: healthTrend as RetentionHealthTrend
    }
  };
}

export function validateRetentionPlaybookInput(raw: unknown): { ok: true; value: Omit<RetentionPlaybookInput, "id"> } | { ok: false; errors: string[] } {
  const body = (raw ?? {}) as Record<string, unknown>;
  const name = String(body.name ?? "").trim();
  const riskDriver = String(body.riskDriver ?? "usage");
  const allowedDrivers: RetentionRiskDriver[] = ["usage", "support", "commercial", "relationship", "billing"];
  const errors: string[] = [];
  if (name.length < 2) errors.push("name must be at least 2 characters");
  if (!allowedDrivers.includes(riskDriver as RetentionRiskDriver)) errors.push("riskDriver must be usage, support, commercial, relationship, or billing");
  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      name: name.slice(0, 120),
      riskDriver: riskDriver as RetentionRiskDriver,
      saveRateLift: round4(finiteNumber(body.saveRateLift, 0.1, 0, 0.8)),
      costCents: finiteInteger(body.costCents, 0, 0, 1_000_000),
      maxDiscountPct: round4(finiteNumber(body.maxDiscountPct, 0, 0, 0.5)),
      slaHours: finiteInteger(body.slaHours, 24, 1, 720)
    }
  };
}

export function validateRetentionPolicyInput(raw: unknown): { ok: true; value: Omit<RetentionPolicyInput, "id"> & { name: string } } | { ok: false; errors: string[] } {
  const body = (raw ?? {}) as Record<string, unknown>;
  const name = String(body.name ?? "Retention policy").trim() || "Retention policy";
  const highRiskThreshold = round4(finiteNumber(body.highRiskThreshold, 0.72, 0, 1));
  const mediumRiskThreshold = round4(finiteNumber(body.mediumRiskThreshold, 0.46, 0, 1));
  const errors: string[] = [];
  if (mediumRiskThreshold >= highRiskThreshold) errors.push("mediumRiskThreshold must be below highRiskThreshold");
  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      name: name.slice(0, 120),
      highRiskThreshold,
      mediumRiskThreshold,
      maxDiscountPct: round4(finiteNumber(body.maxDiscountPct, 0.1, 0, 0.5)),
      minPaybackRatio: round4(finiteNumber(body.minPaybackRatio, 2.5, 0, 20)),
      slaHoursHighRisk: finiteInteger(body.slaHoursHighRisk, 24, 1, 240)
    }
  };
}
