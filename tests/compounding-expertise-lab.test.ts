import assert from "node:assert/strict";
import test from "node:test";
import {
  COMPOUNDING_EXAMPLES,
  COMPETITIVE_INPUTS,
  COMPANY_MODEL_GATES,
  ENDOGENOUS_INPUTS,
  EXOGENOUS_INPUTS,
  GUIDED_PROVENANCE_LABELS,
  INITIAL_DEBATES,
  LAB_WORKFLOW_STEPS,
  SCOREBOOK_CASE_FIELD_CLASSIFICATION,
  apparentPowerLocations,
  buildCaseDetailSequence,
  calculateScorebookMetrics,
  caseSetForExample,
  caseSetDerivedProvenanceLabel,
  casesForCaseSet,
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
  deriveInterestingSlices,
  deriveCanonicalDebateProfile,
  deriveDebateAssessment,
  deriveDebateCandidates,
  deriveDebateEvidenceDashboard,
  deriveDebateEvidenceRegistry,
  deriveHighestValueDiligenceQueue,
  derivePowerMap,
  detectCrossover,
  exampleById,
  explainSimulatorComparison,
  normalizedModelForExample,
  normalizeAssessment,
  summarizeEvidenceCoverage,
  scorebookDerivedSimulatorValues,
  scorebookRowsAreSynthetic,
  simulateComparison,
  simulateScenario,
  sourceRouteIsSafe,
  summarizeConclusion,
  validateAssessment,
  validateProbability,
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

test("marginal information dashboard remains pre-Shannon descriptive", () => {
  const dashboard = deriveDebateEvidenceDashboard({
    analysis: debateAnalysis,
    debates: INITIAL_DEBATES,
    rows: casesForCaseSet(experienceRows, "set-a")
  }, "MARGINAL_INFORMATION_VALUE");

  assert.match(dashboard.summary, /PRE-SHANNON DESCRIPTIVE EVIDENCE/);
  assert.doesNotMatch(dashboard.summary, /entropy estimate|information gain estimate/i);
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
