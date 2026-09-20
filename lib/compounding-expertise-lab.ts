export type CompoundingFramework = "HELMER" | "SUN" | "WOLFE";
export type CompoundingConfidence = "LOW" | "MEDIUM" | "HIGH";
export type CompoundingEvidenceStatus = "OBSERVED" | "SOURCED" | "ASSUMED" | "UNKNOWN";
export type CompoundingDebateSource = "SUN" | "WOLFE" | "USER" | "AI";
export type CompoundingCaseGrade = "CORRECT" | "PARTIALLY_CORRECT" | "INCORRECT" | "UNRESOLVED";
export type CompoundingExampleId = "casap" | "listen-labs" | "aaru" | "maybern" | "creative-agent";
export type CanonicalTestType =
  | "POSITIVE_TEST"
  | "BOUNDARY_TEST"
  | "SUBSTITUTION_COMPRESSION_TEST"
  | "ALTERNATIVE_POWER_TEST"
  | "NEGATIVE_CONTROL";
export type CaseSetSourceType = "CANONICAL_SYNTHETIC" | "DAVIDWOLFE_APP" | "CSV" | "GOOGLE_SHEETS" | "LIVE" | "EXTERNAL" | "MANUAL";
export type CompoundingEvidenceType =
  | "CASESET_DERIVED"
  | "UPSTREAM_APP"
  | "PUBLIC_SOURCE"
  | "COMPANY_DOCUMENT"
  | "ANALYST_INPUT"
  | "MODEL_INFERENCE"
  | "SYNTHETIC_ASSUMPTION"
  | "UNKNOWN";
export type CompoundingEpistemicStatus = "OBSERVED" | "DERIVED" | "SOURCED" | "ASSUMED" | "INFERRED" | "UNKNOWN";
export type CompoundingFieldConfidence = "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";
export type GuidedProvenanceLabel =
  | "OBSERVED — COMPANY DATA"
  | "SOURCED — EXTERNAL EVIDENCE"
  | "DERIVED — COMPANY DATA"
  | "DERIVED — SYNTHETIC FIXTURE"
  | "ANALYST ASSUMPTION"
  | "ARCHETYPE ASSUMPTION"
  | "MODEL INFERENCE"
  | "UNKNOWN / DILIGENCE REQUIRED";

export const GUIDED_PROVENANCE_LABELS: readonly GuidedProvenanceLabel[] = [
  "OBSERVED — COMPANY DATA",
  "SOURCED — EXTERNAL EVIDENCE",
  "DERIVED — COMPANY DATA",
  "DERIVED — SYNTHETIC FIXTURE",
  "ANALYST ASSUMPTION",
  "ARCHETYPE ASSUMPTION",
  "MODEL INFERENCE",
  "UNKNOWN / DILIGENCE REQUIRED"
] as const;

export function caseSetDerivedProvenanceLabel({
  hasRows,
  rowsAreSynthetic
}: {
  hasRows: boolean;
  rowsAreSynthetic: boolean;
}): GuidedProvenanceLabel {
  if (!hasRows) return "UNKNOWN / DILIGENCE REQUIRED";
  return rowsAreSynthetic ? "DERIVED — SYNTHETIC FIXTURE" : "DERIVED — COMPANY DATA";
}

export type CompanyThesisInput = {
  companyName: string;
  companyUrl?: string | null;
  productCategory?: string | null;
  productDescription: string;
  targetCustomer: string;
  businessModel?: string | null;
  workflow: string;
  decisionDescription: string;
  actionSpace?: string | null;
  companyStage?: string | null;
  thesis: string;
  economicCostWrongDecision?: string | null;
  outcomeObjectivity?: string | null;
  naturalFeedbackTime?: string | null;
  caseFrequency?: string | null;
  customerCaseHeterogeneity?: string | null;
  environmentalChangeRate?: string | null;
  foundationModelImprovementRate?: string | null;
  ownsDecisionPoint?: string | null;
  controlsAction?: string | null;
  observesOutcome?: string | null;
  capturesOverrides?: string | null;
  capturesGrades?: string | null;
  learnsAcrossCustomers?: string | null;
  contractualLearningRights?: string | null;
  runsControlledExperiments?: string | null;
  updatesModelPolicyRegularly?: string | null;
  deploysImprovementsQuickly?: string | null;
  dataExclusivity?: string | null;
  workflowEmbeddedness?: string | null;
  switchingCostsAssumption?: string | null;
  rebuildability?: string | null;
  foundationModelDependence?: string | null;
  deterministicInfrastructure?: string | null;
  distributionAdvantage?: string | null;
  regulatoryContractualBarriers?: string | null;
};

export type KeyDebateInput = {
  id?: string;
  question: string;
  bullCase: string;
  bearCase: string;
  evidenceNeeded: string;
  increaseBelief: string;
  decreaseBelief: string;
  probability: number;
  source: CompoundingDebateSource;
};

export type DimensionDefinition = {
  framework: CompoundingFramework;
  dimension: string;
  label: string;
  description: string;
};

export type DimensionAssessmentInput = {
  id?: string;
  framework: CompoundingFramework;
  dimension: string;
  score: number;
  confidence: CompoundingConfidence;
  rationale: string;
  evidenceStatus: CompoundingEvidenceStatus;
  source?: CompoundingDebateSource;
};

export type SimulationScenarioInput = {
  id?: string;
  name: string;
  startingCases: number;
  casesPerMonth: number;
  feedbackDelayDays: number;
  transferability: number;
  informationValue: number;
  learningEfficiency: number;
  stalenessRate: number;
  baseCapability: number;
};

export type SimulationPoint = {
  month: number;
  effectiveExperience: number;
  expertise: number;
  maturedCases: number;
};

export type SimulationSeries = {
  scenario: SimulationScenarioInput;
  points: SimulationPoint[];
};

export type Crossover = {
  month: number;
  from: string;
  to: string;
};

export type ValidationResult = {
  ok: boolean;
  errors: string[];
};

export type ScorebookCaseInput = {
  id?: string;
  caseSetId?: string | null;
  decisionClassId?: string | null;
  agentDecisionActionId?: string | null;
  humanDecisionActionId?: string | null;
  actionTakenActionId?: string | null;
  externalCaseId: string;
  customerSegment: string;
  caseType: string;
  context: string;
  agentDecision: string;
  agentConfidence?: number | null;
  humanDecision?: string | null;
  humanOverride: boolean;
  actionTaken?: string | null;
  outcome?: string | null;
  outcomeValue?: number | null;
  grade: CompoundingCaseGrade;
  gradeConfidence?: number | null;
  decisionAt?: Date | string | null;
  actionAt?: Date | string | null;
  outcomeAt?: Date | string | null;
  isEdgeCase: boolean;
  isSynthetic: boolean;
  sourceLabel: string;
  sourceRecordId?: string | null;
  sourceRecordType?: string | null;
  sourceRecordRoute?: string | null;
  notes?: string | null;
};

export type CaseSetInput = {
  id?: string;
  analysisId?: string | null;
  workflowId?: string | null;
  decisionClassId?: string | null;
  name: string;
  description?: string | null;
  sourceType: CaseSetSourceType;
  sourceSystemKey?: string | null;
  sourceSystemLabel?: string | null;
  sourceRunId?: string | null;
  sourceRunLabel?: string | null;
  sourceRunType?: string | null;
  sourceRoute?: string | null;
  sourceExternalUrl?: string | null;
  generatedAt?: Date | string | null;
  importedAt?: Date | string | null;
  modelVersion?: string | null;
  policyVersion?: string | null;
  experimentId?: string | null;
  timeWindowStart?: Date | string | null;
  timeWindowEnd?: Date | string | null;
  isSynthetic: boolean;
  provenanceLabel: string;
  caseCount: number;
  parentCaseSetId?: string | null;
  derivationDescription?: string | null;
};

export type NormalizedCompanyProfileInput = {
  name: string;
  website?: string | null;
  industry?: string | null;
  productCategory?: string | null;
  productDescription?: string | null;
  companyStage?: string | null;
  geography?: string | null;
  customerType?: string | null;
  customerSegments?: string | null;
  revenueModel?: string | null;
  pricingUnit?: string | null;
  businessModelNotes?: string | null;
  grossMarginProfile?: string | null;
  economicValueUnit?: string | null;
  economicsNotes?: string | null;
  marketContext?: string | null;
  analystThesis?: string | null;
};

export type NormalizedWorkflowStageInput = {
  key: string;
  name: string;
  description?: string | null;
  position: number;
  stageType: string;
};

export type NormalizedDecisionActionInput = {
  key: string;
  label: string;
  description?: string | null;
  reversible?: string;
  requiresHumanApproval?: boolean;
  economicExposure?: string | null;
  regulatoryExposure?: string | null;
};

export type NormalizedDecisionClassInput = {
  key: string;
  stageKey?: string | null;
  name: string;
  description?: string | null;
  decisionMakerType: string;
  decisionFrequency?: string | null;
  estimatedCasesPerPeriod?: number | null;
  frequencyPeriod?: string | null;
  economicStakes: string;
  reversibility: string;
  regulatoryRisk: string;
  operationalRisk: string;
  outcomeObservability: string;
  gradeObjectivity: string;
  naturalFeedbackLatencyDays?: number | null;
  humanReviewMode: string;
  currentAutonomyMode: string;
  actionKeys: string[];
};

export type NormalizedWorkflowInput = {
  key: string;
  name: string;
  description?: string | null;
  position: number;
  stages: NormalizedWorkflowStageInput[];
  decisionClasses: NormalizedDecisionClassInput[];
  actions: NormalizedDecisionActionInput[];
};

export type NormalizedEnvironmentInput = {
  naturalCaseFrequency?: string | null;
  estimatedCasesPerPeriod?: number | null;
  frequencyPeriod?: string | null;
  typicalEconomicCostOfError?: string | null;
  typicalValueOfCorrectDecision?: string | null;
  outcomeObservability?: string | null;
  outcomeObjectivity?: string | null;
  naturalFeedbackLatencyDays?: number | null;
  customerHeterogeneity?: string | null;
  caseHeterogeneity?: string | null;
  environmentalNonstationarity?: string | null;
  regulatoryChangeRate?: string | null;
  foundationModelImprovementRate?: string | null;
  notes?: string | null;
};

export type NormalizedLearningArchitectureInput = {
  capturesContext: string;
  capturesAgentDecision: string;
  capturesHumanDecision: string;
  capturesActionTaken: string;
  capturesOutcome: string;
  capturesExplicitGrade: string;
  outcomeCompletionMechanism?: string | null;
  gradeGenerationMethod?: string | null;
  feedbackLatencyMechanism?: string | null;
  pooledAcrossCustomers: string;
  customerSpecificAdaptation: string;
  usesHumanOverridesForLearning: string;
  usesOutcomeGradesForLearning: string;
  experimentationMode?: string | null;
  modelUpdateCadence?: string | null;
  policyUpdateCadence?: string | null;
  deploymentMode?: string | null;
  deploymentCadence?: string | null;
  humanApprovalForPolicyChanges: string;
  canRetainCases: string;
  canRetainDerivedFeatures: string;
  canTrainAcrossCustomers: string;
  canUseForEvaluation: string;
  contractualRestrictions?: string | null;
  notes?: string | null;
};

export type NormalizedCompetitiveArchitectureInput = {
  rawCasesExclusive: string;
  outcomesExclusive: string;
  humanCorrectionsExclusive: string;
  crossCustomerPoolExclusive: string;
  customerCanExportData: string;
  competitorCanAccessEquivalentData: string;
  systemOfRecord: string;
  systemOfDecision: string;
  systemOfAction: string;
  systemOfOutcomeCapture: string;
  integrationDepth?: string | null;
  replacementComplexity?: string | null;
  publicDataSubstitutionRisk?: string | null;
  syntheticDataSubstitutionRisk?: string | null;
  foundationModelSubstitutionRisk?: string | null;
  competitorRelearningDifficulty?: string | null;
  deterministicInfrastructureStrength?: string | null;
  distributionAdvantage?: string | null;
  regulatoryBarrierStrength?: string | null;
  contractualBarrierStrength?: string | null;
  notes?: string | null;
};

export type NormalizedEvidenceInput = {
  entityType: string;
  entityKey?: string | null;
  fieldKey: string;
  evidenceType: CompoundingEvidenceType;
  epistemicStatus: CompoundingEpistemicStatus;
  valueSnapshot?: string | null;
  sourceLabel: string;
  sourceUrl?: string | null;
  sourceRecordId?: string | null;
  sourceCaseSetKey?: string | null;
  confidence: CompoundingFieldConfidence;
  observedAt?: Date | string | null;
  derivationMethod?: string | null;
  analystNotes?: string | null;
};

export type NormalizedExampleModel = {
  profile: NormalizedCompanyProfileInput;
  workflow: NormalizedWorkflowInput;
  environment: NormalizedEnvironmentInput;
  learningArchitecture: NormalizedLearningArchitectureInput;
  competitiveArchitecture: NormalizedCompetitiveArchitectureInput;
  evidence: NormalizedEvidenceInput[];
};

export type EvidenceCoverageSummary = {
  derived: number;
  sourced: number;
  assumed: number;
  inferred: number;
  unknown: number;
};

export function compoundingAnalysisAccessWhere(accountUserId: string | null, analysisId?: string | null) {
  const access = accountUserId
    ? { OR: [{ accountUserId }, { accountUserId: null }] }
    : { accountUserId: null };
  return analysisId ? { id: analysisId, ...access } : access;
}

