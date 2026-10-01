import type { DebateFamily, ScorebookCaseInput } from "./compounding-expertise-lab";
import { average as mean, rounded as round, bounded as clamp, seededRandom, repeatRange as interval, bootstrapWorldMeans } from "./experiment-statistics";

export const ACTION_POLICY_EXPERIMENT_VERSION = "action-policy-experiment-2.0";
export const ACTION_POLICY_FAMILIES = ["LEARNING_CAUSALITY", "CROSS_CUSTOMER_TRANSFER", "MARGINAL_INFORMATION_VALUE", "ECONOMIC_MATERIALITY"] as const;
export type ActionPolicyFamily = typeof ACTION_POLICY_FAMILIES[number];
export type ActionPolicyExperimentConfig = {
  family: ActionPolicyFamily;
  scenario: "GENERIC" | "CASAP_DISPUTES";
  cases: number; customers: number; patterns: number; sharedStructure: number; drift: number;
  effectStrength: number; outcomeNoise: number; interventionCost: number; minimumEffect: number;
  repetitions: number; seed: number; valuePerOutcome: number; contestCost: number; reviewCost: number;
};
type ConfigInput = Partial<Record<keyof ActionPolicyExperimentConfig, string | number | null | undefined>>;
type Policy = "baseline" | "local" | "pooled" | "selective" | "limited";
const policies: Policy[] = ["baseline", "local", "pooled", "selective", "limited"];
type WorldCase = {
  customer: number; pattern: number; time: number;
  success: number[]; costs: number[]; expected: number[];
  loggedAction: number; reward: number;
};
const numeric = (value: unknown, fallback: number) => value === null || value === undefined || value === "" || !Number.isFinite(Number(value)) ? fallback : Number(value);
const normal = (random: () => number) => Math.sqrt(-2 * Math.log(Math.max(random(), 1e-12))) * Math.cos(2 * Math.PI * random());
const bestAction = (values: number[]) => values.indexOf(Math.max(...values));
const actionNames = (config: ActionPolicyExperimentConfig) => config.scenario === "CASAP_DISPUTES" ? ["Refund", "Contest", "Manual review"] : ["A", "B"];
const patternName = (pattern: number, config: ActionPolicyExperimentConfig) => config.scenario === "CASAP_DISPUTES"
  ? `${["Unauthorized transaction", "Merchandise not received", "Duplicate charge", "Merchant descriptor confusion"][pattern % 4]} · pattern ${pattern + 1}`
  : `Pattern ${pattern + 1}`;

export function actionPolicyDefaults(rows: ScorebookCaseInput[], family: ActionPolicyFamily = "LEARNING_CAUSALITY"): ActionPolicyExperimentConfig {
  const customers = new Set(rows.map(row => row.customerSegment).filter(Boolean)).size;
  const patterns = new Set(rows.map(row => `${row.decisionClassId ?? row.sourceRecordType ?? ""}|${row.caseType}`)).size;
  const values = rows.map(row => Math.abs(row.outcomeValue ?? 0)).filter(value => value > 0 && Number.isFinite(value)).sort((a, b) => a - b);
  const typicalValue = clamp(values.length ? values[Math.floor(values.length / 2)] : 100, 1, 100000);
  return {
    family, scenario: "GENERIC", cases: Math.max(300, Math.min(1200, rows.length || 300)),
    customers: Math.max(2, Math.min(12, customers || 5)), patterns: Math.max(3, Math.min(30, patterns || 12)),
    sharedStructure: customers > 1 && patterns ? 0.65 : 0.5, drift: 0.15, effectStrength: 0.2,
    outcomeNoise: 0.12, interventionCost: round(typicalValue * 0.02, 2), minimumEffect: 0.01,
    repetitions: 12, seed: 7301, valuePerOutcome: typicalValue,
    contestCost: round(typicalValue * 0.2, 2), reviewCost: round(typicalValue * 0.35, 2)
  };
}

