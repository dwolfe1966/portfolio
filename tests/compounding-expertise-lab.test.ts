import assert from "node:assert/strict";
import test from "node:test";
import {
  COMPOUNDING_EXAMPLES,
  COMPETITIVE_INPUTS,
  COMPANY_MODEL_GATES,
  CASAP_PUBLIC_EVIDENCE_ANALYSIS,
  ENDOGENOUS_INPUTS,
  EXOGENOUS_INPUTS,
  GUIDED_PROVENANCE_LABELS,
  INITIAL_DEBATES,
  LAB_WORKFLOW_STEPS,
  SCOREBOOK_CASE_FIELD_CLASSIFICATION,
  DEFAULT_SCENARIOS,
  apparentPowerLocations,
  buildCaseDetailSequence,
  calculateScorebookMetrics,
  caseSetForExample,
  caseSetDerivedProvenanceLabel,
  casesForCaseSet,
  canonicalExampleForCompany,
  classifyEvidenceForDebate,
  compoundingAnalysisAccessWhere,
  defaultAssessments,
  applyExperienceSlice,
  deriveActionDistribution,
  deriveCaseFeedbackLatencyDays,
  deriveCaseInspectionReasons,
  deriveCaseResolvedStatus,
  actionKeyFromDecision,
  decisionClassKeyForCase,
  deriveDecisionSystemMetrics,
  deriveExperienceCanCannot,
  deriveExperienceCoverage,
  deriveExperienceInsights,
  deriveExperienceSnapshot,
  deriveFeedbackLatencyDistribution,
  deriveGradeDistribution,
  deriveCategoricalInformation,
  deriveInformationStructure,
  deriveMarginalNovelty,
  deriveOutcomeInformation,
  derivePatternRepetition,
  deriveInterestingSlices,
  deriveInvestmentSynthesis,
  deriveCanonicalDebateProfile,
  deriveDebateAssessment,
  deriveDebateCandidates,
  deriveDebateEvidenceDashboard,
  deriveDebateEvidenceRegistry,
  deriveHighestValueDiligenceQueue,
  derivePowerMap,
  applyStressTestTemplate,
  classifyStressTestResult,
  detectCrossover,
  deriveStressTestDrivers,
  deriveStressTestPowerImplication,
  deriveScenarioGrounding,
  exampleById,
  explainSimulatorComparison,
  getStressTestTemplate,
  normalizedModelForExample,
  publicEvidenceDefaultAssessments,
  publicEvidenceAnalysisById,
  SIMULATOR_PARAMETER_DEFINITIONS,
  STRESS_TEST_TEMPLATES,
  normalizeAssessment,
  summarizeEvidenceCoverage,
  scorebookDerivedSimulatorValues,
  scorebookRowsAreSynthetic,
  shannonEntropy,
  simulateComparison,
  simulateScenario,
  sourceRouteIsSafe,
  summarizeConclusion,
  summarizeStressTestPrimaryChange,
  summarizeTopStressTestDrivers,
  stressTestRunHref,
  hasExplicitStressTestRunContext,
  mutualInformation,
  validateAssessment,
  validateScenario,
  validateProbability,
  visibleStressTestChangedParameters,
  type DimensionAssessmentInput,
  type ScorebookCaseInput
} from "@/lib/compounding-expertise-lab";
import { buildPricingCaseSetDescriptor, normalizeCECase, PRICING_CE_CASE_SET_ADAPTER } from "@/lib/compounding-expertise-case-adapters";
import { buildDebateGenerationPrompt, generateCompoundingExpertiseDebates } from "@/lib/compounding-expertise-ai";

const baseScenario = {
  name: "Base",
  startingCases: 100,
  casesPerMonth: 30,
  feedbackDelayDays: 30,
  transferability: 0.5,
  informationValue: 0.5,
  learningEfficiency: 0.5,
  stalenessRate: 0.01,
  baseCapability: 2
};

test("compounding simulator is deterministic", () => {
  const first = simulateScenario(baseScenario, 6);
  const second = simulateScenario(baseScenario, 6);
  assert.deepEqual(first.points, second.points);
  assert.equal(first.points[0].effectiveExperience, 100);
});

test("staleness decreases effective accumulated experience when no new cases mature", () => {
  const result = simulateScenario({
    ...baseScenario,
    casesPerMonth: 0,
    feedbackDelayDays: 0,
    stalenessRate: 0.1
  }, 2);

  assert.equal(result.points[0].effectiveExperience, 100);
  assert.ok(result.points[1].effectiveExperience < result.points[0].effectiveExperience);
  assert.ok(result.points[2].effectiveExperience < result.points[1].effectiveExperience);
});

test("higher transferability increases effective expertise all else equal", () => {
  const low = simulateScenario({ ...baseScenario, transferability: 0.2 }, 1);
  const high = simulateScenario({ ...baseScenario, transferability: 0.9 }, 1);

  assert.ok(high.points[0].expertise > low.points[0].expertise);
});

test("longer feedback delay slows new effective experience accumulation", () => {
  const fast = simulateScenario({ ...baseScenario, startingCases: 0, feedbackDelayDays: 0, stalenessRate: 0 }, 2);
  const slow = simulateScenario({ ...baseScenario, startingCases: 0, feedbackDelayDays: 90, stalenessRate: 0 }, 2);

  assert.ok(fast.points[1].effectiveExperience > slow.points[1].effectiveExperience);
  assert.ok(fast.points[2].effectiveExperience > slow.points[2].effectiveExperience);
});

test("crossover detection finds the approximate month when leader changes", () => {
  const incumbent = simulateScenario({
    ...baseScenario,
    name: "Incumbent A",
    startingCases: 10000,
    casesPerMonth: 0,
    transferability: 0.7,
    informationValue: 0.8,
    learningEfficiency: 0.6,
    stalenessRate: 0.1,
    baseCapability: 1.5
  }, 24);
  const challenger = simulateScenario({
    ...baseScenario,
    name: "Challenger B",
    startingCases: 0,
    casesPerMonth: 2000,
    feedbackDelayDays: 0,
    transferability: 0.95,
    informationValue: 0.8,
    learningEfficiency: 0.95,
    stalenessRate: 0,
    baseCapability: 1.5
  }, 24);

  const crossover = detectCrossover(incumbent, challenger);
  assert.ok(crossover);
  assert.equal(crossover?.to, "Challenger B");
  assert.ok(crossover!.month > 0);
});

test("score and probability validation rejects out-of-range inputs", () => {
  assert.equal(validateProbability(101).ok, false);
  assert.equal(validateProbability(50).ok, true);

  const invalid: DimensionAssessmentInput = {
    framework: "SUN",
    dimension: "feedback_speed",
    score: 7,
    confidence: "MEDIUM",
    rationale: "",
    evidenceStatus: "ASSUMED"
  };
  assert.equal(validateAssessment(invalid).ok, false);
  assert.equal(validateAssessment({ ...invalid, score: 5 }).ok, true);
});

test("AI-generated assessments cannot silently become observed or sourced evidence", () => {
  const normalized = normalizeAssessment({
    framework: "WOLFE",
    dimension: "causal_quality",
    score: 4,
    confidence: "HIGH",
    rationale: "Suggested by model.",
    evidenceStatus: "OBSERVED",
    source: "AI"
  });

  assert.equal(normalized.evidenceStatus, "ASSUMED");
  assert.equal(normalized.source, "AI");
});

test("debate generation degrades gracefully when OpenAI is unavailable", async () => {
  const original = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  try {
    const result = await generateCompoundingExpertiseDebates({
      companyName: "TestCo",
      productDescription: "Decision workflow",
      targetCustomer: "Operators",
      workflow: "Case to decision to grade",
      decisionDescription: "Approve or deny",
      thesis: "Maybe scorebook learning compounds."
    });

    assert.equal(result.ok, false);
    assert.ok(result.debates.length >= 2);
    assert.match(result.reason, /OPENAI_API_KEY/);
  } finally {
    if (original) process.env.OPENAI_API_KEY = original;
  }
});

test("V0.3.2 workflow uses guided user-facing labels with experience before debates", () => {
  assert.deepEqual(LAB_WORKFLOW_STEPS.map((step) => step.label), [
    "Overview",
    "Company Model",
    "Experience",
    "Key Debates",
    "Power",
    "Stress Test",
    "Conclusion"
  ]);
  assert.ok(
    LAB_WORKFLOW_STEPS.findIndex((step) => step.label === "Experience") <
      LAB_WORKFLOW_STEPS.findIndex((step) => step.label === "Key Debates")
  );
});

test("Company Model IA exposes four ordered gates for guided review", () => {
  assert.deepEqual(COMPANY_MODEL_GATES.map((gate) => gate.label), [
    "Decision Opportunity",
    "Feedback",
    "Learning Loop",
    "Defensibility"
  ]);
  assert.deepEqual(COMPANY_MODEL_GATES.map((gate) => gate.sequence), ["1", "2", "3", "4"]);
});

test("explicit analysis access helper pins selected analysis and preserves account scope", () => {
  assert.deepEqual(compoundingAnalysisAccessWhere("acct-1", "analysis-1"), {
    id: "analysis-1",
    OR: [{ accountUserId: "acct-1" }, { accountUserId: null }]
  });
  assert.deepEqual(compoundingAnalysisAccessWhere(null, "analysis-1"), {
    id: "analysis-1",
    accountUserId: null
  });
});

test("structured inputs distinguish exogenous opportunity from endogenous capability", () => {
  assert.ok(EXOGENOUS_INPUTS.length >= 7);
  assert.ok(ENDOGENOUS_INPUTS.length >= 10);
  assert.ok(COMPETITIVE_INPUTS.length >= 8);
  assert.equal(EXOGENOUS_INPUTS.every((input) => input.epistemicKind === "EXOGENOUS_ASSUMPTION"), true);
  assert.equal(ENDOGENOUS_INPUTS.every((input) => input.epistemicKind === "ENDOGENOUS_ASSUMPTION"), true);
  assert.ok(EXOGENOUS_INPUTS.some((input) => input.key === "caseFrequency"));
  assert.ok(ENDOGENOUS_INPUTS.some((input) => input.key === "controlsAction"));
  assert.ok(COMPETITIVE_INPUTS.some((input) => input.key === "rebuildability"));
});

test("guided provenance taxonomy separates synthetic fixture derivation from company evidence", () => {
  assert.ok(GUIDED_PROVENANCE_LABELS.includes("DERIVED — SYNTHETIC FIXTURE"));
  assert.ok(GUIDED_PROVENANCE_LABELS.includes("OBSERVED — COMPANY DATA"));
  assert.equal(caseSetDerivedProvenanceLabel({ hasRows: true, rowsAreSynthetic: true }), "DERIVED — SYNTHETIC FIXTURE");
  assert.equal(caseSetDerivedProvenanceLabel({ hasRows: true, rowsAreSynthetic: false }), "DERIVED — COMPANY DATA");
  assert.equal(caseSetDerivedProvenanceLabel({ hasRows: false, rowsAreSynthetic: false }), "UNKNOWN / DILIGENCE REQUIRED");
});