export type DecisionSystemDerivedMetrics = {
  totalCases: number;
  resolvedCases: number;
  gradedCases: number;
  gradeCoverage: number | null;
  outcomeCompletionRate: number | null;
  medianDecisionToActionLatencyDays: number | null;
  medianDecisionToOutcomeLatencyDays: number | null;
  humanOverrideRate: number | null;
  actionDistribution: { label: string; count: number; share: number | null }[];
  gradeDistribution: { label: CompoundingCaseGrade; count: number; share: number | null }[];
  edgeCaseShare: number | null;
  totalOutcomeValue: number | null;
  averageOutcomeValue: number | null;
  customerSegmentCount: number;
  caseTypeCount: number;
  observedDecisionVolume: {
    count: number;
    windowStart: Date | null;
    windowEnd: Date | null;
    days: number | null;
    casesPerMonth: number | null;
  };
};

export type ScorebookMetrics = {
  totalCases: number;
  resolvedCases: number;
  gradedCases: number;
  outcomeCompletionRate: number | null;
  gradeCoverage: number | null;
  agentCorrectnessRate: number | null;
  humanOverrideRate: number | null;
  medianFeedbackLatencyDays: number | null;
  feedbackLatencySampleSize: number;
  edgeCaseShare: number | null;
  outcomeValueSampleSize: number;
  totalOutcomeValue: number | null;
  averageOutcomeValue: number | null;
  syntheticCaseCount: number;
  humanOverrideValue: {
    count: number;
    shareOfCases: number | null;
    resolvableCount: number;
    correctCount: number;
    incorrectCount: number;
    correctRate: number | null;
    incorrectRate: number | null;
    outcomeValueSampleSize: number;
    totalOutcomeValue: number | null;
    averageOutcomeValue: number | null;
  };
};

export type ScorebookDerivedSimulatorValues = {
  startingGradedCases: number;
  feedbackDelayDays: number | null;
  feedbackDelaySampleSize: number;
};

export type EpistemicKind = "OBSERVED_DERIVED" | "SOURCED" | "ENDOGENOUS_ASSUMPTION" | "EXOGENOUS_ASSUMPTION" | "UNKNOWN";

export type StructuredInputDefinition = {
  key: keyof CompanyThesisInput;
  label: string;
  description: string;
  options: string[];
  epistemicKind: EpistemicKind;
};

export const LAB_WORKFLOW_STEPS = [
  { href: "/compounding-expertise/overview", label: "Overview", stage: "0", verb: "Understand" },
  { href: "/compounding-expertise/inputs", label: "Company Model", stage: "1", verb: "Understand" },
  { href: "/compounding-expertise/scorebook", label: "Experience", stage: "2", verb: "Observe" },
  { href: "/compounding-expertise/debates", label: "Key Debates", stage: "3", verb: "Hypothesize" },
  { href: "/compounding-expertise/diagnostic", label: "Power", stage: "4", verb: "Hypothesize" },
  { href: "/compounding-expertise/simulator", label: "Stress Test", stage: "5", verb: "Test" },
  { href: "/compounding-expertise/memo", label: "Conclusion", stage: "6", verb: "Decide" }
] as const;

export const COMPANY_MODEL_GATES = [
  { id: "decision", label: "Decision Opportunity", shortLabel: "Decision Opportunity", sequence: "1" },
  { id: "feedback", label: "Feedback", shortLabel: "Feedback", sequence: "2" },
  { id: "learning-loop", label: "Learning Loop", shortLabel: "Learning Loop", sequence: "3" },
  { id: "defensibility", label: "Defensibility", shortLabel: "Defensibility", sequence: "4" }
] as const;

export const EXOGENOUS_INPUTS: StructuredInputDefinition[] = [
  { key: "economicCostWrongDecision", label: "Economic cost of a wrong decision", description: "How much value is at stake when the product is wrong?", options: ["Unknown", "Low", "Medium", "High"], epistemicKind: "EXOGENOUS_ASSUMPTION" },
  { key: "outcomeObjectivity", label: "Outcome objectivity", description: "Can outcomes be graded objectively rather than by taste or politics?", options: ["Unknown", "Subjective", "Mixed", "Objective / deterministic"], epistemicKind: "EXOGENOUS_ASSUMPTION" },
  { key: "naturalFeedbackTime", label: "Natural feedback time", description: "How quickly does reality reveal whether the decision was good?", options: ["Unknown", "Minutes", "Days", "Weeks", "Months", "Years"], epistemicKind: "EXOGENOUS_ASSUMPTION" },
  { key: "caseFrequency", label: "Case / decision frequency", description: "How often does the workflow generate meaningful decision cases?", options: ["Unknown", "Low", "Medium", "High", "Very high"], epistemicKind: "EXOGENOUS_ASSUMPTION" },
  { key: "customerCaseHeterogeneity", label: "Customer / case heterogeneity", description: "How different are customers, cases, policies, and contexts?", options: ["Unknown", "Low", "Medium", "High"], epistemicKind: "EXOGENOUS_ASSUMPTION" },
  { key: "environmentalChangeRate", label: "Environmental change / nonstationarity", description: "How quickly does the problem distribution change?", options: ["Unknown", "Stable", "Moderate", "Rapidly changing"], epistemicKind: "EXOGENOUS_ASSUMPTION" },
  { key: "foundationModelImprovementRate", label: "Foundation-model improvement relative to this task", description: "How quickly general model capability may compress proprietary experience advantage.", options: ["Unknown", "Slow", "Moderate", "Fast"], epistemicKind: "EXOGENOUS_ASSUMPTION" }
];

export const ENDOGENOUS_INPUTS: StructuredInputDefinition[] = [
  { key: "ownsDecisionPoint", label: "Owns or participates directly in decision point?", description: "Can the product see the actual decision moment?", options: ["Unknown", "No", "Partially", "Yes"], epistemicKind: "ENDOGENOUS_ASSUMPTION" },
  { key: "controlsAction", label: "Controls or executes action?", description: "Does the product actually execute the action, or only recommend it?", options: ["Unknown", "No", "Recommends only", "Partially", "Yes"], epistemicKind: "ENDOGENOUS_ASSUMPTION" },
  { key: "observesOutcome", label: "Observes eventual outcome?", description: "Can the company observe what happened after the decision?", options: ["Unknown", "No", "Partially", "Yes"], epistemicKind: "ENDOGENOUS_ASSUMPTION" },
  { key: "capturesOverrides", label: "Captures human overrides?", description: "Are human corrections captured as learning signal?", options: ["Unknown", "No", "Partially", "Yes"], epistemicKind: "ENDOGENOUS_ASSUMPTION" },
  { key: "capturesGrades", label: "Captures explicit grades?", description: "Are decisions explicitly graded against outcomes?", options: ["Unknown", "No", "Partially", "Yes"], epistemicKind: "ENDOGENOUS_ASSUMPTION" },
  { key: "learnsAcrossCustomers", label: "Can learn across customers?", description: "Can learning from one customer improve another?", options: ["Unknown", "No", "Partially", "Yes"], epistemicKind: "ENDOGENOUS_ASSUMPTION" },
  { key: "contractualLearningRights", label: "Has contractual rights to learn?", description: "Can the company legally use the feedback loop to improve?", options: ["Unknown", "No", "Partial / restricted", "Yes"], epistemicKind: "ENDOGENOUS_ASSUMPTION" },
  { key: "runsControlledExperiments", label: "Runs controlled experiments?", description: "Can the company test changes rather than infer from anecdotes?", options: ["Unknown", "No", "Sometimes", "Yes"], epistemicKind: "ENDOGENOUS_ASSUMPTION" },
  { key: "updatesModelPolicyRegularly", label: "Updates model / policy regularly?", description: "Does learning feed back into system behavior?", options: ["Unknown", "No", "Occasionally", "Yes"], epistemicKind: "ENDOGENOUS_ASSUMPTION" },
  { key: "deploysImprovementsQuickly", label: "Can deploy improvements quickly?", description: "How quickly can the company turn learning into changed behavior?", options: ["Unknown", "No", "Partially", "Yes"], epistemicKind: "ENDOGENOUS_ASSUMPTION" }
];

export const COMPETITIVE_INPUTS: StructuredInputDefinition[] = [
  { key: "dataExclusivity", label: "Data exclusivity", description: "Can rivals access equivalent decision/outcome data?", options: ["Unknown", "Low", "Medium", "High"], epistemicKind: "ENDOGENOUS_ASSUMPTION" },
  { key: "workflowEmbeddedness", label: "Workflow embeddedness", description: "How deeply is the product embedded in the operating workflow?", options: ["Unknown", "Low", "Medium", "High"], epistemicKind: "ENDOGENOUS_ASSUMPTION" },
  { key: "switchingCostsAssumption", label: "Switching costs", description: "Would customers face operational, risk, or integration costs to switch?", options: ["Unknown", "Low", "Medium", "High"], epistemicKind: "ENDOGENOUS_ASSUMPTION" },
  { key: "rebuildability", label: "Rebuildability", description: "How easily could a capable challenger rebuild the useful system and learning loop?", options: ["Unknown", "Easy", "Moderate", "Hard"], epistemicKind: "EXOGENOUS_ASSUMPTION" },
  { key: "foundationModelDependence", label: "Foundation-model dependence", description: "How dependent is the advantage on commoditized frontier model capability?", options: ["Unknown", "Low", "Medium", "High"], epistemicKind: "EXOGENOUS_ASSUMPTION" },
  { key: "deterministicInfrastructure", label: "Deterministic / domain infrastructure", description: "Does defensibility reside in rails, schema, controls, or domain process rather than CE?", options: ["Unknown", "Low", "Medium", "High"], epistemicKind: "ENDOGENOUS_ASSUMPTION" },
  { key: "distributionAdvantage", label: "Distribution advantage", description: "Does the company have advantaged access to customers or workflows?", options: ["Unknown", "Low", "Medium", "High"], epistemicKind: "ENDOGENOUS_ASSUMPTION" },
  { key: "regulatoryContractualBarriers", label: "Regulatory / contractual barriers", description: "Do contracts, consent, or regulation make replication harder?", options: ["Unknown", "Low", "Medium", "High"], epistemicKind: "ENDOGENOUS_ASSUMPTION" }
];

export const HELMER_POWERS: DimensionDefinition[] = [
  { framework: "HELMER", dimension: "scale_economies", label: "Scale Economies", description: "Unit economics improve with volume in a way that is hard to match." },
  { framework: "HELMER", dimension: "network_economies", label: "Network Economies", description: "Product value increases as more participants join." },
  { framework: "HELMER", dimension: "counter_positioning", label: "Counter-Positioning", description: "The model is hard for incumbents to copy without damaging their existing business." },
  { framework: "HELMER", dimension: "switching_costs", label: "Switching Costs", description: "Customers face meaningful cost, risk, or disruption when leaving." },
  { framework: "HELMER", dimension: "branding", label: "Branding", description: "Brand meaning lowers acquisition friction or supports pricing power." },
  { framework: "HELMER", dimension: "cornered_resource", label: "Cornered Resource", description: "The company controls a scarce asset not generally available to rivals." },
  { framework: "HELMER", dimension: "process_power", label: "Process Power", description: "Operational routines compound into difficult-to-copy performance." }
];

export const SUN_DIMENSIONS: DimensionDefinition[] = [
  { framework: "SUN", dimension: "workflow_capture_position", label: "Workflow / capture position", description: "The product sits where decisions and outcomes are naturally captured." },
  { framework: "SUN", dimension: "objective_grading", label: "Objective grading", description: "Decisions can be graded against outcomes with relatively low ambiguity." },
  { framework: "SUN", dimension: "feedback_speed", label: "Feedback speed", description: "The system receives outcome feedback quickly enough to learn." },
  { framework: "SUN", dimension: "freshness", label: "Freshness", description: "Recent cases remain available and relevant to future decisions." },
  { framework: "SUN", dimension: "diversity_edge_cases", label: "Diversity / edge cases", description: "The scorebook includes enough varied and rare cases to improve judgment." },
  { framework: "SUN", dimension: "cross_customer_learning", label: "Cross-customer learning", description: "Learning from one customer can improve decisions for others." },
  { framework: "SUN", dimension: "contractual_rights_consent", label: "Contractual rights / consent", description: "The company can legally use feedback to improve the product." },
  { framework: "SUN", dimension: "economic_value_of_being_right", label: "Economic value of being right", description: "Better decisions create meaningful customer or company value." }
];

export const WOLFE_DIMENSIONS: DimensionDefinition[] = [
  { framework: "WOLFE", dimension: "cross_customer_transferability", label: "Cross-customer transferability", description: "Experience transfers across customers without being too context-specific." },
  { framework: "WOLFE", dimension: "customer_heterogeneity", label: "Customer heterogeneity", description: "Customer variation is understood rather than averaging away important differences." },
  { framework: "WOLFE", dimension: "marginal_information_gain", label: "Marginal information gain", description: "New cases still teach something non-obvious rather than repeating known patterns." },
  { framework: "WOLFE", dimension: "knowledge_compressibility", label: "Knowledge compressibility", description: "Useful information cannot be easily compressed into a static playbook or prompt." },
  { framework: "WOLFE", dimension: "causal_quality", label: "Causal quality", description: "The scorebook distinguishes causality from correlation or confounded outcomes." },
  { framework: "WOLFE", dimension: "nonstationarity", label: "Nonstationarity", description: "The environment changes slowly enough, or the learning loop is fast enough, to stay relevant." },
  { framework: "WOLFE", dimension: "learning_efficiency", label: "Learning efficiency", description: "The organization turns graded cases into product improvement quickly." }
];

