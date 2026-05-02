import { Prisma } from "@prisma/client";

export const ACQUISITION_CHANNELS = ["SEARCH", "SOCIAL", "DISPLAY", "VIDEO"] as const;
export type AcquisitionChannel = (typeof ACQUISITION_CHANNELS)[number];

export type AcquisitionCampaignState = "DRAFT" | "TESTING" | "SCALING" | "PAUSED" | "COMPLETED";

export type CreateAcquisitionCampaignInput = {
  name: string;
  objective: string;
  budgetCents: number;
  startAt: string;
  endAt: string;
  channels: AcquisitionChannel[];
  targetCacCents: number;
  targetLtvCents: number;
  maxBudgetShiftPct?: number;
  minConfidence?: number;
  cooldownHours?: number;
  cacAutoPausePctOfTarget?: number;
  minLtvCacRatio?: number;
  approvalCapPct?: number;
  templateIds?: string[];
};

export const POLICY_DEFAULTS = {
  cacAutoPausePctOfTarget: 1.25,
  minLtvCacRatio: 2.5,
  approvalCapPct: 0.15
} as const;

export const ACQUISITION_DEFAULTS: CreateAcquisitionCampaignInput = {
  name: "Q2 Growth Sprint",
  objective: "Lead generation for AI lifecycle consulting",
  budgetCents: 250000,
  startAt: new Date().toISOString(),
  endAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString(),
  channels: ["SEARCH", "SOCIAL"],
  targetCacCents: 14500,
  targetLtvCents: 72000,
  maxBudgetShiftPct: 0.2,
  minConfidence: 0.65,
  cooldownHours: 24,
  cacAutoPausePctOfTarget: POLICY_DEFAULTS.cacAutoPausePctOfTarget,
  minLtvCacRatio: POLICY_DEFAULTS.minLtvCacRatio,
  approvalCapPct: POLICY_DEFAULTS.approvalCapPct
};

