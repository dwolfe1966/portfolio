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