export const ALL_DIMENSIONS = [...HELMER_POWERS, ...SUN_DIMENSIONS, ...WOLFE_DIMENSIONS];

export const SYNTHETIC_CLAIMS_EXAMPLE: CompanyThesisInput = {
  companyName: "Synthetic Claims Resolution AI",
  productDescription:
    "A synthetic example company that helps insurance and marketplace operations teams triage disputes, recommend resolutions, and learn from graded outcomes.",
  targetCustomer: "Claims, trust-and-safety, and dispute operations teams with repeated decision workflows.",
  workflow: "Claim intake -> evidence collection -> decision recommendation -> human review -> outcome tracking -> grade capture.",
  decisionDescription:
    "Whether to approve, deny, escalate, request more evidence, or propose a settlement for a claim or dispute.",
  thesis:
    "The possible Power would come from owning a continuous graded decision loop, not from a static historical dataset. The question is whether fresh, transferable, objectively graded cases improve automation faster than capable challengers can infer or relearn the same judgment."
};

export const SYNTHETIC_DEBATES: KeyDebateInput[] = [
  {
    question: "Does the workflow naturally capture both the decision and the later outcome grade?",
    bullCase: "The product sits in the operational path, so decisions, evidence, outcomes, and reviewer corrections can be captured as part of normal work.",
    bearCase: "Outcome grades may arrive outside the product, be delayed, or be too subjective to support durable learning.",
    evidenceNeeded: "Instrumentation map, outcome labels, reviewer override logs, and grade completeness by customer.",
    increaseBelief: "A high share of decisions receive objective outcome grades without manual backfill.",
    decreaseBelief: "Most outcomes are missing, subjective, delayed, or stored in customer systems the product cannot use.",
    probability: 58,
    source: "USER"
  },
  {
    question: "Is the scorebook transferable across customers without washing out local policy differences?",
    bullCase: "Many claims share common evidence patterns, fraud signals, and resolution tradeoffs across customers.",
    bearCase: "Each customer has different policy rules, risk tolerance, data fields, and escalation behavior.",
    evidenceNeeded: "Cross-customer holdout tests, per-customer error analysis, and examples where global learning improves a new customer.",
    increaseBelief: "Global cases improve accuracy or time-to-resolution for a customer excluded from training.",
    decreaseBelief: "Customer-specific models consistently outperform global learning and do not benefit from shared cases.",
    probability: 46,
    source: "WOLFE"
  },
  {
    question: "Could a capable challenger compress or simulate the useful knowledge without owning the historical scorebook?",
    bullCase: "The useful expertise may be procedural and tacit, embedded in edge cases and reviewer corrections that are hard to infer.",
    bearCase: "The repeatable judgment may be reducible to policies, public examples, foundation-model priors, and a short calibration period.",
    evidenceNeeded: "Learning curves for new deployments, synthetic-data benchmarks, and accuracy after limited customer-specific calibration.",
    increaseBelief: "Accuracy continues improving with proprietary graded cases after policy and foundation-model baselines plateau.",
    decreaseBelief: "A challenger reaches similar performance with policy docs, simulated cases, and a small fresh sample.",
    probability: 42,
    source: "WOLFE"
  }
];

export const INITIAL_DEBATES: KeyDebateInput[] = [
  {
    question: "Is the product positioned to capture graded decisions as part of the natural workflow?",
    bullCase: "If the product owns the decision workflow, it can capture cases, decisions, outcomes, and grades without relying on separate reporting.",
    bearCase: "If decisioning or outcomes happen outside the product, the scorebook may be incomplete or too delayed to compound.",
    evidenceNeeded: "Workflow map, instrumentation plan, examples of decision records, and observed grade capture rate.",
    increaseBelief: "Most meaningful decisions receive outcome grades inside the product flow with low manual effort.",
    decreaseBelief: "Grades are sparse, manual, subjective, or disconnected from the product workflow.",
    probability: 50,
    source: "SUN"
  },
  {
    question: "Does each additional graded case add useful marginal information?",
    bullCase: "New cases may expose edge conditions, policy ambiguity, and correction patterns that improve future automation.",
    bearCase: "The useful information may plateau quickly once common cases and rules are documented.",
    evidenceNeeded: "Learning curves, error analysis by case age, and marginal performance gain from incremental case cohorts.",
    increaseBelief: "Recent case cohorts continue improving decisions after policy and foundation-model baselines are included.",
    decreaseBelief: "Performance plateaus quickly or new cases duplicate known lessons.",
    probability: 50,
    source: "WOLFE"
  },
  {
    question: "Could a capable challenger compress, infer, simulate, or relearn the useful scorebook knowledge?",
    bullCase: "The proprietary scorebook may encode hard-to-copy reviewer corrections, causal labels, and operational context.",
    bearCase: "The useful judgment may be captured by public rules, foundation-model priors, synthetic cases, or a short calibration period.",
    evidenceNeeded: "Challenger-style benchmark, synthetic-case comparison, and performance after limited fresh calibration.",
    increaseBelief: "A challenger with policy docs and a small sample remains materially behind the scorebook owner.",
    decreaseBelief: "A challenger reaches similar performance with compressed rules, simulated examples, or short relearning.",
    probability: 50,
    source: "WOLFE"
  }
];

export type CompoundingExample = {
  id: CompoundingExampleId;
  label: string;
  role: string;
  companyName: string;
  testType: CanonicalTestType;
  testLabel: string;
  canonicalQuestion: string;
  productCategory: string;
  principalDecision: string;
  gradeObjectivity: string;
  typicalFeedbackSpeed: string;
  economicCostOfError: string;
  caseFrequency: string;
  crossCustomerTransferPotential: string;
  historicalCaseDependence: string;
  primaryPowerHypothesis: string;
  competingPowerHypothesis: string;
  whyCanonical: string;
  expectedTheoreticalBehavior: string;
  labFailureCondition: string;
  sourceAppKey?: string | null;
  syntheticDatasetLabel: string;
  caseSet: Omit<CaseSetInput, "analysisId" | "caseCount">;
  analysis: CompanyThesisInput;
  debates: KeyDebateInput[];
  scenarios: SimulationScenarioInput[];
  cases: ScorebookCaseInput[];
};

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function createSyntheticCases(config: {
  prefix: string;
  sourceLabel: string;
  segments: string[];
  caseTypes: string[];
  decisions: string[];
  outcomes: string[];
  count: number;
  delayPattern: number[];
  unresolvedEvery?: number;
  overrideEvery?: number;
  edgeEvery?: number;
  objectiveBias?: "strong" | "mixed" | "weak";
  valueBase?: number;
}): ScorebookCaseInput[] {
  const base = new Date("2026-01-05T12:00:00.000Z");
  return Array.from({ length: config.count }, (_, index) => {
    const externalCaseId = `${config.prefix}-${String(index + 1).padStart(3, "0")}`;
    const isUnresolved = config.unresolvedEvery ? (index + 1) % config.unresolvedEvery === 0 : false;
    const humanOverride = config.overrideEvery ? (index + 2) % config.overrideEvery === 0 : false;
    const isEdgeCase = config.edgeEvery ? (index + 3) % config.edgeEvery === 0 : false;
    const delayDays = config.delayPattern[index % config.delayPattern.length];
    const decisionAt = addDays(base, index * 2);
    const outcomeAt = isUnresolved ? null : addDays(decisionAt, delayDays);
    const agentDecision = config.decisions[index % config.decisions.length];
    const humanDecision = humanOverride
      ? config.decisions[(index + 1) % config.decisions.length]
      : index % 5 === 0
        ? null
        : agentDecision;
    const grade: CompoundingCaseGrade = isUnresolved
      ? "UNRESOLVED"
      : config.objectiveBias === "weak"
        ? (index % 4 === 0 ? "INCORRECT" : index % 3 === 0 ? "PARTIALLY_CORRECT" : "CORRECT")
        : config.objectiveBias === "mixed"
          ? (index % 5 === 0 ? "INCORRECT" : index % 3 === 0 ? "PARTIALLY_CORRECT" : "CORRECT")
          : (index % 8 === 0 ? "INCORRECT" : index % 5 === 0 ? "PARTIALLY_CORRECT" : "CORRECT");
    const outcomeValue = isUnresolved
      ? null
      : Math.round(((config.valueBase ?? 1200) + index * 85) * (grade === "INCORRECT" ? -0.35 : grade === "PARTIALLY_CORRECT" ? 0.45 : 1));

    return {
      externalCaseId,
      customerSegment: config.segments[index % config.segments.length],
      caseType: config.caseTypes[index % config.caseTypes.length],
      context: `${config.sourceLabel}. Synthetic case context ${index + 1}; generated to test scorebook inspection, not to describe real operations.`,
      agentDecision,
      agentConfidence: Math.min(0.96, 0.54 + (index % 7) * 0.06),
      humanDecision,
      humanOverride,
      actionTaken: isUnresolved ? null : humanDecision ?? agentDecision,
      outcome: isUnresolved ? null : config.outcomes[index % config.outcomes.length],
      outcomeValue,
      grade,
      gradeConfidence: isUnresolved ? null : config.objectiveBias === "weak" ? 0.45 + (index % 3) * 0.08 : 0.68 + (index % 4) * 0.07,
      decisionAt,
      actionAt: isUnresolved ? null : addDays(decisionAt, 1),
      outcomeAt,
      isEdgeCase,
      isSynthetic: true,
      sourceLabel: config.sourceLabel,
      sourceRecordId: externalCaseId,
      sourceRecordType: "canonical_synthetic_fixture",
      sourceRecordRoute: null,
      notes: isUnresolved ? "Outcome not yet observed; unresolved rows should remain incomplete." : "Synthetic illustrative row for theory testing."
    };
  });
}

const EXAMPLE_DEBATES: KeyDebateInput[] = [
  INITIAL_DEBATES[0],
  INITIAL_DEBATES[1],
  INITIAL_DEBATES[2]
];

const CASAP_SOURCE = "SYNTHETIC ILLUSTRATIVE DATA - Synthetic disputes scorebook, not Casap data";
const LISTEN_SOURCE = "SYNTHETIC ILLUSTRATIVE DATA - Synthetic research/listening scorebook, not Listen Labs data";
const AARU_SOURCE = "SYNTHETIC ILLUSTRATIVE DATA - Synthetic model-first research scorebook, not Aaru data";
const MAYBERN_SOURCE = "SYNTHETIC ILLUSTRATIVE DATA - Synthetic deterministic-rails scorebook, not Maybern data";
const CREATIVE_SOURCE = "SYNTHETIC ILLUSTRATIVE DATA - Synthetic creative marketing agent scorebook";

export const DEFAULT_SCENARIOS: SimulationScenarioInput[] = [
  {
    name: "Incumbent A",
    startingCases: 50000,
    casesPerMonth: 4000,
    feedbackDelayDays: 21,
    transferability: 0.7,
    informationValue: 0.8,
    learningEfficiency: 0.55,
    stalenessRate: 0.015,
    baseCapability: 2.4
  },
  {
    name: "Challenger B",
    startingCases: 5000,
    casesPerMonth: 2500,
    feedbackDelayDays: 7,
    transferability: 0.85,
    informationValue: 0.85,
    learningEfficiency: 0.75,
    stalenessRate: 0.012,
    baseCapability: 2.9
  }
];