const scorebookRows: ScorebookCaseInput[] = [
  {
    externalCaseId: "case-1",
    customerSegment: "enterprise",
    caseType: "dispute",
    context: "Resolved correct row",
    agentDecision: "approve",
    agentConfidence: 0.8,
    humanDecision: "approve",
    humanOverride: false,
    actionTaken: "approve",
    outcome: "won",
    outcomeValue: 100,
    grade: "CORRECT",
    gradeConfidence: 0.9,
    decisionAt: new Date("2026-01-01T00:00:00Z"),
    outcomeAt: new Date("2026-01-04T00:00:00Z"),
    isEdgeCase: false,
    isSynthetic: true,
    sourceLabel: "SYNTHETIC ILLUSTRATIVE DATA - test fixture",
    notes: null
  },
  {
    externalCaseId: "case-2",
    customerSegment: "smb",
    caseType: "dispute",
    context: "Override row",
    agentDecision: "deny",
    agentConfidence: 0.72,
    humanDecision: "approve",
    humanOverride: true,
    actionTaken: "approve",
    outcome: "retained",
    outcomeValue: 200,
    grade: "PARTIALLY_CORRECT",
    gradeConfidence: 0.7,
    decisionAt: new Date("2026-01-02T00:00:00Z"),
    outcomeAt: new Date("2026-01-08T00:00:00Z"),
    isEdgeCase: true,
    isSynthetic: true,
    sourceLabel: "SYNTHETIC ILLUSTRATIVE DATA - test fixture",
    notes: "observational only"
  },
  {
    externalCaseId: "case-3",
    customerSegment: "smb",
    caseType: "appeal",
    context: "Unresolved row",
    agentDecision: "request evidence",
    agentConfidence: 0.52,
    humanDecision: null,
    humanOverride: false,
    actionTaken: null,
    outcome: null,
    outcomeValue: null,
    grade: "UNRESOLVED",
    gradeConfidence: null,
    decisionAt: new Date("2026-01-03T00:00:00Z"),
    outcomeAt: null,
    isEdgeCase: false,
    isSynthetic: true,
    sourceLabel: "SYNTHETIC ILLUSTRATIVE DATA - test fixture",
    notes: null
  }
];

test("case metric calculations preserve missing and unresolved outcomes", () => {
  const metrics = calculateScorebookMetrics(scorebookRows);

  assert.equal(metrics.totalCases, 3);
  assert.equal(metrics.resolvedCases, 2);
  assert.equal(metrics.gradedCases, 2);
  assert.equal(metrics.outcomeCompletionRate, 0.6667);
  assert.equal(metrics.gradeCoverage, 0.6667);
  assert.equal(metrics.agentCorrectnessRate, 1);
});

const experienceRows: ScorebookCaseInput[] = [
  { ...scorebookRows[0], id: "a-1", caseSetId: "set-a", externalCaseId: "a-1", actionTaken: "approve", outcomeValue: 100, grade: "CORRECT", decisionAt: new Date("2026-02-01T00:00:00Z"), outcomeAt: new Date("2026-02-04T00:00:00Z") },
  { ...scorebookRows[1], id: "a-2", caseSetId: "set-a", externalCaseId: "a-2", actionTaken: "approve", outcomeValue: 900, grade: "INCORRECT", decisionAt: new Date("2026-02-02T00:00:00Z"), outcomeAt: new Date("2026-02-20T00:00:00Z") },
  { ...scorebookRows[2], id: "a-3", caseSetId: "set-a", externalCaseId: "a-3", actionTaken: null, outcomeValue: null, grade: "UNRESOLVED", decisionAt: new Date("2026-02-03T00:00:00Z"), outcomeAt: null },
  { ...scorebookRows[0], id: "a-4", caseSetId: "set-a", externalCaseId: "a-4", actionTaken: "escalate", outcomeValue: 5000, grade: "PARTIALLY_CORRECT", isEdgeCase: true, humanOverride: false, humanDecision: "escalate", decisionAt: new Date("2026-02-04T00:00:00Z"), outcomeAt: new Date("2026-03-20T00:00:00Z") },
  { ...scorebookRows[0], id: "b-1", caseSetId: "set-b", externalCaseId: "b-1", actionTaken: "deny", outcomeValue: 50, grade: "CORRECT", isSynthetic: false, sourceLabel: "company row" }
];

test("Experience Snapshot and diagnostics use only active CaseSet rows", () => {
  const active = casesForCaseSet(experienceRows, "set-a");
  const snapshot = deriveExperienceSnapshot(active);
  const gradeDistribution = deriveGradeDistribution(active);
  const actionDistribution = deriveActionDistribution(active);

  assert.equal(snapshot.totalCases, 4);
  assert.equal(snapshot.outcomesObserved, 3);
  assert.equal(snapshot.gradedCases, 3);
  assert.equal(snapshot.provenance, "DERIVED — SYNTHETIC FIXTURE");
  assert.equal(gradeDistribution.find((item) => item.label === "INCORRECT")?.count, 1);
  assert.equal(gradeDistribution.find((item) => item.label === "UNRESOLVED")?.count, 1);
  assert.equal(actionDistribution[0].label, "approve");
  assert.equal(actionDistribution[0].count, 2);
});

test("Experience feedback latency buckets are deterministic and include unavailable rows", () => {
  const buckets = deriveFeedbackLatencyDistribution(casesForCaseSet(experienceRows, "set-a"));
  assert.equal(buckets.find((bucket) => bucket.key === "0_7")?.count, 1);
  assert.equal(buckets.find((bucket) => bucket.key === "15_30")?.count, 1);
  assert.equal(buckets.find((bucket) => bucket.key === "31_PLUS")?.count, 1);
  assert.equal(buckets.find((bucket) => bucket.key === "UNAVAILABLE")?.count, 1);
});

test("Experience interesting slices identify override, error, edge, unresolved, longest-feedback, and high-impact cases", () => {
  const active = casesForCaseSet(experienceRows, "set-a");
  const slices = deriveInterestingSlices(active);
  assert.equal(slices.find((slice) => slice.key === "human-overrides")?.count, 1);
  assert.equal(slices.find((slice) => slice.key === "agent-errors")?.count, 1);
  assert.equal(slices.find((slice) => slice.key === "edge-cases")?.count, 2);
  assert.equal(slices.find((slice) => slice.key === "unresolved")?.count, 1);
  assert.equal(applyExperienceSlice(active, "longest-feedback")[0].externalCaseId, "a-4");
  assert.equal(applyExperienceSlice(active, "highest-impact")[0].externalCaseId, "a-4");
});

test("Experience insights are deterministic and avoid unsupported causal claims", () => {
  const insights = deriveExperienceInsights(casesForCaseSet(experienceRows, "set-a"));
  const text = insights.map((insight) => `${insight.statement} ${insight.support}`).join(" ");
  assert.match(text, /Outcome representation|Most cases are graded|Human intervention|synthetic fixture/i);
  assert.doesNotMatch(text, /causes future performance|durable Power|substantial expertise/i);
});

test("Experience quality dimensions remain separate and preserve synthetic provenance", () => {
  const active = casesForCaseSet(experienceRows, "set-a");
  const quality = deriveExperienceCoverage(active, deriveExperienceSnapshot(active).provenance);
  assert.deepEqual(quality.map((item) => item.label), [
    "Outcome completeness",
    "Grade coverage",
    "Feedback timing",
    "Decision/action coverage",
    "Provenance quality"
  ]);
  assert.equal(quality.every((item) => item.provenance === "DERIVED — SYNTHETIC FIXTURE"), true);
});

test("Experience can/cannot-tell-us distinction preserves synthetic fixture caveat", () => {
  const result = deriveExperienceCanCannot(casesForCaseSet(experienceRows, "set-a"));
  assert.ok(result.canTellUs.some((item) => item.includes("grade coverage")));
  assert.ok(result.cannotTellUs.some((item) => item.includes("future performance improvement")));
  assert.ok(result.cannotTellUs.some((item) => item.includes("not company evidence")));
});

function infoRow(overrides: Partial<ScorebookCaseInput> = {}): ScorebookCaseInput {
  return {
    externalCaseId: overrides.externalCaseId ?? "info-row",
    caseSetId: overrides.caseSetId ?? "info-set",
    decisionClassId: overrides.decisionClassId ?? "resolve-dispute",
    customerSegment: overrides.customerSegment ?? "segment-a",
    caseType: overrides.caseType ?? "standard",
    context: overrides.context ?? "Information Structure test row",
    agentDecision: overrides.agentDecision ?? "approve",
    agentConfidence: overrides.agentConfidence ?? 0.8,
    humanDecision: overrides.humanDecision ?? overrides.agentDecision ?? "approve",
    humanOverride: overrides.humanOverride ?? false,
    actionTaken: overrides.actionTaken ?? "approve",
    outcome: overrides.outcome ?? "resolved",
    outcomeValue: overrides.outcomeValue ?? 100,
    grade: overrides.grade ?? "CORRECT",
    gradeConfidence: overrides.gradeConfidence ?? 0.9,
    decisionAt: overrides.decisionAt ?? new Date("2026-01-01T00:00:00Z"),
    actionAt: overrides.actionAt ?? new Date("2026-01-02T00:00:00Z"),
    outcomeAt: overrides.outcomeAt ?? new Date("2026-01-05T00:00:00Z"),
    isEdgeCase: overrides.isEdgeCase ?? false,
    isSynthetic: overrides.isSynthetic ?? false,
    sourceLabel: overrides.sourceLabel ?? "company cases",
    notes: overrides.notes ?? null
  };
}

function chronologicalRows(patterns: string[]) {
  return patterns.map((pattern, index) => infoRow({
    externalCaseId: `chrono-${index}`,
    caseType: pattern,
    customerSegment: `segment-${index % 2}`,
    actionTaken: index % 2 ? "deny" : "approve",
    grade: index % 3 === 0 ? "INCORRECT" : "CORRECT",
    decisionAt: new Date(Date.UTC(2026, 0, index + 1)),
    actionAt: new Date(Date.UTC(2026, 0, index + 1, 12)),
    outcomeAt: new Date(Date.UTC(2026, 0, index + 3))
  }));
}

test("Information Structure Shannon entropy handles canonical distributions", () => {
  assert.equal(shannonEntropy([]), 0);
  assert.equal(shannonEntropy([10]), 0);
  assert.equal(shannonEntropy([5, 5]), 1);
  assert.equal(shannonEntropy([5, 5, 5, 5]), 2);
  assert.ok(Math.abs(shannonEntropy([9, 3]) - 0.8113) < 0.0002);

  const rows = [
    ...Array.from({ length: 5 }, (_, index) => infoRow({ externalCaseId: `a-${index}`, caseType: "a" })),
    ...Array.from({ length: 5 }, (_, index) => infoRow({ externalCaseId: `b-${index}`, caseType: "b" }))
  ];
  const diagnostic = deriveCategoricalInformation(rows, "caseType");
  assert.equal(diagnostic.entropyBits, 1);
  assert.equal(diagnostic.normalizedEntropy, 1);
  assert.equal(diagnostic.status, "INSUFFICIENT DATA");
});

test("Information Structure mutual information handles independence, association, and missing values", () => {
  const independent = mutualInformation([
    { x: "a", y: "0" },
    { x: "a", y: "1" },
    { x: "b", y: "0" },
    { x: "b", y: "1" }
  ]);
  assert.ok(independent.mutualInformationBits < 0.0001);

  const perfect = mutualInformation([
    { x: "a", y: "0" },
    { x: "a", y: "0" },
    { x: "b", y: "1" },
    { x: "b", y: "1" }
  ]);
  assert.equal(perfect.mutualInformationBits, perfect.outcomeEntropyBits);
  assert.equal(perfect.normalizedInformation, 1);

  const partial = mutualInformation([
    { x: "a", y: "0" },
    { x: "a", y: "0" },
    { x: "a", y: "1" },
    { x: "b", y: "1" },
    { x: "b", y: "1" },
    { x: null, y: "1" }
  ]);
  assert.ok(partial.mutualInformationBits > 0);
  assert.equal(partial.usableCount, 5);

  const zeroOutcomeEntropy = mutualInformation([{ x: "a", y: "0" }, { x: "b", y: "0" }]);
  assert.equal(zeroOutcomeEntropy.outcomeEntropyBits, 0);
  assert.equal(zeroOutcomeEntropy.normalizedInformation, null);
});

