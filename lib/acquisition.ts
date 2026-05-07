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
    { headline: "Increase winback revenue with AI lifecycle loops", description: "Prioritize the right users with explainable scoring and generated copy.", callToAction: "Open lifecycle tool" },
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

export type AdWriteOperationType =
  | "create_campaign"
  | "update_budget"
  | "pause_resume"
  | "upload_creative"
  | "sync_audience"
  | "rollback_change";

export type AdWriteRiskLevel = "low" | "medium" | "high";

export type AdWriteSafetyInput = {
  operationType: AdWriteOperationType;
  workspaceExecutionEnabled: boolean;
  providerHealthOk: boolean;
  hasCredentialGrant: boolean;
  targetAccountAllowed: boolean;
  productionWritesEnabled: boolean;
  dryRunCompleted: boolean;
  idempotencyKey?: string | null;
  rollbackPlan?: string | null;
  protectedCampaign?: boolean;
  emergencyStopActive?: boolean;
  requiresApproval?: boolean;
  approvalCompleted?: boolean;
  riskLevel?: AdWriteRiskLevel;
  estimatedSpendExposureCents?: number;
};

export type AdWriteSafetyDecision = {
  allowed: boolean;
  operationType: AdWriteOperationType;
  riskLevel: AdWriteRiskLevel;
  reasons: string[];
};

export type AdWritePolicyGateInput = AdWriteSafetyInput & {
  campaignBudgetCents: number;
  dailySpendCapCents?: number | null;
  projectedDailySpendCents?: number | null;
  shiftAmountCents?: number | null;
  sourceBudgetCents?: number | null;
  maxBudgetShiftPct: number;
  approvalCapPct: number;
  observedCacCents?: number | null;
  observedRevenueCents?: number | null;
  conversions?: number | null;
  targetCacCents: number;
  targetLtvCents: number;
  cacAutoPausePctOfTarget: number;
  minLtvCacRatio: number;
  confidence?: number | null;
  minConfidence: number;
  lastActionAt?: string | Date | null;
  now?: string | Date | null;
  cooldownHours: number;
};

export type AdWritePolicyGateDecision = AdWriteSafetyDecision & {
  requiresApproval: boolean;
  approvalReasons: string[];
  blockReasons: string[];
  policyBand: PolicyBand;
  metrics: {
    projectedDailySpendCents: number;
    dailySpendCapCents: number | null;
    shiftPct: number | null;
    approvalCapPct: number;
    maxBudgetShiftPct: number;
    confidence: number | null;
    minConfidence: number;
    observedRatio: number | null;
    cacOverrunPct: number | null;
    cooldownRemainingHours: number;
  };
};

const REVERSIBLE_WRITE_OPERATIONS = new Set<AdWriteOperationType>([
  "update_budget",
  "pause_resume",
  "upload_creative",
  "sync_audience",
  "rollback_change"
]);

const HIGH_RISK_WRITE_OPERATIONS = new Set<AdWriteOperationType>([
  "create_campaign",
  "upload_creative",
  "sync_audience"
]);

function cleanIdempotencyKey(value: string | null | undefined) {
  return String(value ?? "").trim();
}

function inferWriteRiskLevel(input: AdWriteSafetyInput): AdWriteRiskLevel {
  if (input.riskLevel) return input.riskLevel;
  if (HIGH_RISK_WRITE_OPERATIONS.has(input.operationType)) return "high";
  if ((input.estimatedSpendExposureCents ?? 0) > 0) return "medium";
  return "low";
}

