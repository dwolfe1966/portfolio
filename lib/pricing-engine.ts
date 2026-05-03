export type PricingExperimentState =
  | "DRAFT"
  | "RUNNING"
  | "PAUSED"
  | "DECISION_READY"
  | "PROMOTED"
  | "ROLLED_BACK";

export type PricingDecisionRecommendation = "promote" | "extend" | "pause" | "rollback";
export type PricingGuardrailBand = "healthy" | "watch" | "unhealthy";
export type PricingRiskBand = "low" | "medium" | "high";

export type PricingSegmentInput = {
  id: string;
  name: string;
  baselineConversionRate: number;
  baselineChurnRate: number;
  baselineArpuCents: number;
  grossMarginPercent: number;
  monthlyVolume: number;
  riskBand: PricingRiskBand;
};

export type PricingVariantInput = {
  id: string;
  name: string;
  monthlyPriceCents: number;
  marginImpactPercent: number;
  expectedSupportLoadDelta: number;
};

export type PricingExperimentInput = {
  id: string;
  holdoutPercent: number;
  minimumSampleSize: number;
  minGrossMarginPercent: number;
  maxChurnDeltaPercent: number;
  maxSupportLoadDelta: number;
  minConfidence: number;
};

export type PricingScenarioAssumptions = {
  conversionLiftPercent: number;
  churnSensitivityPercent: number;
  supportLoadSensitivity: number;
  demandElasticity: number;
};

export type PricingSegmentSimulationResult = {
  segmentId: string;
  variantId: string;
  sampleSize: number;
  conversionRate: number;
  churnRate: number;
  arpuCents: number;
  grossMarginPercent: number;
  netRevenueLiftCents: number;
  guardrailBand: PricingGuardrailBand;
};

export type PricingExperimentSimulation = {
  experimentId: string;
  arpuLiftPercent: number;
  conversionDeltaPercent: number;
  churnDeltaPercent: number;
  grossMarginPercent: number;
  netRevenueLiftCents: number;
  supportLoadDelta: number;
  confidence: number;
  holdoutHealth: PricingGuardrailBand;
  recommendation: PricingDecisionRecommendation;
  segmentResults: PricingSegmentSimulationResult[];
};