test("Information Structure pattern repetition is deterministic and active-CaseSet isolated", () => {
  const allSame = Array.from({ length: 24 }, (_, index) => infoRow({ externalCaseId: `same-${index}` }));
  const same = derivePatternRepetition(allSame);
  assert.equal(same.uniquePatternCount, 1);
  assert.equal(same.repeatedPatternCases, 24);
  assert.equal(same.status, "HIGH REPETITION");
  assert.match(same.interpretation, /structural repetition/i);

  const allUnique = Array.from({ length: 24 }, (_, index) => infoRow({
    externalCaseId: `unique-${index}`,
    caseType: `case-type-${index}`,
    actionTaken: `action-${index}`,
    grade: index % 2 ? "CORRECT" : "INCORRECT"
  }));
  const unique = derivePatternRepetition(allUnique);
  assert.equal(unique.uniquePatternCount, 24);
  assert.equal(unique.repeatedPatternCases, 0);
  assert.equal(unique.status, "LOW REPETITION");

  const mixedSets = [
    ...Array.from({ length: 10 }, (_, index) => infoRow({ externalCaseId: `a-${index}`, caseSetId: "a", caseType: "repeat" })),
    ...Array.from({ length: 10 }, (_, index) => infoRow({ externalCaseId: `b-${index}`, caseSetId: "b", caseType: `unique-${index}` }))
  ];
  const activeStructure = deriveInformationStructure(casesForCaseSet(mixedSets, "a"));
  assert.equal(activeStructure.patternRepetition.uniquePatternCount, 1);
});

test("Information Structure marginal novelty uses chronological cohorts without future leakage", () => {
  const persistent = chronologicalRows(Array.from({ length: 50 }, (_, index) => `pattern-${index}`));
  const persistentNovelty = deriveMarginalNovelty(persistent);
  assert.equal(persistentNovelty.status, "NOVELTY PERSISTING");
  assert.equal(persistentNovelty.cohorts[0].newPatternSignatures, 10);
  assert.equal(persistentNovelty.cohorts.at(-1)!.newPatternSignatures, 10);

  const saturatedPatterns = [
    ...Array.from({ length: 10 }, (_, index) => `early-${index}`),
    ...Array.from({ length: 40 }, (_, index) => `early-${index % 10}`)
  ];
  const saturation = deriveMarginalNovelty(chronologicalRows(saturatedPatterns));
  assert.equal(saturation.status, "APPARENT SATURATION");
  assert.equal(saturation.cohorts[0].newPatternSignatures, 10);
  assert.equal(saturation.cohorts.at(-1)!.newPatternSignatures, 0);

  const renewalPatterns = [
    ...Array.from({ length: 30 }, (_, index) => `base-${index % 10}`),
    ...Array.from({ length: 20 }, (_, index) => `renewal-${index}`)
  ];
  const renewal = deriveMarginalNovelty(chronologicalRows(renewalPatterns));
  assert.ok(renewal.cohorts.at(-1)!.newPatternSignatures > renewal.cohorts[1].newPatternSignatures);

  const noChronology = persistent.map((row) => ({ ...row, decisionAt: null, actionAt: null, outcomeAt: null }));
  const missing = deriveMarginalNovelty(noChronology);
  assert.equal(missing.status, "UNAVAILABLE");
  assert.match(missing.interpretation, /chronology/i);
});

test("Information Structure Experience integration preserves provenance and no-CaseSet unavailability", () => {
  const empty = deriveInformationStructure([]);
  assert.equal(empty.available, false);
  assert.equal(empty.summary.diversity, "UNAVAILABLE");
  assert.match(empty.unavailableReason ?? "", /No production CaseSet/i);
  assert.ok(empty.evidenceNeeded.some((item) => /case-level/i.test(item)));
  assert.equal(empty.outcomeInformation.status, "UNAVAILABLE");

  const synthetic = deriveInformationStructure(exampleById("casap").cases);
  assert.equal(synthetic.available, true);
  assert.equal(synthetic.provenance, "DERIVED — SYNTHETIC FIXTURE");
  assert.equal(synthetic.sampleState, "SMALL SAMPLE / DESCRIPTIVE ONLY");
  assert.ok(synthetic.ceInterpretation.some((item) => /not proof|not the same|not model learning|not establish/i.test(item)));

  const missingFields = Array.from({ length: 30 }, (_, index) => infoRow({
    externalCaseId: `missing-${index}`,
    caseType: index < 10 ? "known" : "",
    customerSegment: index < 10 ? "segment" : ""
  }));
  const limited = deriveCategoricalInformation(missingFields, "caseType");
  assert.equal(limited.limitedCoverage, true);
  assert.equal(limited.status, "INSUFFICIENT DATA");
});

test("Information Structure outcome information remains descriptive and non-causal", () => {
  const rows = Array.from({ length: 60 }, (_, index) => infoRow({
    externalCaseId: `mi-${index}`,
    actionTaken: index % 2 ? "deny" : "approve",
    grade: index % 2 ? "INCORRECT" : "CORRECT"
  }));
  const outcome = deriveOutcomeInformation(rows);
  assert.equal(outcome.status, "MEASURABLE");
  assert.ok(outcome.topAssociations.some((item) => item.xField === "actionTaken" && (item.normalizedInformation ?? 0) > 0.9));
  assert.match(outcome.interpretation, /association, not causality/i);
});

test("case inspection reasons flag deterministic row attributes without information-value labels", () => {
  const reasons = deriveCaseInspectionReasons(experienceRows[1]);
  assert.ok(reasons.includes("Human override"));
  assert.ok(reasons.includes("Agent incorrect"));
  assert.ok(reasons.includes("Economic value recorded"));
  assert.equal(reasons.some((reason) => reason.toLowerCase().includes("information")), false);
});

const debateAnalysis = {
  companyName: "Casap archetype review",
  productDescription: "Dispute resolution workflow",
  targetCustomer: "Financial operations teams",
  workflow: "intake -> evidence -> decision -> outcome",
  decisionDescription: "Resolve disputes",
  thesis: "Scorebook experience may compound.",
  learnsAcrossCustomers: "Yes",
  contractualLearningRights: "Unknown",
  updatesModelPolicyRegularly: "Unknown",
  deploysImprovementsQuickly: "Unknown",
  rebuildability: "Hard",
  foundationModelDependence: "High"
};

test("debate candidate derivation creates load-bearing evidence-to-belief debates", () => {
  const candidates = deriveDebateCandidates({
    analysis: debateAnalysis,
    debates: INITIAL_DEBATES,
    rows: casesForCaseSet(experienceRows, "set-a"),
    analysisId: "analysis-1",
    caseSetId: "set-a"
  });

  assert.ok(candidates.length >= 3);
  assert.ok(candidates.some((candidate) => candidate.family === "CROSS_CUSTOMER_TRANSFER"));
  assert.ok(candidates.every((candidate) => !("recommendedProbability" in candidate)));
  assert.ok(candidates.every((candidate) => candidate.ifTrue && candidate.ifFalse && candidate.bestNextTest));
});

test("canonical profiles produce meaningfully different debate sets", () => {
  const casap = deriveCanonicalDebateProfile({ ...debateAnalysis, companyName: "Casap archetype review" });
  const listen = deriveCanonicalDebateProfile({ ...debateAnalysis, companyName: "Listen Labs", productCategory: "AI-assisted research" });
  const maybern = deriveCanonicalDebateProfile({ ...debateAnalysis, companyName: "Maybern", productCategory: "Deterministic finance infrastructure" });

  assert.notDeepEqual(casap, listen);
  assert.notDeepEqual(casap, maybern);
  assert.ok(maybern.includes("ALTERNATIVE_POWER"));
});

test("synthetic evidence cannot establish company propositions and preserves links/provenance", () => {
  const assessment = deriveDebateAssessment({
    analysis: debateAnalysis,
    debates: INITIAL_DEBATES,
    rows: casesForCaseSet(experienceRows, "set-a"),
    analysisId: "analysis-1",
    caseSetId: "set-a"
  }, "EXPERIENCE_CAPTURE");

  assert.equal(assessment.assessment, "UNPROVEN");
  assert.equal(assessment.confidence, "LOW");
  assert.equal(assessment.evidenceFor[0].provenance, "DERIVED — SYNTHETIC FIXTURE");
  assert.match(assessment.evidenceFor[0].href ?? "", /analysisId=analysis-1/);
  assert.match(assessment.evidenceFor[0].href ?? "", /caseSetId=set-a/);
});

test("grade coverage cannot establish learning causality", () => {
  const assessment = deriveDebateAssessment({
    analysis: debateAnalysis,
    debates: INITIAL_DEBATES,
    rows: casesForCaseSet(experienceRows, "set-a")
  }, "LEARNING_CAUSALITY");

  assert.equal(assessment.assessment, "UNPROVEN");
  assert.match(assessment.assessmentReason, /Grade coverage is descriptive/i);
  assert.ok(assessment.missingEvidence.some((item) => item.source.includes("UPDATE")));
});

test("multiple customer segments cannot establish transfer", () => {
  const assessment = deriveDebateAssessment({
    analysis: debateAnalysis,
    debates: INITIAL_DEBATES,
    rows: casesForCaseSet(experienceRows, "set-a")
  }, "CROSS_CUSTOMER_TRANSFER");

  assert.equal(assessment.assessment, "UNPROVEN");
  assert.match(assessment.assessmentReason, /not cross-customer performance transfer/i);
  assert.ok(assessment.evidenceFor.some((item) => item.direction === "CONTEXT-DESCRIPTIVE"));
  assert.equal(assessment.evidenceFor.some((item) => item.direction === "SUPPORTS"), false);
});

test("V0.4.1 debate evidence registry separates context from support and strips missing links", () => {
  const registry = deriveDebateEvidenceRegistry({
    analysis: debateAnalysis,
    debates: INITIAL_DEBATES,
    rows: casesForCaseSet(experienceRows, "set-a"),
    analysisId: "analysis-1",
    caseSetId: "set-a"
  });
  const transfer = registry.CROSS_CUSTOMER_TRANSFER;

  assert.equal(transfer.assessment, "UNPROVEN");
  assert.equal(transfer.evidenceFor.length, 0);
  assert.ok(transfer.contextEvidence.some((item) => item.value.includes("customer segments represented")));
  assert.ok(transfer.contextEvidence.every((item) => item.direction === "CONTEXT-DESCRIPTIVE"));
  assert.ok(transfer.missingEvidence.every((item) => item.direction === "MISSING"));
  assert.ok(transfer.missingEvidence.every((item) => item.href === undefined));
  assert.match(transfer.evidenceCoverage, /context/);
  assert.match(transfer.tenSecondSummary, /UNPROVEN/);
});

test("debate evidence dashboards use active CaseSet rows only", () => {
  const dashboard = deriveDebateEvidenceDashboard({
    analysis: debateAnalysis,
    debates: INITIAL_DEBATES,
    rows: casesForCaseSet(experienceRows, "set-a"),
    analysisId: "analysis-1",
    caseSetId: "set-a"
  }, "EXPERIENCE_CAPTURE");
  const casesMetric = dashboard.sections.flatMap((section) => section.metrics ?? []).find((metric) => metric.label === "Cases");

  assert.equal(casesMetric?.value, "4");
  assert.match(casesMetric?.href ?? "", /analysisId=analysis-1/);
  assert.match(casesMetric?.href ?? "", /caseSetId=set-a/);
});

