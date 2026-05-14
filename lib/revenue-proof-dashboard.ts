export type RevenueProofApp = "lifecycle" | "acquisition";
export type RevenueProofStatus = "ready" | "warning" | "blocked";
export type RevenueProofConfidence = "low" | "medium" | "high";

export type RevenueProofAction = {
  id: string;
  label: string;
  status?: "applied" | "approved" | "pending" | "blocked" | string | null;
  occurredAt?: Date | string | null;
  auditUrl?: string | null;
};

export type RevenueProofExportLink = {
  label: string;
  href: string;
  evidenceType?: "baseline" | "actions" | "outcomes" | "audit" | string | null;
};

export type RevenueProofDashboardInput = {
  app: RevenueProofApp;
  baselineLabel?: string | null;
  baselinePopulation?: number | null;
  baselineConversionRate?: number | null;
  baselineRevenueCents?: number | null;
  treatmentPopulation?: number | null;
  controlPopulation?: number | null;
  observedConversions?: number | null;
  observedRevenueCents?: number | null;
  spendCents?: number | null;
  confidence?: RevenueProofConfidence | string | null;
  confidenceFlags?: string[];
  actions?: RevenueProofAction[];
  exportLinks?: RevenueProofExportLink[];
};

export type RevenueProofMetric = {
  label: string;
  value: string;
  tone?: "neutral" | "positive" | "warning" | "blocked";
};

export type RevenueProofDashboard = {
  app: RevenueProofApp;
  status: RevenueProofStatus;
  confidence: RevenueProofConfidence;
  baselineLabel: string;
  baselineRevenueCents: number;
  expectedRevenueCents: number;
  observedRevenueCents: number;
  incrementalRevenueCents: number;
  spendCents: number;
  incrementalProfitCents: number;
  treatmentPopulation: number;
  controlPopulation: number;
  observedConversions: number;
  baselineConversionRate: number;
  observedConversionRate: number;
  actions: RevenueProofAction[];
  exportLinks: RevenueProofExportLink[];
  confidenceFlags: string[];
  blockers: string[];
  warnings: string[];
  metrics: RevenueProofMetric[];
};

function finiteNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function normalizeNonNegative(value: number | null | undefined) {
  return finiteNumber(value) && value > 0 ? value : 0;
}

function normalizeConfidence(value: RevenueProofDashboardInput["confidence"]): RevenueProofConfidence {
  if (value === "high" || value === "medium" || value === "low") return value;
  return "low";
}

function money(cents: number) {
  const dollars = cents / 100;
  return dollars.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: Math.abs(dollars) >= 1000 ? 0 : 2
  });
}

function percent(value: number) {
  return `${(value * 100).toFixed(value > 0.1 ? 1 : 2)}%`;
}

function statusFor(blockers: string[], warnings: string[]): RevenueProofStatus {
  if (blockers.length > 0) return "blocked";
  if (warnings.length > 0) return "warning";
  return "ready";
}

export function buildRevenueProofDashboard(input: RevenueProofDashboardInput): RevenueProofDashboard {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const confidence = normalizeConfidence(input.confidence);
  const baselinePopulation = normalizeNonNegative(input.baselinePopulation);
  const treatmentPopulation = normalizeNonNegative(input.treatmentPopulation);
  const controlPopulation = normalizeNonNegative(input.controlPopulation);
  const observedConversions = normalizeNonNegative(input.observedConversions);
  const observedRevenueCents = normalizeNonNegative(input.observedRevenueCents);
  const baselineRevenueCents = normalizeNonNegative(input.baselineRevenueCents);
  const spendCents = normalizeNonNegative(input.spendCents);
  const baselineConversionRate = finiteNumber(input.baselineConversionRate) ? Math.min(Math.max(input.baselineConversionRate, 0), 1) : 0;

  if (!input.baselineLabel?.trim()) blockers.push("Attach a named baseline snapshot.");
  if (baselinePopulation <= 0) blockers.push("Record baseline population.");
  if (treatmentPopulation <= 0) blockers.push("Record treatment population.");
  if (baselineConversionRate <= 0) warnings.push("Baseline conversion rate is missing or zero.");
  if (baselineRevenueCents <= 0) warnings.push("Baseline revenue is missing or zero.");
  if (observedRevenueCents <= 0) warnings.push("Observed revenue is missing or zero.");
  if ((input.actions ?? []).length === 0) warnings.push("No agent actions are attached to this proof view.");
  if ((input.exportLinks ?? []).length === 0) warnings.push("No evidence exports are linked yet.");
  if (confidence === "low") warnings.push("Confidence is low; keep proof directional until reviewed.");

  const expectedRevenueCents = treatmentPopulation > 0 && baselinePopulation > 0
    ? Math.round(baselineRevenueCents * (treatmentPopulation / baselinePopulation))
    : 0;
  const incrementalRevenueCents = observedRevenueCents - expectedRevenueCents;
  const incrementalProfitCents = input.app === "acquisition" ? incrementalRevenueCents - spendCents : incrementalRevenueCents;
  const observedConversionRate = treatmentPopulation > 0 ? observedConversions / treatmentPopulation : 0;
  const status = statusFor(blockers, warnings);

  const metrics: RevenueProofMetric[] = [
    { label: "Expected baseline", value: money(expectedRevenueCents) },
    { label: "Observed revenue", value: money(observedRevenueCents), tone: observedRevenueCents >= expectedRevenueCents ? "positive" : "warning" },
    { label: "Incremental revenue", value: money(incrementalRevenueCents), tone: incrementalRevenueCents > 0 ? "positive" : "warning" },
    {
      label: input.app === "acquisition" ? "Incremental profit" : "Billable lift candidate",
      value: money(incrementalProfitCents),
      tone: incrementalProfitCents > 0 ? "positive" : "warning"
    },
    { label: "Baseline conversion", value: percent(baselineConversionRate) },
    { label: "Observed conversion", value: percent(observedConversionRate), tone: observedConversionRate >= baselineConversionRate ? "positive" : "warning" }
  ];

  return {
    app: input.app,
    status,
    confidence,
    baselineLabel: input.baselineLabel?.trim() || "Unassigned baseline",
    baselineRevenueCents,
    expectedRevenueCents,
    observedRevenueCents,
    incrementalRevenueCents,
    spendCents,
    incrementalProfitCents,
    treatmentPopulation,
    controlPopulation,
    observedConversions,
    baselineConversionRate,
    observedConversionRate,
    actions: input.actions ?? [],
    exportLinks: input.exportLinks ?? [],
    confidenceFlags: [...(input.confidenceFlags ?? []), ...warnings],
    blockers,
    warnings,
    metrics
  };
}