export const COMPOUNDING_EXAMPLES: CompoundingExample[] = [
  {
    id: "casap",
    label: "Casap",
    role: "Strong Compounding Expertise candidate.",
    companyName: "Casap",
    testType: "POSITIVE_TEST",
    testLabel: "Positive test",
    canonicalQuestion: "Can repeated, economically consequential, objectively graded decisions create expertise that a capable challenger cannot quickly reproduce?",
    productCategory: "Disputes / fraud / exception resolution",
    principalDecision: "Dispute / fraud / exception resolution action.",
    gradeObjectivity: "Relatively high",
    typicalFeedbackSpeed: "Relatively fast - days/weeks as an archetype assumption",
    economicCostOfError: "High",
    caseFrequency: "High / repeated workflow",
    crossCustomerTransferPotential: "Plausibly high but requires evidence",
    historicalCaseDependence: "Potentially important",
    primaryPowerHypothesis: "Compounding Expertise, potentially reinforcing Network Economies and Process Power.",
    competingPowerHypothesis: "Workflow distribution, process execution, or data rights may matter as much as the scorebook.",
    whyCanonical: "Close to the strongest theoretical environment for Ben Sun's thesis: repeated decisions, observable outcomes, meaningful economics, and workflow capture.",
    expectedTheoreticalBehavior: "Compounding Expertise should be plausible if cross-customer transfer and resistance to compression are demonstrated.",
    labFailureCondition: "If the Lab rejects CE merely because case count is modest, or accepts CE without testing transferability/compressibility, the framework is behaving poorly.",
    sourceAppKey: null,
    syntheticDatasetLabel: CASAP_SOURCE,
    caseSet: {
      name: "Synthetic disputes scorebook",
      description: "Canonical positive-test fixture for objectively graded dispute and exception decisions.",
      sourceType: "CANONICAL_SYNTHETIC",
      sourceSystemKey: "canonical_test_suite",
      sourceSystemLabel: "Canonical Test Fixture",
      sourceRunLabel: "Casap positive test fixture",
      sourceRunType: "synthetic_fixture",
      sourceRoute: "/compounding-expertise/overview?canonical=casap",
      generatedAt: new Date("2026-01-05T12:00:00.000Z"),
      isSynthetic: true,
      provenanceLabel: CASAP_SOURCE,
      derivationDescription: "Created as a synthetic theory-test CaseSet; not Casap operational data."
    },
    analysis: {
      companyName: "Casap archetype review",
      companyUrl: null,
      productCategory: "Disputes / fraud / exception resolution",
      productDescription: "Company-analysis archetype for a disputes workflow where decisions can plausibly be graded against outcomes. Case rows are synthetic fixtures only.",
      targetCustomer: "Operations teams handling repeated disputes, chargebacks, or exception workflows.",
      businessModel: "Unknown / not assessed",
      workflow: "Dispute intake -> evidence review -> recommended resolution -> human approval or override -> outcome and grade capture.",
      decisionDescription: "Recommend approve, deny, refund, escalate, or request evidence for repeated dispute cases.",
      actionSpace: "Approve, deny, refund, escalate, or request additional evidence.",
      companyStage: "Unknown / not assessed",
      thesis: "This is a strong candidate for Compounding Expertise if the product owns the graded workflow and cross-customer cases remain transferable.",
      economicCostWrongDecision: "High",
      outcomeObjectivity: "Objective / deterministic",
      naturalFeedbackTime: "Days",
      caseFrequency: "High",
      customerCaseHeterogeneity: "Medium",
      environmentalChangeRate: "Moderate",
      foundationModelImprovementRate: "Moderate",
      ownsDecisionPoint: "Yes",
      controlsAction: "Partially",
      observesOutcome: "Yes",
      capturesOverrides: "Yes",
      capturesGrades: "Yes",
      learnsAcrossCustomers: "Partially",
      contractualLearningRights: "Partial / restricted",
      runsControlledExperiments: "Sometimes",
      updatesModelPolicyRegularly: "Yes",
      deploysImprovementsQuickly: "Yes",
      dataExclusivity: "Medium",
      workflowEmbeddedness: "High",
      switchingCostsAssumption: "Medium",
      rebuildability: "Moderate",
      foundationModelDependence: "Medium",
      deterministicInfrastructure: "Medium",
      distributionAdvantage: "Unknown",
      regulatoryContractualBarriers: "Medium"
    },
    debates: EXAMPLE_DEBATES,
    scenarios: DEFAULT_SCENARIOS,
    cases: createSyntheticCases({
      prefix: "SYN-DSP",
      sourceLabel: CASAP_SOURCE,
      segments: ["mid-market marketplace", "enterprise fintech", "consumer platform"],
      caseTypes: ["evidence mismatch", "policy exception", "fraud signal", "customer appeal"],
      decisions: ["approve claim", "deny claim", "request more evidence", "escalate for review"],
      outcomes: ["chargeback avoided", "customer retained", "loss prevented", "manual review saved"],
      count: 28,
      delayPattern: [3, 5, 7, 10, 14],
      unresolvedEvery: 9,
      overrideEvery: 4,
      edgeEvery: 5,
      objectiveBias: "strong",
      valueBase: 1800
    })
  },
  {
    id: "listen-labs",
    label: "Listen Labs",
    role: "Ambiguous case: accumulated research or knowledge may not equal a graded decision scorebook.",
    companyName: "Listen Labs",
    testType: "BOUNDARY_TEST",
    testLabel: "Boundary test",
    canonicalQuestion: "Is accumulated proprietary knowledge the same thing as accumulated graded expertise?",
    productCategory: "AI-assisted research / listening",
    principalDecision: "Research insight / recommendation used to support later product, marketing, or strategy decisions.",
    gradeObjectivity: "Low-to-medium / often indirect",
    typicalFeedbackSpeed: "Delayed and sometimes ambiguous",
    economicCostOfError: "Medium / context-dependent",
    caseFrequency: "Potentially high research volume, but not necessarily high graded-decision volume",
    crossCustomerTransferPotential: "Uncertain",
    historicalCaseDependence: "Questionable",
    primaryPowerHypothesis: "Potentially valuable proprietary knowledge / filing cabinet rather than a true scorebook.",
    competingPowerHypothesis: "Brand, workflow ownership, research distribution, or proprietary access may dominate.",
    whyCanonical: "Separates information accumulation from decision -> outcome -> grade accumulation.",
    expectedTheoreticalBehavior: "The Lab should not infer strong CE merely from large amounts of proprietary research or customer knowledge.",
    labFailureCondition: "If interview/research volume alone creates a strong CE conclusion without an observable decision/outcome/grade loop, the Lab has confused the filing cabinet with the scorebook.",
    sourceAppKey: null,
    syntheticDatasetLabel: LISTEN_SOURCE,
    caseSet: {
      name: "Synthetic research/listening scorebook",
      description: "Canonical boundary-test fixture for qualitative research where decision/outcome/grade linkage is weak.",
      sourceType: "CANONICAL_SYNTHETIC",
      sourceSystemKey: "canonical_test_suite",
      sourceSystemLabel: "Canonical Test Fixture",
      sourceRunLabel: "Listen Labs boundary test fixture",
      sourceRunType: "synthetic_fixture",
      sourceRoute: "/compounding-expertise/overview?canonical=listen-labs",
      generatedAt: new Date("2026-01-05T12:00:00.000Z"),
      isSynthetic: true,
      provenanceLabel: LISTEN_SOURCE,
      derivationDescription: "Created as a synthetic theory-test CaseSet; not Listen Labs operational data."
    },
    analysis: {
      companyName: "Listen Labs archetype review",
      companyUrl: null,
      productCategory: "AI-assisted research / listening",
      productDescription: "Company-analysis archetype for AI-assisted research/listening workflows. Case rows are synthetic fixtures only.",
      targetCustomer: "Product, marketing, and research teams synthesizing customer interviews or qualitative feedback.",
      businessModel: "Unknown / not assessed",
      workflow: "Research prompt -> participant/session evidence -> synthesis -> recommendation -> later product or messaging decision.",
      decisionDescription: "Recommend themes, positioning, prioritization, or follow-up research questions from qualitative evidence.",
      actionSpace: "Recommend themes, segments, follow-up research, or defer conclusion.",
      companyStage: "Unknown / not assessed",
      thesis: "Accumulated knowledge may be valuable, but the scorebook claim is weaker unless recommendations are tied to objective later grades.",
      economicCostWrongDecision: "Medium",
      outcomeObjectivity: "Subjective",
      naturalFeedbackTime: "Months",
      caseFrequency: "Medium",
      customerCaseHeterogeneity: "High",
      environmentalChangeRate: "Moderate",
      foundationModelImprovementRate: "Fast",
      ownsDecisionPoint: "Partially",
      controlsAction: "Recommends only",
      observesOutcome: "Partially",
      capturesOverrides: "Partially",
      capturesGrades: "No",
      learnsAcrossCustomers: "Partially",
      contractualLearningRights: "Partial / restricted",
      runsControlledExperiments: "Sometimes",
      updatesModelPolicyRegularly: "Occasionally",
      deploysImprovementsQuickly: "Partially",
      dataExclusivity: "Medium",
      workflowEmbeddedness: "Medium",
      switchingCostsAssumption: "Low",
      rebuildability: "Moderate",
      foundationModelDependence: "High",
      deterministicInfrastructure: "Low",
      distributionAdvantage: "Unknown",
      regulatoryContractualBarriers: "Low"
    },
    debates: EXAMPLE_DEBATES,
    scenarios: [
      { ...DEFAULT_SCENARIOS[0], startingCases: 900, casesPerMonth: 90, feedbackDelayDays: 75, transferability: 0.42, informationValue: 0.55, learningEfficiency: 0.48 },
      { ...DEFAULT_SCENARIOS[1], startingCases: 120, casesPerMonth: 60, feedbackDelayDays: 45, transferability: 0.5, informationValue: 0.5, learningEfficiency: 0.62 }
    ],
    cases: createSyntheticCases({
      prefix: "SYN-RSCH",
      sourceLabel: LISTEN_SOURCE,
      segments: ["growth team", "product team", "enterprise research"],
      caseTypes: ["theme synthesis", "positioning read", "feature priority", "interview follow-up"],
      decisions: ["recommend theme", "recommend segment", "recommend follow-up", "defer conclusion"],
      outcomes: ["directionally useful", "ambiguous downstream signal", "not adopted", "later validated by team"],
      count: 24,
      delayPattern: [21, 45, 60, 90],
      unresolvedEvery: 4,
      overrideEvery: 6,
      edgeEvery: 7,
      objectiveBias: "mixed",
      valueBase: 700
    })
  },
  {
    id: "aaru",
    label: "Aaru / model-first research",
    role: "Challenge case: stronger model intelligence may substitute for proprietary experience.",
    companyName: "Aaru",
    testType: "SUBSTITUTION_COMPRESSION_TEST",
    testLabel: "Substitution / compression test",
    canonicalQuestion: "Can sufficiently capable models or simulation substitute for real-world experience that historically had to be accumulated case by case?",
    productCategory: "Model-first research / simulation",
    principalDecision: "Prediction/simulation of likely human or market response to a proposed action.",
    gradeObjectivity: "Potentially high when simulation predictions are later compared with actual outcomes",
    typicalFeedbackSpeed: "Depends on prediction horizon",
    economicCostOfError: "Use-case dependent",
    caseFrequency: "Potentially high through simulation",
    crossCustomerTransferPotential: "Potentially central",
    historicalCaseDependence: "Core question - potentially lower if model priors/simulation substitute for experience",
    primaryPowerHypothesis: "Model/simulation capability may compress the value of historical scorebooks.",
    competingPowerHypothesis: "Base model capability, simulation quality, or synthetic data generation may dominate proprietary experience.",
    whyCanonical: "Directly tests the Wolfe criticism that economically useful scorebook information can be compressed, simulated, inferred, or relearned.",
    expectedTheoreticalBehavior: "Increasing base-model/simulation capability should be capable of reducing the modeled advantage of historical experience.",
    labFailureCondition: "If the Lab always rewards the larger historical scorebook and cannot represent model/simulation substitution, the theory test is incomplete.",
    sourceAppKey: null,
    syntheticDatasetLabel: AARU_SOURCE,
    caseSet: {
      name: "Synthetic model-first research scorebook",
      description: "Canonical substitution/compression fixture for model-first research and simulation claims.",
      sourceType: "CANONICAL_SYNTHETIC",
      sourceSystemKey: "canonical_test_suite",
      sourceSystemLabel: "Canonical Test Fixture",
      sourceRunLabel: "Aaru substitution/compression test fixture",
      sourceRunType: "synthetic_fixture",
      sourceRoute: "/compounding-expertise/overview?canonical=aaru",
      generatedAt: new Date("2026-01-05T12:00:00.000Z"),
      isSynthetic: true,
      provenanceLabel: AARU_SOURCE,
      derivationDescription: "Created as a synthetic theory-test CaseSet; not Aaru operational data."
    },
    analysis: {
      companyName: "Aaru model-first archetype review",
      companyUrl: null,
      productCategory: "Model-first research / simulation",
      productDescription: "Company-analysis archetype for model-first research where base intelligence may compress the value of historical cases. Case rows are synthetic fixtures only.",
      targetCustomer: "Strategy, investment, or research teams asking model-heavy analytical questions.",
      businessModel: "Unknown / not assessed",
      workflow: "Question -> model-generated analysis -> reviewer correction -> decision support -> optional later outcome review.",
      decisionDescription: "Generate or rank analytical conclusions, research paths, or scenario implications.",
      actionSpace: "Generate, rank, support, challenge, or request more evidence.",
      companyStage: "Unknown / not assessed",
      thesis: "The challenge is whether higher base capability can substitute for proprietary historical experience quickly enough to weaken scorebook Power.",
      economicCostWrongDecision: "Medium",
      outcomeObjectivity: "Mixed",
      naturalFeedbackTime: "Weeks",
      caseFrequency: "High",
      customerCaseHeterogeneity: "High",
      environmentalChangeRate: "Rapidly changing",
      foundationModelImprovementRate: "Fast",
      ownsDecisionPoint: "Partially",
      controlsAction: "Recommends only",
      observesOutcome: "Partially",
      capturesOverrides: "Yes",
      capturesGrades: "Partially",
      learnsAcrossCustomers: "Partially",
      contractualLearningRights: "Unknown",
      runsControlledExperiments: "Sometimes",
      updatesModelPolicyRegularly: "Yes",
      deploysImprovementsQuickly: "Yes",
      dataExclusivity: "Low",
      workflowEmbeddedness: "Medium",
      switchingCostsAssumption: "Low",
      rebuildability: "Easy",
      foundationModelDependence: "High",
      deterministicInfrastructure: "Low",
      distributionAdvantage: "Unknown",
      regulatoryContractualBarriers: "Low"
    },
    debates: EXAMPLE_DEBATES,
    scenarios: [
      { ...DEFAULT_SCENARIOS[0], startingCases: 600, casesPerMonth: 80, feedbackDelayDays: 35, transferability: 0.45, informationValue: 0.5, learningEfficiency: 0.5, baseCapability: 2.7 },
      { ...DEFAULT_SCENARIOS[1], startingCases: 80, casesPerMonth: 120, feedbackDelayDays: 14, transferability: 0.68, informationValue: 0.58, learningEfficiency: 0.82, baseCapability: 3.35 }
    ],
    cases: createSyntheticCases({
      prefix: "SYN-MDL",
      sourceLabel: AARU_SOURCE,
      segments: ["investor research", "strategy desk", "model evaluation"],
      caseTypes: ["market map", "company assessment", "scenario analysis", "forecast critique"],
      decisions: ["support thesis", "challenge thesis", "request more evidence", "rank alternative"],
      outcomes: ["reviewer accepted", "partially revised", "superseded by new data", "unresolved external result"],
      count: 22,
      delayPattern: [7, 14, 30, 60],
      unresolvedEvery: 5,
      overrideEvery: 5,
      edgeEvery: 6,
      objectiveBias: "mixed",
      valueBase: 500
    })
  },
  {
    id: "maybern",
    label: "Maybern",
    role: "Alternative Power: deterministic rails/schema may matter more than Compounding Expertise.",
    companyName: "Maybern",
    testType: "ALTERNATIVE_POWER_TEST",
    testLabel: "Alternative Power test",
    canonicalQuestion: "Does an AI company need Compounding Expertise at all, or can durable Power reside in deterministic domain infrastructure?",
    productCategory: "Deterministic finance / fund operations infrastructure",
    principalDecision: "Structured fund/finance calculation or controlled operational action.",
    gradeObjectivity: "Very high",
    typicalFeedbackSpeed: "Immediate/short",
    economicCostOfError: "High",
    caseFrequency: "Repeated but not necessarily strategically important for learning",
    crossCustomerTransferPotential: "Not necessarily the primary strategic variable",
    historicalCaseDependence: "Potentially secondary",
    primaryPowerHypothesis: "Deterministic rails, Process Power, Switching Costs, domain infrastructure.",
    competingPowerHypothesis: "Compounding Expertise may be weak/modest while business Power resides elsewhere.",
    whyCanonical: "Tests Ben's argument that some durable AI applications may sell what intelligence needs rather than intelligence itself.",
    expectedTheoreticalBehavior: "The Lab should be capable of concluding weak/modest CE but potentially strong business Power elsewhere.",
    labFailureCondition: "If weak CE automatically produces a weak-company conclusion, the Lab is improperly treating CE as the only form of Power.",
    sourceAppKey: null,
    syntheticDatasetLabel: MAYBERN_SOURCE,
    caseSet: {
      name: "Synthetic deterministic-rails scorebook",
      description: "Canonical alternative-Power fixture for deterministic rails, schema, and controlled execution.",
      sourceType: "CANONICAL_SYNTHETIC",
      sourceSystemKey: "canonical_test_suite",
      sourceSystemLabel: "Canonical Test Fixture",
      sourceRunLabel: "Maybern alternative Power test fixture",
      sourceRunType: "synthetic_fixture",
      sourceRoute: "/compounding-expertise/overview?canonical=maybern",
      generatedAt: new Date("2026-01-05T12:00:00.000Z"),
      isSynthetic: true,
      provenanceLabel: MAYBERN_SOURCE,
      derivationDescription: "Created as a synthetic theory-test CaseSet; not Maybern operational data."
    },
    analysis: {
      companyName: "Maybern archetype review",
      companyUrl: null,
      productCategory: "Deterministic finance / fund operations infrastructure",
      productDescription: "Company-analysis archetype for deterministic workflows where schema, controls, and process execution may be the stronger source of Power. Case rows are synthetic fixtures only.",
      targetCustomer: "Finance, fund operations, or compliance teams requiring controlled execution.",
      businessModel: "Unknown / not assessed",
      workflow: "Structured request -> schema validation -> deterministic rule path -> exception handling -> audit trail.",
      decisionDescription: "Validate, route, reconcile, or reject structured operational exceptions.",
      actionSpace: "Validate, route, reconcile, reject, or request source documentation.",
      companyStage: "Unknown / not assessed",
      thesis: "The key question is whether Power resides in accumulated graded cases or in deterministic process rails, schemas, and trust controls.",
      economicCostWrongDecision: "High",
      outcomeObjectivity: "Objective / deterministic",
      naturalFeedbackTime: "Days",
      caseFrequency: "Medium",
      customerCaseHeterogeneity: "Medium",
      environmentalChangeRate: "Stable",
      foundationModelImprovementRate: "Moderate",
      ownsDecisionPoint: "Yes",
      controlsAction: "Yes",
      observesOutcome: "Yes",
      capturesOverrides: "Yes",
      capturesGrades: "Partially",
      learnsAcrossCustomers: "Partially",
      contractualLearningRights: "Yes",
      runsControlledExperiments: "No",
      updatesModelPolicyRegularly: "Occasionally",
      deploysImprovementsQuickly: "Partially",
      dataExclusivity: "Medium",
      workflowEmbeddedness: "High",
      switchingCostsAssumption: "High",
      rebuildability: "Hard",
      foundationModelDependence: "Low",
      deterministicInfrastructure: "High",
      distributionAdvantage: "Unknown",
      regulatoryContractualBarriers: "High"
    },
    debates: EXAMPLE_DEBATES,
    scenarios: [
      { ...DEFAULT_SCENARIOS[0], startingCases: 2000, casesPerMonth: 180, feedbackDelayDays: 10, transferability: 0.52, informationValue: 0.42, learningEfficiency: 0.46, baseCapability: 2.2 },
      { ...DEFAULT_SCENARIOS[1], startingCases: 300, casesPerMonth: 120, feedbackDelayDays: 8, transferability: 0.55, informationValue: 0.4, learningEfficiency: 0.55, baseCapability: 2.6 }
    ],
    cases: createSyntheticCases({
      prefix: "SYN-RAIL",
      sourceLabel: MAYBERN_SOURCE,
      segments: ["fund operations", "finance controller", "compliance ops"],
      caseTypes: ["schema mismatch", "rule exception", "reconciliation variance", "approval routing"],
      decisions: ["accept", "reject", "route exception", "request source document"],
      outcomes: ["audit trail complete", "variance resolved", "control prevented error", "manual escalation required"],
      count: 26,
      delayPattern: [1, 2, 3, 5],
      unresolvedEvery: 13,
      overrideEvery: 7,
      edgeEvery: 4,
      objectiveBias: "strong",
      valueBase: 900
    })
  },
  {
    id: "creative-agent",
    label: "Creative Marketing Agent",
    role: "Negative control: many cases but subjective/noisy grading and difficult-to-prove decision superiority.",
    companyName: "Creative Marketing Agent",
    testType: "NEGATIVE_CONTROL",
    testLabel: "Negative control",
    canonicalQuestion: "When can enormous volumes of apparently graded data fail to create durable expertise?",
    productCategory: "Creative / marketing agent",
    principalDecision: "Creative / message / audience / campaign allocation choice.",
    gradeObjectivity: "Superficially measurable but causally noisy",
    typicalFeedbackSpeed: "Fast for clicks/conversions; slower for durable economic outcomes",
    economicCostOfError: "Medium",
    caseFrequency: "Very high",
    crossCustomerTransferPotential: "Potentially broad but highly context-sensitive",
    historicalCaseDependence: "Large datasets may exist but contain substantial redundancy",
    primaryPowerHypothesis: "Possibly none from CE alone.",
    competingPowerHypothesis: "Workflow distribution, brand, media buying economics, or creative process may matter more.",
    whyCanonical: "Tests whether the Lab confuses high case volume + rapid feedback with high-value transferable expertise.",
    expectedTheoreticalBehavior: "Large data volume should not automatically produce strong CE when outcomes are confounded, nonstationary, redundant, or easily learned by frontier models.",
    labFailureCondition: "If the Lab declares strong CE primarily from volume and fast click feedback, the analytical framework has failed its negative control.",
    sourceAppKey: null,
    syntheticDatasetLabel: CREATIVE_SOURCE,
    caseSet: {
      name: "Synthetic creative marketing scorebook",
      description: "Canonical negative-control fixture for high-volume but noisy and confounded creative feedback.",
      sourceType: "CANONICAL_SYNTHETIC",
      sourceSystemKey: "canonical_test_suite",
      sourceSystemLabel: "Canonical Test Fixture",
      sourceRunLabel: "Creative Marketing Agent negative-control fixture",
      sourceRunType: "synthetic_fixture",
      sourceRoute: "/compounding-expertise/overview?canonical=creative-agent",
      generatedAt: new Date("2026-01-05T12:00:00.000Z"),
      isSynthetic: true,
      provenanceLabel: CREATIVE_SOURCE,
      derivationDescription: "Created as a fully synthetic negative-control CaseSet."
    },
    analysis: {
      companyName: "Creative Marketing Agent",
      companyUrl: null,
      productCategory: "Creative / marketing agent",
      productDescription: "Fully synthetic negative-control archetype for a high-volume creative workflow with subjective outcomes and attribution ambiguity.",
      targetCustomer: "Marketing teams producing creative variants, social posts, ads, and campaign concepts.",
      businessModel: "Synthetic",
      workflow: "Brief -> generated creative -> human edit -> launch or discard -> noisy performance readout.",
      decisionDescription: "Select, rewrite, or reject creative variants for audience/channel use.",
      actionSpace: "Ship, rewrite, reject, or test a creative variant against a control.",
      companyStage: "Synthetic",
      thesis: "High case volume alone should not imply Compounding Expertise if grades are subjective, delayed, confounded, or weakly tied to decisions.",
      economicCostWrongDecision: "Low",
      outcomeObjectivity: "Subjective",
      naturalFeedbackTime: "Weeks",
      caseFrequency: "Very high",
      customerCaseHeterogeneity: "High",
      environmentalChangeRate: "Rapidly changing",
      foundationModelImprovementRate: "Fast",
      ownsDecisionPoint: "Partially",
      controlsAction: "Partially",
      observesOutcome: "Partially",
      capturesOverrides: "Yes",
      capturesGrades: "Partially",
      learnsAcrossCustomers: "Partially",
      contractualLearningRights: "Unknown",
      runsControlledExperiments: "Sometimes",
      updatesModelPolicyRegularly: "Yes",
      deploysImprovementsQuickly: "Yes",
      dataExclusivity: "Low",
      workflowEmbeddedness: "Low",
      switchingCostsAssumption: "Low",
      rebuildability: "Easy",
      foundationModelDependence: "High",
      deterministicInfrastructure: "Low",
      distributionAdvantage: "Medium",
      regulatoryContractualBarriers: "Low"
    },
    debates: EXAMPLE_DEBATES,
    scenarios: [
      { ...DEFAULT_SCENARIOS[0], startingCases: 20000, casesPerMonth: 3000, feedbackDelayDays: 28, transferability: 0.28, informationValue: 0.35, learningEfficiency: 0.38, stalenessRate: 0.08, baseCapability: 2.3 },
      { ...DEFAULT_SCENARIOS[1], startingCases: 1500, casesPerMonth: 2200, feedbackDelayDays: 21, transferability: 0.4, informationValue: 0.42, learningEfficiency: 0.7, stalenessRate: 0.05, baseCapability: 3.0 }
    ],
    cases: createSyntheticCases({
      prefix: "SYN-CRTV",
      sourceLabel: CREATIVE_SOURCE,
      segments: ["paid social", "email", "brand", "content"],
      caseTypes: ["headline variant", "image concept", "email subject", "landing copy"],
      decisions: ["ship variant", "rewrite", "reject", "test against control"],
      outcomes: ["mixed performance", "attribution unclear", "team liked creative", "underperformed noisy baseline"],
      count: 32,
      delayPattern: [14, 21, 28, 45],
      unresolvedEvery: 3,
      overrideEvery: 4,
      edgeEvery: 5,
      objectiveBias: "weak",
      valueBase: 300
    })
  }
];