test("cross-customer transfer dashboard shows segment context without inferring transfer", () => {
  const dashboard = deriveDebateEvidenceDashboard({
    analysis: debateAnalysis,
    debates: INITIAL_DEBATES,
    rows: casesForCaseSet(experienceRows, "set-a"),
    analysisId: "analysis-1",
    caseSetId: "set-a"
  }, "CROSS_CUSTOMER_TRANSFER");

  assert.match(dashboard.summary, /context, not proof|Segment diversity is context/i);
  assert.ok(dashboard.sections.some((section) => section.note?.includes("not establish")));
  assert.ok(dashboard.sections.flatMap((section) => section.metrics ?? []).some((metric) => metric.label === "Pooled-vs-local transfer experiment" && metric.unavailable));
  assert.ok(dashboard.sections.flatMap((section) => section.bars ?? []).length > 0);
});

test("learning causality dashboard does not infer causality from grades alone", () => {
  const dashboard = deriveDebateEvidenceDashboard({
    analysis: debateAnalysis,
    debates: INITIAL_DEBATES,
    rows: casesForCaseSet(experienceRows, "set-a")
  }, "LEARNING_CAUSALITY");

  assert.match(dashboard.summary, /not proof/i);
  assert.ok(dashboard.sections.flatMap((section) => section.metrics ?? []).some((metric) => metric.label === "Before/after or treatment comparison" && metric.unavailable));
});

test("rebuildability dashboard explicitly shows missing challenger test", () => {
  const dashboard = deriveDebateEvidenceDashboard({
    analysis: debateAnalysis,
    debates: INITIAL_DEBATES,
    rows: casesForCaseSet(experienceRows, "set-a"),
    competitiveArchitecture: { competitorRelearningDifficulty: "Hard", foundationModelSubstitutionRisk: "High" }
  }, "REBUILDABILITY_COMPRESSION");

  assert.ok(dashboard.sections.flatMap((section) => section.metrics ?? []).some((metric) => metric.label === "Challenger benchmark" && metric.unavailable));
  assert.match(dashboard.sections.map((section) => section.note ?? "").join(" "), /not been empirically tested/i);
});

test("marginal information dashboard consumes Information Structure without resolving the debate", () => {
  const dashboard = deriveDebateEvidenceDashboard({
    analysis: debateAnalysis,
    debates: INITIAL_DEBATES,
    rows: casesForCaseSet(experienceRows, "set-a")
  }, "MARGINAL_INFORMATION_VALUE");
  const assessment = deriveDebateAssessment({
    analysis: debateAnalysis,
    debates: INITIAL_DEBATES,
    rows: casesForCaseSet(experienceRows, "set-a")
  }, "MARGINAL_INFORMATION_VALUE");

  assert.match(dashboard.summary, /Information Structure diagnostics are descriptive evidence/i);
  assert.ok(dashboard.sections.flatMap((section) => section.metrics ?? []).some((metric) => /entropy|Pattern repetition|Structural novelty|Outcome information/i.test(metric.label)));
  assert.equal(assessment.assessment, "UNPROVEN");
  assert.doesNotMatch(dashboard.summary, /supported|Power/i);
});

test("external debate evidence preserves source provenance and direction", () => {
  const dashboard = deriveDebateEvidenceDashboard({
    analysis: debateAnalysis,
    debates: INITIAL_DEBATES,
    rows: casesForCaseSet(experienceRows, "set-a"),
    evidenceRecords: [{
      entityType: "experiment",
      fieldKey: "cross_customer_transfer",
      evidenceType: "EXPERIMENT",
      epistemicStatus: "SOURCED",
      valueSnapshot: "Measured pooled cross-customer holdout improved accuracy.",
      sourceLabel: "Holdout experiment",
      sourceUrl: "https://example.com/holdout",
      confidence: "HIGH",
      derivationMethod: "Experiment result"
    }]
  }, "CROSS_CUSTOMER_TRANSFER");

  assert.equal(dashboard.externalEvidence.length, 1);
  assert.equal(dashboard.externalEvidence[0].source, "Holdout experiment");
  assert.equal(dashboard.externalEvidence[0].direction, "SUPPORTS");
  assert.equal(dashboard.externalEvidence[0].provenance, "SOURCED — EXTERNAL EVIDENCE");
  assert.equal(dashboard.externalEvidence[0].href, "https://example.com/holdout");
});

test("high case volume cannot establish marginal information value", () => {
  const rows = Array.from({ length: 60 }, (_, index) => ({
    ...scorebookRows[0],
    externalCaseId: `volume-${index}`,
    caseSetId: "volume-set"
  }));
  const assessment = deriveDebateAssessment({ analysis: debateAnalysis, debates: INITIAL_DEBATES, rows }, "MARGINAL_INFORMATION_VALUE");

  assert.equal(assessment.assessment, "UNPROVEN");
  assert.match(assessment.assessmentReason, /high volume alone is insufficient/i);
});

test("absence of challenger benchmark leaves rebuildability unproven", () => {
  const assessment = deriveDebateAssessment({
    analysis: debateAnalysis,
    debates: INITIAL_DEBATES,
    rows: casesForCaseSet(experienceRows, "set-a"),
    competitiveArchitecture: { competitorRelearningDifficulty: "Hard", foundationModelSubstitutionRisk: "High" }
  }, "REBUILDABILITY_COMPRESSION");

  assert.equal(assessment.assessment, "UNPROVEN");
  assert.equal(assessment.confidence, "LOW");
  assert.ok(assessment.missingEvidence.some((item) => item.source.includes("challenger")));
});

test("investor belief remains separate from CE assessment", () => {
  const candidates = deriveDebateCandidates({
    analysis: debateAnalysis,
    debates: [{
      ...INITIAL_DEBATES[1],
      question: "Does experience transfer across customers?",
      probability: 70
    }],
    rows: casesForCaseSet(experienceRows, "set-a")
  });
  const transfer = candidates.find((candidate) => candidate.family === "CROSS_CUSTOMER_TRANSFER");

  assert.equal(transfer?.assessment, "UNPROVEN");
  assert.equal(transfer?.investorBelief, 70);
  assert.match(transfer?.investorBeliefDivergence ?? "", /more positive than the currently available evidence/i);
  assert.equal(transfer?.evidenceFor.some((item) => item.value.includes("70")), false);
  assert.equal("recommendedProbability" in (transfer ?? {}), false);
});

test("highest-value diligence queue prioritizes unresolved high-impact debates", () => {
  const candidates = deriveDebateCandidates({
    analysis: debateAnalysis,
    debates: INITIAL_DEBATES,
    rows: casesForCaseSet(experienceRows, "set-a")
  });
  const queue = deriveHighestValueDiligenceQueue(candidates, 3);

  assert.equal(queue.length, 3);
  assert.ok(queue.every((item) => item.test.length > 0));
  assert.ok(queue.every((item) => item.href.startsWith("#debate-")));
});

test("Power Map keeps multiple customers as context, not Network Economies proof", () => {
  const powerMap = derivePowerMap({
    analysis: debateAnalysis,
    debates: INITIAL_DEBATES,
    rows: casesForCaseSet(experienceRows, "set-a")
  });
  const network = powerMap.powers.find((power) => power.key === "network_economies");

  assert.equal(network?.thesisStrength, "UNPROVEN");
  assert.equal(network?.evidenceStrength, "NONE");
  assert.ok(network?.evidenceFor.some((item) => item.direction === "CONTEXT-DESCRIPTIVE"));
  assert.equal(powerMap.hasOverallMoatScore, false);
});

test("Conclusion investment synthesis consumes Debate Engine and Power Map without numeric moat score", () => {
  const example = exampleById("casap");
  assert.ok(example);
  const normalized = normalizedModelForExample(example);
  const rows = example.cases;
  const debates = deriveDebateCandidates({
    analysis: example.analysis,
    debates: example.debates,
    rows,
    analysisId: "analysis-1",
    caseSetId: "case-set-1",
    learningArchitecture: normalized.learningArchitecture,
    competitiveArchitecture: normalized.competitiveArchitecture,
    evidenceRecords: []
  });
  const powerMap = derivePowerMap({
    analysis: example.analysis,
    debates: example.debates,
    rows,
    analysisId: "analysis-1",
    caseSetId: "case-set-1",
    learningArchitecture: normalized.learningArchitecture,
    competitiveArchitecture: normalized.competitiveArchitecture,
    evidenceRecords: [],
    assessments: []
  });
  const synthesis = deriveInvestmentSynthesis({
    analysis: example.analysis,
    experience: deriveExperienceSnapshot(rows),
    debates,
    powerMap,
    stressTest: null
  });

  assert.equal(powerMap.hasOverallMoatScore, false);
  assert.match(synthesis.currentThesis, /SYNTHETIC EVIDENCE/);
  assert.equal(synthesis.evidenceQuality, "LOW");
  assert.notEqual(synthesis.primaryPowerHypothesis, "no demonstrated Power yet");
  assert.match(synthesis.memo, /No stress test has been run/i);
  assert.doesNotMatch(synthesis.memo, /overall .*score|moat score/i);
});

test("Conclusion synthesis keeps investor belief and scenario output separate from CE evidence", () => {
  const example = exampleById("casap");
  assert.ok(example);
  const normalized = normalizedModelForExample(example);
  const rows = example.cases;
  const debates = deriveDebateCandidates({
    analysis: example.analysis,
    debates: [{ ...example.debates[0], probability: 75 }],
    rows,
    analysisId: "analysis-1",
    caseSetId: "case-set-1",
    learningArchitecture: normalized.learningArchitecture,
    competitiveArchitecture: normalized.competitiveArchitecture,
    evidenceRecords: []
  });
  const powerMap = derivePowerMap({
    analysis: example.analysis,
    debates: [{ ...example.debates[0], probability: 75 }],
    rows,
    analysisId: "analysis-1",
    caseSetId: "case-set-1",
    learningArchitecture: normalized.learningArchitecture,
    competitiveArchitecture: normalized.competitiveArchitecture,
    evidenceRecords: [],
    assessments: []
  });
  const series = simulateComparison(applyStressTestTemplate(DEFAULT_SCENARIOS, "better_foundation_model"), 36);
  const result = classifyStressTestResult(series, detectCrossover(series[0], series[1]));
  const synthesis = deriveInvestmentSynthesis({
    analysis: example.analysis,
    experience: deriveExperienceSnapshot(rows),
    debates,
    powerMap,
    stressTest: {
      templateName: "Better foundation model",
      primaryChange: "Challenger base capability 2.9 -> 3.6",
      result,
      implication: deriveStressTestPowerImplication("better_foundation_model", result)
    }
  });

  assert.equal(synthesis.investorView.hasInvestorBelief, true);
  assert.match(synthesis.investorView.summary, /Investor belief remains separate from CE evidence|more positive/i);
  assert.match(synthesis.memo, /SCENARIO IMPLICATION — NOT EMPIRICAL EVIDENCE/);
  assert.doesNotMatch(synthesis.evidenceBuckets.supports.map((item) => item.value).join(" "), /75%/);
});

