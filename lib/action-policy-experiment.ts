import type { DebateFamily, ScorebookCaseInput } from "./compounding-expertise-lab";

export const ACTION_POLICY_EXPERIMENT_VERSION = "action-policy-experiment-1.0";

export const ACTION_POLICY_FAMILIES = ["LEARNING_CAUSALITY", "CROSS_CUSTOMER_TRANSFER", "MARGINAL_INFORMATION_VALUE", "ECONOMIC_MATERIALITY"] as const;
export type ActionPolicyFamily = typeof ACTION_POLICY_FAMILIES[number];

export type ActionPolicyExperimentConfig = {
  family: ActionPolicyFamily;
  cases: number;
  customers: number;
  patterns: number;
  sharedStructure: number;
  drift: number;
  effectStrength: number;
  outcomeNoise: number;
  interventionCost: number;
  minimumEffect: number;
  repetitions: number;
  seed: number;
};

type Action = "A" | "B";
type WorldCase = { customer: number; pattern: number; time: number; expectedA: number; expectedB: number; loggedAction: Action; reward: number };
type Policy = "baseline" | "local" | "pooled" | "selective" | "limited";

const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const mean = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
const round = (value: number, places = 4) => Number(value.toFixed(places));
const numeric = (value: unknown, fallback: number) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const randomGenerator = (seed: number) => {
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

export function actionPolicyDefaults(rows: ScorebookCaseInput[], family: ActionPolicyFamily = "LEARNING_CAUSALITY"): ActionPolicyExperimentConfig {
  const customers = new Set(rows.map(row => row.customerSegment).filter(Boolean)).size;
  const patterns = new Set(rows.map(row => `${row.decisionClassId ?? row.sourceRecordType ?? ""}|${row.caseType}`)).size;
  const values = rows.map(row => Math.abs(row.outcomeValue ?? 0)).filter(value => value > 0).sort((a, b) => a - b);
  const typicalValue = values.length ? values[Math.floor(values.length / 2)] : 100;
  return {
    family,
    cases: Math.max(300, Math.min(1200, rows.length || 300)),
    customers: Math.max(2, Math.min(12, customers || 5)),
    patterns: Math.max(3, Math.min(30, patterns || 12)),
    sharedStructure: customers > 1 && patterns ? 0.65 : 0.5,
    drift: 0.15,
    effectStrength: 0.2,
    outcomeNoise: 0.12,
    interventionCost: round(typicalValue * 0.02, 2),
    minimumEffect: 0.01,
    repetitions: 8,
    seed: 7301
  };
}

export function normalizeActionPolicyConfig(input: Partial<Record<keyof ActionPolicyExperimentConfig, string | number | null | undefined>>, rows: ScorebookCaseInput[] = []): ActionPolicyExperimentConfig {
  const requestedFamily = String(input.family ?? "LEARNING_CAUSALITY") as ActionPolicyFamily;
  const family = ACTION_POLICY_FAMILIES.includes(requestedFamily) ? requestedFamily : "LEARNING_CAUSALITY";
  const defaults = actionPolicyDefaults(rows, family);
  return {
    family,
    cases: Math.round(clamp(numeric(input.cases, defaults.cases), 120, 1200)),
    customers: Math.round(clamp(numeric(input.customers, defaults.customers), 2, 12)),
    patterns: Math.round(clamp(numeric(input.patterns, defaults.patterns), 3, 30)),
    sharedStructure: clamp(numeric(input.sharedStructure, defaults.sharedStructure)),
    drift: clamp(numeric(input.drift, defaults.drift)),
    effectStrength: clamp(numeric(input.effectStrength, defaults.effectStrength), 0.02, 0.45),
    outcomeNoise: clamp(numeric(input.outcomeNoise, defaults.outcomeNoise), 0, 0.45),
    interventionCost: Math.max(0, numeric(input.interventionCost, defaults.interventionCost)),
    minimumEffect: clamp(numeric(input.minimumEffect, defaults.minimumEffect), 0.001, 0.2),
    repetitions: Math.round(clamp(numeric(input.repetitions, defaults.repetitions), 4, 20)),
    seed: Math.round(clamp(numeric(input.seed, defaults.seed), 1, 2147483647))
  };
}

function generateWorld(config: ActionPolicyExperimentConfig, seed: number) {
  const random = randomGenerator(seed);
  const shared = Array.from({ length: config.patterns }, () => normal(random));
  const local = Array.from({ length: config.customers }, () => Array.from({ length: config.patterns }, () => normal(random)));
  const later = Array.from({ length: config.patterns }, () => normal(random));
  const rows: WorldCase[] = [];
  for (let index = 0; index < config.cases; index++) {
    const customer = index % config.customers;
    const pattern = Math.floor(random() * config.patterns);
    const time = Math.floor(index / config.customers);
    const progress = index / Math.max(1, config.cases - 1);
    const driftWeight = config.drift * clamp((progress - 0.45) / 0.45);
    const sharedSignal = shared[pattern] * (1 - driftWeight) + later[pattern] * driftWeight;
    const signal = config.sharedStructure * sharedSignal + (1 - config.sharedStructure) * local[customer][pattern];
    const expectedA = clamp(0.5 + config.effectStrength * Math.tanh(signal));
    const expectedB = 1 - expectedA;
    const best: Action = expectedA >= expectedB ? "A" : "B";
    const loggedAction: Action = random() < 0.66 ? best : best === "A" ? "B" : "A";
    const expected = loggedAction === "A" ? expectedA : expectedB;
    const noisy = clamp(expected * (1 - config.outcomeNoise) + 0.5 * config.outcomeNoise);
    rows.push({ customer, pattern, time, expectedA, expectedB, loggedAction, reward: random() < noisy ? 1 : 0 });
  }
  return rows;
}

function choose(train: WorldCase[], row: WorldCase, policy: Policy): Action {
  const usable = policy === "limited" ? train.slice(0, Math.max(20, Math.floor(train.length * 0.35))) : train;
  const estimate = (scope: "local" | "pooled", action: Action) => {
    const items = usable.filter(item => item.pattern === row.pattern && item.loggedAction === action && (scope === "pooled" || item.customer === row.customer));
    return (items.reduce((sum, item) => sum + item.reward, 0) + 1) / (items.length + 2);
  };
  const baseA = (usable.filter(item => item.loggedAction === "A").reduce((sum, item) => sum + item.reward, 0) + 1) / (usable.filter(item => item.loggedAction === "A").length + 2);
  const baseB = (usable.filter(item => item.loggedAction === "B").reduce((sum, item) => sum + item.reward, 0) + 1) / (usable.filter(item => item.loggedAction === "B").length + 2);
  if (policy === "baseline") return baseA >= baseB ? "A" : "B";
  const localA = estimate("local", "A"), localB = estimate("local", "B");
  const pooledA = estimate("pooled", "A"), pooledB = estimate("pooled", "B");
  if (policy === "local") return localA >= localB ? "A" : "B";
  if (policy === "pooled" || policy === "limited") return pooledA >= pooledB ? "A" : "B";
  const localCount = usable.filter(item => item.customer === row.customer && item.pattern === row.pattern).length;
  const localWeight = localCount / (localCount + 10);
  return localWeight * localA + (1 - localWeight) * pooledA >= localWeight * localB + (1 - localWeight) * pooledB ? "A" : "B";
}

function evaluate(world: WorldCase[], policy: Policy, config: ActionPolicyExperimentConfig) {
  const boundary = Math.floor(world.length * 0.6);
  const train = world.slice(0, boundary);
  const test = world.slice(boundary);
  const bySegment = Array.from({ length: config.customers }, (_, customer) => {
    const items = test.filter(row => row.customer === customer);
    const values = items.map(row => {
      const action = choose(train, row, policy);
      return { value: action === "A" ? row.expectedA : row.expectedB, correct: action === (row.expectedA >= row.expectedB ? "A" : "B") };
    });
    return { customer, value: mean(values.map(item => item.value)), accuracy: mean(values.map(item => item.correct ? 1 : 0)), count: values.length };
  });
  return { value: mean(bySegment.map(item => item.value)), accuracy: mean(bySegment.map(item => item.accuracy)), bySegment };
}

function interval(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  return { mean: round(mean(values)), low: round(sorted[Math.floor((sorted.length - 1) * 0.1)]), high: round(sorted[Math.ceil((sorted.length - 1) * 0.9)]) };
}

function comparatorFor(family: ActionPolicyFamily): { candidate: Policy; comparison: Policy; label: string } {
  if (family === "CROSS_CUSTOMER_TRANSFER") return { candidate: "selective", comparison: "local", label: "selective pooling versus customer-local learning" };
  if (family === "MARGINAL_INFORMATION_VALUE") return { candidate: "selective", comparison: "limited", label: "full experience versus an early-history learner" };
  return { candidate: "selective", comparison: "baseline", label: "experience-informed policy versus baseline policy" };
}

function generatedRows(world: WorldCase[], config: ActionPolicyExperimentConfig, comparator: ReturnType<typeof comparatorFor>): ScorebookCaseInput[] {
  const boundary = Math.floor(world.length * 0.6);
  const train = world.slice(0, boundary);
  const test = world.slice(boundary);
  const random = randomGenerator(config.seed + 99173);
  const baseDate = Date.UTC(2026, 0, 1);
  return test.map((row, index) => {
    const arm = index % 2 ? comparator.candidate : comparator.comparison;
    const action = choose(train, row, arm);
    const expected = action === "A" ? row.expectedA : row.expectedB;
    const reward = random() < expected ? 1 : 0;
    const decisionAt = new Date(baseDate + index * 86_400_000);
    return {
      externalCaseId: `policy-${config.seed}-${index + 1}`,
      customerSegment: `Simulated customer ${row.customer + 1}`,
      caseType: `Pattern ${row.pattern + 1} · ${arm} arm`,
      context: `Targeted ${config.family} action-policy experiment; ${arm} arm`,
      agentDecision: action,
      agentConfidence: round(Math.max(expected, 1 - expected)),
      humanDecision: null,
      humanOverride: false,
      actionTaken: action,
      outcome: reward ? "Favorable simulated outcome" : "Unfavorable simulated outcome",
      outcomeValue: round((reward ? 1 : -1) * 100 - (arm === comparator.candidate ? config.interventionCost : 0), 2),
      grade: reward ? "CORRECT" : "INCORRECT",
      gradeConfidence: 1,
      decisionAt,
      actionAt: new Date(decisionAt.getTime() + 60_000),
      outcomeAt: new Date(decisionAt.getTime() + 86_400_000),
      isEdgeCase: Math.abs(row.expectedA - row.expectedB) < 0.08,
      isSynthetic: true,
      sourceLabel: `SYNTHETIC ACTION-POLICY EXPERIMENT · ${config.family}`,
      sourceRecordId: `action-policy:${config.seed}:${index + 1}`,
      sourceRecordType: `action_policy_experiment:${arm}`,
      notes: `SIMULATED COUNTERFACTUAL WORLD — NOT OBSERVED COMPANY DATA. Expected reward surface is known only inside the experiment.`
    };
  });
}

export function runActionPolicyExperiment(raw: Partial<Record<keyof ActionPolicyExperimentConfig, string | number | null | undefined>>, sourceRows: ScorebookCaseInput[] = []) {
  const config = normalizeActionPolicyConfig(raw, sourceRows);
  const comparator = comparatorFor(config.family);
  const runs = Array.from({ length: config.repetitions }, (_, repetition) => {
    const world = generateWorld(config, config.seed + repetition * 7919);
    const baseline = evaluate(world, "baseline", config);
    const local = evaluate(world, "local", config);
    const pooled = evaluate(world, "pooled", config);
    const selective = evaluate(world, "selective", config);
    const limited = evaluate(world, "limited", config);
    const arms = { baseline, local, pooled, selective, limited };
    const candidate = arms[comparator.candidate], comparison = arms[comparator.comparison];
    return {
      arms,
      gain: candidate.value - comparison.value,
      accuracyGain: candidate.accuracy - comparison.accuracy,
      segmentGains: candidate.bySegment.map((item, index) => item.value - comparison.bySegment[index].value)
    };
  });
  const gain = interval(runs.map(run => run.gain));
  const accuracyGain = interval(runs.map(run => run.accuracyGain));
  const arm = (name: Policy) => ({ value: interval(runs.map(run => run.arms[name].value)), accuracy: interval(runs.map(run => run.arms[name].accuracy)) });
  const segmentGains = Array.from({ length: config.customers }, (_, customer) => interval(runs.map(run => run.segmentGains[customer])));
  const harmedSegments = segmentGains.filter(item => item.mean < -config.minimumEffect).length;
  const verdict = gain.low >= config.minimumEffect && harmedSegments === 0 ? "SUPPORTS" : gain.high <= 0 || gain.mean < 0 ? "CHALLENGES" : "MIXED";
  const world = generateWorld(config, config.seed);
  const rows = generatedRows(world, config, comparator);
  const economicGain = round(gain.mean * 100 - config.interventionCost, 2);
  const finding = {
    id: "action-policy",
    family: config.family as DebateFamily,
    verdict,
    headline: verdict === "SUPPORTS" ? `${comparator.label} clears the minimum-effect and segment-safety tests.` : verdict === "CHALLENGES" ? `${comparator.label} fails to improve simulated policy value.` : `${comparator.label} is directionally positive but not decision-ready.`,
    detail: `Expected-value gain ${gain.mean.toFixed(3)} (${gain.low.toFixed(3)}–${gain.high.toFixed(3)} across repeated worlds); accuracy gain ${accuracyGain.mean.toFixed(3)}; ${harmedSegments}/${config.customers} segments materially harmed.`,
    implication: config.family === "ECONOMIC_MATERIALITY" ? `Modeled net value per decision is ${economicGain.toFixed(2)} after the configured intervention cost.` : "This tests changed actions and their latent outcomes, not merely prediction of recorded grades.",
    worksWhen: `The ${comparator.candidate} policy gain is at least ${config.minimumEffect.toFixed(3)} and no segment loses more than that threshold.`,
    failsWhen: "The gain is non-positive, the uncertainty range crosses the threshold, or a segment experiences material negative transfer.",
    nextExperiment: "Replace simulator rewards with randomized, logged-propensity, or matched observed outcomes from a new policy trial.",
    metrics: { gain: gain.mean, low: gain.low, high: gain.high, accuracyGain: accuracyGain.mean, harmedSegments, customers: config.customers, minimumEffect: config.minimumEffect, economicGain }
  };
  return {
    version: ACTION_POLICY_EXPERIMENT_VERSION,
    config,
    comparator,
    arms: { baseline: arm("baseline"), local: arm("local"), pooled: arm("pooled"), selective: arm("selective"), limited: arm("limited") },
    gain,
    accuracyGain,
    segmentGains,
    harmedSegments,
    finding,
    findings: [finding],
    generatedRows: rows,
    generatedCaseCount: rows.length,
    assumptions: "Synthetic action-policy experiment calibrated from the selected dataset’s size and structure. The simulator contains known potential outcomes for both actions; saved rows and conclusions remain synthetic and do not become observed company evidence."
  };
}

export type ActionPolicyExperimentResult = ReturnType<typeof runActionPolicyExperiment>;

export function actionPolicyEvidenceSnapshot(result: ActionPolicyExperimentResult) {
  const { generatedRows: _generatedRows, ...snapshot } = result;
  return snapshot;
}