export function validateCreateCampaignInput(raw: unknown): { ok: true; value: CreateAcquisitionCampaignInput } | { ok: false; errors: string[] } {
  const body = (raw ?? {}) as Partial<CreateAcquisitionCampaignInput>;
  const errors: string[] = [];

  const channels = Array.isArray(body.channels) && body.channels.length > 0
    ? body.channels.filter((channel): channel is AcquisitionChannel => ACQUISITION_CHANNELS.includes(channel as AcquisitionChannel))
    : ACQUISITION_DEFAULTS.channels;

  const value: CreateAcquisitionCampaignInput = {
    name: String(body.name ?? ACQUISITION_DEFAULTS.name).trim(),
    objective: String(body.objective ?? ACQUISITION_DEFAULTS.objective).trim(),
    budgetCents: Number(body.budgetCents ?? ACQUISITION_DEFAULTS.budgetCents),
    startAt: String(body.startAt ?? ACQUISITION_DEFAULTS.startAt),
    endAt: String(body.endAt ?? ACQUISITION_DEFAULTS.endAt),
    channels,
    targetCacCents: Number(body.targetCacCents ?? ACQUISITION_DEFAULTS.targetCacCents),
    targetLtvCents: Number(body.targetLtvCents ?? ACQUISITION_DEFAULTS.targetLtvCents),
    maxBudgetShiftPct: Number(body.maxBudgetShiftPct ?? ACQUISITION_DEFAULTS.maxBudgetShiftPct),
    minConfidence: Number(body.minConfidence ?? ACQUISITION_DEFAULTS.minConfidence),
    cooldownHours: Number(body.cooldownHours ?? ACQUISITION_DEFAULTS.cooldownHours),
    cacAutoPausePctOfTarget: Number(body.cacAutoPausePctOfTarget ?? ACQUISITION_DEFAULTS.cacAutoPausePctOfTarget),
    minLtvCacRatio: Number(body.minLtvCacRatio ?? ACQUISITION_DEFAULTS.minLtvCacRatio),
    approvalCapPct: Number(body.approvalCapPct ?? ACQUISITION_DEFAULTS.approvalCapPct),
    templateIds: Array.isArray(body.templateIds)
      ? body.templateIds.filter((id): id is string => typeof id === "string" && id.length > 0)
      : undefined
  };

  if (!value.name) errors.push("name is required");
  if (!value.objective) errors.push("objective is required");
  if (!Number.isFinite(value.budgetCents) || value.budgetCents < 5000) errors.push("budgetCents must be at least 5000");
  if (!Number.isFinite(Date.parse(value.startAt))) errors.push("startAt must be an ISO date string");
  if (!Number.isFinite(Date.parse(value.endAt))) errors.push("endAt must be an ISO date string");
  if (Date.parse(value.endAt) <= Date.parse(value.startAt)) errors.push("endAt must be after startAt");
  if (!Number.isFinite(value.targetCacCents) || value.targetCacCents <= 0) errors.push("targetCacCents must be positive");
  if (!Number.isFinite(value.targetLtvCents) || value.targetLtvCents <= 0) errors.push("targetLtvCents must be positive");
  if (value.targetLtvCents <= value.targetCacCents) errors.push("targetLtvCents should be greater than targetCacCents");
  if (!Number.isFinite(value.maxBudgetShiftPct!) || value.maxBudgetShiftPct! <= 0 || value.maxBudgetShiftPct! > 0.5) {
    errors.push("maxBudgetShiftPct must be between 0 and 0.5");
  }
  if (!Number.isFinite(value.minConfidence!) || value.minConfidence! < 0.5 || value.minConfidence! > 0.95) {
    errors.push("minConfidence must be between 0.5 and 0.95");
  }
  if (!Number.isFinite(value.cooldownHours!) || value.cooldownHours! < 1 || value.cooldownHours! > 168) {
    errors.push("cooldownHours must be between 1 and 168");
  }
  if (!Number.isFinite(value.cacAutoPausePctOfTarget!) || value.cacAutoPausePctOfTarget! < 1 || value.cacAutoPausePctOfTarget! > 3) {
    errors.push("cacAutoPausePctOfTarget must be between 1 and 3");
  }
  if (!Number.isFinite(value.minLtvCacRatio!) || value.minLtvCacRatio! < 1 || value.minLtvCacRatio! > 10) {
    errors.push("minLtvCacRatio must be between 1 and 10");
  }
  if (!Number.isFinite(value.approvalCapPct!) || value.approvalCapPct! <= 0 || value.approvalCapPct! > 0.5) {
    errors.push("approvalCapPct must be between 0 and 0.5");
  }
  if (value.templateIds !== undefined && value.templateIds.length > 12) {
    errors.push("templateIds may include at most 12 templates per campaign");
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true, value };
}

export type AudienceTemplateInput = {
  name: string;
  audienceType: string;
  targetingJson: Prisma.InputJsonValue;
  predictedCpcCents: number;
  predictedCacCents: number;
  description?: string | null;
};

export function validateAudienceTemplateInput(
  raw: unknown
): { ok: true; value: AudienceTemplateInput } | { ok: false; errors: string[] } {
  const body = (raw ?? {}) as { [key: string]: unknown };
  const errors: string[] = [];

  const name = String(body.name ?? "").trim();
  const audienceType = String(body.audienceType ?? "").trim();
  const predictedCpcCents = Number(body.predictedCpcCents);
  const predictedCacCents = Number(body.predictedCacCents);
  const description =
    typeof body.description === "string" && body.description.trim().length > 0
      ? body.description.trim().slice(0, 500)
      : null;

  let targetingJson: Prisma.InputJsonValue = {};
  if (body.targetingJson === undefined || body.targetingJson === null) {
    targetingJson = {};
  } else if (typeof body.targetingJson === "string") {
    try {
      targetingJson = JSON.parse(body.targetingJson) as Prisma.InputJsonValue;
    } catch {
      errors.push("targetingJson must be valid JSON");
    }
  } else {
    targetingJson = body.targetingJson as Prisma.InputJsonValue;
  }

  if (!name) errors.push("name is required");
  if (name.length > 80) errors.push("name must be 80 characters or fewer");
  if (!audienceType) errors.push("audienceType is required");
  if (audienceType.length > 40) errors.push("audienceType must be 40 characters or fewer");
  if (!Number.isFinite(predictedCpcCents) || predictedCpcCents < 0 || predictedCpcCents > 50000) {
    errors.push("predictedCpcCents must be between 0 and 50000");
  }
  if (!Number.isFinite(predictedCacCents) || predictedCacCents < 0 || predictedCacCents > 500000) {
    errors.push("predictedCacCents must be between 0 and 500000");
  }

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      name,
      audienceType,
      targetingJson,
      predictedCpcCents: Math.round(predictedCpcCents),
      predictedCacCents: Math.round(predictedCacCents),
      description
    }
  };
}