test("supported cross-customer transfer strengthens Network Economies without numeric moat score", () => {
  const powerMap = derivePowerMap({
    analysis: debateAnalysis,
    debates: INITIAL_DEBATES,
    rows: casesForCaseSet(experienceRows, "set-a"),
    evidenceRecords: [{
      entityType: "experiment",
      fieldKey: "cross_customer_transfer",
      evidenceType: "EXPERIMENT",
      epistemicStatus: "SOURCED",
      valueSnapshot: "Measured pooled cross-customer holdout improved accuracy.",
      sourceLabel: "Holdout experiment",
      confidence: "HIGH",
      derivationMethod: "Experiment result"
    }]
  });
  const network = powerMap.powers.find((power) => power.key === "network_economies");

  assert.equal(network?.thesisStrength, "MODERATE");
  assert.equal(network?.evidenceStrength, "LOW");
  assert.equal("overallScore" in powerMap, false);
});

test("closed learning loop alone does not establish Process Power without reproducibility evidence", () => {
  const powerMap = derivePowerMap({
    analysis: { ...debateAnalysis, updatesModelPolicyRegularly: "Yes", deploysImprovementsQuickly: "Yes", rebuildability: "Easy" },
    debates: INITIAL_DEBATES,
    rows: casesForCaseSet(experienceRows, "set-a"),
    learningArchitecture: { usesOutcomeGradesForLearning: "Yes", deploymentCadence: "Weekly" }
  });
  const process = powerMap.powers.find((power) => power.key === "process_power");

  assert.equal(process?.thesisStrength, "WEAK");
  assert.notEqual(process?.evidenceStrength, "HIGH");
});

test("customer-specific accumulated state can support Switching Costs", () => {
  const powerMap = derivePowerMap({
    analysis: { ...debateAnalysis, switchingCostsAssumption: "High", workflowEmbeddedness: "High" },
    debates: INITIAL_DEBATES,
    rows: casesForCaseSet(experienceRows, "set-a"),
    competitiveArchitecture: { switchingCosts: "High", integrationDepth: "High" }
  });
  const switching = powerMap.powers.find((power) => power.key === "switching_costs");

  assert.equal(switching?.thesisStrength, "MODERATE");
  assert.equal(switching?.evidenceStrength, "LOW");
});

test("proprietary data alone does not establish Cornered Resource", () => {
  const powerMap = derivePowerMap({
    analysis: { ...debateAnalysis, dataExclusivity: "High", rebuildability: "Easy" },
    debates: INITIAL_DEBATES,
    rows: casesForCaseSet(experienceRows, "set-a"),
    competitiveArchitecture: { crossCustomerPoolExclusive: "High", competitorRelearningDifficulty: "Easy" }
  });
  const cornered = powerMap.powers.find((power) => power.key === "cornered_resource");

  assert.equal(cornered?.thesisStrength, "WEAK");
  assert.equal(cornered?.evidenceStrength, "NONE");
});

test("company size alone does not establish Scale Economies", () => {
  const powerMap = derivePowerMap({
    analysis: { ...debateAnalysis, companyName: "LargeCo" },
    debates: INITIAL_DEBATES,
    rows: casesForCaseSet(experienceRows, "set-a")
  });
  const scale = powerMap.powers.find((power) => power.key === "scale_economies");

  assert.equal(scale?.thesisStrength, "UNPROVEN");
  assert.equal(scale?.evidenceStrength, "NONE");
});

test("CE can map to different Helmer Powers or remain a capability advantage", () => {
  const switchingMap = derivePowerMap({
    analysis: { ...debateAnalysis, switchingCostsAssumption: "High", workflowEmbeddedness: "High" },
    debates: INITIAL_DEBATES,
    rows: casesForCaseSet(experienceRows, "set-a"),
    competitiveArchitecture: { switchingCosts: "High", integrationDepth: "High" }
  });
  const unprovenMap = derivePowerMap({
    analysis: debateAnalysis,
    debates: INITIAL_DEBATES,
    rows: []
  });

  assert.ok(switchingMap.ceMechanism.classifications.includes("REINFORCES SWITCHING COSTS") || switchingMap.ceMechanism.classifications.includes("CAPABILITY ADVANTAGE ONLY"));
  assert.ok(unprovenMap.ceMechanism.classifications.includes("UNPROVEN MECHANISM"));
});

test("CE-derived and analyst Power assessments remain separate", () => {
  const powerMap = derivePowerMap({
    analysis: debateAnalysis,
    debates: INITIAL_DEBATES,
    rows: casesForCaseSet(experienceRows, "set-a"),
    assessments: [{
      framework: "HELMER",
      dimension: "network_economies",
      score: 5,
      confidence: "HIGH",
      evidenceStatus: "ASSUMED",
      rationale: "Investor believes network effects are likely."
    }]
  });
  const network = powerMap.powers.find((power) => power.key === "network_economies");

  assert.equal(network?.thesisStrength, "UNPROVEN");
  assert.equal(network?.analystAssessment?.score, 5);
  assert.equal(network?.analystDiverges, true);
});

test("synthetic evidence cannot demonstrate actual company Power", () => {
  const powerMap = derivePowerMap({
    analysis: debateAnalysis,
    debates: INITIAL_DEBATES,
    rows: casesForCaseSet(experienceRows, "set-a")
  });

  assert.ok(powerMap.powers.every((power) => power.evidenceStrength !== "HIGH"));
  assert.match(powerMap.conclusion, /hypothesis|No durable Power|evidence/i);
});

test("feedback latency and simulator-derived values use only observed graded rows", () => {
  const metrics = calculateScorebookMetrics(scorebookRows);
  const derived = scorebookDerivedSimulatorValues(scorebookRows);

  assert.equal(metrics.medianFeedbackLatencyDays, 4.5);
  assert.equal(metrics.feedbackLatencySampleSize, 2);
  assert.equal(derived.startingGradedCases, 2);
  assert.equal(derived.feedbackDelayDays, 4.5);
  assert.equal(derived.feedbackDelaySampleSize, 2);
});

test("case detail helpers classify raw and CE-derived fields", () => {
  assert.ok(SCOREBOOK_CASE_FIELD_CLASSIFICATION.sourceRawFields.includes("decisionAt"));
  assert.ok(SCOREBOOK_CASE_FIELD_CLASSIFICATION.sourceRawFields.includes("outcomeAt"));
  assert.ok(SCOREBOOK_CASE_FIELD_CLASSIFICATION.ceDerivedFields.includes("feedbackLatencyDays"));
  assert.ok(SCOREBOOK_CASE_FIELD_CLASSIFICATION.ceDerivedFields.includes("resolvedStatus"));
  assert.equal(deriveCaseFeedbackLatencyDays(scorebookRows[0]), 3);
  assert.equal(deriveCaseResolvedStatus(scorebookRows[0]), "resolved");
  assert.equal(deriveCaseResolvedStatus(scorebookRows[2]), "unresolved");
});

test("case detail sequence preserves context to grade inspection order with incomplete cases", () => {
  const sequence = buildCaseDetailSequence(scorebookRows[2]);

  assert.deepEqual(sequence.map((step) => step.label), [
    "Context",
    "Agent Decision",
    "Human Intervention",
    "Action Taken",
    "Outcome",
    "Grade"
  ]);
  assert.equal(sequence.every((step) => step.fieldType === "SOURCE / RAW FIELD"), true);
  assert.equal(sequence.find((step) => step.label === "Outcome")?.value, null);
  assert.equal(sequence.find((step) => step.label === "Grade")?.value, "UNRESOLVED");
});

test("human override calculations are descriptive and sample-sized", () => {
  const metrics = calculateScorebookMetrics(scorebookRows);

  assert.equal(metrics.humanOverrideValue.count, 1);
  assert.equal(metrics.humanOverrideValue.resolvableCount, 1);
  assert.equal(metrics.humanOverrideValue.correctRate, 1);
  assert.equal(metrics.humanOverrideValue.totalOutcomeValue, 200);
});

test("simulator explanation preserves toy-model framing", () => {
  const series = simulateComparison([
    { ...baseScenario, name: "Incumbent A", startingCases: 500, baseCapability: 1.4 },
    { ...baseScenario, name: "Challenger B", startingCases: 20, baseCapability: 2.6, learningEfficiency: 0.9 }
  ], 12);
  const crossover = detectCrossover(series[0], series[1]);
  const explanation = explainSimulatorComparison(series, crossover);

  assert.match(explanation, /exploratory scenario/i);
  assert.ok(explanation.includes("base/foundation-model capability") || explanation.includes("starting graded cases"));
});

test("Stress Test canonical templates apply deterministic non-persisted scenario presets", () => {
  assert.deepEqual(STRESS_TEST_TEMPLATES.map((template) => template.id), [
    "baseline",
    "better_foundation_model",
    "faster_learner",
    "transfer_breakdown",
    "feedback_delay",
    "experience_staleness",
    "continuous_capture",
    "custom"
  ]);

  const baseline = [
    { ...baseScenario, id: "persisted-a", name: "Incumbent / Company", startingCases: 1000, casesPerMonth: 100 },
    { ...baseScenario, id: "persisted-b", name: "Challenger / Alternative", startingCases: 100, casesPerMonth: 50 }
  ];
  const betterModel = applyStressTestTemplate(baseline, "better_foundation_model");
  assert.equal(betterModel[0].id, "persisted-a");
  assert.equal(betterModel[1].id, "persisted-b");
  assert.ok(betterModel[1].baseCapability > baseline[1].baseCapability);
  assert.equal(baseline[1].baseCapability, 2);

  const fasterLearner = applyStressTestTemplate(baseline, "faster_learner");
  assert.ok(fasterLearner[1].learningEfficiency > baseline[1].learningEfficiency);
  const transferBreakdown = applyStressTestTemplate(baseline, "transfer_breakdown");
  assert.ok(transferBreakdown[0].transferability < baseline[0].transferability);
  const feedbackDelay = applyStressTestTemplate(baseline, "feedback_delay");
  assert.ok(feedbackDelay[0].feedbackDelayDays > baseline[0].feedbackDelayDays);
  const staleness = applyStressTestTemplate(baseline, "experience_staleness");
  assert.ok(staleness[0].stalenessRate > baseline[0].stalenessRate);
  const capture = applyStressTestTemplate(baseline, "continuous_capture");
  assert.ok(capture[0].casesPerMonth > capture[1].casesPerMonth);
  assert.equal(getStressTestTemplate("custom").name, "Custom");
});

test("Stress Test simplified UX exposes only selected scenario changes by default", () => {
  assert.deepEqual(visibleStressTestChangedParameters("better_foundation_model").map((definition) => definition.key), ["baseCapability"]);
  assert.deepEqual(visibleStressTestChangedParameters("faster_learner").map((definition) => definition.key), ["learningEfficiency"]);
  assert.deepEqual(visibleStressTestChangedParameters("transfer_breakdown").map((definition) => definition.key), ["transferability"]);
  assert.deepEqual(visibleStressTestChangedParameters("feedback_delay").map((definition) => definition.key), ["feedbackDelayDays"]);
  assert.deepEqual(visibleStressTestChangedParameters("experience_staleness").map((definition) => definition.key), ["stalenessRate"]);
  assert.deepEqual(visibleStressTestChangedParameters("continuous_capture").map((definition) => definition.key), ["casesPerMonth"]);
  assert.equal(visibleStressTestChangedParameters("custom").length, SIMULATOR_PARAMETER_DEFINITIONS.length);
});

