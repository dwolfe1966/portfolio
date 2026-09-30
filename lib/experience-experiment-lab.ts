import type { DebateFamily, ScorebookCaseInput } from "./compounding-expertise-lab";

export const EXPERIMENT_LAB_VERSION = "experience-experiment-lab-1.1";

export type SyntheticWorldConfig = {
  customers: number;
  casesPerCustomer: number;
  patterns: number;
  sharedStructure: number;
  drift: number;
  outcomeNoise: number;
  missingFeedback: number;
  challengerCalibration: number;
  repetitions: number;
  seed: number;
};

export type ExperimentFinding = {
  id: "pooling" | "selection" | "reconstruction";
  family: DebateFamily;
  verdict: "SUPPORTS" | "MIXED" | "CHALLENGES" | "BLOCKED";
  headline: string;
  detail: string;
  implication: string;
  metrics: Record<string, number | string>;
};

type Action = "A" | "B";
type WorldCase = {
  customer: number;
  pattern: number;
  time: number;
  action: Action;
  observedReward: number | null;
  expectedA: number;
  expectedB: number;
};

const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const mean = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
const round = (value: number, places = 4) => Number(value.toFixed(places));
const mix = (seed: number) => {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let result = value;
    result = Math.imul(result ^ result >>> 15, result | 1);
    result ^= result + Math.imul(result ^ result >>> 7, result | 61);
    return ((result ^ result >>> 14) >>> 0) / 4294967296;
  };
};
const normal = (random: () => number) => Math.sqrt(-2 * Math.log(Math.max(random(), 1e-12))) * Math.cos(2 * Math.PI * random());

export const DEFAULT_SYNTHETIC_WORLD: SyntheticWorldConfig = {
  customers: 5,
  casesPerCustomer: 200,
  patterns: 12,
  sharedStructure: 0.7,
  drift: 0.15,
  outcomeNoise: 0.15,
  missingFeedback: 0.05,
  challengerCalibration: 25,
  repetitions: 8,
  seed: 4107
};

export function normalizeSyntheticWorld(input: Partial<Record<keyof SyntheticWorldConfig, number | string | null | undefined>>): SyntheticWorldConfig {
  const numeric = (key: keyof SyntheticWorldConfig, fallback: number) => {
    const value = Number(input[key]);
    return Number.isFinite(value) ? value : fallback;
  };
  const customers = Math.round(clamp(numeric("customers", DEFAULT_SYNTHETIC_WORLD.customers), 2, 12));
  const casesPerCustomer = Math.round(clamp(numeric("casesPerCustomer", DEFAULT_SYNTHETIC_WORLD.casesPerCustomer), 40, 300));
  const requestedRepetitions = Math.round(clamp(numeric("repetitions", DEFAULT_SYNTHETIC_WORLD.repetitions), 3, 12));
  const repetitions = Math.max(3, Math.min(requestedRepetitions, Math.floor(24_000 / (customers * casesPerCustomer))));
  return {
    customers,
    casesPerCustomer,
    patterns: Math.round(clamp(numeric("patterns", DEFAULT_SYNTHETIC_WORLD.patterns), 2, 30)),
    sharedStructure: clamp(numeric("sharedStructure", DEFAULT_SYNTHETIC_WORLD.sharedStructure)),
    drift: clamp(numeric("drift", DEFAULT_SYNTHETIC_WORLD.drift)),
    outcomeNoise: clamp(numeric("outcomeNoise", DEFAULT_SYNTHETIC_WORLD.outcomeNoise), 0, 0.45),
    missingFeedback: clamp(numeric("missingFeedback", DEFAULT_SYNTHETIC_WORLD.missingFeedback), 0, 0.8),
    challengerCalibration: Math.round(clamp(numeric("challengerCalibration", DEFAULT_SYNTHETIC_WORLD.challengerCalibration), 0, 500)),
    repetitions,
    seed: Math.round(clamp(numeric("seed", DEFAULT_SYNTHETIC_WORLD.seed), 1, 2147483647))
  };
}