export function normalizeActionPolicyConfig(input: ConfigInput, rows: ScorebookCaseInput[] = []): ActionPolicyExperimentConfig {
  const requestedFamily = String(input.family ?? "LEARNING_CAUSALITY") as ActionPolicyFamily;
  const family = ACTION_POLICY_FAMILIES.includes(requestedFamily) ? requestedFamily : "LEARNING_CAUSALITY";
  const defaults = actionPolicyDefaults(rows, family);
  return {
    family, scenario: input.scenario === "CASAP_DISPUTES" ? "CASAP_DISPUTES" : "GENERIC",
    cases: Math.round(clamp(numeric(input.cases, defaults.cases), 120, 1200)),
    customers: Math.round(clamp(numeric(input.customers, defaults.customers), 2, 12)),
    patterns: Math.round(clamp(numeric(input.patterns, defaults.patterns), 3, 30)),
    sharedStructure: clamp(numeric(input.sharedStructure, defaults.sharedStructure)), drift: clamp(numeric(input.drift, defaults.drift)),
    effectStrength: clamp(numeric(input.effectStrength, defaults.effectStrength), 0.02, 0.45),
    outcomeNoise: clamp(numeric(input.outcomeNoise, defaults.outcomeNoise), 0, 0.45),
    interventionCost: clamp(numeric(input.interventionCost, defaults.interventionCost), 0, 100000),
    minimumEffect: clamp(numeric(input.minimumEffect, defaults.minimumEffect), 0.001, 0.2),
    repetitions: Math.round(clamp(numeric(input.repetitions, defaults.repetitions), 4, 40)),
    seed: Math.round(clamp(numeric(input.seed, defaults.seed), 1, 2147483647)),
    valuePerOutcome: clamp(numeric(input.valuePerOutcome, defaults.valuePerOutcome), 1, 100000),
    contestCost: clamp(numeric(input.contestCost, defaults.contestCost), 0, 100000),
    reviewCost: clamp(numeric(input.reviewCost, defaults.reviewCost), 0, 100000)
  };
}

function generateWorld(config: ActionPolicyExperimentConfig, seed: number) {
  const random = seededRandom(seed);
  const shared = Array.from({ length: config.patterns }, () => normal(random));
  const local = Array.from({ length: config.customers }, () => Array.from({ length: config.patterns }, () => normal(random)));
  const later = Array.from({ length: config.patterns }, () => normal(random));
  return Array.from({ length: config.cases }, (_, index): WorldCase => {
    const customer = index % config.customers, pattern = Math.floor(random() * config.patterns);
    const driftWeight = config.drift * clamp((index / Math.max(1, config.cases - 1) - 0.45) / 0.45);
    const signal = config.sharedStructure * (shared[pattern] * (1 - driftWeight) + later[pattern] * driftWeight) + (1 - config.sharedStructure) * local[customer][pattern];
    const genericSuccess = clamp(0.5 + config.effectStrength * Math.tanh(signal));
    // Casap is a workflow scenario, not a fitted model of the company's policies.
    // Success here means avoided dispute loss. Refund has zero avoided loss.
    const contestSuccess = clamp(0.32 + (pattern % 4) * 0.09 + config.effectStrength * Math.tanh(signal));
    const success = config.scenario === "CASAP_DISPUTES"
      ? [0, contestSuccess, clamp(contestSuccess + 0.1 + 0.2 * (pattern % 3 === 0 ? 1 : 0))]
      : [genericSuccess, 1 - genericSuccess];
    const probabilities = success.map((value, action) => config.scenario === "CASAP_DISPUTES" && action === 0 ? 0 : value * (1 - config.outcomeNoise) + 0.5 * config.outcomeNoise);
    const costs = config.scenario === "CASAP_DISPUTES" ? [0, config.contestCost, config.reviewCost] : [0, 0];
    const offset = config.scenario === "CASAP_DISPUTES" ? config.valuePerOutcome : 0;
    const expected = probabilities.map((probability, action) => (probability * config.valuePerOutcome - offset - costs[action]) / config.valuePerOutcome);
    // Randomized logging avoids a hidden oracle choosing historical actions.
    const loggedAction = Math.floor(random() * probabilities.length);
    const reward = ((random() < probabilities[loggedAction] ? config.valuePerOutcome : 0) - offset - costs[loggedAction]) / config.valuePerOutcome;
    return { customer, pattern, time: index, success: probabilities, costs, expected, loggedAction, reward };
  });
}

