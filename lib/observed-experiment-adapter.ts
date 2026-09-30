import type { DebateFamily, ScorebookCaseInput } from "./compounding-expertise-lab";
import { analyzeExperience } from "./experience-analysis";

export const OBSERVED_EXPERIMENT_ADAPTER_VERSION = "observed-experiment-adapter-1.0";

export type ObservedExperimentVerdict = "SUPPORTS" | "CHALLENGES" | "MIXED" | "BLOCKED";

export type ObservedExperiment = {
  id: string;
  family: DebateFamily;
  title: string;
  status: "TESTED" | "MEASURED" | "BLOCKED";
  verdict: ObservedExperimentVerdict;
  headline: string;
  detail: string;
  limitation: string;
  nextExperiment: string;
  sample: number;
  metrics: Record<string, number | string | null>;
};

const finite = (value: number | null | undefined): value is number => typeof value === "number" && Number.isFinite(value);
const pct = (value: number) => `${Math.round(value * 100)}%`;

export function runObservedDataExperimentAdapter(rows: ScorebookCaseInput[]) {
  const report = analyzeExperience(rows);
  const linkedRate = report.profile.total ? report.profile.linked / report.profile.total : 0;
  const captureVerdict: ObservedExperimentVerdict = !rows.length ? "BLOCKED" : linkedRate >= 0.75 ? "SUPPORTS" : linkedRate < 0.5 ? "CHALLENGES" : "MIXED";
  const predictiveGain = report.scores.find(item => item.model === "base-rate")?.brier === undefined || report.selected === null
    ? null
    : report.scores.find(item => item.model === "base-rate")!.brier - (report.scores.find(item => item.model === report.selected)?.brier ?? NaN);
  const predictiveVerdict: ObservedExperimentVerdict = !report.ready || !finite(predictiveGain)
    ? "BLOCKED"
    : predictiveGain > 0.005 ? "SUPPORTS" : "CHALLENGES";
  const transfer = report.transfer;
  const transferVerdict: ObservedExperimentVerdict = !transfer.enough || !finite(transfer.delta)
    ? "BLOCKED"
    : transfer.delta > 0.005 ? "SUPPORTS" : "CHALLENGES";
  const negativeTransferSegments = transfer.bySegment.filter(item => finite(item.delta) && item.delta < -0.005).length;
  const firstCurve = report.curve[0]?.brier ?? null;
  const finalCurve = report.curve.at(-1)?.brier ?? null;
  const curveGain = finite(firstCurve) && finite(finalCurve) ? firstCurve - finalCurve : null;
  const curveReverses = report.findings.find(item => item.id === "learning-curve")?.metrics.directionReversal === "YES";
  const curveVerdict: ObservedExperimentVerdict = !report.ready || !finite(curveGain)
    ? "BLOCKED"
    : curveGain > 0.005 && !curveReverses ? "SUPPORTS" : "CHALLENGES";
  const fullBrier = finalCurve;
  const nearFull = finite(fullBrier) ? report.curve.find(item => item.brier <= fullBrier + 0.005) : undefined;
  const compressionVerdict: ObservedExperimentVerdict = !report.ready || !nearFull
    ? "BLOCKED"
    : nearFull.fraction <= 0.5 ? "CHALLENGES" : nearFull.fraction >= 1 ? "SUPPORTS" : "MIXED";
  const valueRows = report.profile.economicValueRows;

  const experiments: ObservedExperiment[] = [
    {
      id: "capture-linkage", family: "EXPERIENCE_CAPTURE", title: "Feedback-loop linkage", status: rows.length ? "MEASURED" : "BLOCKED", verdict: captureVerdict,
      headline: rows.length ? `${pct(linkedRate)} of selected cases link decision, action, outcome, and resolved grade.` : "No selected case rows are available.",
      detail: captureVerdict === "SUPPORTS" ? "The selected dataset is sufficiently complete to analyze the operating feedback loop." : "Missing links limit what can be learned from the selected dataset.",
      limitation: "Coverage establishes that experience is captured; it does not independently validate grading quality or prove that the system learns from it.",
      nextExperiment: "Independently regrade a stratified sample and audit missing links.", sample: rows.length,
      metrics: { linked: report.profile.linked, total: report.profile.total, linkedRate }
    },
    {
      id: "chronological-holdout", family: "LEARNING_CAUSALITY", title: "Chronological held-out prediction", status: report.ready ? "TESTED" : "BLOCKED", verdict: predictiveVerdict,
      headline: report.ready ? report.selected === "base-rate" ? "Validation selected the base-rate model; richer historical models produced no validated out-of-sample gain." : `${report.selected} achieved ${finite(predictiveGain) ? predictiveGain.toFixed(3) : "unavailable"} Brier improvement versus the base-rate model on later cases.` : report.blockedReason,
      detail: predictiveVerdict === "BLOCKED" ? "The selected dataset does not meet the chronological train/validation/test requirements." : predictiveVerdict === "SUPPORTS" ? "Historical case structure contains information that improves prediction on later cases." : "The selected cases do not clear the pre-set 0.005 Brier materiality threshold versus the simple base-rate benchmark.",
      limitation: "This is a time-safe predictive test, not proof that deployed learning caused better actions or economic outcomes.",
      nextExperiment: "Run a versioned or randomized action-policy comparison on a new batch.", sample: report.ready ? report.protocol.finalTest : 0,
      metrics: { selectedModel: report.selected, predictiveGain, finalTest: report.protocol.finalTest }
    },
    {
      id: "segment-transfer", family: "CROSS_CUSTOMER_TRANSFER", title: "Segment pooling holdout", status: transfer.enough ? "TESTED" : "BLOCKED", verdict: transferVerdict,
      headline: `${transfer.finding}${finite(transfer.delta) ? ` Local minus pooled Brier: ${transfer.delta.toFixed(3)}.` : ""}`,
      detail: `${transfer.sharedPatterns}/${transfer.patternCount} patterns cross segments; ${negativeTransferSegments}/${transfer.bySegment.length} evaluated segments show material negative transfer. ${transferVerdict === "CHALLENGES" && transfer.enough ? "The positive pooled-learning sub-thesis fails the pre-set 0.005 Brier materiality threshold in this dataset." : ""}`.trim(),
      limitation: transfer.scope,
      nextExperiment: "Repeat with verified customer identities and compare pooled versus local action policies on held-out customers.", sample: transfer.scored,
      metrics: { sharedPatterns: transfer.sharedPatterns, patternCount: transfer.patternCount, scored: transfer.scored, localMinusPooledBrier: transfer.delta, negativeTransferSegments }
    },
    {
      id: "cohort-value", family: "MARGINAL_INFORMATION_VALUE", title: "Successive-cohort value", status: report.ready ? "TESTED" : "BLOCKED", verdict: curveVerdict,
      headline: finite(curveGain) ? `Expanding from the earliest cohort to full history changed Brier by ${curveGain.toFixed(3)}; ${curveReverses ? "the curve reverses direction." : "the curve is directionally consistent."}` : report.blockedReason,
      detail: curveVerdict === "BLOCKED" ? "The selected dataset does not meet the fixed-window cohort-test requirements." : curveVerdict === "SUPPORTS" ? "Additional cohorts improve the fixed estimator on the fixed future evaluation set." : "The positive marginal-value sub-thesis fails: the gain is below 0.005 Brier or reverses as history grows.",
      limitation: "The result is estimator- and time-window-specific and does not by itself establish causal policy improvement.",
      nextExperiment: "Repeat on a fresh time window and isolate new patterns from changing case mix.", sample: report.ready ? report.protocol.finalTest : 0,
      metrics: { firstBrier: firstCurve, fullHistoryBrier: finalCurve, gain: curveGain, directionReversal: curveReverses ? "YES" : "NO" }
    },
    {
      id: "history-compression", family: "REBUILDABILITY_COMPRESSION", title: "History compression proxy", status: report.ready ? "TESTED" : "BLOCKED", verdict: compressionVerdict,
      headline: nearFull ? `${Math.round(nearFull.fraction * 100)}% of development history reaches within 0.005 Brier of the full-history estimator.` : report.blockedReason,
      detail: compressionVerdict === "BLOCKED" ? "The selected dataset does not support a stable history-ablation comparison." : compressionVerdict === "CHALLENGES" ? "A relatively small historical subset reproduces nearly all measured predictive performance, which weakens a raw-history durability claim." : compressionVerdict === "SUPPORTS" ? "Only the full observed history reaches the full-history benchmark, a directional sign that aggressive compression loses value." : "The proxy does not clearly distinguish compressible from cumulative experience.",
      limitation: "This is an internal history-ablation proxy, not a competitor-access, public-data, or calibration-budget challenger test.",
      nextExperiment: "Run a budgeted challenger using only public features, compressed rules, synthetic cases, and limited calibration.", sample: report.ready ? report.protocol.finalTest : 0,
      metrics: { nearFullFraction: nearFull?.fraction ?? null, nearFullCases: nearFull?.trainingCases ?? null, fullHistoryBrier: fullBrier }
    },
    {
      id: "economic-association", family: "ECONOMIC_MATERIALITY", title: "Economic outcome coverage", status: valueRows ? "MEASURED" : "BLOCKED", verdict: valueRows ? "MIXED" : "BLOCKED",
      headline: `${valueRows}/${rows.length} selected cases include finite economic outcome values.`,
      detail: valueRows ? "The dataset can describe stakes and grade-associated outcomes, but cannot yet identify incremental value caused by a better policy." : "Economic materiality cannot be quantified from the selected rows.",
      limitation: "Units must be consistent, and observed association is not causal incremental value.",
      nextExperiment: "Define value units and compare matched or randomized policy outcomes net of operating cost.", sample: valueRows,
      metrics: { valueRows, total: rows.length }
    },
    {
      id: "rights-boundary", family: "LEARNING_RIGHTS", title: "Learning-rights boundary", status: "BLOCKED", verdict: "BLOCKED",
      headline: "Case rows cannot establish contractual retention, training, or cross-customer reuse rights.", detail: "This question correctly routes to contracts, governance, and operational-access evidence.",
      limitation: "Inferring legal permission from technical availability would be invalid.", nextExperiment: "Review contracts and data governance against the intended learning uses.", sample: 0, metrics: {}
    },
    {
      id: "alternative-power-boundary", family: "ALTERNATIVE_POWER", title: "Alternative-Power boundary", status: "BLOCKED", verdict: "BLOCKED",
      headline: "Selected cases alone cannot establish switching costs, scale economies, brand, or counter-positioning.", detail: "Case data may quantify product performance, while durable barriers require customer, cost, workflow, and competitive evidence.",
      limitation: "Do not infer a Helmer Power solely from case volume or predictive accuracy.", nextExperiment: "Join workflow adoption, replacement, pricing, cost, and competitor evidence to the analysis.", sample: 0, metrics: {}
    }
  ];

  return {
    adapterVersion: OBSERVED_EXPERIMENT_ADAPTER_VERSION,
    datasetProfile: { rows: rows.length, eligible: report.profile.eligible, segments: report.profile.groups, linked: report.profile.linked, economicValueRows: valueRows },
    mapping: ["decision/action/outcome/grade linkage", "chronological holdout", "segment pooling", "successive cohorts", "history ablation", "economic-value coverage"],
    experiments,
    byFamily: Object.fromEntries(experiments.map(experiment => [experiment.family, experiment])) as Record<DebateFamily, ObservedExperiment>
  };
}

export type ObservedExperimentAdapterResult = ReturnType<typeof runObservedDataExperimentAdapter>;
