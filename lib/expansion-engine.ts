export type ExpansionSignalTrend = "accelerating" | "steady" | "softening";
export type ExpansionMotion = "seat_expansion" | "feature_upgrade" | "usage_commit" | "services_attach";
export type ExpansionReadinessBand = "low" | "medium" | "high";

export type ExpansionAccountInput = {
  id: string;
  name: string;
  segment: string;
  currentArrCents: number;
  seatsPurchased: number;
  seatsActive: number;
  usageGrowthRate: number;
  productQualifiedScore: number;
  supportHealthScore: number;
  renewalDays: number;
  executiveSponsor: boolean;
  openExpansionSignals: number;
  trend: ExpansionSignalTrend;
};

export type ExpansionOfferInput = {
  id: string;
  name: string;
  motion: ExpansionMotion;
  targetSegment: string;
  expectedLiftPercent: number;
  costCents: number;
  marginPercent: number;
  slaDays: number;
};

export type ExpansionPolicyInput = {
  id: string;
  highReadinessThreshold: number;
  mediumReadinessThreshold: number;
  minMarginPercent: number;
  minPaybackRatio: number;
  maxSlaDays: number;
};

export type ExpansionRecommendation = {
  accountId: string;
  offerId: string | null;
  readinessScore: number;
  readinessBand: ExpansionReadinessBand;
  primaryMotion: ExpansionMotion;
  expectedExpansionArrCents: number;
  pursuitCostCents: number;
  paybackRatio: number;
  marginPercent: number;
  slaDays: number;
  decision: "pursue" | "nurture" | "defer";
};