export function exampleById(id: string | null | undefined) {
  return COMPOUNDING_EXAMPLES.find((example) => example.id === id) ?? COMPOUNDING_EXAMPLES[0];
}

export function canonicalExampleForCompany(companyName: string | null | undefined) {
  const normalized = String(companyName ?? "").toLowerCase();
  return COMPOUNDING_EXAMPLES.find((example) =>
    normalized.includes(example.id.replace("-labs", " labs"))
      || normalized.includes(example.companyName.toLowerCase())
      || normalized.includes(example.label.toLowerCase())
  ) ?? null;
}

export function caseSetForExample(example: CompoundingExample): CaseSetInput {
  return {
    ...example.caseSet,
    caseCount: example.cases.length
  };
}

function stage(key: string, name: string, position: number, stageType: string, description?: string): NormalizedWorkflowStageInput {
  return { key, name, position, stageType, description };
}

function action(key: string, label: string, description: string, reversible = "UNKNOWN", requiresHumanApproval = false): NormalizedDecisionActionInput {
  return { key, label, description, reversible, requiresHumanApproval };
}

function decisionClass(input: NormalizedDecisionClassInput): NormalizedDecisionClassInput {
  return input;
}

export function actionKeyFromDecision(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "UNKNOWN";
}

function baseWorkflow(example: CompoundingExample, stages: NormalizedWorkflowStageInput[], decisionClasses: NormalizedDecisionClassInput[], actions: NormalizedDecisionActionInput[]): NormalizedWorkflowInput {
  return {
    key: "primary_workflow",
    name: example.analysis.workflow.split("->")[0]?.trim() || `${example.label} workflow`,
    description: example.analysis.workflow,
    position: 0,
    stages,
    decisionClasses,
    actions
  };
}