export function evaluateAdWriteOperationSafety(input: AdWriteSafetyInput): AdWriteSafetyDecision {
  const reasons: string[] = [];
  const riskLevel = inferWriteRiskLevel(input);

  if (!input.workspaceExecutionEnabled) reasons.push("Workspace execution is disabled.");
  if (!input.providerHealthOk) reasons.push("Provider health is not ok.");
  if (!input.hasCredentialGrant) reasons.push("Required credential grant is missing.");
  if (!input.targetAccountAllowed) reasons.push("Target ad account is not allowed for writes.");
  if (!input.productionWritesEnabled) reasons.push("Production writes are not enabled for this workspace.");
  if (input.protectedCampaign) reasons.push("Target campaign is protected from agent writes.");
  if (input.emergencyStopActive) reasons.push("Emergency stop is active.");
  if (!input.dryRunCompleted) reasons.push("Provider dry-run must complete before mutation.");
  if (!cleanIdempotencyKey(input.idempotencyKey)) reasons.push("Idempotency key is required.");

  if (REVERSIBLE_WRITE_OPERATIONS.has(input.operationType) && !String(input.rollbackPlan ?? "").trim()) {
    reasons.push("Rollback plan is required for reversible write operations.");
  }

  if ((riskLevel === "high" || input.requiresApproval) && !input.approvalCompleted) {
    reasons.push("Approval is required before this write operation.");
  }

  return {
    allowed: reasons.length === 0,
    operationType: input.operationType,
    riskLevel,
    reasons
  };
}

function positiveNumber(value: number | null | undefined) {
  return Number.isFinite(value) && value !== null && value !== undefined ? Number(value) : null;
}