export function buildCreativeVariants(channels: AcquisitionChannel[]) {
  const base = [
    { headline: "Catch change signals before your competitors", description: "Turn external entity updates into revenue-ready outreach.", callToAction: "Book a walkthrough" },
    { headline: "Increase winback revenue with AI lifecycle loops", description: "Prioritize the right users with explainable scoring and generated copy.", callToAction: "See live demo" },
    { headline: "Reduce wasted spend with agent-managed growth", description: "Continuously rebalance budgets toward best-performing audiences.", callToAction: "Start pilot" }
  ];

  return channels.flatMap((channel, channelIndex) =>
    base.map((creative, idx) => {
      const confidenceBoost = 0.02 * idx + channelIndex * 0.01;
      return {
        ...creative,
        channel,
        predictedCtr: Number((0.012 + confidenceBoost).toFixed(4)),
        predictedConversion: Number((0.035 + confidenceBoost).toFixed(4)),
        status: "PENDING" as const
      };
    })
  );
}

export function buildAudienceSegments() {
  return [
    {
      name: "ICP Operators",
      audienceType: "lookalike",
      targetingJson: { seniority: ["director", "vp"], companySize: ["50-2000"], intent: "high" } as Prisma.JsonObject,
      predictedCpcCents: 310,
      predictedCacCents: 13500
    },
    {
      name: "Growth Leaders",
      audienceType: "interest",
      targetingJson: { interests: ["growth strategy", "subscription analytics", "marketing ops"] } as Prisma.JsonObject,
      predictedCpcCents: 260,
      predictedCacCents: 15200
    },
    {
      name: "Retention Champions",
      audienceType: "keyword",
      targetingJson: { keywords: ["reduce churn", "improve ltv", "reactivation campaign"], negatives: ["jobs", "course"] } as Prisma.JsonObject,
      predictedCpcCents: 295,
      predictedCacCents: 14500
    }
  ];
}

export function scoreTestCell(metrics: {
  ctr: number;
  conversionRate: number;
  cpaCents: number;
  roas: number;
  targetCacCents: number;
  targetLtvCents: number;
}) {
  const ctrScore = Math.min(metrics.ctr / 0.03, 1) * 0.25;
  const conversionScore = Math.min(metrics.conversionRate / 0.12, 1) * 0.25;
  const cacScore = Math.max(0, 1 - metrics.cpaCents / metrics.targetCacCents) * 0.3;
  const roasScore = Math.min(metrics.roas / (metrics.targetLtvCents / metrics.targetCacCents), 1) * 0.2;
  return Number((ctrScore + conversionScore + cacScore + roasScore).toFixed(4));
}

export function nextStateFromScore(score: number): AcquisitionCampaignState {
  if (score >= 0.78) return "SCALING";
  if (score >= 0.55) return "TESTING";
  return "PAUSED";
}

const STATE_TRANSITIONS: Record<AcquisitionCampaignState, AcquisitionCampaignState[]> = {
  DRAFT: ["TESTING", "COMPLETED"],
  TESTING: ["SCALING", "PAUSED", "COMPLETED"],
  SCALING: ["TESTING", "PAUSED", "COMPLETED"],
  PAUSED: ["TESTING", "COMPLETED"],
  COMPLETED: []
};

export function validTransitionsFrom(state: AcquisitionCampaignState): AcquisitionCampaignState[] {
  return [...STATE_TRANSITIONS[state]];
}

export function isValidStateTransition(
  from: AcquisitionCampaignState,
  to: AcquisitionCampaignState
): boolean {
  if (from === to) return false;
  return STATE_TRANSITIONS[from].includes(to);
}

export type PolicyBand = "healthy" | "watch" | "unhealthy";