function fitPolicy(history: WorldCase[], policy: Policy, count: number) {
  // Same estimator for marginal-information tests; only history volume changes.
  const train = policy === "limited" ? history.slice(0, Math.max(20, Math.floor(history.length * 0.35))) : history;
  const summaries = new Map<string, { count: number; sum: number }>();
  for (const item of train) for (const key of [`all:${item.loggedAction}`, `customer:${item.customer}:${item.loggedAction}`, `pattern:${item.pattern}:${item.loggedAction}`, `local:${item.customer}:${item.pattern}:${item.loggedAction}`]) {
    const prior = summaries.get(key) ?? { count: 0, sum: 0 };
    summaries.set(key, { count: prior.count + 1, sum: prior.sum + item.reward });
  }
  const estimate = (key: string, prior: number, weight = 2) => {
    const item = summaries.get(key);
    return ((item?.sum ?? 0) + weight * prior) / ((item?.count ?? 0) + weight);
  };
  const base = Array.from({ length: count }, (_, action) => estimate(`all:${action}`, 0));
  return (row: WorldCase) => {
    if (policy === "baseline") return bestAction(base);
    const estimates = base.map((prior, action) => {
      const pooled = estimate(`pattern:${row.pattern}:${action}`, prior);
      // Local priors must never borrow outcomes from another customer.
      const localPrior = estimate(`customer:${row.customer}:${action}`, 0);
      const local = estimate(`local:${row.customer}:${row.pattern}:${action}`, localPrior);
      if (policy === "pooled") return pooled;
      if (policy === "local") return local;
      const localCount = summaries.get(`local:${row.customer}:${row.pattern}:${action}`)?.count ?? 0;
      const localWeight = localCount / (localCount + 10);
      return localWeight * local + (1 - localWeight) * pooled;
    });
    return bestAction(estimates);
  };
}

function evaluate(world: WorldCase[], policy: Policy, config: ActionPolicyExperimentConfig, split = 0.6, halfHistory = false, holdoutCustomer = false) {
  const boundary = Math.floor(world.length * split), test = world.slice(boundary);
  // Thin whole customer cycles throughout the window: neither a recency-only
  // test nor every-other-row sampling that drops half the customers.
  const history = world.slice(0, boundary).filter(row => !halfHistory || Math.floor(row.time / config.customers) % 2 === 0);
  const learners = Array.from({ length: config.customers }, (_, customer) => fitPolicy(holdoutCustomer ? history.filter(row => row.customer !== customer) : history, policy, actionNames(config).length));
  const scored = test.map(row => {
    const action = learners[row.customer](row);
    return { customer: row.customer, action, value: row.expected[action], correct: action === bestAction(row.expected) ? 1 : 0 };
  });
  const bySegment = Array.from({ length: config.customers }, (_, customer) => {
    const items = scored.filter(row => row.customer === customer);
    return { customer, value: mean(items.map(row => row.value)), accuracy: mean(items.map(row => row.correct)), count: items.length };
  });
  return {
    value: mean(scored.map(row => row.value)), accuracy: mean(scored.map(row => row.correct)), bySegment,
    actionShare: actionNames(config).map((_, action) => scored.filter(row => row.action === action).length / scored.length)
  };
}

function comparatorFor(family: ActionPolicyFamily): { candidate: Policy; comparison: Policy; label: string } {
  if (family === "CROSS_CUSTOMER_TRANSFER") return { candidate: "selective", comparison: "local", label: "selective pooling versus customer-local learning" };
  if (family === "MARGINAL_INFORMATION_VALUE") return { candidate: "selective", comparison: "limited", label: "full experience versus an early-history learner" };
  return { candidate: "selective", comparison: "baseline", label: "experience-informed policy versus baseline policy" };
}