function parsePolicyDate(value: string | Date | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function hoursBetween(later: Date, earlier: Date) {
  return Math.max(0, (later.getTime() - earlier.getTime()) / (60 * 60 * 1000));
}

export function evaluateAdWritePolicyGate(input: AdWritePolicyGateInput): AdWritePolicyGateDecision {
  const blockReasons: string[] = [];
  const approvalReasons: string[] = [];

  const projectedDailySpendCents = positiveNumber(input.projectedDailySpendCents) ?? 0;
  const dailySpendCapCents = positiveNumber(input.dailySpendCapCents);
  if (dailySpendCapCents !== null && projectedDailySpendCents > dailySpendCapCents) {
    blockReasons.push(
      `Projected daily spend ${projectedDailySpendCents} exceeds cap ${dailySpendCapCents}.`
    );
  }

  const shiftAmountCents = positiveNumber(input.shiftAmountCents);
  const sourceBudgetCents = positiveNumber(input.sourceBudgetCents);
  const shiftPct = shiftAmountCents !== null && sourceBudgetCents !== null && sourceBudgetCents > 0
    ? shiftAmountCents / sourceBudgetCents
    : null;

  if (shiftPct !== null && shiftPct > input.maxBudgetShiftPct) {
    blockReasons.push(
      `Budget shift ${(shiftPct * 100).toFixed(1)}% exceeds max shift ${(input.maxBudgetShiftPct * 100).toFixed(1)}%.`
    );
  } else if (shiftPct !== null && shiftPct > input.approvalCapPct) {
    approvalReasons.push(
      `Budget shift ${(shiftPct * 100).toFixed(1)}% exceeds auto-approval cap ${(input.approvalCapPct * 100).toFixed(1)}%.`
    );
  }

  const confidence = positiveNumber(input.confidence);
  if (confidence !== null && confidence < input.minConfidence) {
    blockReasons.push(
      `Confidence ${(confidence * 100).toFixed(0)}% is below minimum ${(input.minConfidence * 100).toFixed(0)}%.`
    );
  }

  const now = parsePolicyDate(input.now) ?? new Date();
  const lastActionAt = parsePolicyDate(input.lastActionAt);
  const elapsedCooldownHours = lastActionAt ? hoursBetween(now, lastActionAt) : input.cooldownHours;
  const cooldownRemainingHours = Math.max(0, input.cooldownHours - elapsedCooldownHours);
  if (cooldownRemainingHours > 0) {
    blockReasons.push(`Cooldown has ${cooldownRemainingHours.toFixed(1)} hours remaining.`);
  }

  const hasCacInputs =
    positiveNumber(input.observedCacCents) !== null &&
    positiveNumber(input.observedRevenueCents) !== null &&
    positiveNumber(input.conversions) !== null;
  const campaignPolicy = hasCacInputs
    ? evaluateCampaignPolicy({
        observedCacCents: Number(input.observedCacCents),
        observedRevenueCents: Number(input.observedRevenueCents),
        conversions: Number(input.conversions),
        targetCacCents: input.targetCacCents,
        targetLtvCents: input.targetLtvCents,
        cacAutoPausePctOfTarget: input.cacAutoPausePctOfTarget,
        minLtvCacRatio: input.minLtvCacRatio
      })
    : null;

  if (campaignPolicy?.shouldPause && input.operationType !== "pause_resume") {
    blockReasons.push(...campaignPolicy.reasons);
  }

  const requiresApproval = approvalReasons.length > 0 || input.requiresApproval === true;
  const safety = evaluateAdWriteOperationSafety({
    ...input,
    requiresApproval,
    approvalCompleted: input.approvalCompleted
  });

  return {
    ...safety,
    allowed: safety.reasons.length === 0 && blockReasons.length === 0,
    requiresApproval,
    approvalReasons,
    blockReasons: [...safety.reasons, ...blockReasons],
    reasons: [...safety.reasons, ...blockReasons],
    policyBand: blockReasons.length > 0 || campaignPolicy?.band === "unhealthy" ? "unhealthy" : approvalReasons.length > 0 || campaignPolicy?.band === "watch" ? "watch" : "healthy",
    metrics: {
      projectedDailySpendCents,
      dailySpendCapCents,
      shiftPct,
      approvalCapPct: input.approvalCapPct,
      maxBudgetShiftPct: input.maxBudgetShiftPct,
      confidence,
      minConfidence: input.minConfidence,
      observedRatio: campaignPolicy?.observedRatio ?? null,
      cacOverrunPct: campaignPolicy?.cacOverrunPct ?? null,
      cooldownRemainingHours: Number(cooldownRemainingHours.toFixed(2))
    }
  };
}

export type AcquisitionAgentRunbookStepKey =
  | "observe_performance"
  | "diagnose_cell_movement"
  | "propose_action"
  | "check_policy"
  | "request_approval"
  | "apply_approved_action"
  | "monitor_reversal"
  | "log_revenue_impact";

export type AcquisitionAgentRunbookStepStatus =
  | "ready"
  | "blocked"
  | "approval_required"
  | "waiting"
  | "completed";

export type AcquisitionAgentRunbookStep = {
  key: AcquisitionAgentRunbookStepKey;
  status: AcquisitionAgentRunbookStepStatus;
  auditEvent: string;
  summary: string;
  reasons: string[];
};

export type AcquisitionAgentRunbookInput = {
  observedPerformance: boolean;
  diagnosedMovement: boolean;
  proposedAction: boolean;
  policyDecision?: AdWritePolicyGateDecision | null;
  approvalCompleted?: boolean;
  actionApplied?: boolean;
  reversalWindowHours: number;
  reversalConditionMet?: boolean;
  outcomeObserved?: boolean;
  revenueImpactCents?: number | null;
};

export type AcquisitionAgentRunbook = {
  currentStep: AcquisitionAgentRunbookStepKey;
  readyToApply: boolean;
  shouldRollback: boolean;
  revenueImpactCents: number;
  steps: AcquisitionAgentRunbookStep[];
};

export function buildAcquisitionAgentRunbook(input: AcquisitionAgentRunbookInput): AcquisitionAgentRunbook {
  const policyDecision = input.policyDecision ?? null;
  const policyChecked = Boolean(policyDecision);
  const approvalRequired = Boolean(policyDecision?.requiresApproval);
  const onlyApprovalBlocks = approvalRequired && policyDecision?.blockReasons.every((reason) => /approval/i.test(reason));
  const policyAllowed = Boolean(policyDecision?.allowed);
  const approvalComplete = !approvalRequired || input.approvalCompleted === true;
  const readyToApply = input.observedPerformance && input.diagnosedMovement && input.proposedAction && policyAllowed && approvalComplete;
  const shouldRollback = input.actionApplied === true && input.reversalConditionMet === true;
  const revenueImpactCents = Number.isFinite(input.revenueImpactCents ?? NaN) ? Number(input.revenueImpactCents) : 0;

  const steps: AcquisitionAgentRunbookStep[] = [
    {
      key: "observe_performance",
      status: input.observedPerformance ? "completed" : "ready",
      auditEvent: "performance.synced",
      summary: "Sync platform performance and first-party conversion quality for the configured window.",
      reasons: []
    },
    {
      key: "diagnose_cell_movement",
      status: input.observedPerformance ? input.diagnosedMovement ? "completed" : "ready" : "blocked",
      auditEvent: "cell.diagnosed",
      summary: "Compare cells against CAC, ROAS, LTV:CAC, confidence, and budget movement signals.",
      reasons: input.observedPerformance ? [] : ["Performance must be observed before diagnosis."]
    },
    {
      key: "propose_action",
      status: input.diagnosedMovement ? input.proposedAction ? "completed" : "ready" : "blocked",
      auditEvent: "action.recommended",
      summary: "Draft the recommended budget, pause/resume, creative, audience, or rollback action.",
      reasons: input.diagnosedMovement ? [] : ["Cell movement must be diagnosed before action proposal."]
    },
    {
      key: "check_policy",
      status: input.proposedAction ? policyChecked ? policyAllowed || onlyApprovalBlocks ? "completed" : "blocked" : "ready" : "blocked",
      auditEvent: "policy.checked",
      summary: "Evaluate spend caps, CAC/LTV, confidence, cooldown, approval, emergency stop, and rollback gates.",
      reasons: input.proposedAction ? policyDecision?.reasons ?? [] : ["Action proposal is required before policy check."]
    },
    {
      key: "request_approval",
      status: approvalRequired ? input.approvalCompleted ? "completed" : "approval_required" : policyChecked ? "completed" : "blocked",
      auditEvent: approvalRequired ? "approval.requested" : "approval.completed",
      summary: "Request operator approval when policy says the action cannot be auto-applied.",
      reasons: approvalRequired ? policyDecision?.approvalReasons ?? ["Approval is required before this write operation."] : []
    },
    {
      key: "apply_approved_action",
      status: readyToApply ? input.actionApplied ? "completed" : "ready" : "blocked",
      auditEvent: input.actionApplied ? "provider.write_applied" : "provider.dry_run",
      summary: "Apply the approved provider mutation with idempotency and before/after diff metadata.",
      reasons: readyToApply ? [] : ["Observation, diagnosis, proposal, policy pass, and approval must complete first."]
    },
    {
      key: "monitor_reversal",
      status: input.actionApplied ? shouldRollback ? "ready" : input.outcomeObserved ? "completed" : "waiting" : "blocked",
      auditEvent: shouldRollback ? "provider.rollback_applied" : "outcome.observed",
      summary: `Monitor reversal conditions for ${Math.max(0, input.reversalWindowHours)} hours after action.`,
      reasons: shouldRollback ? ["Reversal condition met after provider write."] : []
    },
    {
      key: "log_revenue_impact",
      status: input.outcomeObserved ? "ready" : "blocked",
      auditEvent: "revenue.attributed",
      summary: "Attribute downstream revenue impact and persist customer-visible proof.",
      reasons: input.outcomeObserved ? [] : ["Outcome observation is required before revenue attribution."]
    }
  ];

  return {
    currentStep: steps.find((step) => step.status === "ready" || step.status === "approval_required" || step.status === "waiting" || step.status === "blocked")?.key ?? "log_revenue_impact",
    readyToApply,
    shouldRollback,
    revenueImpactCents,
    steps
  };
}