test("Stress Test workspace summarizes the selected condition without changing result semantics", () => {
  const baseline = [
    { ...baseScenario, name: "Incumbent / Company", startingCases: 1000, casesPerMonth: 100, baseCapability: 2 },
    { ...baseScenario, name: "Challenger / Alternative", startingCases: 100, casesPerMonth: 50, baseCapability: 1.8 }
  ];
  const strongerModel = applyStressTestTemplate(baseline, "better_foundation_model");
  const primaryChange = summarizeStressTestPrimaryChange("better_foundation_model", strongerModel, baseline);
  const baselineChange = summarizeStressTestPrimaryChange("baseline", baseline, baseline);
  const customChange = summarizeStressTestPrimaryChange("custom", baseline, baseline);

  assert.equal(primaryChange.label, "Base capability");
  assert.match(primaryChange.summary, /Challenger \/ Alternative base capability/i);
  assert.ok(primaryChange.challengerValue > primaryChange.challengerBaseline!);
  assert.match(baselineChange.summary, /No template condition is changed/);
  assert.match(customChange.summary, /Custom scenario/);

  const afterSeries = simulateComparison(strongerModel, 36);
  const after = classifyStressTestResult(afterSeries, detectCrossover(afterSeries[0], afterSeries[1]));
  assert.ok(["ADVANTAGE_PERSISTS", "ADVANTAGE_COMPRESSES", "CHALLENGER_CATCHES_UP", "CHALLENGER_OVERTAKES", "NO_MATERIAL_INITIAL_ADVANTAGE"].includes(after.classification));
});

test("Stress Test run state can distinguish ready-to-run from executed results", () => {
  const selectedButNotRun = { template: "better_foundation_model", run: "" };
  const executed = { template: "better_foundation_model", run: "1" };

  assert.equal(Boolean(selectedButNotRun.template && selectedButNotRun.run === "1"), false);
  assert.equal(Boolean(executed.template && executed.run === "1"), true);
});

test("Stress Test run context serializes exact scenarios for Conclusion recomputation", () => {
  const scenarios = applyStressTestTemplate([
    { ...baseScenario, id: "incumbent-id", name: "Incumbent / Company", startingCases: 10000, baseCapability: 2.1, learningEfficiency: 0.61 },
    { ...baseScenario, id: "challenger-id", name: "Challenger / Alternative", startingCases: 650, baseCapability: 1.9, learningEfficiency: 0.38, informationValue: 0.24 }
  ], "better_foundation_model");
  const stressSeries = simulateComparison(scenarios, 36);
  const stressResult = classifyStressTestResult(stressSeries, detectCrossover(stressSeries[0], stressSeries[1]));
  const href = stressTestRunHref("/compounding-expertise/memo", {
    analysisId: "analysis-123",
    caseSetId: "case-set-456",
    templateId: "better_foundation_model",
    scenarios,
    includeRun: true
  });
  const params = new URLSearchParams(href.split("?")[1]);

  assert.equal(params.get("analysisId"), "analysis-123");
  assert.equal(params.get("caseSetId"), "case-set-456");
  assert.equal(params.get("template"), "better_foundation_model");
  assert.equal(params.get("run"), "1");
  assert.equal(hasExplicitStressTestRunContext(params), true);
  assert.deepEqual(params.getAll("informationValue"), scenarios.map((scenario) => `${scenario.informationValue}`));
  assert.deepEqual(params.getAll("learningEfficiency"), scenarios.map((scenario) => `${scenario.learningEfficiency}`));

  const recomputedScenarios = scenarios.map((scenario, index) => ({
    ...scenario,
    name: params.getAll("name")[index],
    startingCases: Number(params.getAll("startingCases")[index]),
    casesPerMonth: Number(params.getAll("casesPerMonth")[index]),
    feedbackDelayDays: Number(params.getAll("feedbackDelayDays")[index]),
    transferability: Number(params.getAll("transferability")[index]),
    informationValue: Number(params.getAll("informationValue")[index]),
    learningEfficiency: Number(params.getAll("learningEfficiency")[index]),
    stalenessRate: Number(params.getAll("stalenessRate")[index]),
    baseCapability: Number(params.getAll("baseCapability")[index])
  }));
  const conclusionSeries = simulateComparison(recomputedScenarios, 36);
  const conclusionResult = classifyStressTestResult(conclusionSeries, detectCrossover(conclusionSeries[0], conclusionSeries[1]));

  assert.deepEqual(conclusionResult, stressResult);
});

test("Stress Test selected template without run context is not a Conclusion finding", () => {
  const selectedOnly = new URLSearchParams({ analysisId: "analysis-123", caseSetId: "case-set-456", template: "better_foundation_model" });
  const runWithoutValues = new URLSearchParams({ analysisId: "analysis-123", template: "better_foundation_model", run: "1" });

  assert.equal(hasExplicitStressTestRunContext(selectedOnly), false);
  assert.equal(hasExplicitStressTestRunContext(runWithoutValues), false);
});

test("Stress Test result classifications and crossover metrics are deterministic", () => {
  const persistsSeries = simulateComparison([
    { ...baseScenario, name: "Incumbent / Company", startingCases: 20000, baseCapability: 2.2, learningEfficiency: 0.7 },
    { ...baseScenario, name: "Challenger / Alternative", startingCases: 200, baseCapability: 1.4, learningEfficiency: 0.3 }
  ], 36);
  const persists = classifyStressTestResult(persistsSeries, detectCrossover(persistsSeries[0], persistsSeries[1]));
  assert.equal(persists.classification, "ADVANTAGE_PERSISTS");
  assert.equal(typeof persists.month12Gap, "number");
  assert.equal(typeof persists.month36Gap, "number");

  const compressSeries = simulateComparison([
    { ...baseScenario, name: "Incumbent / Company", startingCases: 50000, baseCapability: 2.4, learningEfficiency: 0.6 },
    { ...baseScenario, name: "Challenger / Alternative", startingCases: 100, baseCapability: 2.6, learningEfficiency: 0.9 }
  ], 36);
  const compressCrossover = detectCrossover(compressSeries[0], compressSeries[1]);
  const compress = classifyStressTestResult(compressSeries, compressCrossover);
  assert.ok(["ADVANTAGE_COMPRESSES", "CHALLENGER_CATCHES_UP", "CHALLENGER_OVERTAKES"].includes(compress.classification));
  assert.equal(compress.crossoverMonth, compressCrossover?.month ?? null);

  const noInitialSeries = simulateComparison([
    { ...baseScenario, name: "Incumbent / Company" },
    { ...baseScenario, name: "Challenger / Alternative" }
  ], 36);
  const noInitial = classifyStressTestResult(noInitialSeries, detectCrossover(noInitialSeries[0], noInitialSeries[1]));
  assert.equal(noInitial.classification, "NO_MATERIAL_INITIAL_ADVANTAGE");
});

test("Stress Test drivers, implications, and parameter epistemics preserve toy-model limits", () => {
  const scenarios = applyStressTestTemplate([
    { ...baseScenario, name: "Incumbent / Company", startingCases: 10000, baseCapability: 1.8 },
    { ...baseScenario, name: "Challenger / Alternative", startingCases: 500, baseCapability: 1.9 }
  ], "better_foundation_model");
  const series = simulateComparison(scenarios, 36);
  const result = classifyStressTestResult(series, detectCrossover(series[0], series[1]));
  const drivers = deriveStressTestDrivers(series, result);
  const topDrivers = summarizeTopStressTestDrivers(drivers);
  const implication = deriveStressTestPowerImplication("better_foundation_model", result);

  assert.ok(drivers.length >= 1 && drivers.length <= 4);
  assert.ok(topDrivers.length <= 3);
  assert.ok(drivers.some((driver) => /Base capability|Starting experience|Learning efficiency/.test(driver.title)));
  assert.doesNotMatch(drivers.map((driver) => driver.detail).join(" "), /forecast/i);
  assert.match(implication, /scenario|model|historical|experience|Power/i);
  assert.doesNotMatch(implication, /empirical evidence proves/i);

  const startingCases = SIMULATOR_PARAMETER_DEFINITIONS.find((definition) => definition.key === "startingCases");
  const informationValue = SIMULATOR_PARAMETER_DEFINITIONS.find((definition) => definition.key === "informationValue");
  assert.equal(startingCases?.epistemic, "OBSERVED / DERIVED");
  assert.match(informationValue?.help ?? "", /Shannon layer/i);
});

test("scorebook-derived simulator values remain limited to supported fields", () => {
  const derivedKeys = SIMULATOR_PARAMETER_DEFINITIONS
    .filter((definition) => definition.epistemic === "OBSERVED / DERIVED")
    .map((definition) => definition.key)
    .sort();
  assert.deepEqual(derivedKeys, ["feedbackDelayDays", "startingCases"]);
});

test("Stress Test decimal inputs accept persisted non-step-aligned assumption values", () => {
  const learningEfficiency = SIMULATOR_PARAMETER_DEFINITIONS.find((definition) => definition.key === "learningEfficiency");
  const informationValue = SIMULATOR_PARAMETER_DEFINITIONS.find((definition) => definition.key === "informationValue");
  const transferability = SIMULATOR_PARAMETER_DEFINITIONS.find((definition) => definition.key === "transferability");
  const staleness = SIMULATOR_PARAMETER_DEFINITIONS.find((definition) => definition.key === "stalenessRate");

  assert.equal(learningEfficiency?.step, 0.01);
  assert.equal(informationValue?.step, 0.01);
  assert.equal(transferability?.step, 0.01);
  assert.equal(staleness?.step, 0.001);
  assert.equal(validateScenario({ ...baseScenario, learningEfficiency: 0.38, informationValue: 0.24, transferability: 0.37, stalenessRate: 0.012 }).ok, true);
});

test("conclusion handles insufficient evidence without manufacturing Power", () => {
  const assessments = defaultAssessments();
  const metrics = calculateScorebookMetrics([]);
  const conclusion = summarizeConclusion({
    analysis: {
      companyName: "EmptyCo",
      productDescription: "",
      targetCustomer: "",
      workflow: "",
      decisionDescription: "",
      thesis: ""
    },
    metrics,
    assessments,
    debates: []
  });

  assert.equal(conclusion.evidenceQuality, "Weak / insufficient");
  assert.match(conclusion.nextExperiment, /held-out-customer|instrument/i);
  assert.deepEqual(apparentPowerLocations(assessments), ["no demonstrated Power yet"]);
});

test("synthetic dataset labeling is explicit for bundled examples", () => {
  for (const example of COMPOUNDING_EXAMPLES) {
    assert.match(example.syntheticDatasetLabel, /SYNTHETIC ILLUSTRATIVE DATA/);
    assert.equal(scorebookRowsAreSynthetic(example.cases), true);
    for (const row of example.cases) {
      assert.equal(row.isSynthetic, true);
      assert.match(row.sourceLabel, /SYNTHETIC ILLUSTRATIVE DATA/);
      assert.ok(row.actionAt === null || row.actionAt instanceof Date || typeof row.actionAt === "string");
      assert.equal(row.sourceRecordType, "canonical_synthetic_fixture");
      assert.ok(row.sourceRecordId);
      if (example.id === "casap") assert.match(row.sourceLabel, /not Casap data/);
      if (example.id === "listen-labs") assert.match(row.sourceLabel, /not Listen Labs data/);
      if (example.id === "aaru") assert.match(row.sourceLabel, /not Aaru data/);
      if (example.id === "maybern") assert.match(row.sourceLabel, /not Maybern data/);
    }
  }
});