export type ExpansionPortfolioSimulation = {
  averageReadinessScore: number;
  highReadinessAccounts: number;
  pipelineArrCents: number;
  expectedExpansionArrCents: number;
  averageMarginPercent: number;
  paybackRatio: number;
  recommendation: "scale" | "sequence" | "rebuild";
  rows: ExpansionRecommendation[];
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function round4(value: number) {
  return Math.round(value * 10000) / 10000;
}

function classifyReadiness(score: number, policy: Pick<ExpansionPolicyInput, "highReadinessThreshold" | "mediumReadinessThreshold">): ExpansionReadinessBand {
  if (score >= policy.highReadinessThreshold) return "high";
  if (score >= policy.mediumReadinessThreshold) return "medium";
  return "low";
}

export function inferExpansionMotion(account: ExpansionAccountInput): ExpansionMotion {
  const seatUtilization = account.seatsPurchased > 0 ? account.seatsActive / account.seatsPurchased : 0;
  if (seatUtilization >= 0.86 && account.usageGrowthRate >= 0.12) return "seat_expansion";
  if (account.productQualifiedScore >= 0.72) return "feature_upgrade";
  if (account.usageGrowthRate >= 0.18) return "usage_commit";
  return "services_attach";
}

export function scoreExpansionReadiness(
  account: ExpansionAccountInput,
  policy: Pick<ExpansionPolicyInput, "highReadinessThreshold" | "mediumReadinessThreshold">
): Pick<ExpansionRecommendation, "accountId" | "readinessScore" | "readinessBand" | "primaryMotion"> {
  const seatUtilization = account.seatsPurchased > 0 ? account.seatsActive / account.seatsPurchased : 0;
  const renewalTiming = clamp((180 - account.renewalDays) / 180, 0, 1);
  const trendLift = account.trend === "accelerating" ? 0.1 : account.trend === "softening" ? -0.08 : 0;
  const score = clamp(
    seatUtilization * 0.22 +
    clamp(account.usageGrowthRate / 0.35, 0, 1) * 0.2 +
    account.productQualifiedScore * 0.22 +
    account.supportHealthScore * 0.14 +
    renewalTiming * 0.08 +
    (account.executiveSponsor ? 0.07 : 0) +
    clamp(account.openExpansionSignals / 6, 0, 1) * 0.07 +
    trendLift,
    0,
    1
  );
  return {
    accountId: account.id,
    readinessScore: round4(score),
    readinessBand: classifyReadiness(score, policy),
    primaryMotion: inferExpansionMotion(account)
  };
}

export function recommendExpansionOffer(
  account: ExpansionAccountInput,
  offers: ExpansionOfferInput[],
  policy: ExpansionPolicyInput
): ExpansionRecommendation {
  const scored = scoreExpansionReadiness(account, policy);
  const offer = offers
    .filter((candidate) => candidate.motion === scored.primaryMotion)
    .sort((a, b) => {
      const aSegment = a.targetSegment === account.segment ? 1 : 0;
      const bSegment = b.targetSegment === account.segment ? 1 : 0;
      return bSegment - aSegment || b.expectedLiftPercent - a.expectedLiftPercent;
    })[0] ?? offers[0];

  if (!offer) {
    return {
      ...scored,
      offerId: null,
      expectedExpansionArrCents: 0,
      pursuitCostCents: 0,
      paybackRatio: 0,
      marginPercent: 0,
      slaDays: policy.maxSlaDays,
      decision: "defer"
    };
  }

  const readinessAdjustedLift = offer.expectedLiftPercent * clamp(scored.readinessScore + 0.18, 0.2, 1);
  const expectedExpansionArrCents = Math.round(account.currentArrCents * readinessAdjustedLift);
  const pursuitCostCents = offer.costCents;
  const grossProfitCents = Math.round(expectedExpansionArrCents * offer.marginPercent);
  const paybackRatio = grossProfitCents / Math.max(pursuitCostCents, 1);
  const decision =
    offer.marginPercent < policy.minMarginPercent || paybackRatio < policy.minPaybackRatio
      ? "defer"
      : scored.readinessBand === "high" && offer.slaDays <= policy.maxSlaDays
        ? "pursue"
        : "nurture";

  return {
    ...scored,
    offerId: offer.id,
    expectedExpansionArrCents,
    pursuitCostCents,
    paybackRatio: round4(paybackRatio),
    marginPercent: round4(offer.marginPercent),
    slaDays: offer.slaDays,
    decision
  };
}

export function simulateExpansionPortfolio(
  accounts: ExpansionAccountInput[],
  offers: ExpansionOfferInput[],
  policy: ExpansionPolicyInput
): ExpansionPortfolioSimulation {
  const rows = accounts
    .map((account) => recommendExpansionOffer(account, offers, policy))
    .sort((a, b) => b.readinessScore - a.readinessScore);
  const highReadinessAccounts = rows.filter((row) => row.readinessBand === "high").length;
  const averageReadinessScore = rows.reduce((sum, row) => sum + row.readinessScore, 0) / Math.max(rows.length, 1);
  const pipelineArrCents = accounts.reduce((sum, account) => sum + Math.round(account.currentArrCents * 0.35), 0);
  const expectedExpansionArrCents = rows.reduce((sum, row) => sum + row.expectedExpansionArrCents, 0);
  const pursuitCostCents = rows.reduce((sum, row) => sum + row.pursuitCostCents, 0);
  const averageMarginPercent = rows.reduce((sum, row) => sum + row.marginPercent * row.expectedExpansionArrCents, 0) / Math.max(expectedExpansionArrCents, 1);
  const paybackRatio = Math.round(expectedExpansionArrCents * averageMarginPercent) / Math.max(pursuitCostCents, 1);
  const recommendation = paybackRatio < policy.minPaybackRatio
    ? "rebuild"
    : highReadinessAccounts >= Math.max(2, accounts.length * 0.3)
      ? "scale"
      : "sequence";
  return {
    averageReadinessScore: round4(averageReadinessScore),
    highReadinessAccounts,
    pipelineArrCents,
    expectedExpansionArrCents,
    averageMarginPercent: round4(averageMarginPercent),
    paybackRatio: round4(paybackRatio),
    recommendation,
    rows
  };
}