export type PolicyEvaluationInput = {
  observedCacCents: number;
  observedRevenueCents: number;
  conversions: number;
  targetCacCents: number;
  targetLtvCents: number;
  cacAutoPausePctOfTarget: number;
  minLtvCacRatio: number;
};

export type PolicyEvaluationResult = {
  band: PolicyBand;
  observedRatio: number;
  cacOverrunPct: number;
  shouldPause: boolean;
  reasons: string[];
};

export function classifyLtvCacRatio(ratio: number, minLtvCacRatio: number): PolicyBand {
  if (!Number.isFinite(ratio) || ratio <= 0) return "unhealthy";
  if (ratio < minLtvCacRatio) return "unhealthy";
  if (ratio < minLtvCacRatio + 1) return "watch";
  return "healthy";
}

export function evaluateCampaignPolicy(input: PolicyEvaluationInput): PolicyEvaluationResult {
  const reasons: string[] = [];
  const observedLtvPerConversion = input.conversions > 0 ? input.observedRevenueCents / input.conversions : 0;
  const ratioBasis = observedLtvPerConversion > 0 ? observedLtvPerConversion : input.targetLtvCents;
  const observedRatio = input.observedCacCents > 0 ? ratioBasis / input.observedCacCents : 0;
  const cacOverrunPct = input.targetCacCents > 0 ? input.observedCacCents / input.targetCacCents : 0;

  const band = classifyLtvCacRatio(observedRatio, input.minLtvCacRatio);

  if (cacOverrunPct >= input.cacAutoPausePctOfTarget) {
    reasons.push(
      `Observed CAC is ${(cacOverrunPct * 100).toFixed(0)}% of target (auto-pause at ${(input.cacAutoPausePctOfTarget * 100).toFixed(0)}%).`
    );
  }
  if (observedRatio > 0 && observedRatio < input.minLtvCacRatio) {
    reasons.push(
      `LTV:CAC ratio ${observedRatio.toFixed(2)} is below floor ${input.minLtvCacRatio.toFixed(2)}.`
    );
  }

  return {
    band,
    observedRatio,
    cacOverrunPct,
    shouldPause: reasons.length > 0,
    reasons
  };
}

export type SignificanceHint =
  | "significant_high"
  | "trending_high"
  | "neutral"
  | "trending_low"
  | "significant_low"
  | "insufficient";

export type CellSignificance = {
  hint: SignificanceHint;
  zScore: number;
  sampleSize: number;
};

const MIN_CLICKS_FOR_SIGNIFICANCE = 30;

export function computeCellSignificance(args: {
  cellConversions: number;
  cellClicks: number;
  campaignMeanConversionRate: number;
}): CellSignificance {
  const { cellConversions, cellClicks, campaignMeanConversionRate: mean } = args;

  if (cellClicks < MIN_CLICKS_FOR_SIGNIFICANCE) {
    return { hint: "insufficient", zScore: 0, sampleSize: cellClicks };
  }
  if (mean <= 0 || mean >= 1) {
    return { hint: "neutral", zScore: 0, sampleSize: cellClicks };
  }

  const cellRate = cellConversions / cellClicks;
  const standardError = Math.sqrt((mean * (1 - mean)) / cellClicks);
  const zScore = standardError > 0 ? (cellRate - mean) / standardError : 0;

  let hint: SignificanceHint;
  if (zScore >= 1.96) hint = "significant_high";
  else if (zScore >= 1) hint = "trending_high";
  else if (zScore <= -1.96) hint = "significant_low";
  else if (zScore <= -1) hint = "trending_low";
  else hint = "neutral";

  return { hint, zScore: Number(zScore.toFixed(3)), sampleSize: cellClicks };
}

export type BudgetShiftDecision = {
  approved: boolean;
  shiftPct: number;
  approvalCapPct: number;
};

export function evaluateBudgetShift(args: {
  amountCents: number;
  fromBudgetCents: number;
  approvalCapPct: number;
}): BudgetShiftDecision {
  const shiftPct = args.fromBudgetCents > 0 ? args.amountCents / args.fromBudgetCents : 1;
  return {
    approved: shiftPct <= args.approvalCapPct,
    shiftPct,
    approvalCapPct: args.approvalCapPct
  };
}
