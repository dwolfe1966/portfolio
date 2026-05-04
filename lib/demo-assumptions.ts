export const DEMO_ASSUMPTIONS_KEY = "demo.assumptions.v1";

export type DemoAssumptions = {
  defaultTopN: number;
  recencyScore: number;
  minPriorityScore: number;
  highPriorityThreshold: number;
  highPriorityLift: number;
  openRate: number;
  clickRate: number;
  engageRate: number;
  purchaseRate: number;
  avgOrderValue: number;
};

export const DEMO_ASSUMPTION_DEFAULTS: DemoAssumptions = {
  defaultTopN: 50,
  recencyScore: 0.9,
  minPriorityScore: 0,
  highPriorityThreshold: 0.65,
  highPriorityLift: 1.8,
  openRate: 0.5,
  clickRate: 0.24,
  engageRate: 0.45,
  purchaseRate: 0.25,
  avgOrderValue: 129
};

export function normalizeDemoAssumptions(input?: Partial<DemoAssumptions> | null): DemoAssumptions {
  const source = input ?? {};
  return {
    defaultTopN: Number(source.defaultTopN ?? DEMO_ASSUMPTION_DEFAULTS.defaultTopN),
    recencyScore: Number(source.recencyScore ?? DEMO_ASSUMPTION_DEFAULTS.recencyScore),
    minPriorityScore: Number(source.minPriorityScore ?? DEMO_ASSUMPTION_DEFAULTS.minPriorityScore),
    highPriorityThreshold: Number(source.highPriorityThreshold ?? DEMO_ASSUMPTION_DEFAULTS.highPriorityThreshold),
    highPriorityLift: Number(source.highPriorityLift ?? DEMO_ASSUMPTION_DEFAULTS.highPriorityLift),
    openRate: Number(source.openRate ?? DEMO_ASSUMPTION_DEFAULTS.openRate),
    clickRate: Number(source.clickRate ?? DEMO_ASSUMPTION_DEFAULTS.clickRate),
    engageRate: Number(source.engageRate ?? DEMO_ASSUMPTION_DEFAULTS.engageRate),
    purchaseRate: Number(source.purchaseRate ?? DEMO_ASSUMPTION_DEFAULTS.purchaseRate),
    avgOrderValue: Number(source.avgOrderValue ?? DEMO_ASSUMPTION_DEFAULTS.avgOrderValue)
  };
}

/**
 * Derived expected revenue per high-priority candidate.
 * Replaces the old standalone `revenuePerHighPriority` input so the funnel
 * controls and the revenue projection stay internally consistent.
 */
export function expectedRevenuePerHighPriority(args: {
  purchaseRate: number;
  avgOrderValue: number;
  highPriorityLift: number;
}): number {
  return args.purchaseRate * args.avgOrderValue * args.highPriorityLift;
}