function generatedRows(world: WorldCase[], config: ActionPolicyExperimentConfig, comparator: ReturnType<typeof comparatorFor>): ScorebookCaseInput[] {
  const boundary = Math.floor(world.length * 0.6), train = world.slice(0, boundary);
  const candidate = fitPolicy(train, comparator.candidate, actionNames(config).length);
  const comparison = fitPolicy(train, comparator.comparison, actionNames(config).length);
  const assignmentRandom = seededRandom(config.seed + 99173), outcomeRandom = seededRandom(config.seed + 117);
  return world.slice(boundary).map((row, index) => {
    const isCandidate = assignmentRandom() < 0.5;
    const arm = isCandidate ? comparator.candidate : comparator.comparison;
    const action = (isCandidate ? candidate : comparison)(row);
    const reward = outcomeRandom() < row.success[action] ? 1 : 0;
    const decisionAt = new Date(Date.UTC(2026, 0, 1) + index * 3600000);
    const operatingCost = row.costs[action] + (isCandidate ? config.interventionCost : 0);
    return {
      externalCaseId: `policy-${config.seed}-${index + 1}`, customerSegment: `Simulated customer ${row.customer + 1}`,
      caseType: patternName(row.pattern, config), context: `${config.family}; ${arm} trial arm`,
      agentDecision: actionNames(config)[action], agentConfidence: null, humanDecision: null, humanOverride: false,
      actionTaken: actionNames(config)[action], outcome: reward ? "Avoided simulated loss" : "Simulated loss incurred",
      outcomeValue: round(reward * config.valuePerOutcome - (config.scenario === "CASAP_DISPUTES" ? config.valuePerOutcome : 0) - operatingCost, 2),
      grade: action === bestAction(row.expected) ? "CORRECT" : "INCORRECT", gradeConfidence: 1,
      decisionAt, actionAt: new Date(decisionAt.getTime() + 60000), outcomeAt: new Date(decisionAt.getTime() + 86400000),
      isEdgeCase: [...row.expected].sort((a, b) => b - a)[0] - [...row.expected].sort((a, b) => b - a)[1] < 0.08,
      isSynthetic: true, sourceLabel: `SYNTHETIC ACTION-POLICY EXPERIMENT · ${config.scenario}`,
      sourceRecordId: `action-policy:${config.seed}:${index + 1}`, sourceRecordType: `action_policy_experiment:${arm}`,
      notes: JSON.stringify({ provenance: "SIMULATED COUNTERFACTUAL WORLD — NOT OBSERVED COMPANY DATA", ceExperiment: {
        schemaVersion: 1, customerId: `sim-customer-${row.customer}`, policyVersion: arm,
        experimentId: `${ACTION_POLICY_EXPERIMENT_VERSION}:${Object.entries(config).map(([key, value]) => `${key}=${value}`).join(";")}`, trialArm: arm,
        assignmentProbability: 0.5, valueUnit: "scenario currency units", operatingCost,
        preDecisionFeatures: { pattern: row.pattern }, gradingMethod: "Simulator optimal expected-net-value action",
        // Audit only. Neither policy fitting nor the observed adapter reads these.
        potentialOutcomes: Object.fromEntries(actionNames(config).map((name, i) => [name, round(row.expected[i] * config.valuePerOutcome, 2)]))
      } })
    };
  });
}