test("all canonical tests expose the same theory-test metadata", () => {
  assert.equal(COMPOUNDING_EXAMPLES.length, 5);
  assert.equal(new Set(COMPOUNDING_EXAMPLES.map((example) => example.testType)).size, 5);
  for (const example of COMPOUNDING_EXAMPLES) {
    assert.ok(example.testLabel);
    assert.ok(example.canonicalQuestion);
    assert.ok(example.principalDecision);
    assert.ok(example.gradeObjectivity);
    assert.ok(example.typicalFeedbackSpeed);
    assert.ok(example.economicCostOfError);
    assert.ok(example.caseFrequency);
    assert.ok(example.primaryPowerHypothesis);
    assert.ok(example.competingPowerHypothesis);
    assert.ok(example.whyCanonical);
    assert.ok(example.expectedTheoreticalBehavior);
    assert.ok(example.labFailureCondition);
    assert.ok(example.syntheticDatasetLabel.includes("SYNTHETIC ILLUSTRATIVE DATA"));
  }
});

test("V0.3 canonical fixtures expose normalized company and decision-system model", () => {
  const casap = exampleById("casap");
  const normalized = normalizedModelForExample(casap);

  assert.equal(normalized.profile.name, "Casap archetype review");
  assert.ok(normalized.workflow.stages.length >= 6);
  assert.ok(normalized.workflow.decisionClasses.length >= 4);
  assert.ok(normalized.workflow.decisionClasses.some((item) => item.key === "fraud_escalation"));
  assert.ok(normalized.workflow.actions.some((item) => item.key === "REQUEST_MORE_EVIDENCE"));
  assert.equal(normalized.learningArchitecture.capturesAgentDecision, "YES");
  assert.ok(normalized.evidence.some((item) => item.epistemicStatus === "ASSUMED" && item.sourceLabel.includes("not Casap data")));
});

test("V0.3 keeps decision class as a finer analytical unit than company", () => {
  const casap = exampleById("casap");
  const fraudCase = casap.cases.find((row) => row.caseType.toLowerCase().includes("fraud"));

  assert.ok(fraudCase);
  assert.equal(decisionClassKeyForCase(casap, fraudCase!), "fraud_escalation");
  assert.equal(actionKeyFromDecision("request more evidence"), "REQUEST_MORE_EVIDENCE");
});

test("V0.3 decision-system metrics derive only observable CaseSet facts", () => {
  const metrics = deriveDecisionSystemMetrics(scorebookRows);

  assert.equal(metrics.totalCases, 3);
  assert.equal(metrics.customerSegmentCount, 2);
  assert.equal(metrics.caseTypeCount, 2);
  assert.equal(metrics.medianDecisionToOutcomeLatencyDays, 4.5);
  assert.ok(metrics.actionDistribution.some((item) => item.label === "approve" && item.count === 2));
  assert.equal(metrics.observedDecisionVolume.count, 3);
});

test("V0.3 evidence coverage preserves epistemic distinctions", () => {
  const summary = summarizeEvidenceCoverage([
    { epistemicStatus: "DERIVED" },
    { epistemicStatus: "OBSERVED" },
    { epistemicStatus: "SOURCED" },
    { epistemicStatus: "ASSUMED" },
    { epistemicStatus: "INFERRED" },
    { epistemicStatus: "UNKNOWN" }
  ]);

  assert.equal(summary.derived, 2);
  assert.equal(summary.sourced, 1);
  assert.equal(summary.assumed, 1);
  assert.equal(summary.inferred, 1);
  assert.equal(summary.unknown, 1);
});

test("canonical fixtures resolve to explicit synthetic CaseSets", () => {
  for (const example of COMPOUNDING_EXAMPLES) {
    const caseSet = caseSetForExample(example);
    assert.equal(caseSet.sourceType, "CANONICAL_SYNTHETIC");
    assert.equal(caseSet.sourceSystemKey, "canonical_test_suite");
    assert.equal(caseSet.isSynthetic, true);
    assert.equal(caseSet.caseCount, example.cases.length);
    assert.match(caseSet.provenanceLabel, /SYNTHETIC ILLUSTRATIVE DATA/);
    assert.equal(sourceRouteIsSafe(caseSet.sourceRoute), true);
  }
});

test("Casap public evidence analysis is separate from the synthetic canonical Casap fixture", () => {
  const syntheticCasap = exampleById("casap");
  const publicCasap = publicEvidenceAnalysisById("casap-public-2026-09");

  assert.equal(publicCasap.id, "casap-public-2026-09");
  assert.notEqual(publicCasap.id, syntheticCasap.id);
  assert.match(publicCasap.label, /Public Evidence Analysis/);
  assert.match(publicCasap.publicSourceLabel, /PUBLIC SOURCES/);
  assert.match(publicCasap.publicSourceLabel, /NO PRODUCTION CASE DATA/);
  assert.equal(syntheticCasap.cases.length > 0, true);
  assert.equal(publicCasap.normalized.evidence.some((item) => item.evidenceType === "SYNTHETIC_ASSUMPTION"), false);
  assert.equal(canonicalExampleForCompany("Casap archetype review")?.id, "casap");
  assert.equal(canonicalExampleForCompany(publicCasap.analysis.companyName), null);
  assert.equal(canonicalExampleForCompany(publicCasap.label), null);
  assert.equal(publicCasap.normalized.evidence.some((item) => /SYNTHETIC/i.test(item.valueSnapshot ?? "")), false);
});

test("Casap public evidence fixture preserves source-backed facts without manufacturing scorebook cases", () => {
  const fixture = CASAP_PUBLIC_EVIDENCE_ANALYSIS;

  assert.equal(fixture.normalized.profile.name, "Casap Technologies");
  assert.equal(fixture.normalized.profile.revenueModel, "UNKNOWN");
  assert.match(fixture.normalized.profile.businessModelNotes ?? "", /do not establish revenue/i);
  assert.equal(fixture.normalized.workflow.decisionClasses.length, 3);
  assert.ok(fixture.normalized.workflow.decisionClasses.some((item) => item.key === "fraud_likelihood"));
  assert.ok(fixture.normalized.workflow.decisionClasses.some((item) => item.key === "dispute_next_action"));
  assert.ok(fixture.normalized.workflow.decisionClasses.some((item) => item.key === "chargeback_likelihood_evidence"));
  assert.equal(fixture.normalized.learningArchitecture.usesOutcomeGradesForLearning, "UNKNOWN");
  assert.equal(fixture.normalized.learningArchitecture.deploymentCadence, "UNKNOWN");
  assert.equal(fixture.normalized.learningArchitecture.canTrainAcrossCustomers, "UNKNOWN");
  assert.equal(fixture.normalized.competitiveArchitecture.rawCasesExclusive, "UNKNOWN");
  assert.equal(fixture.normalized.competitiveArchitecture.competitorRelearningDifficulty, "UNKNOWN");
  assert.equal(fixture.normalized.environment.estimatedCasesPerPeriod, null);
  assert.equal("caseSet" in fixture, false);
  assert.equal("cases" in fixture, false);
  assert.match(fixture.normalized.profile.economicsNotes ?? "", /aggregate public customer metrics/i);
});

test("Casap public analyst dimension assessments start unknown despite public evidence records", () => {
  const assessments = publicEvidenceDefaultAssessments();

  assert.ok(assessments.length > 0);
  assert.ok(assessments.every((assessment) => assessment.evidenceStatus === "UNKNOWN"));
  assert.ok(assessments.every((assessment) => /Public evidence analysis starts/.test(assessment.rationale)));
});