export function normalizedModelForExample(example: CompoundingExample): NormalizedExampleModel {
  const profile: NormalizedCompanyProfileInput = {
    name: example.analysis.companyName,
    website: example.analysis.companyUrl,
    industry: example.productCategory,
    productCategory: example.productCategory,
    productDescription: example.analysis.productDescription,
    companyStage: example.analysis.companyStage,
    geography: "Unknown / not assessed",
    customerType: example.analysis.targetCustomer,
    customerSegments: [...new Set(example.cases.map((row) => row.customerSegment))].join(", "),
    revenueModel: example.id === "creative-agent" ? "UNKNOWN" : "UNKNOWN",
    pricingUnit: "Unknown / not assessed",
    businessModelNotes: example.analysis.businessModel,
    grossMarginProfile: "Unknown / not assessed",
    economicValueUnit: example.economicCostOfError,
    economicsNotes: `Canonical test metadata only: ${example.economicCostOfError}.`,
    marketContext: example.role,
    analystThesis: example.analysis.thesis
  };

  const commonStages = [
    stage("intake", "Intake", 0, "INTAKE", "Case or request enters the workflow."),
    stage("evidence", "Evidence", 1, "EVIDENCE_COLLECTION", "Relevant context and evidence are assembled."),
    stage("decision", "Decision", 2, "DECISION", "Agent, rule, or human recommends a decision."),
    stage("human_review", "Human review", 3, "HUMAN_REVIEW", "Human reviewer approves, overrides, or escalates."),
    stage("execution", "Action", 4, "EXECUTION", "The actual action is taken."),
    stage("outcome", "Outcome", 5, "OUTCOME", "Reality later reveals an outcome."),
    stage("grade", "Grade", 6, "GRADING", "The decision/action is graded where possible.")
  ];

  const commonLearning: NormalizedLearningArchitectureInput = {
    capturesContext: "YES",
    capturesAgentDecision: "YES",
    capturesHumanDecision: example.analysis.capturesOverrides ?? "UNKNOWN",
    capturesActionTaken: example.analysis.controlsAction === "Recommends only" ? "PARTIAL" : example.analysis.controlsAction ?? "UNKNOWN",
    capturesOutcome: example.analysis.observesOutcome ?? "UNKNOWN",
    capturesExplicitGrade: example.analysis.capturesGrades ?? "UNKNOWN",
    outcomeCompletionMechanism: "Derived from scorebook rows when outcomes exist; otherwise analyst assumption.",
    gradeGenerationMethod: "Synthetic canonical fixtures use illustrative grades; observed grades require future source evidence.",
    feedbackLatencyMechanism: "Derived from decision/outcome timestamps when present.",
    pooledAcrossCustomers: example.analysis.learnsAcrossCustomers ?? "UNKNOWN",
    customerSpecificAdaptation: "UNKNOWN",
    usesHumanOverridesForLearning: example.analysis.capturesOverrides ?? "UNKNOWN",
    usesOutcomeGradesForLearning: example.analysis.capturesGrades ?? "UNKNOWN",
    experimentationMode: example.analysis.runsControlledExperiments ?? "UNKNOWN",
    modelUpdateCadence: example.analysis.updatesModelPolicyRegularly ?? "UNKNOWN",
    policyUpdateCadence: example.analysis.updatesModelPolicyRegularly ?? "UNKNOWN",
    deploymentMode: "Unknown / not assessed",
    deploymentCadence: example.analysis.deploysImprovementsQuickly ?? "UNKNOWN",
    humanApprovalForPolicyChanges: "UNKNOWN",
    canRetainCases: "UNKNOWN",
    canRetainDerivedFeatures: "UNKNOWN",
    canTrainAcrossCustomers: example.analysis.contractualLearningRights ?? "UNKNOWN",
    canUseForEvaluation: "UNKNOWN",
    contractualRestrictions: example.analysis.contractualLearningRights,
    notes: "Canonical test architecture metadata; not verified operating-company evidence."
  };

  const competitiveArchitecture: NormalizedCompetitiveArchitectureInput = {
    rawCasesExclusive: example.analysis.dataExclusivity ?? "UNKNOWN",
    outcomesExclusive: example.analysis.dataExclusivity ?? "UNKNOWN",
    humanCorrectionsExclusive: example.analysis.dataExclusivity ?? "UNKNOWN",
    crossCustomerPoolExclusive: example.analysis.dataExclusivity ?? "UNKNOWN",
    customerCanExportData: "UNKNOWN",
    competitorCanAccessEquivalentData: example.analysis.rebuildability ?? "UNKNOWN",
    systemOfRecord: example.analysis.workflowEmbeddedness ?? "UNKNOWN",
    systemOfDecision: example.analysis.ownsDecisionPoint ?? "UNKNOWN",
    systemOfAction: example.analysis.controlsAction ?? "UNKNOWN",
    systemOfOutcomeCapture: example.analysis.observesOutcome ?? "UNKNOWN",
    integrationDepth: example.analysis.workflowEmbeddedness,
    replacementComplexity: example.analysis.switchingCostsAssumption,
    publicDataSubstitutionRisk: example.analysis.rebuildability,
    syntheticDataSubstitutionRisk: example.id === "aaru" || example.id === "creative-agent" ? "High" : "Unknown",
    foundationModelSubstitutionRisk: example.analysis.foundationModelDependence,
    competitorRelearningDifficulty: example.historicalCaseDependence,
    deterministicInfrastructureStrength: example.analysis.deterministicInfrastructure,
    distributionAdvantage: example.analysis.distributionAdvantage,
    regulatoryBarrierStrength: example.analysis.regulatoryContractualBarriers,
    contractualBarrierStrength: example.analysis.regulatoryContractualBarriers,
    notes: "Competitive architecture assumptions support Helmer interpretation but do not prove Power."
  };

  const environment: NormalizedEnvironmentInput = {
    naturalCaseFrequency: example.caseFrequency,
    estimatedCasesPerPeriod: null,
    frequencyPeriod: "month",
    typicalEconomicCostOfError: example.economicCostOfError,
    typicalValueOfCorrectDecision: example.economicCostOfError,
    outcomeObservability: example.analysis.observesOutcome,
    outcomeObjectivity: example.gradeObjectivity,
    naturalFeedbackLatencyDays: null,
    customerHeterogeneity: example.analysis.customerCaseHeterogeneity,
    caseHeterogeneity: example.analysis.customerCaseHeterogeneity,
    environmentalNonstationarity: example.analysis.environmentalChangeRate,
    regulatoryChangeRate: "Unknown / not assessed",
    foundationModelImprovementRate: example.analysis.foundationModelImprovementRate,
    notes: "Environment values are canonical-test assumptions unless separately sourced."
  };

  const genericActions = [
    action("APPROVE_CLAIM", "Approve claim", "Approve or accept the requested action.", "MODERATE", true),
    action("DENY_CLAIM", "Deny claim", "Deny or reject the requested action.", "MODERATE", true),
    action("REQUEST_MORE_EVIDENCE", "Request more evidence", "Ask for more evidence before resolution.", "EASY", false),
    action("ESCALATE_FOR_REVIEW", "Escalate for review", "Route to specialist or fraud review.", "EASY", true),
    action("RECOMMEND_THEME", "Recommend theme", "Recommend a synthesized research theme.", "EASY", false),
    action("RECOMMEND_SEGMENT", "Recommend segment", "Recommend a segment or audience interpretation.", "EASY", false),
    action("RECOMMEND_FOLLOW_UP", "Recommend follow-up", "Ask for more research or evidence.", "EASY", false),
    action("DEFER_CONCLUSION", "Defer conclusion", "Defer until evidence improves.", "EASY", false),
    action("SUPPORT_THESIS", "Support thesis", "Support the proposed analytical thesis.", "EASY", false),
    action("CHALLENGE_THESIS", "Challenge thesis", "Challenge the proposed analytical thesis.", "EASY", false),
    action("RANK_ALTERNATIVE", "Rank alternative", "Rank candidate alternatives.", "EASY", false),
    action("ACCEPT", "Accept", "Accept a structured operational action.", "MODERATE", false),
    action("REJECT", "Reject", "Reject a structured operational action.", "MODERATE", false),
    action("ROUTE_EXCEPTION", "Route exception", "Route exception for operational handling.", "EASY", true),
    action("REQUEST_SOURCE_DOCUMENT", "Request source document", "Request source documentation.", "EASY", false),
    action("SHIP_VARIANT", "Ship variant", "Ship creative or message variant.", "MODERATE", false),
    action("REWRITE", "Rewrite", "Rewrite creative or message.", "EASY", false),
    action("TEST_AGAINST_CONTROL", "Test against control", "Run a comparative creative test.", "EASY", false)
  ];

  const workflow = baseWorkflow(example, commonStages, [
    decisionClass({
      key: "primary_decision",
      stageKey: "decision",
      name: example.principalDecision.replace(/\.$/, ""),
      description: example.canonicalQuestion,
      decisionMakerType: example.analysis.ownsDecisionPoint === "Yes" ? "HYBRID" : "UNKNOWN",
      decisionFrequency: example.caseFrequency,
      estimatedCasesPerPeriod: null,
      frequencyPeriod: "month",
      economicStakes: example.economicCostOfError.toUpperCase().includes("HIGH") ? "HIGH" : example.economicCostOfError.toUpperCase().includes("LOW") ? "LOW" : "MEDIUM",
      reversibility: example.id === "creative-agent" ? "MODERATE" : "UNKNOWN",
      regulatoryRisk: example.id === "maybern" ? "HIGH" : "UNKNOWN",
      operationalRisk: example.economicCostOfError.toUpperCase().includes("HIGH") ? "HIGH" : "UNKNOWN",
      outcomeObservability: example.analysis.observesOutcome === "Yes" ? "HIGH" : example.analysis.observesOutcome === "No" ? "LOW" : "PARTIAL",
      gradeObjectivity: example.gradeObjectivity.toUpperCase().includes("OBJECTIVE") || example.gradeObjectivity.toUpperCase().includes("HIGH") ? "MOSTLY_OBJECTIVE" : example.gradeObjectivity.toUpperCase().includes("LOW") || example.gradeObjectivity.toUpperCase().includes("SUBJECTIVE") ? "SUBJECTIVE" : "MIXED",
      naturalFeedbackLatencyDays: null,
      humanReviewMode: example.analysis.controlsAction === "Recommends only" ? "REQUIRED" : "EXCEPTION",
      currentAutonomyMode: example.analysis.controlsAction === "Recommends only" ? "RECOMMEND_ONLY" : "HUMAN_APPROVAL",
      actionKeys: genericActions.map((item) => item.key)
    })
  ], genericActions);

  if (example.id === "casap") {
    workflow.name = "Dispute resolution";
    workflow.decisionClasses = [
      decisionClass({ ...workflow.decisionClasses[0], key: "classify_dispute", name: "Classify dispute", description: "Classify incoming disputes by policy, evidence, and fraud signals.", economicStakes: "HIGH", outcomeObservability: "HIGH", gradeObjectivity: "MOSTLY_OBJECTIVE", humanReviewMode: "SAMPLE", currentAutonomyMode: "BOUNDED_AUTONOMY", actionKeys: ["REQUEST_MORE_EVIDENCE", "ESCALATE_FOR_REVIEW"] }),
      decisionClass({ ...workflow.decisionClasses[0], key: "request_evidence", name: "Request evidence", description: "Decide whether more evidence is required before resolution.", economicStakes: "MEDIUM", outcomeObservability: "HIGH", gradeObjectivity: "MIXED", humanReviewMode: "SAMPLE", currentAutonomyMode: "BOUNDED_AUTONOMY", actionKeys: ["REQUEST_MORE_EVIDENCE", "APPROVE_CLAIM", "DENY_CLAIM"] }),
      decisionClass({ ...workflow.decisionClasses[0], key: "recommend_resolution", name: "Recommend resolution", description: "Recommend approve, deny, refund, or related dispute outcome.", economicStakes: "HIGH", outcomeObservability: "HIGH", gradeObjectivity: "MOSTLY_OBJECTIVE", humanReviewMode: "EXCEPTION", currentAutonomyMode: "HUMAN_APPROVAL", actionKeys: ["APPROVE_CLAIM", "DENY_CLAIM", "REQUEST_MORE_EVIDENCE"] }),
      decisionClass({ ...workflow.decisionClasses[0], key: "fraud_escalation", name: "Escalate suspected fraud", description: "Escalate suspicious or high-risk cases for fraud review.", economicStakes: "VERY_HIGH", outcomeObservability: "PARTIAL", gradeObjectivity: "MOSTLY_OBJECTIVE", humanReviewMode: "REQUIRED", currentAutonomyMode: "RECOMMEND_ONLY", actionKeys: ["ESCALATE_FOR_REVIEW", "REQUEST_MORE_EVIDENCE"] })
    ];
  }

  return {
    profile,
    workflow,
    environment,
    learningArchitecture: commonLearning,
    competitiveArchitecture,
    evidence: [
      {
        entityType: "company_profile",
        entityKey: "profile",
        fieldKey: "name",
        evidenceType: example.id === "creative-agent" ? "SYNTHETIC_ASSUMPTION" : "PUBLIC_SOURCE",
        epistemicStatus: example.id === "creative-agent" ? "ASSUMED" : "UNKNOWN",
        valueSnapshot: example.companyName,
        sourceLabel: example.id === "creative-agent" ? "Synthetic archetype" : "Public-company archetype; source verification pending",
        confidence: example.id === "creative-agent" ? "HIGH" : "LOW"
      },
      {
        entityType: "case_set",
        entityKey: "canonical_case_set",
        fieldKey: "provenanceLabel",
        evidenceType: "SYNTHETIC_ASSUMPTION",
        epistemicStatus: "ASSUMED",
        valueSnapshot: example.syntheticDatasetLabel,
        sourceLabel: example.syntheticDatasetLabel,
        confidence: "HIGH"
      },
      {
        entityType: "environment",
        entityKey: "environment",
        fieldKey: "naturalCaseFrequency",
        evidenceType: "SYNTHETIC_ASSUMPTION",
        epistemicStatus: "ASSUMED",
        valueSnapshot: example.caseFrequency,
        sourceLabel: "Canonical test metadata; not measured company data",
        confidence: "MEDIUM"
      },
      {
        entityType: "decision_class",
        entityKey: "primary_decision",
        fieldKey: "gradeObjectivity",
        evidenceType: "SYNTHETIC_ASSUMPTION",
        epistemicStatus: "ASSUMED",
        valueSnapshot: example.gradeObjectivity,
        sourceLabel: "Canonical test metadata; not measured company data",
        confidence: "MEDIUM"
      }
    ]
  };
}