const DEFAULT_SCENARIO: PricingScenarioAssumptions = {
  conversionLiftPercent: 6,
  churnSensitivityPercent: 1.2,
  supportLoadSensitivity: 1,
  demandElasticity: 0.35
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function round4(value: number) {
  return Math.round(value * 10000) / 10000;
}

function classifyGuardrail(value: number, healthyLimit: number, unhealthyLimit: number, direction: "min" | "max") {
  if (direction === "min") {
    if (value < unhealthyLimit) return "unhealthy" as const;
    if (value < healthyLimit) return "watch" as const;
    return "healthy" as const;
  }
  if (value > unhealthyLimit) return "unhealthy" as const;
  if (value > healthyLimit) return "watch" as const;
  return "healthy" as const;
}

export function classifyHoldoutHealth(holdoutPercent: number, minHoldoutPercent = 0.1): PricingGuardrailBand {
  if (holdoutPercent < minHoldoutPercent * 0.5) return "unhealthy";
  if (holdoutPercent < minHoldoutPercent) return "watch";
  return "healthy";
}

export function recommendPricingDecision(input: {
  confidence: number;
  minConfidence: number;
  grossMarginPercent: number;
  minGrossMarginPercent: number;
  churnDeltaPercent: number;
  maxChurnDeltaPercent: number;
  supportLoadDelta: number;
  maxSupportLoadDelta: number;
  sampleSize: number;
  minimumSampleSize: number;
  holdoutHealth: PricingGuardrailBand;
}): PricingDecisionRecommendation {
  if (
    input.holdoutHealth === "unhealthy" ||
    input.grossMarginPercent < input.minGrossMarginPercent ||
    input.churnDeltaPercent > input.maxChurnDeltaPercent
  ) {
    return "rollback";
  }
  if (input.supportLoadDelta > input.maxSupportLoadDelta) return "pause";
  if (input.sampleSize < input.minimumSampleSize || input.confidence < input.minConfidence) return "extend";
  return "promote";
}

export function simulatePricingExperiment(
  experiment: PricingExperimentInput,
  segments: PricingSegmentInput[],
  control: PricingVariantInput,
  treatments: PricingVariantInput[],
  scenario: Partial<PricingScenarioAssumptions> = {}
): PricingExperimentSimulation {
  const assumptions = { ...DEFAULT_SCENARIO, ...scenario };
  const treatment = treatments[0] ?? control;
  const priceDelta = control.monthlyPriceCents > 0
    ? (treatment.monthlyPriceCents - control.monthlyPriceCents) / control.monthlyPriceCents
    : 0;

  const segmentResults = segments.map((segment) => {
    const exposed = Math.max(0, Math.round(segment.monthlyVolume * (1 - experiment.holdoutPercent)));
    const sampleSize = Math.max(0, Math.floor(exposed / Math.max(treatments.length + 1, 2)));
    const conversionPressure = assumptions.conversionLiftPercent / 100 - priceDelta * assumptions.demandElasticity;
    const conversionRate = clamp(segment.baselineConversionRate * (1 + conversionPressure), 0, 1);
    const churnDelta = Math.max(0, priceDelta * assumptions.churnSensitivityPercent);
    const churnRate = clamp(segment.baselineChurnRate + churnDelta, 0, 1);
    const grossMarginPercent = clamp(
      segment.grossMarginPercent + treatment.marginImpactPercent,
      0,
      1
    );
    const supportLoadDelta = treatment.expectedSupportLoadDelta * assumptions.supportLoadSensitivity;
    const controlNet = sampleSize * segment.baselineConversionRate * segment.baselineArpuCents * segment.grossMarginPercent;
    const treatmentNet = sampleSize * conversionRate * treatment.monthlyPriceCents * grossMarginPercent;
    const churnCost = sampleSize * Math.max(churnRate - segment.baselineChurnRate, 0) * segment.baselineArpuCents;
    const netRevenueLiftCents = Math.round(treatmentNet - controlNet - churnCost);
    const marginBand = classifyGuardrail(
      grossMarginPercent,
      experiment.minGrossMarginPercent + 0.03,
      experiment.minGrossMarginPercent,
      "min"
    );
    const churnBand = classifyGuardrail(
      (churnRate - segment.baselineChurnRate) * 100,
      experiment.maxChurnDeltaPercent * 0.75,
      experiment.maxChurnDeltaPercent,
      "max"
    );
    const supportBand = classifyGuardrail(
      supportLoadDelta,
      experiment.maxSupportLoadDelta * 0.75,
      experiment.maxSupportLoadDelta,
      "max"
    );
    const guardrailBand: PricingGuardrailBand =
      marginBand === "unhealthy" || churnBand === "unhealthy" || supportBand === "unhealthy"
        ? "unhealthy"
        : marginBand === "watch" || churnBand === "watch" || supportBand === "watch"
          ? "watch"
          : "healthy";

    return {
      segmentId: segment.id,
      variantId: treatment.id,
      sampleSize,
      conversionRate: round4(conversionRate),
      churnRate: round4(churnRate),
      arpuCents: treatment.monthlyPriceCents,
      grossMarginPercent: round4(grossMarginPercent),
      netRevenueLiftCents,
      guardrailBand
    };
  });

  const totalSample = segmentResults.reduce((sum, row) => sum + row.sampleSize, 0);
  const baselineWeightedArpu = segments.reduce((sum, segment) => {
    return sum + segment.baselineArpuCents * segment.monthlyVolume;
  }, 0) / Math.max(segments.reduce((sum, segment) => sum + segment.monthlyVolume, 0), 1);
  const averageArpu = segmentResults.reduce((sum, row) => sum + row.arpuCents * row.sampleSize, 0) / Math.max(totalSample, 1);
  const grossMarginPercent = segmentResults.reduce((sum, row) => sum + row.grossMarginPercent * row.sampleSize, 0) / Math.max(totalSample, 1);
  const netRevenueLiftCents = segmentResults.reduce((sum, row) => sum + row.netRevenueLiftCents, 0);
  const conversionBaseline = segments.reduce((sum, s) => sum + s.baselineConversionRate * s.monthlyVolume, 0) / Math.max(segments.reduce((sum, s) => sum + s.monthlyVolume, 0), 1);
  const churnBaseline = segments.reduce((sum, s) => sum + s.baselineChurnRate * s.monthlyVolume, 0) / Math.max(segments.reduce((sum, s) => sum + s.monthlyVolume, 0), 1);
  const conversionAvg = segmentResults.reduce((sum, row) => sum + row.conversionRate * row.sampleSize, 0) / Math.max(totalSample, 1);
  const churnAvg = segmentResults.reduce((sum, row) => sum + row.churnRate * row.sampleSize, 0) / Math.max(totalSample, 1);
  const supportLoadDelta = treatment.expectedSupportLoadDelta * assumptions.supportLoadSensitivity;
  const confidence = clamp(Math.sqrt(totalSample / Math.max(experiment.minimumSampleSize, 1)) * 0.55 + Math.max(netRevenueLiftCents, 0) / 1_000_000, 0, 0.98);
  const holdoutHealth = classifyHoldoutHealth(experiment.holdoutPercent);
  const recommendation = recommendPricingDecision({
    confidence,
    minConfidence: experiment.minConfidence,
    grossMarginPercent,
    minGrossMarginPercent: experiment.minGrossMarginPercent,
    churnDeltaPercent: (churnAvg - churnBaseline) * 100,
    maxChurnDeltaPercent: experiment.maxChurnDeltaPercent,
    supportLoadDelta,
    maxSupportLoadDelta: experiment.maxSupportLoadDelta,
    sampleSize: totalSample,
    minimumSampleSize: experiment.minimumSampleSize,
    holdoutHealth
  });

  return {
    experimentId: experiment.id,
    arpuLiftPercent: round4((averageArpu - baselineWeightedArpu) / Math.max(baselineWeightedArpu, 1) * 100),
    conversionDeltaPercent: round4((conversionAvg - conversionBaseline) * 100),
    churnDeltaPercent: round4((churnAvg - churnBaseline) * 100),
    grossMarginPercent: round4(grossMarginPercent),
    netRevenueLiftCents,
    supportLoadDelta: round4(supportLoadDelta),
    confidence: round4(confidence),
    holdoutHealth,
    recommendation,
    segmentResults
  };
}

export function validatePricingDecisionInput(raw: unknown): { ok: true; value: { decision: PricingDecisionRecommendation; rationale: string; actor: string } } | { ok: false; errors: string[] } {
  const body = (raw ?? {}) as Record<string, unknown>;
  const decision = String(body.decision ?? "");
  const rationale = String(body.rationale ?? "").trim();
  const actor = String(body.actor ?? "demo-operator").trim() || "demo-operator";
  const allowed: PricingDecisionRecommendation[] = ["promote", "extend", "pause", "rollback"];
  const errors: string[] = [];
  if (!allowed.includes(decision as PricingDecisionRecommendation)) errors.push("decision must be promote, extend, pause, or rollback");
  if (rationale.length < 6) errors.push("rationale must be at least 6 characters");
  if (errors.length) return { ok: false, errors };
  return { ok: true, value: { decision: decision as PricingDecisionRecommendation, rationale: rationale.slice(0, 500), actor: actor.slice(0, 80) } };
}

export function validatePricingScenarioInput(raw: unknown): Partial<PricingScenarioAssumptions> {
  const body = (raw ?? {}) as Record<string, unknown>;
  return {
    conversionLiftPercent: Number.isFinite(Number(body.conversionLiftPercent)) ? clamp(Number(body.conversionLiftPercent), -30, 50) : undefined,
    churnSensitivityPercent: Number.isFinite(Number(body.churnSensitivityPercent)) ? clamp(Number(body.churnSensitivityPercent), 0, 10) : undefined,
    supportLoadSensitivity: Number.isFinite(Number(body.supportLoadSensitivity)) ? clamp(Number(body.supportLoadSensitivity), 0, 5) : undefined,
    demandElasticity: Number.isFinite(Number(body.demandElasticity)) ? clamp(Number(body.demandElasticity), 0, 3) : undefined
  };
}