test("Casap public evidence records are sourced and include limitations", () => {
  const evidence = CASAP_PUBLIC_EVIDENCE_ANALYSIS.normalized.evidence;
  const privacy = evidence.find((item) => item.fieldKey === "learning_rights_privacy_policy");
  const compoundingClaim = evidence.find((item) => item.fieldKey === "company_claim_compounding_behavior");
  const fileneBlog = evidence.find((item) => item.fieldKey === "filene_blog_multi_credit_union_testing");

  assert.ok(evidence.length >= 8);
  for (const record of evidence) {
    assert.equal(record.evidenceType, "PUBLIC_SOURCE");
    assert.equal(record.epistemicStatus, "SOURCED");
    assert.ok(record.sourceLabel);
    assert.match(record.sourceUrl ?? "", /^https:\/\//);
    assert.ok(record.analystNotes);
  }
  assert.ok(privacy);
  assert.match(privacy!.analystNotes ?? "", /insufficient to establish contractual rights/i);
  assert.ok(compoundingClaim);
  assert.match(compoundingClaim!.analystNotes ?? "", /NOT EMPIRICAL PROOF/i);
  assert.ok(fileneBlog);
  assert.equal(fileneBlog!.confidence, "HIGH");
  assert.match(fileneBlog!.sourceUrl ?? "", /filene\.org\/blog\/chartway-credit-union/);
  assert.match(fileneBlog!.valueSnapshot ?? "", /five credit unions/i);
  assert.match(fileneBlog!.valueSnapshot ?? "", /122% improvement/i);
  assert.match(fileneBlog!.valueSnapshot ?? "", /63%/);
  assert.match(fileneBlog!.analystNotes ?? "", /Does NOT establish grade-driven model improvement/i);
  assert.match(fileneBlog!.analystNotes ?? "", /cross-customer transfer/i);
});

test("Casap public evidence keeps CE debates conservative without production cases", () => {
  const fixture = CASAP_PUBLIC_EVIDENCE_ANALYSIS;
  const input = {
    analysis: fixture.analysis,
    debates: fixture.debates,
    rows: [],
    learningArchitecture: fixture.normalized.learningArchitecture,
    competitiveArchitecture: fixture.normalized.competitiveArchitecture,
    evidenceRecords: fixture.normalized.evidence.map((record) => ({
      ...record,
      entityId: record.entityKey ?? null
    }))
  };

  const candidates = deriveDebateCandidates(input, 8);
  const learning = candidates.find((candidate) => candidate.family === "LEARNING_CAUSALITY");
  const transfer = candidates.find((candidate) => candidate.family === "CROSS_CUSTOMER_TRANSFER");
  const rights = candidates.find((candidate) => candidate.family === "LEARNING_RIGHTS");
  const rebuildability = candidates.find((candidate) => candidate.family === "REBUILDABILITY_COMPRESSION");

  assert.ok(learning);
  assert.equal(learning!.assessment, "UNPROVEN");
  assert.match(learning!.assessmentReason, /no controlled|Grade coverage is descriptive|future decisions/i);
  assert.ok(transfer);
  assert.equal(transfer!.assessment, "UNPROVEN");
  assert.ok(transfer!.contextEvidence.every((item) => item.direction === "CONTEXT-DESCRIPTIVE"));
  assert.ok(rights);
  assert.notEqual(rights!.assessment, "SUPPORTED");
  assert.ok(rebuildability);
  assert.equal(rebuildability!.assessment, "UNPROVEN");
});

test("Casap public operational results can support workflow value without establishing cross-customer transfer", () => {
  const fixture = CASAP_PUBLIC_EVIDENCE_ANALYSIS;
  const input = {
    analysis: fixture.analysis,
    debates: fixture.debates,
    rows: [],
    learningArchitecture: fixture.normalized.learningArchitecture,
    competitiveArchitecture: fixture.normalized.competitiveArchitecture,
    evidenceRecords: fixture.normalized.evidence.map((record) => ({
      ...record,
      entityId: record.entityKey ?? null
    }))
  };
  const transfer = deriveDebateAssessment(input, "CROSS_CUSTOMER_TRANSFER");
  const economicDashboard = deriveDebateEvidenceDashboard(input, "ECONOMIC_MATERIALITY");
  const experienceDashboard = deriveDebateEvidenceDashboard(input, "EXPERIENCE_CAPTURE");

  assert.equal(transfer.assessment, "UNPROVEN");
  assert.equal(transfer.evidenceFor.some((item) => item.direction === "SUPPORTS"), false);
  assert.ok(transfer.missingEvidence.some((item) => /held-out customer/i.test(item.value) || /pooled/i.test(item.expectedEvidence ?? "")));
  assert.ok(economicDashboard.externalEvidence.some((item) => item.direction === "SUPPORTS" && /cost|loss|savings/i.test(item.value)));
  assert.ok(experienceDashboard.externalEvidence.some((item) => item.direction === "SUPPORTS" || item.direction === "CONTEXT-DESCRIPTIVE"));
  assert.equal(calculateScorebookMetrics([]).totalCases, 0);
});

test("Casap public evidence routing is proposition-specific", () => {
  const evidence = CASAP_PUBLIC_EVIDENCE_ANALYSIS.normalized.evidence;
  const chartway = evidence.find((record) => record.fieldKey === "chartway_customer_results")!;
  const fileneBlog = evidence.find((record) => record.fieldKey === "filene_blog_multi_credit_union_testing")!;
  const compoundingClaim = evidence.find((record) => record.fieldKey === "company_claim_compounding_behavior")!;
  const privacy = evidence.find((record) => record.fieldKey === "learning_rights_privacy_policy")!;

  assert.equal(classifyEvidenceForDebate(chartway, "ECONOMIC_MATERIALITY"), "SUPPORTS");
  assert.equal(classifyEvidenceForDebate(chartway, "CROSS_CUSTOMER_TRANSFER"), "CONTEXT-DESCRIPTIVE");
  assert.equal(classifyEvidenceForDebate(fileneBlog, "CROSS_CUSTOMER_TRANSFER"), "CONTEXT-DESCRIPTIVE");
  assert.equal(classifyEvidenceForDebate(compoundingClaim, "LEARNING_CAUSALITY"), "CONTEXT-DESCRIPTIVE");
  assert.equal(classifyEvidenceForDebate(privacy, "LEARNING_RIGHTS"), "CONTEXT-DESCRIPTIVE");
  assert.notEqual(classifyEvidenceForDebate(privacy, "LEARNING_RIGHTS"), "SUPPORTS");
  assert.notEqual(classifyEvidenceForDebate(chartway, "REBUILDABILITY_COMPRESSION"), "SUPPORTS");
});

test("Casap public Debates, Power, and Conclusion preserve unproven CE mechanism", () => {
  const fixture = CASAP_PUBLIC_EVIDENCE_ANALYSIS;
  const input = {
    analysis: fixture.analysis,
    debates: fixture.debates,
    rows: [],
    learningArchitecture: fixture.normalized.learningArchitecture,
    competitiveArchitecture: fixture.normalized.competitiveArchitecture,
    evidenceRecords: fixture.normalized.evidence.map((record) => ({
      ...record,
      entityId: record.entityKey ?? null
    }))
  };
  const candidates = deriveDebateCandidates(input, 8);
  const transfer = candidates.find((candidate) => candidate.family === "CROSS_CUSTOMER_TRANSFER")!;
  const powerMap = derivePowerMap(input);
  const network = powerMap.powers.find((power) => power.key === "network_economies")!;
  const experience = deriveExperienceSnapshot([]);
  const synthesis = deriveInvestmentSynthesis({
    analysis: fixture.analysis,
    experience,
    debates: candidates,
    powerMap,
    stressTest: null
  });

  assert.equal(transfer.assessment, "UNPROVEN");
  assert.equal(transfer.evidenceFor.length, 0);
  assert.equal(transfer.evidenceDashboard.externalEvidence.some((item) => item.direction === "CONTEXT-DESCRIPTIVE" && /five credit unions|Chartway|MidSouth|interaction/i.test(item.value)), true);
  assert.equal(network.thesisStrength, "UNPROVEN");
  assert.notEqual(network.why, "Cross-customer transfer evidence supports a network-like CE mechanism.");
  assert.equal(powerMap.ceMechanism.classifications.includes("REINFORCES NETWORK ECONOMIES"), false);
  assert.equal(powerMap.ceMechanism.classifications.includes("UNPROVEN MECHANISM"), true);
  assert.equal(synthesis.ceThesis, "UNPROVEN");
});

test("Casap public Company Model has structural opportunity but unproven learning loop inputs", () => {
  const fixture = CASAP_PUBLIC_EVIDENCE_ANALYSIS;
  const decisionClasses = fixture.normalized.workflow.decisionClasses;

  assert.ok(decisionClasses.some((item) => item.name.includes("Fraud likelihood") && item.economicStakes === "HIGH"));
  assert.ok(decisionClasses.some((item) => item.outcomeObservability === "PARTIAL"));
  assert.equal(fixture.normalized.learningArchitecture.usesOutcomeGradesForLearning, "UNKNOWN");
  assert.equal(fixture.normalized.learningArchitecture.deploymentCadence, "UNKNOWN");
  assert.ok(criticalCasapUnknowns(fixture).includes("cross-customer transfer"));
});

function criticalCasapUnknowns(fixture: typeof CASAP_PUBLIC_EVIDENCE_ANALYSIS) {
  return [
    fixture.normalized.learningArchitecture.pooledAcrossCustomers === "UNKNOWN" ? "cross-customer transfer" : null,
    fixture.normalized.learningArchitecture.canTrainAcrossCustomers === "UNKNOWN" ? "contractual learning rights" : null,
    fixture.normalized.learningArchitecture.usesOutcomeGradesForLearning === "UNKNOWN" ? "actual grade → update loop" : null,
    fixture.normalized.competitiveArchitecture.competitorRelearningDifficulty === "UNKNOWN" ? "challenger rebuildability" : null
  ].filter((item): item is string => Boolean(item));
}

test("Better foundation model stress template changes challenger, not incumbent", () => {
  const [incumbent, challenger] = applyStressTestTemplate(DEFAULT_SCENARIOS, "better_foundation_model");
  const primaryChange = summarizeStressTestPrimaryChange("better_foundation_model", [incumbent, challenger], DEFAULT_SCENARIOS);

  assert.equal(incumbent.baseCapability, DEFAULT_SCENARIOS[0].baseCapability);
  assert.ok(challenger.baseCapability > DEFAULT_SCENARIOS[1].baseCapability);
  assert.ok(challenger.baseCapability > incumbent.baseCapability);
  assert.equal(primaryChange.label, "Base capability");
  assert.equal(primaryChange.incumbentValue, incumbent.baseCapability);
  assert.equal(primaryChange.incumbentBaseline, DEFAULT_SCENARIOS[0].baseCapability);
  assert.equal(primaryChange.challengerValue, challenger.baseCapability);
  assert.ok(primaryChange.summary.includes("Challenger"));
});

test("Casap public no-CaseSet stress tests are assumption-driven", () => {
  assert.equal(deriveScenarioGrounding([]), "ASSUMPTION-DRIVEN");
  assert.equal(deriveScenarioGrounding(exampleById("casap").cases), "ASSUMPTION-DRIVEN");
  assert.equal(deriveScenarioGrounding(scorebookRows.map((row) => ({ ...row, isSynthetic: false }))), "PARTIALLY GROUNDED");
});

test("source route validation rejects external or unsafe routes", () => {
  assert.equal(sourceRouteIsSafe("/pricing/outputs?returnTo=compounding-expertise"), true);
  assert.equal(sourceRouteIsSafe("https://example.com"), false);
  assert.equal(sourceRouteIsSafe("//example.com"), false);
  assert.equal(sourceRouteIsSafe("javascript:alert(1)"), false);
});

test("cases can associate with and filter by CaseSet without mixing metrics", () => {
  const rows: ScorebookCaseInput[] = [
    { ...scorebookRows[0], caseSetId: "set-a" },
    { ...scorebookRows[1], caseSetId: "set-a" },
    { ...scorebookRows[2], caseSetId: "set-b" }
  ];
  const setA = casesForCaseSet(rows, "set-a");
  const setB = casesForCaseSet(rows, "set-b");

  assert.equal(setA.length, 2);
  assert.equal(setB.length, 1);
  assert.equal(calculateScorebookMetrics(setA).totalCases, 2);
  assert.equal(calculateScorebookMetrics(setA).gradedCases, 2);
  assert.equal(calculateScorebookMetrics(setB).gradedCases, 0);
});

test("adapter-normalized CE cases allow unresolved nullable outcomes and grades", () => {
  const normalized = normalizeCECase({
    externalCaseId: "pricing-run-1-row-1",
    customerSegment: "mid-market",
    caseType: "pricing simulation",
    context: "Segment price variant decision",
    agentDecision: "raise price",
    outcome: null,
    grade: null,
    actionAt: new Date("2026-01-02T00:00:00Z"),
    sourceRecordId: "pricing-result-1",
    sourceRecordType: "pricing_simulation_result",
    humanOverride: null
  }, "DAVIDWOLFE.APP PRICING SOURCE SYSTEM - generated run descriptor");

  assert.equal(normalized.grade, "UNRESOLVED");
  assert.equal(normalized.outcome, null);
  assert.ok(normalized.actionAt);
  assert.equal(normalized.sourceRecordType, "pricing_simulation_result");
  assert.equal(normalized.humanOverride, false);
  assert.equal(normalized.isSynthetic, false);
});

test("pricing adapter descriptor uses safe source route and source metadata", () => {
  const caseSet = buildPricingCaseSetDescriptor({
    runId: "run-42",
    runLabel: "Pricing Run #42",
    caseCount: 12,
    timeWindowStart: "2026-01-01",
    timeWindowEnd: "2026-01-31"
  });

  assert.equal(PRICING_CE_CASE_SET_ADAPTER.sourceSystemKey, "pricing");
  assert.equal(caseSet.sourceType, "DAVIDWOLFE_APP");
  assert.equal(caseSet.sourceSystemKey, "pricing");
  assert.equal(caseSet.caseCount, 12);
  assert.equal(caseSet.timeWindowStart, "2026-01-01");
  assert.equal(caseSet.timeWindowEnd, "2026-01-31");
  assert.equal(sourceRouteIsSafe(caseSet.sourceRoute), true);
  assert.match(caseSet.sourceRoute ?? "", /returnTo=compounding-expertise/);
});

test("example dataset loading resolves every archetype without actual company data claims", () => {
  for (const id of ["casap", "listen-labs", "aaru", "maybern", "creative-agent"]) {
    const example = exampleById(id);
    assert.equal(example.id, id);
    assert.ok(example.cases.length >= 20);
    assert.ok(example.cases.length <= 50);
    assert.ok(example.syntheticDatasetLabel.includes("SYNTHETIC ILLUSTRATIVE DATA"));
    assert.ok(!example.syntheticDatasetLabel.includes("actual"));
  }
});

test("AI debate prompt uses scorebook summary without converting synthetic fixtures into evidence", () => {
  const prompt = buildDebateGenerationPrompt(
    {
      companyName: "TestCo",
      productDescription: "AI decision tool",
      targetCustomer: "Operators",
      workflow: "Case -> decision -> outcome -> grade",
      decisionDescription: "Approve or deny",
      thesis: "Experience may compound.",
      economicCostWrongDecision: "high",
      ownsDecisionPoint: "yes"
    },
    {
      exogenous: { outcomeObjectivity: "objective / deterministic" },
      endogenous: { capturesGrades: "yes" },
      scorebookSummary: calculateScorebookMetrics(scorebookRows)
    }
  );

  assert.match(prompt, /Scorebook summary/);
  assert.match(prompt, /synthetic case fixtures/);
  assert.doesNotMatch(prompt, /case-1/);
  assert.match(prompt, /AI output is hypothesis generation, not evidence/);
});