export function decisionClassKeyForCase(example: CompoundingExample, row: ScorebookCaseInput) {
  if (example.id === "casap") {
    const type = row.caseType.toLowerCase();
    if (type.includes("evidence")) return "request_evidence";
    if (type.includes("fraud")) return "fraud_escalation";
    if (type.includes("appeal") || type.includes("exception")) return "classify_dispute";
    return "recommend_resolution";
  }
  return "primary_decision";
}

export function sourceRouteIsSafe(route: string | null | undefined) {
  if (!route) return false;
  if (!route.startsWith("/") || route.startsWith("//")) return false;
  return !/^\/(?:\\|%5c)/i.test(route) && !/[\r\n]/.test(route);
}

export function casesForCaseSet(rows: ScorebookCaseInput[], caseSetId: string | null | undefined) {
  return caseSetId ? rows.filter((row) => row.caseSetId === caseSetId) : rows;
}

function finite(value: number, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(finite(value), min), max);
}

function round(value: number, digits = 4) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function validateProbability(value: number): ValidationResult {
  const errors = Number.isInteger(value) && value >= 0 && value <= 100
    ? []
    : ["Probability must be an integer from 0 to 100."];
  return { ok: errors.length === 0, errors };
}

export function validateAssessment(input: DimensionAssessmentInput): ValidationResult {
  const errors: string[] = [];
  if (!Number.isInteger(input.score) || input.score < 0 || input.score > 5) {
    errors.push("Dimension score must be an integer from 0 to 5.");
  }
  if (!["LOW", "MEDIUM", "HIGH"].includes(input.confidence)) errors.push("Confidence must be LOW, MEDIUM, or HIGH.");
  if (!["OBSERVED", "SOURCED", "ASSUMED", "UNKNOWN"].includes(input.evidenceStatus)) {
    errors.push("Evidence status must be OBSERVED, SOURCED, ASSUMED, or UNKNOWN.");
  }
  return { ok: errors.length === 0, errors };
}

export function normalizeAssessment(input: DimensionAssessmentInput): DimensionAssessmentInput {
  const source = input.source ?? "USER";
  const evidenceStatus = source === "AI" && (input.evidenceStatus === "OBSERVED" || input.evidenceStatus === "SOURCED")
    ? "ASSUMED"
    : input.evidenceStatus;
  return {
    ...input,
    score: Math.round(clamp(input.score, 0, 5)),
    confidence: ["LOW", "MEDIUM", "HIGH"].includes(input.confidence) ? input.confidence : "LOW",
    evidenceStatus: ["OBSERVED", "SOURCED", "ASSUMED", "UNKNOWN"].includes(evidenceStatus) ? evidenceStatus : "UNKNOWN",
    source
  };
}

export function validateScenario(input: SimulationScenarioInput): ValidationResult {
  const errors: string[] = [];
  if (input.startingCases < 0) errors.push("Starting cases cannot be negative.");
  if (input.casesPerMonth < 0) errors.push("Cases per month cannot be negative.");
  if (input.feedbackDelayDays < 0) errors.push("Feedback delay cannot be negative.");
  for (const key of ["transferability", "informationValue", "learningEfficiency", "stalenessRate", "baseCapability"] as const) {
    const value = input[key];
    if (!Number.isFinite(value)) errors.push(`${key} must be numeric.`);
  }
  if (input.transferability < 0 || input.transferability > 1) errors.push("Transferability must be 0 to 1.");
  if (input.informationValue < 0 || input.informationValue > 1) errors.push("Information value must be 0 to 1.");
  if (input.learningEfficiency < 0 || input.learningEfficiency > 1) errors.push("Learning efficiency must be 0 to 1.");
  if (input.stalenessRate < 0 || input.stalenessRate > 1) errors.push("Monthly staleness rate must be 0 to 1.");
  if (input.baseCapability < 0 || input.baseCapability > 5) errors.push("Base capability must be 0 to 5.");
  return { ok: errors.length === 0, errors };
}

export function sanitizeScenario(input: SimulationScenarioInput): SimulationScenarioInput {
  return {
    ...input,
    name: input.name.trim() || "Scenario",
    startingCases: Math.max(0, Math.round(finite(input.startingCases))),
    casesPerMonth: Math.max(0, finite(input.casesPerMonth)),
    feedbackDelayDays: Math.max(0, Math.round(finite(input.feedbackDelayDays))),
    transferability: clamp(input.transferability, 0, 1),
    informationValue: clamp(input.informationValue, 0, 1),
    learningEfficiency: clamp(input.learningEfficiency, 0, 1),
    stalenessRate: clamp(input.stalenessRate, 0, 1),
    baseCapability: clamp(input.baseCapability, 0, 5)
  };
}

function asDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function ratio(numerator: number, denominator: number) {
  return denominator > 0 ? round(numerator / denominator, 4) : null;
}

function median(values: number[]) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const midpoint = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? round((sorted[midpoint - 1] + sorted[midpoint]) / 2, 2)
    : round(sorted[midpoint], 2);
}

function isResolvableGrade(grade: CompoundingCaseGrade) {
  return grade === "CORRECT" || grade === "PARTIALLY_CORRECT" || grade === "INCORRECT";
}

function isCorrectGrade(grade: CompoundingCaseGrade) {
  return grade === "CORRECT" || grade === "PARTIALLY_CORRECT";
}

function feedbackLatencyDays(row: ScorebookCaseInput) {
  const decisionAt = asDate(row.decisionAt);
  const outcomeAt = asDate(row.outcomeAt);
  if (!decisionAt || !outcomeAt || outcomeAt < decisionAt) return null;
  return (outcomeAt.getTime() - decisionAt.getTime()) / (24 * 60 * 60 * 1000);
}

export const SCOREBOOK_CASE_FIELD_CLASSIFICATION = {
  sourceRawFields: [
    "externalCaseId",
    "customerSegment",
    "caseType",
    "context",
    "agentDecision",
    "agentConfidence",
    "humanDecision",
    "humanOverride",
    "actionTaken",
    "outcome",
    "outcomeValue",
    "grade",
    "gradeConfidence",
    "decisionAt",
    "actionAt",
    "outcomeAt",
    "isEdgeCase",
    "isSynthetic",
    "sourceLabel",
    "sourceRecordId",
    "sourceRecordType",
    "sourceRecordRoute",
    "notes"
  ],
  ceDerivedFields: [
    "feedbackLatencyDays",
    "resolvedStatus",
    "decisionClassLabel",
    "flags"
  ]
} as const;

export function deriveCaseFeedbackLatencyDays(row: ScorebookCaseInput) {
  return feedbackLatencyDays(row);
}

export function deriveCaseResolvedStatus(row: ScorebookCaseInput) {
  return Boolean(row.outcome || row.outcomeAt || row.grade !== "UNRESOLVED") ? "resolved" : "unresolved";
}

export function buildCaseDetailSequence(row: ScorebookCaseInput) {
  return [
    { label: "Context", value: row.context, fieldType: "SOURCE / RAW FIELD" },
    { label: "Agent Decision", value: row.agentDecision, fieldType: "SOURCE / RAW FIELD" },
    { label: "Human Intervention", value: row.humanDecision ?? (row.humanOverride ? "Override captured without final decision" : "No override captured"), fieldType: "SOURCE / RAW FIELD" },
    { label: "Action Taken", value: row.actionTaken, fieldType: "SOURCE / RAW FIELD" },
    { label: "Outcome", value: row.outcome, fieldType: "SOURCE / RAW FIELD" },
    { label: "Grade", value: row.grade, fieldType: "SOURCE / RAW FIELD" }
  ] as const;
}

function actionLatencyDays(row: ScorebookCaseInput) {
  const decisionAt = asDate(row.decisionAt);
  const actionAt = asDate(row.actionAt);
  if (!decisionAt || !actionAt || actionAt < decisionAt) return null;
  return (actionAt.getTime() - decisionAt.getTime()) / (24 * 60 * 60 * 1000);
}

function distribution<T extends string>(values: T[], total: number) {
  const counts = new Map<T, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count, share: ratio(count, total) }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export function scorebookRowsAreSynthetic(rows: ScorebookCaseInput[]) {
  return rows.length > 0 && rows.every((row) => row.isSynthetic);
}

export function calculateScorebookMetrics(rows: ScorebookCaseInput[]): ScorebookMetrics {
  const totalCases = rows.length;
  const resolvedRows = rows.filter((row) => Boolean(row.outcome || row.outcomeAt || row.grade !== "UNRESOLVED"));
  const gradedRows = rows.filter((row) => isResolvableGrade(row.grade));
  const correctRows = gradedRows.filter((row) => isCorrectGrade(row.grade));
  const overrideRows = rows.filter((row) => row.humanOverride && row.humanDecision && row.humanDecision !== row.agentDecision);
  const overrideResolvable = overrideRows.filter((row) => isResolvableGrade(row.grade));
  const overrideCorrect = overrideResolvable.filter((row) => isCorrectGrade(row.grade));
  const overrideIncorrect = overrideResolvable.filter((row) => row.grade === "INCORRECT");
  const latencyValues = rows.map(feedbackLatencyDays).filter((value): value is number => value !== null);
  const outcomeValues = rows.map((row) => row.outcomeValue).filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const overrideOutcomeValues = overrideRows.map((row) => row.outcomeValue).filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  const totalOutcomeValue = outcomeValues.length ? round(outcomeValues.reduce((sum, value) => sum + value, 0), 2) : null;
  const overrideTotalOutcomeValue = overrideOutcomeValues.length
    ? round(overrideOutcomeValues.reduce((sum, value) => sum + value, 0), 2)
    : null;

  return {
    totalCases,
    resolvedCases: resolvedRows.length,
    gradedCases: gradedRows.length,
    outcomeCompletionRate: ratio(resolvedRows.length, totalCases),
    gradeCoverage: ratio(gradedRows.length, totalCases),
    agentCorrectnessRate: ratio(correctRows.length, gradedRows.length),
    humanOverrideRate: ratio(overrideRows.length, totalCases),
    medianFeedbackLatencyDays: median(latencyValues),
    feedbackLatencySampleSize: latencyValues.length,
    edgeCaseShare: ratio(rows.filter((row) => row.isEdgeCase).length, totalCases),
    outcomeValueSampleSize: outcomeValues.length,
    totalOutcomeValue,
    averageOutcomeValue: totalOutcomeValue !== null ? round(totalOutcomeValue / outcomeValues.length, 2) : null,
    syntheticCaseCount: rows.filter((row) => row.isSynthetic).length,
    humanOverrideValue: {
      count: overrideRows.length,
      shareOfCases: ratio(overrideRows.length, totalCases),
      resolvableCount: overrideResolvable.length,
      correctCount: overrideCorrect.length,
      incorrectCount: overrideIncorrect.length,
      correctRate: ratio(overrideCorrect.length, overrideResolvable.length),
      incorrectRate: ratio(overrideIncorrect.length, overrideResolvable.length),
      outcomeValueSampleSize: overrideOutcomeValues.length,
      totalOutcomeValue: overrideTotalOutcomeValue,
      averageOutcomeValue: overrideTotalOutcomeValue !== null ? round(overrideTotalOutcomeValue / overrideOutcomeValues.length, 2) : null
    }
  };
}

export function scorebookDerivedSimulatorValues(rows: ScorebookCaseInput[]): ScorebookDerivedSimulatorValues {
  const gradedRows = rows.filter((row) => isResolvableGrade(row.grade));
  const latencyValues = gradedRows.map(feedbackLatencyDays).filter((value): value is number => value !== null);
  return {
    startingGradedCases: gradedRows.length,
    feedbackDelayDays: median(latencyValues),
    feedbackDelaySampleSize: latencyValues.length
  };
}

export function deriveDecisionSystemMetrics(rows: ScorebookCaseInput[]): DecisionSystemDerivedMetrics {
  const totalCases = rows.length;
  const scorebook = calculateScorebookMetrics(rows);
  const actionLatencyValues = rows.map(actionLatencyDays).filter((value): value is number => value !== null);
  const outcomeLatencyValues = rows.map(feedbackLatencyDays).filter((value): value is number => value !== null);
  const actionValues = rows
    .map((row) => row.actionTaken ?? row.humanDecision ?? row.agentDecision)
    .filter((value): value is string => Boolean(value));
  const decisionDates = rows.map((row) => asDate(row.decisionAt)).filter((value): value is Date => value !== null);
  const windowStart = decisionDates.length ? new Date(Math.min(...decisionDates.map((date) => date.getTime()))) : null;
  const windowEnd = decisionDates.length ? new Date(Math.max(...decisionDates.map((date) => date.getTime()))) : null;
  const windowDays = windowStart && windowEnd
    ? Math.max(1, (windowEnd.getTime() - windowStart.getTime()) / (24 * 60 * 60 * 1000))
    : null;

  return {
    totalCases,
    resolvedCases: scorebook.resolvedCases,
    gradedCases: scorebook.gradedCases,
    gradeCoverage: scorebook.gradeCoverage,
    outcomeCompletionRate: scorebook.outcomeCompletionRate,
    medianDecisionToActionLatencyDays: median(actionLatencyValues),
    medianDecisionToOutcomeLatencyDays: median(outcomeLatencyValues),
    humanOverrideRate: scorebook.humanOverrideRate,
    actionDistribution: distribution(actionValues, totalCases),
    gradeDistribution: distribution(rows.map((row) => row.grade), totalCases),
    edgeCaseShare: scorebook.edgeCaseShare,
    totalOutcomeValue: scorebook.totalOutcomeValue,
    averageOutcomeValue: scorebook.averageOutcomeValue,
    customerSegmentCount: new Set(rows.map((row) => row.customerSegment).filter(Boolean)).size,
    caseTypeCount: new Set(rows.map((row) => row.caseType).filter(Boolean)).size,
    observedDecisionVolume: {
      count: decisionDates.length,
      windowStart,
      windowEnd,
      days: windowDays,
      casesPerMonth: windowDays === null ? null : round(decisionDates.length / windowDays * 30, 2)
    }
  };
}