function runSingleActionPolicyExperiment(raw: ConfigInput, sourceRows: ScorebookCaseInput[] = []) {
  const config = normalizeActionPolicyConfig(raw, sourceRows), comparator = comparatorFor(config.family);
  const runs = Array.from({ length: config.repetitions }, (_, repetition) => {
    const world = generateWorld(config, config.seed + repetition * 7919);
    const arms = Object.fromEntries(policies.map(policy => [policy, evaluate(world, policy, config)])) as Record<Policy, ReturnType<typeof evaluate>>;
    const candidate = arms[comparator.candidate], comparison = arms[comparator.comparison];
    const segmentGains = candidate.bySegment.map((item, index) => item.value - comparison.bySegment[index].value);
    const contrast = (split: number, half = false, holdout = false) => evaluate(world, comparator.candidate, config, split, half, holdout).value - evaluate(world, comparator.comparison, config, split, half, holdout).value;
    return {
      arms, gain: candidate.value - comparison.value, accuracyGain: candidate.accuracy - comparison.accuracy, segmentGains,
      sensitivities: [contrast(0.45), contrast(0.75), contrast(0.6, true), 0.5 * Math.min(...segmentGains) + 0.5 * mean(segmentGains), contrast(0.6, false, true)]
    };
  });
  const gain = interval(runs.map(run => run.gain)), accuracyGain = interval(runs.map(run => run.accuracyGain));
  const net = (value: number) => value * config.valuePerOutcome - config.interventionCost;
  const ci = bootstrapWorldMeans(runs.map(run => run.gain), config.seed + 700);
  const netInterval = { mean: round(net(ci.mean), 2), low: round(net(ci.low), 2), high: round(net(ci.high), 2) };
  const segmentGains = Array.from({ length: config.customers }, (_, customer) => ({
    ...interval(runs.map(run => run.segmentGains[customer])),
    ci: bootstrapWorldMeans(runs.map(run => run.segmentGains[customer]), config.seed + customer + 900)
  }));
  const harmedSegments = segmentGains.filter(item => item.mean < -config.minimumEffect).length;
  const uncertainSegments = segmentGains.filter(item => item.mean >= -config.minimumEffect && item.ci.low < -config.minimumEffect).length;
  const sensitivityLabels = ["Earlier cutoff (45% history)", "Later cutoff (75% history)", "Half the training history", "Half of case mix in worst-performing segment", "Unseen customer (leave-one-customer-out)"];
  const sensitivities = sensitivityLabels.map((label, index) => {
    const values = runs.map(run => run.sensitivities[index]);
    const summary = interval(values);
    const clearsThreshold = config.family === "ECONOMIC_MATERIALITY" ? net(summary.mean) >= config.minimumEffect * config.valuePerOutcome : summary.mean >= config.minimumEffect;
    return { label, ...summary, netGain: round(net(summary.mean), 2), clearsThreshold };
  });
  const allStressPass = sensitivities.every(item => item.clearsThreshold);
  const economicPass = config.family !== "ECONOMIC_MATERIALITY" || netInterval.low >= config.minimumEffect * config.valuePerOutcome;
  const verdict = ci.high <= 0 || (config.family === "ECONOMIC_MATERIALITY" && netInterval.high <= 0) ? "CHALLENGES"
    : ci.low >= config.minimumEffect && economicPass && harmedSegments === 0 && uncertainSegments === 0 && allStressPass ? "SUPPORTS" : "MIXED";
  const economicGain = netInterval.mean;
  const finding = {
    id: "action-policy", family: config.family as DebateFamily, verdict,
    headline: verdict === "SUPPORTS" ? `${comparator.label} delivers a robust, material gain.`
      : verdict === "CHALLENGES" ? `${comparator.label} does not improve ${config.family === "ECONOMIC_MATERIALITY" ? "net economics" : "policy value"} in this scenario.`
      : `${comparator.label}: ${gain.mean > 0 ? "positive average gain with identified boundaries" : "no stable positive gain"}.`,
    detail: `Normalized expected-net-value gain ${gain.mean.toFixed(3)}; 95% world-bootstrap CI ${ci.low.toFixed(3)}–${ci.high.toFixed(3)}. ${harmedSegments} materially harmed and ${uncertainSegments} unresolved-safety segments; ${sensitivities.filter(item => item.clearsThreshold).length}/${sensitivities.length} stress checks clear the threshold.`,
    implication: `Net incremental value ${economicGain.toFixed(2)} per decision after ${config.interventionCost.toFixed(2)} incremental intervention cost (${config.valuePerOutcome.toFixed(2)} value scale). ${config.scenario === "CASAP_DISPUTES" ? "Compares refund, contest, and manual-review decisions." : "Evaluates changed actions, not grade prediction."}`,
    worksWhen: `The 95% CI clears ${config.minimumEffect.toFixed(3)}, segment safety is resolved, and the gain survives time, history-size, customer-mix, and unseen-customer tests.`,
    failsWhen: sensitivities.filter(item => !item.clearsThreshold).map(item => item.label).join("; ") || "No tested stress condition failed; untested assumptions remain outside this result.",
    nextExperiment: "Log versioned policies, randomized trial arms, assignment probabilities, pre-decision features, and net outcomes for a new policy trial.",
    metrics: { gain: gain.mean, low: ci.low, high: ci.high, accuracyGain: accuracyGain.mean, harmedSegments, uncertainSegments, customers: config.customers, minimumEffect: config.minimumEffect, economicGain }
  };
  const arm = (name: Policy) => ({
    value: interval(runs.map(run => run.arms[name].value)), accuracy: interval(runs.map(run => run.arms[name].accuracy)),
    economicValue: round(mean(runs.map(run => run.arms[name].value)) * config.valuePerOutcome, 2),
    actionShare: actionNames(config).map((action, index) => ({ action, share: round(mean(runs.map(run => run.arms[name].actionShare[index]))) }))
  });
  const rows = generatedRows(generateWorld(config, config.seed), config, comparator);
  return {
    version: ACTION_POLICY_EXPERIMENT_VERSION, config, comparator,
    arms: { baseline: arm("baseline"), local: arm("local"), pooled: arm("pooled"), selective: arm("selective"), limited: arm("limited") },
    gain, accuracyGain, segmentGains, harmedSegments, finding, findings: [finding], generatedRows: rows, generatedCaseCount: rows.length,
    robustness: { ci, netInterval, sensitivities, uncertainSegments, allStressPass, smallReplicationWarning: config.repetitions < 12,
      interpretation: "Bootstrap intervals describe mean effects across simulated worlds, not company-population uncertainty. Segment intervals are pointwise, not simultaneous. Stress checks diagnose sensitivity; they are not independent corroborating studies." },
    calibration: { sourceCases: sourceRows.length, sourceGroups: new Set(sourceRows.map(row => row.customerSegment).filter(Boolean)).size,
      measured: "Defaults use selected row count, segment labels, case-type count, and median absolute recorded outcome value as a scale proxy.",
      assumed: "Action reward surfaces, cross-customer sharing, drift, noise, costs, and causal effects are configurable assumptions; not estimated company effects. The Casap preset does not claim these are Casap's actual policies or unit economics." },
    assumptions: "60% chronological training / 40% evaluation in each independently seeded world. Randomized historical actions; all arms see the same held-out cases. Policy fitting cannot access latent potential outcomes. Saved trial rows are from the first world only; the summary uses every repeated world."
  };
}

// One Casap run answers all four executable debate families using identical
// worlds and policies. They are related comparisons, not independent evidence.
export function runActionPolicyExperiment(raw: ConfigInput, sourceRows: ScorebookCaseInput[] = []) {
  const primary = runSingleActionPolicyExperiment(raw, sourceRows);
  const related = primary.config.scenario === "CASAP_DISPUTES"
    ? ACTION_POLICY_FAMILIES.map(family => family === primary.config.family ? primary : runSingleActionPolicyExperiment({ ...primary.config, family }, sourceRows))
    : [primary];
  return {
    ...primary,
    findings: related.map(result => result.finding),
    relatedComparisons: related.map(result => ({
      family: result.config.family, comparator: result.comparator.label, verdict: result.finding.verdict,
      gain: result.gain.mean, netGain: result.robustness.netInterval.mean, ci: result.robustness.ci,
      interpretation: result.finding.headline
    }))
  };
}

export type ActionPolicyExperimentResult = ReturnType<typeof runActionPolicyExperiment>;
export function actionPolicyEvidenceSnapshot(result: ActionPolicyExperimentResult) {
  const { generatedRows: _generatedRows, ...snapshot } = result;
  return snapshot;
}