function generateWorld(config: SyntheticWorldConfig, seed: number): WorldCase[] {
  const random = mix(seed);
  const shared = Array.from({ length: config.patterns }, () => normal(random) * 0.85);
  const customer = Array.from({ length: config.customers }, () => Array.from({ length: config.patterns }, () => normal(random) * 0.85));
  const sharedLater = Array.from({ length: config.patterns }, () => normal(random) * 0.85);
  const customerLater = Array.from({ length: config.customers }, () => Array.from({ length: config.patterns }, () => normal(random) * 0.85));
  const rows: WorldCase[] = [];
  for (let time = 0; time < config.casesPerCustomer; time++) {
    for (let group = 0; group < config.customers; group++) {
      const pattern = Math.floor(random() * config.patterns);
      const timeRatio = time / Math.max(1, config.casesPerCustomer - 1);
      const transition = clamp((timeRatio - 0.3) / 0.45);
      const driftWeight = config.drift * transition * transition * (3 - 2 * transition);
      const sharedSignal = (1 - driftWeight) * shared[pattern] + driftWeight * sharedLater[pattern];
      const customerSignal = (1 - driftWeight) * customer[group][pattern] + driftWeight * customerLater[group][pattern];
      const signal = config.sharedStructure * sharedSignal + (1 - config.sharedStructure) * customerSignal;
      const expectedA = clamp(0.5 + 0.28 * Math.tanh(signal));
      const expectedB = 1 - expectedA;
      // Logged behavior explores both actions, while favoring the action currently
      // expected to be better. The experiment evaluates policies on latent expected
      // outcomes, so no observed counterfactual is presented as real evidence.
      const best: Action = expectedA >= expectedB ? "A" : "B";
      const action: Action = random() < 0.7 ? best : best === "A" ? "B" : "A";
      const expected = action === "A" ? expectedA : expectedB;
      const noisy = clamp(expected * (1 - config.outcomeNoise) + 0.5 * config.outcomeNoise);
      const observedReward = random() < config.missingFeedback ? null : random() < noisy ? 1 : 0;
      rows.push({ customer: group, pattern, time, action, observedReward, expectedA, expectedB });
    }
  }
  return rows;
}

type Policy = "local" | "pooled" | "selective";
type History = "full" | "recent" | "balanced";

function chooseAction(train: WorldCase[], row: WorldCase, policy: Policy, history: History = "full"): Action {
  let usable = train.filter(item => item.observedReward !== null && item.time < row.time);
  if (history === "recent") usable = usable.filter(item => item.time >= row.time - Math.max(20, Math.round(row.time * 0.35)));
  if (history === "balanced") {
    const byPattern = new Map<number, WorldCase[]>();
    for (const item of usable) byPattern.set(item.pattern, [...(byPattern.get(item.pattern) ?? []), item]);
    const cap = Math.max(5, Math.min(...[...byPattern.values()].map(items => items.length)));
    usable = [...byPattern.values()].flatMap(items => items.slice(-cap));
  }
  const estimate = (scope: "local" | "pooled", action: Action) => {
    const subset = usable.filter(item => item.pattern === row.pattern && item.action === action && (scope === "pooled" || item.customer === row.customer));
    return (subset.reduce((sum, item) => sum + item.observedReward!, 0) + 1) / (subset.length + 2);
  };
  const localA = estimate("local", "A"), localB = estimate("local", "B");
  const pooledA = estimate("pooled", "A"), pooledB = estimate("pooled", "B");
  if (policy === "local") return localA >= localB ? "A" : "B";
  if (policy === "pooled") return pooledA >= pooledB ? "A" : "B";
  const localCount = usable.filter(item => item.pattern === row.pattern && item.customer === row.customer).length;
  const weight = localCount / (localCount + 12);
  return weight * localA + (1 - weight) * pooledA >= weight * localB + (1 - weight) * pooledB ? "A" : "B";
}

