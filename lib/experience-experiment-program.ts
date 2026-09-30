import type { DebateFamily, ScorebookCaseInput } from "./compounding-expertise-lab";
import { calibrateWorldDefaults, runSyntheticExperimentLab, type ExperimentFinding, type SyntheticWorldConfig } from "./experience-experiment-lab";

export const EXPERIMENT_PROGRAM_VERSION = "experience-experiment-program-1.0";

type AxisPoint = { value: number; primary: number; secondary: number; verdict: string };
export type ExperimentProgramConclusion = ExperimentFinding & {
  thesis: string;
  worksWhen: string;
  failsWhen: string;
  nextExperiment: string;
};

const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const round = (value: number, places = 4) => Number(value.toFixed(places));
const casePattern = (row: ScorebookCaseInput) => `${row.decisionClassId ?? row.sourceRecordType ?? ""}|${row.caseType}`;
const timestamp = (row: ScorebookCaseInput) => {
  const value = row.decisionAt ?? row.actionAt ?? row.outcomeAt;
  const time = value ? new Date(value).getTime() : Number.NaN;
  return Number.isFinite(time) ? time : 0;
};
const resolvedCorrect = (row: ScorebookCaseInput) => row.grade === "CORRECT" ? 1 : row.grade === "PARTIALLY_CORRECT" ? 0.5 : row.grade === "INCORRECT" ? 0 : null;

export function buildAutomatedExperimentPlan(rows: ScorebookCaseInput[]) {
  const defaults = calibrateWorldDefaults(rows);
  const segments = [...new Set(rows.map(row => row.customerSegment).filter(Boolean))];
  const byPattern = new Map<string, Set<string>>();
  for (const row of rows) {
    const segment = row.customerSegment;
    if (!segment) continue;
    const key = casePattern(row);
    if (!byPattern.has(key)) byPattern.set(key, new Set());
    byPattern.get(key)!.add(segment);
  }
  const sharedStructureEstimate = segments.length > 1 && byPattern.size
    ? [...byPattern.values()].reduce((sum, represented) => sum + (represented.size - 1) / (segments.length - 1), 0) / byPattern.size
    : defaults.sharedStructure;
  const chronological = rows.map(row => ({ row, time: timestamp(row), grade: resolvedCorrect(row) })).filter(item => item.time && item.grade !== null).sort((a, b) => a.time - b.time);
  const quartile = Math.max(1, Math.floor(chronological.length / 4));
  const early = chronological.slice(0, quartile);
  const late = chronological.slice(-quartile);
  const rate = (items: typeof chronological) => items.length ? items.reduce((sum, item) => sum + item.grade!, 0) / items.length : 0;
  const observedShift = early.length && late.length ? Math.abs(rate(late) - rate(early)) : 0;
  const calibrated: SyntheticWorldConfig = {
    ...defaults,
    sharedStructure: round(clamp(sharedStructureEstimate, 0.05, 0.95), 2),
    drift: round(clamp(Math.max(0.05, observedShift * 2), 0, 0.9), 2)
  };
  const sharedPatterns = [...byPattern.values()].filter(value => value.size > 1).length;
  return {
    calibrated,
    profile: {
      cases: rows.length,
      customers: segments.length,
      patterns: byPattern.size,
      sharedPatterns,
      sharedStructureEstimate: round(sharedStructureEstimate),
      observedGradeShift: round(observedShift),
      missingFeedback: defaults.missingFeedback
    },
    tests: [
      { family: "CROSS_CUSTOMER_TRANSFER" as DebateFamily, title: "Pooling boundary", question: "At what level of shared structure does selective cross-customer learning outperform customer-only history?", axis: "Shared structure", points: [0, 0.25, 0.5, 0.75, 1] },
      { family: "MARGINAL_INFORMATION_VALUE" as DebateFamily, title: "Staleness boundary", question: "When does recent experience become more valuable than the full accumulated history?", axis: "Environmental drift", points: [0, 0.25, 0.5, 0.75, 1] },
      { family: "REBUILDABILITY_COMPRESSION" as DebateFamily, title: "Reconstruction curve", question: "How much calibration data does a restricted challenger need to close the incumbent gap?", axis: "Challenger calibration cases", points: [0, 25, 50, 100, 250, 500] }
    ],
    rationale: `${rows.length} selected cases imply ${segments.length || "unknown"} customer groups, ${sharedPatterns}/${byPattern.size || 0} recurring patterns shared across groups, and an early-to-late resolved-grade shift of ${Math.round(observedShift * 100)} percentage points.`
  };
}

