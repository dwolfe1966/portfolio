export const DEMO_ASSUMPTIONS_KEY = "demo.assumptions.v1";

export type DemoAssumptions = {
  defaultTopN: number;
  recencyScore: number;
  minPriorityScore: number;
  highPriorityThreshold: number;
  revenuePerHighPriority: number;
  openRate: number;
  clickRate: number;
  engageRate: number;
  purchaseRate: number;
  avgOrderValue: number;
};

export const DEMO_ASSUMPTION_DEFAULTS: DemoAssumptions = {
  defaultTopN: 10,
  recencyScore: 0.9,
  minPriorityScore: 0,
  highPriorityThreshold: 0.8,
  revenuePerHighPriority: 18.5,
  openRate: 0.3,
  clickRate: 0.08,
  engageRate: 0.04,
  purchaseRate: 0.012,
  avgOrderValue: 89
};

export function normalizeDemoAssumptions(input?: Partial<DemoAssumptions> | null): DemoAssumptions {
  const source = input ?? {};
  return {
    defaultTopN: Number(source.defaultTopN ?? DEMO_ASSUMPTION_DEFAULTS.defaultTopN),
    recencyScore: Number(source.recencyScore ?? DEMO_ASSUMPTION_DEFAULTS.recencyScore),
    minPriorityScore: Number(source.minPriorityScore ?? DEMO_ASSUMPTION_DEFAULTS.minPriorityScore),
    highPriorityThreshold: Number(source.highPriorityThreshold ?? DEMO_ASSUMPTION_DEFAULTS.highPriorityThreshold),
    revenuePerHighPriority: Number(source.revenuePerHighPriority ?? DEMO_ASSUMPTION_DEFAULTS.revenuePerHighPriority),
    openRate: Number(source.openRate ?? DEMO_ASSUMPTION_DEFAULTS.openRate),
    clickRate: Number(source.clickRate ?? DEMO_ASSUMPTION_DEFAULTS.clickRate),
    engageRate: Number(source.engageRate ?? DEMO_ASSUMPTION_DEFAULTS.engageRate),
    purchaseRate: Number(source.purchaseRate ?? DEMO_ASSUMPTION_DEFAULTS.purchaseRate),
    avgOrderValue: Number(source.avgOrderValue ?? DEMO_ASSUMPTION_DEFAULTS.avgOrderValue)
  };
}