function policyValue(rows: WorldCase[], policy: Policy, history: History = "full", calibration?: { limit: number; publicOnly: boolean }) {
  const boundary = Math.floor(Math.max(...rows.map(row => row.time)) * 0.75);
  let train = rows.filter(row => row.time < boundary);
  if (calibration) {
    const publicRules = calibration.publicOnly ? train.filter(row => row.customer === 0) : train;
    const calibrationRows = calibration.limit > 0 ? train.filter(row => row.customer !== 0).slice(-calibration.limit) : [];
    train = [...publicRules, ...calibrationRows];
  }
  const test = rows.filter(row => row.time >= boundary);
  return mean(test.map(row => {
    const action = chooseAction(train, row, policy, history);
    return action === "A" ? row.expectedA : row.expectedB;
  }));
}

function summarize(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  return { mean: mean(values), low: sorted[Math.floor((sorted.length - 1) * 0.1)], high: sorted[Math.ceil((sorted.length - 1) * 0.9)] };
}

export function runSyntheticExperimentLab(raw: Partial<Record<keyof SyntheticWorldConfig, number | string | null | undefined>>) {
  const config = normalizeSyntheticWorld(raw);
  const runs = Array.from({ length: config.repetitions }, (_, index) => {
    const world = generateWorld(config, config.seed + index * 7919);
    const local = policyValue(world, "local");
    const pooled = policyValue(world, "pooled");
    const selective = policyValue(world, "selective");
    const full = policyValue(world, "selective", "full");
    const recent = policyValue(world, "selective", "recent");
    const balanced = policyValue(world, "selective", "balanced");
    const incumbent = selective;
    const challenger = policyValue(world, "selective", "full", { limit: config.challengerCalibration, publicOnly: true });
    return { local, pooled, selective, full, recent, balanced, incumbent, challenger };
  });
  const pooling = {
    local: summarize(runs.map(run => run.local)),
    pooled: summarize(runs.map(run => run.pooled)),
    selective: summarize(runs.map(run => run.selective))
  };
  const selection = {
    full: summarize(runs.map(run => run.full)),
    recent: summarize(runs.map(run => run.recent)),
    balanced: summarize(runs.map(run => run.balanced))
  };
  const reconstruction = {
    incumbent: summarize(runs.map(run => run.incumbent)),
    challenger: summarize(runs.map(run => run.challenger)),
    gap: summarize(runs.map(run => run.incumbent - run.challenger))
  };
  const poolingGain = pooling.selective.mean - pooling.local.mean;
  const pooledGain = pooling.pooled.mean - pooling.local.mean;
  const rankedSelection = [...(["full", "recent", "balanced"] as const)].sort((a, b) => selection[b].mean - selection[a].mean);
  const bestSelection = rankedSelection[0] === "full" || selection[rankedSelection[0]].mean - selection.full.mean > 0.005 ? rankedSelection[0] : "full";
  const findings: ExperimentFinding[] = [
    {
      id: "pooling", family: "CROSS_CUSTOMER_TRANSFER",
      verdict: poolingGain > 0.015 ? "SUPPORTS" : pooledGain < -0.01 ? "CHALLENGES" : "MIXED",
      headline: poolingGain > 0.015 ? "Selective pooling creates a meaningful advantage in this world." : pooledGain < -0.01 ? "Unconditional pooling destroys value in this world." : "Pooling produces a small or strategy-dependent effect in this world.",
      detail: `Expected policy value: local ${round(pooling.local.mean)}, pooled ${round(pooling.pooled.mean)}, selective ${round(pooling.selective.mean)} across ${config.repetitions} worlds.`,
      implication: poolingGain > 0.015 ? "Cross-customer learning is plausible when shared structure is learned without erasing customer-specific variation." : "The pooling rule matters as much as the existence of shared data; use selective weighting and monitor group harm.",
      metrics: { local: round(pooling.local.mean), pooled: round(pooling.pooled.mean), selective: round(pooling.selective.mean), selectiveGain: round(poolingGain) }
    },
    {
      id: "selection", family: "MARGINAL_INFORMATION_VALUE",
      verdict: bestSelection === "full" ? "SUPPORTS" : "MIXED",
      headline: bestSelection === "full" ? "The full history performs best in this world." : `${bestSelection[0].toUpperCase()}${bestSelection.slice(1)} experience outperforms the full history in this world.`,
      detail: `Expected value: full ${round(selection.full.mean)}, recent ${round(selection.recent.mean)}, balanced ${round(selection.balanced.mean)}.`,
      implication: bestSelection === "full" ? "Additional experience remains useful under these drift and noise assumptions." : "More data is not automatically more information; selection and weighting should be part of the learning system.",
      metrics: { full: round(selection.full.mean), recent: round(selection.recent.mean), balanced: round(selection.balanced.mean), best: bestSelection }
    },
    {
      id: "reconstruction", family: "REBUILDABILITY_COMPRESSION",
      verdict: reconstruction.gap.mean > 0.02 ? "SUPPORTS" : reconstruction.gap.mean < 0.005 ? "CHALLENGES" : "MIXED",
      headline: reconstruction.gap.mean > 0.02 ? "Limited calibration leaves a material reconstruction gap in this world." : reconstruction.gap.mean < 0.005 ? "A lightly calibrated challenger nearly reconstructs the policy in this world." : "The reconstruction gap is modest in this world.",
      detail: `Incumbent expected value ${round(reconstruction.incumbent.mean)} versus challenger ${round(reconstruction.challenger.mean)}; mean gap ${round(reconstruction.gap.mean)}.`,
      implication: reconstruction.gap.mean > 0.02 ? "Experience access may matter, but test larger challenger budgets and stronger public priors." : "Experience alone is unlikely to create durable Power under these assumptions.",
      metrics: { incumbent: round(reconstruction.incumbent.mean), challenger: round(reconstruction.challenger.mean), gap: round(reconstruction.gap.mean), calibrationCases: config.challengerCalibration }
    }
  ];
  return {
    version: EXPERIMENT_LAB_VERSION,
    config,
    generatedCases: config.customers * config.casesPerCustomer * config.repetitions,
    pooling, selection, reconstruction, findings,
    assumptions: "Generated worlds contain two actions with known counterfactual expected outcomes. Policies learn only from logged actions and observed feedback; evaluation uses the simulator's latent reward surface. Results establish conditional behavior under the displayed assumptions, not facts about the selected company."
  };
}

export type SyntheticExperimentLabResult = ReturnType<typeof runSyntheticExperimentLab>;

export function calibrateWorldDefaults(rows: ScorebookCaseInput[]): SyntheticWorldConfig {
  const customers = new Set(rows.map(row => row.customerSegment).filter(Boolean)).size;
  const patterns = new Set(rows.map(row => `${row.decisionClassId ?? row.sourceRecordType ?? ""}|${row.caseType}`)).size;
  const missing = rows.length ? rows.filter(row => !row.outcome || row.grade === "UNRESOLVED").length / rows.length : DEFAULT_SYNTHETIC_WORLD.missingFeedback;
  return normalizeSyntheticWorld({
    ...DEFAULT_SYNTHETIC_WORLD,
    customers: customers || DEFAULT_SYNTHETIC_WORLD.customers,
    casesPerCustomer: customers ? Math.max(40, Math.round(rows.length / customers)) : DEFAULT_SYNTHETIC_WORLD.casesPerCustomer,
    patterns: patterns || DEFAULT_SYNTHETIC_WORLD.patterns,
    missingFeedback: missing
  });
}
