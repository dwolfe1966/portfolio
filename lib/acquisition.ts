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
};

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
  cooldownHours: 24
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
    cooldownHours: Number(body.cooldownHours ?? ACQUISITION_DEFAULTS.cooldownHours)
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

  return errors.length > 0 ? { ok: false, errors } : { ok: true, value };
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