function sweepConfig(config: SyntheticWorldConfig): SyntheticWorldConfig {
  return { ...config, casesPerCustomer: Math.max(config.casesPerCustomer, Math.min(240, config.patterns * 8)), repetitions: 3 };
}

function firstValue(points: AxisPoint[], predicate: (point: AxisPoint) => boolean) {
  return points.find(predicate)?.value ?? null;
}

export function runAutomatedExperimentProgram(rows: ScorebookCaseInput[]) {
  const plan = buildAutomatedExperimentPlan(rows);
  const config = sweepConfig(plan.calibrated);
  const baseline = runSyntheticExperimentLab(config);
  const sharedStructure: AxisPoint[] = [0, 0.25, 0.5, 0.75, 1].map(value => {
    const result = runSyntheticExperimentLab({ ...config, sharedStructure: value, seed: config.seed + 1000 });
    const selectiveGain = result.pooling.selective.mean - result.pooling.local.mean;
    const pooledGain = result.pooling.pooled.mean - result.pooling.local.mean;
    return { value, primary: round(selectiveGain), secondary: round(pooledGain), verdict: result.findings.find(item => item.id === "pooling")!.verdict };
  });
  const drift: AxisPoint[] = [0, 0.25, 0.5, 0.75, 1].map(value => {
    const result = runSyntheticExperimentLab({ ...config, drift: value, seed: config.seed + 2000 });
    const recentGain = result.selection.recent.mean - result.selection.full.mean;
    const balancedGain = result.selection.balanced.mean - result.selection.full.mean;
    return { value, primary: round(recentGain), secondary: round(balancedGain), verdict: recentGain > 0.01 ? "RECENT WINS" : recentGain < -0.01 ? "FULL WINS" : "SIMILAR" };
  });
  const calibration: AxisPoint[] = [0, 25, 50, 100, 250, 500].map(value => {
    const result = runSyntheticExperimentLab({ ...config, challengerCalibration: value, seed: config.seed + 4000 });
    return { value, primary: round(result.reconstruction.gap.mean), secondary: round(result.reconstruction.challenger.mean), verdict: result.findings.find(item => item.id === "reconstruction")!.verdict };
  });

  const poolingThreshold = firstValue(sharedStructure, point => point.primary > 0.015);
  const harmfulPoolingMax = [...sharedStructure].reverse().find(point => point.secondary < -0.01)?.value ?? null;
  const driftThreshold = firstValue(drift, point => Math.max(point.primary, point.secondary) > 0.01);
  const reconstructionThreshold = firstValue(calibration, point => point.primary < 0.005);
  const initialGap = calibration[0].primary;
  const finalGap = calibration.at(-1)!.primary;
  const selectedPoolingPosition = poolingThreshold === null ? "unresolved" : plan.calibrated.sharedStructure >= poolingThreshold ? "above" : "below";
  const findings: ExperimentProgramConclusion[] = [
    {
      id: "pooling", family: "CROSS_CUSTOMER_TRANSFER", verdict: poolingThreshold === null ? "MIXED" : selectedPoolingPosition === "above" ? "SUPPORTS" : "CHALLENGES",
      thesis: "Cross-customer experience creates decision value only when shared structure is high enough and pooling preserves local variation.",
      headline: poolingThreshold === null ? "Selective pooling did not clear the materiality threshold in the tested range." : `The selected dataset’s ${Math.round(plan.calibrated.sharedStructure * 100)}% pattern-overlap proxy is ${selectedPoolingPosition} the approximately ${Math.round(poolingThreshold * 100)}% pooling threshold.`,
      detail: `Selective-minus-local value ranges from ${sharedStructure[0].primary.toFixed(3)} to ${sharedStructure.at(-1)!.primary.toFixed(3)} across the tested boundary; material benefit begins around ${poolingThreshold === null ? "an unobserved level" : `${Math.round(poolingThreshold * 100)}% shared structure`}.`,
      implication: "Treat cross-customer learning as a conditional mechanism with an estimable transfer boundary, not as an automatic consequence of having more customers.",
      worksWhen: poolingThreshold === null ? "No tested shared-structure level produced a material selective-pooling gain." : `Shared decision structure is at or above roughly ${Math.round(poolingThreshold * 100)}% under the displayed assumptions.`,
      failsWhen: harmfulPoolingMax === null ? "No material unconditional-pooling harm appeared at the tested grid points." : `Unconditional pooling can destroy value through approximately ${Math.round(harmfulPoolingMax * 100)}% shared structure.`,
      nextExperiment: "Estimate shared structure and segment-level harm on newly held-out customers using the selected dataset’s actual features and actions.",
      metrics: { poolingThreshold: poolingThreshold ?? "not reached", harmfulPoolingMax: harmfulPoolingMax ?? "not observed", calibratedSharedStructure: plan.calibrated.sharedStructure }
    },
    {
      id: "selection", family: "MARGINAL_INFORMATION_VALUE", verdict: driftThreshold === null || plan.calibrated.drift < driftThreshold ? "SUPPORTS" : "MIXED",
      thesis: "Accumulated experience remains valuable only while its relevance exceeds its staleness cost.",
      headline: driftThreshold === null ? "Full history remained competitive throughout the tested drift range." : `Selected experience overtakes full history at approximately ${Math.round(driftThreshold * 100)}% drift in this experiment grid.`,
      detail: `The best selected-history gain versus full history moves from ${Math.max(drift[0].primary, drift[0].secondary).toFixed(3)} at zero drift to ${Math.max(drift.at(-1)!.primary, drift.at(-1)!.secondary).toFixed(3)} at maximum tested drift.`,
      implication: "The learning system needs explicit recency and selection logic; accumulating every case is not itself the advantage.",
      worksWhen: driftThreshold === null ? "Full accumulated history remains useful across the tested range." : `Environmental drift stays below roughly ${Math.round(driftThreshold * 100)}%, after which recency or pattern balancing becomes more valuable.`,
      failsWhen: driftThreshold === null ? "A staleness boundary was not reached in the tested range." : `High drift makes older experience actively dilute the current signal beyond the estimated boundary.`,
      nextExperiment: "Backtest rolling time windows on the selected dataset and compare stable versus rapidly changing decision classes.",
      metrics: { driftThreshold: driftThreshold ?? "not reached", calibratedDrift: plan.calibrated.drift, selectedHistoryGainAtMaxDrift: round(Math.max(drift.at(-1)!.primary, drift.at(-1)!.secondary)) }
    },
    {
      id: "reconstruction", family: "REBUILDABILITY_COMPRESSION", verdict: initialGap > 0.02 && finalGap >= 0.005 ? "SUPPORTS" : finalGap < 0.005 ? "CHALLENGES" : "MIXED",
      thesis: "Experience supports durable advantage only to the extent that a capable challenger cannot cheaply reconstruct its policy value.",
      headline: reconstructionThreshold === null ? `The challenger retains a ${finalGap.toFixed(3)} value gap after 500 calibration cases.` : `The challenger closes the material gap by approximately ${reconstructionThreshold} calibration cases.`,
      detail: `The incumbent gap changes from ${initialGap.toFixed(3)} with no calibration to ${finalGap.toFixed(3)} at 500 cases.`,
      implication: reconstructionThreshold === null ? "The simulated experience advantage resists the tested calibration budget, but public priors and richer challenger strategies remain untested." : "The mechanism appears compressible at the estimated budget; experience volume alone is unlikely to create durable Power.",
      worksWhen: reconstructionThreshold === null ? "The challenger remains below the incumbent throughout the tested budget." : `Calibration access remains below roughly ${reconstructionThreshold} cases.`,
      failsWhen: reconstructionThreshold === null ? "The failure boundary exceeds the tested 500-case budget." : `A challenger receives approximately ${reconstructionThreshold} or more representative calibration cases.`,
      nextExperiment: "Run a restricted-access challenger on actual policy artifacts, public data, synthetic cases, and a fixed labeled calibration budget.",
      metrics: { reconstructionThreshold: reconstructionThreshold ?? "not reached", initialGap, finalGap }
    }
  ];
  return {
    version: EXPERIMENT_PROGRAM_VERSION,
    plan,
    baseline,
    sweeps: { sharedStructure, drift, calibration },
    findings,
    generatedCases: baseline.generatedCases + [...sharedStructure, ...drift, ...calibration].length * config.customers * config.casesPerCustomer * config.repetitions,
    assumptions: "Automated sensitivity results are conditional simulations calibrated from the selected dataset’s size, group structure, missing feedback, and descriptive time shift. They identify mechanism boundaries; they do not convert simulated outcomes into observed company evidence."
  };
}

export type AutomatedExperimentProgramResult = ReturnType<typeof runAutomatedExperimentProgram>;