export function summarizeEvidenceCoverage(records: Array<{ epistemicStatus: string }>): EvidenceCoverageSummary {
  return records.reduce<EvidenceCoverageSummary>((summary, record) => {
    const status = record.epistemicStatus.toUpperCase();
    if (status === "DERIVED" || status === "OBSERVED") summary.derived += 1;
    else if (status === "SOURCED") summary.sourced += 1;
    else if (status === "ASSUMED") summary.assumed += 1;
    else if (status === "INFERRED") summary.inferred += 1;
    else summary.unknown += 1;
    return summary;
  }, { derived: 0, sourced: 0, assumed: 0, inferred: 0, unknown: 0 });
}

export function simulateScenario(input: SimulationScenarioInput, months = 36): SimulationSeries {
  const scenario = sanitizeScenario(input);
  const delayMonths = Math.max(0, Math.ceil(scenario.feedbackDelayDays / 30));
  const pending: number[] = [];
  let effectiveExperience = scenario.startingCases;
  const points: SimulationPoint[] = [];

  for (let month = 0; month <= months; month++) {
    const expertise = scenario.baseCapability
      + scenario.learningEfficiency
      * scenario.informationValue
      * scenario.transferability
      * Math.log(1 + Math.max(0, effectiveExperience));

    points.push({
      month,
      effectiveExperience: round(effectiveExperience, 2),
      expertise: round(expertise, 4),
      maturedCases: 0
    });

    if (month === months) break;
    pending.push(scenario.casesPerMonth);
    const maturedCases = delayMonths === 0
      ? pending.shift() ?? 0
      : pending.length > delayMonths
        ? pending.shift() ?? 0
        : 0;
    effectiveExperience = (1 - scenario.stalenessRate) * effectiveExperience + maturedCases;
    points[points.length - 1].maturedCases = round(maturedCases, 2);
  }

  return { scenario, points };
}

export function simulateComparison(scenarios: SimulationScenarioInput[], months = 36) {
  return scenarios.map((scenario) => simulateScenario(scenario, months));
}

export function detectCrossover(a: SimulationSeries, b: SimulationSeries): Crossover | null {
  const max = Math.min(a.points.length, b.points.length);
  for (let index = 1; index < max; index++) {
    const previousDelta = a.points[index - 1].expertise - b.points[index - 1].expertise;
    const currentDelta = a.points[index].expertise - b.points[index].expertise;
    if (previousDelta === 0) continue;
    if ((previousDelta > 0 && currentDelta <= 0) || (previousDelta < 0 && currentDelta >= 0)) {
      return {
        month: a.points[index].month,
        from: previousDelta > 0 ? a.scenario.name : b.scenario.name,
        to: previousDelta > 0 ? b.scenario.name : a.scenario.name
      };
    }
  }
  return null;
}

export function explainSimulatorComparison(series: SimulationSeries[], crossover: Crossover | null) {
  if (series.length < 2) return "Add two scenarios to compare trajectories. This is an exploratory scenario, not a forecast.";
  const [a, b] = series;
  const aEnd = a.points[a.points.length - 1]?.expertise ?? 0;
  const bEnd = b.points[b.points.length - 1]?.expertise ?? 0;
  const leader = aEnd >= bEnd ? a : b;
  const trailer = aEnd >= bEnd ? b : a;
  const reasons: string[] = [];
  if (leader.scenario.startingCases > trailer.scenario.startingCases * 1.5) reasons.push("a larger starting stock of graded cases");
  if (leader.scenario.feedbackDelayDays < trailer.scenario.feedbackDelayDays) reasons.push("faster modeled feedback maturation");
  if (leader.scenario.learningEfficiency > trailer.scenario.learningEfficiency) reasons.push("higher learning efficiency");
  if (leader.scenario.baseCapability > trailer.scenario.baseCapability) reasons.push("higher base/foundation-model capability");
  if (leader.scenario.transferability > trailer.scenario.transferability) reasons.push("stronger assumed transferability");
  if (leader.scenario.stalenessRate < trailer.scenario.stalenessRate) reasons.push("slower modeled staleness");
  const reasonText = reasons.length ? reasons.join(", ") : "small combined parameter differences";

  if (crossover) {
    return `${crossover.to} overtakes ${crossover.from} around month ${crossover.month} in this toy model because ${reasonText}. This is an exploratory scenario, not a forecast.`;
  }
  return `${leader.scenario.name} remains ahead over the modeled horizon primarily because of ${reasonText}. This is an exploratory scenario, not a forecast.`;
}

export function defaultAssessments(): DimensionAssessmentInput[] {
  return ALL_DIMENSIONS.map((definition) => ({
    framework: definition.framework,
    dimension: definition.dimension,
    score: 0,
    confidence: "LOW",
    rationale: "",
    evidenceStatus: "UNKNOWN",
    source: "USER"
  }));
}

export const DIAGNOSTIC_QUESTIONS = [
  {
    title: "Is valuable expertise being created?",
    description: "Does each case teach something decision-relevant, economically meaningful, and causally interpretable?",
    items: [
      { framework: "SUN", dimension: "objective_grading" },
      { framework: "SUN", dimension: "economic_value_of_being_right" },
      { framework: "WOLFE", dimension: "marginal_information_gain" },
      { framework: "WOLFE", dimension: "causal_quality" }
    ]
  },
  {
    title: "Does the expertise compound?",
    description: "Does feedback arrive fast enough, remain fresh, cover edge cases, and transfer across customers?",
    items: [
      { framework: "SUN", dimension: "feedback_speed" },
      { framework: "SUN", dimension: "freshness" },
      { framework: "SUN", dimension: "cross_customer_learning" },
      { framework: "SUN", dimension: "diversity_edge_cases" },
      { framework: "WOLFE", dimension: "cross_customer_transferability" },
      { framework: "WOLFE", dimension: "customer_heterogeneity" },
      { framework: "WOLFE", dimension: "nonstationarity" },
      { framework: "WOLFE", dimension: "learning_efficiency" }
    ]
  },
  {
    title: "Is the expertise defensible?",
    description: "Can competitors reproduce, compress, infer, or legally access the useful learning loop?",
    items: [
      { framework: "SUN", dimension: "workflow_capture_position" },
      { framework: "SUN", dimension: "contractual_rights_consent" },
      { framework: "WOLFE", dimension: "knowledge_compressibility" }
    ]
  }
] satisfies Array<{
  title: string;
  description: string;
  items: Array<{ framework: CompoundingFramework; dimension: string }>;
}>;

export function sortedHighLeverageDebates(debates: KeyDebateInput[], take = 4) {
  return [...debates]
    .sort((a, b) => Math.abs(50 - a.probability) - Math.abs(50 - b.probability))
    .slice(0, take);
}

export function strongestEvidence(assessments: DimensionAssessmentInput[], take = 3) {
  return assessments
    .filter((item) => item.score >= 4)
    .sort((a, b) => b.score - a.score)
    .slice(0, take);
}

export function strongestChallenges(assessments: DimensionAssessmentInput[], take = 3) {
  return assessments
    .filter((item) => item.score <= 2)
    .sort((a, b) => a.score - b.score)
    .slice(0, take);
}

export function apparentPowerLocations(assessments: DimensionAssessmentInput[]) {
  const labels = new Set<string>();
  for (const item of assessments) {
    if (item.score < 4 || item.confidence === "LOW") continue;
    if (item.framework === "SUN") {
      if (item.dimension === "workflow_capture_position") labels.add("capture point");
      if (["objective_grading", "feedback_speed", "diversity_edge_cases", "cross_customer_learning"].includes(item.dimension)) labels.add("scorebook");
    }
    if (item.framework === "HELMER") {
      const label = HELMER_POWERS.find((power) => power.dimension === item.dimension)?.label;
      if (label) labels.add(label);
    }
  }
  if (labels.size > 1) labels.add("combination");
  if (labels.size === 0) labels.add("no demonstrated Power yet");
  return [...labels];
}

function includesAny(values: Array<string | null | undefined>, targets: string[]) {
  return values.some((value) => value ? targets.includes(value) : false);
}

export function summarizeConclusion(input: {
  analysis: CompanyThesisInput;
  metrics: ScorebookMetrics;
  assessments: DimensionAssessmentInput[];
  debates: KeyDebateInput[];
}) {
  const opportunityFavorable = includesAny([
    input.analysis.economicCostWrongDecision,
    input.analysis.outcomeObjectivity,
    input.analysis.naturalFeedbackTime
  ], ["High", "Objective / deterministic", "Minutes", "Days", "Weeks"]);
  const opportunityUnfavorable = includesAny([
    input.analysis.outcomeObjectivity,
    input.analysis.foundationModelImprovementRate,
    input.analysis.environmentalChangeRate
  ], ["Subjective", "Fast", "Rapidly changing"]);
  const capabilityStrongCount = [
    input.analysis.ownsDecisionPoint,
    input.analysis.observesOutcome,
    input.analysis.capturesOverrides,
    input.analysis.capturesGrades,
    input.analysis.learnsAcrossCustomers,
    input.analysis.contractualLearningRights,
    input.analysis.runsControlledExperiments,
    input.analysis.updatesModelPolicyRegularly,
    input.analysis.deploysImprovementsQuickly
  ].filter((value) => value === "Yes").length;
  const capabilityWeakCount = [
    input.analysis.ownsDecisionPoint,
    input.analysis.observesOutcome,
    input.analysis.capturesGrades,
    input.analysis.learnsAcrossCustomers,
    input.analysis.contractualLearningRights
  ].filter((value) => value === "No").length;
  const evidenceQuality = input.metrics.totalCases < 5 || input.metrics.gradeCoverage === null || input.metrics.gradeCoverage < 0.35
    ? "Weak / insufficient"
    : input.metrics.gradeCoverage >= 0.75 && input.metrics.feedbackLatencySampleSize >= 5
      ? "Strong"
      : "Partial";
  const biggestDebate = sortedHighLeverageDebates(input.debates, 1)[0] ?? null;
  const nextExperiment = biggestDebate?.evidenceNeeded
    || (input.metrics.humanOverrideValue.count > 0
      ? "Compare human overrides with eventual outcomes to determine whether overrides add decision value."
      : "Run a held-out-customer test to see whether pooled experience improves decisions beyond customer-specific history.");

  return {
    opportunity: opportunityFavorable && !opportunityUnfavorable ? "Favorable" : opportunityUnfavorable && !opportunityFavorable ? "Unfavorable" : "Uncertain",
    opportunityWhy: "Based on exogenous assumptions about decision value, outcome objectivity, feedback timing, nonstationarity, and model improvement.",
    capability: capabilityStrongCount >= 6 && capabilityWeakCount === 0 ? "Strong" : capabilityWeakCount >= 2 ? "Weak" : "Uncertain",
    capabilityWhy: "Based on endogenous assumptions about capture position, outcome visibility, override/grade capture, rights, experimentation, and deployment velocity.",
    evidenceQuality,
    evidenceWhy: `Based on ${input.metrics.totalCases} cases, ${input.metrics.gradedCases} graded rows, and ${input.metrics.feedbackLatencySampleSize} latency observations.`,
    biggestDebate,
    nextExperiment
  };
}

export function composeMemo(input: {
  analysis: CompanyThesisInput;
  debates: KeyDebateInput[];
  assessments: DimensionAssessmentInput[];
}) {
  const evidence = strongestEvidence(input.assessments);
  const challenges = strongestChallenges(input.assessments);
  const unresolved = sortedHighLeverageDebates(input.debates);
  const power = apparentPowerLocations(input.assessments);

  return {
    currentThesis: input.analysis.thesis,
    strongestEvidence: evidence.map((item) => `${item.framework}: ${item.dimension} scored ${item.score}/5 (${item.evidenceStatus.toLowerCase()}). ${item.rationale || "No rationale supplied."}`),
    strongestChallenges: challenges.map((item) => `${item.framework}: ${item.dimension} scored ${item.score}/5 (${item.evidenceStatus.toLowerCase()}). ${item.rationale || "No rationale supplied."}`),
    unresolvedDebates: unresolved.map((debate) => ({
      question: debate.question,
      probability: debate.probability,
      increaseBelief: debate.increaseBelief,
      decreaseBelief: debate.decreaseBelief
    })),
    powerLocations: power,
    evidenceRequests: unresolved.slice(0, 3).map((debate) => debate.evidenceNeeded),
    wolfeStressTest:
      "Could the useful information in the historical scorebook be compressed, inferred, simulated, or relearned by a capable challenger?"
  };
}
