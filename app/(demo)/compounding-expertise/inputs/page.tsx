import Link from "next/link";
import type { ReactNode } from "react";
import { Section } from "@/components/site/Section";
import { EpistemicBadge, IntegrityNotice, LabWorkflowRail } from "@/components/compounding-expertise/CompoundingLabComponents";
import {
  COMPETITIVE_INPUTS,
  COMPANY_MODEL_GATES,
  ENDOGENOUS_INPUTS,
  EXOGENOUS_INPUTS,
  caseSetDerivedProvenanceLabel,
  canonicalExampleForCompany,
  casesForCaseSet,
  deriveDecisionSystemMetrics,
  scorebookRowsAreSynthetic,
  summarizeEvidenceCoverage,
  type CompanyThesisInput,
  type GuidedProvenanceLabel,
  type ScorebookCaseInput,
  type StructuredInputDefinition
} from "@/lib/compounding-expertise-lab";
import { saveAnalysisAction } from "../actions";
import { currentAccountUserId, loadCompoundingAnalysis } from "../data";

export const dynamic = "force-dynamic";

function StructuredControl({
  analysis,
  definition
}: {
  analysis: Partial<CompanyThesisInput> | null;
  definition: StructuredInputDefinition;
}) {
  const value = analysis?.[definition.key] ?? "";
  return (
    <label className="compoundingStructuredControl">
      <span>
        <strong>{definition.label}</strong>
        <EpistemicBadge kind={definition.epistemicKind} />
      </span>
      <small>{definition.description}</small>
      <select name={definition.key} defaultValue={value}>
        <option value="">Unknown / not assessed</option>
        {definition.options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function display(value: string | number | null | undefined, fallback = "Unknown") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function pct(value: number | null) {
  return value === null ? "Unavailable" : `${Math.round(value * 100)}%`;
}

function days(value: number | null | undefined) {
  return value === null || value === undefined ? "Unknown" : `${value} days`;
}

function profileFacts(analysis: NonNullable<Awaited<ReturnType<typeof loadCompoundingAnalysis>>>) {
  const profile = analysis.companyProfile;
  return {
    name: profile?.name ?? analysis.companyName,
    website: profile?.website ?? analysis.companyUrl,
    category: profile?.productCategory ?? analysis.productCategory,
    productDescription: profile?.productDescription ?? analysis.productDescription,
    customer: profile?.customerType ?? analysis.targetCustomer,
    customerSegments: profile?.customerSegments ?? "Unknown / not assessed",
    businessModel: profile?.businessModelNotes ?? analysis.businessModel,
    stage: profile?.companyStage ?? analysis.companyStage,
    thesis: profile?.analystThesis ?? analysis.thesis
  };
}

function caseInput(row: NonNullable<Awaited<ReturnType<typeof loadCompoundingAnalysis>>>["scorebookCases"][number]): ScorebookCaseInput {
  return {
    id: row.id,
    caseSetId: row.caseSetId,
    decisionClassId: row.decisionClassId,
    agentDecisionActionId: row.agentDecisionActionId,
    humanDecisionActionId: row.humanDecisionActionId,
    actionTakenActionId: row.actionTakenActionId,
    externalCaseId: row.externalCaseId,
    customerSegment: row.customerSegment,
    caseType: row.caseType,
    context: row.context,
    agentDecision: row.agentDecision,
    agentConfidence: row.agentConfidence,
    humanDecision: row.humanDecision,
    humanOverride: row.humanOverride,
    actionTaken: row.actionTaken,
    outcome: row.outcome,
    outcomeValue: row.outcomeValue,
    grade: row.grade,
    gradeConfidence: row.gradeConfidence,
    decisionAt: row.decisionAt,
    actionAt: row.actionAt,
    outcomeAt: row.outcomeAt,
    isEdgeCase: row.isEdgeCase,
    isSynthetic: row.isSynthetic,
    sourceLabel: row.sourceLabel,
    sourceRecordId: row.sourceRecordId,
    sourceRecordType: row.sourceRecordType,
    sourceRecordRoute: row.sourceRecordRoute,
    notes: row.notes
  };
}

function evidenceLabel(status: string | null | undefined) {
  const normalized = String(status ?? "UNKNOWN").toUpperCase();
  if (normalized === "OBSERVED") return "OBSERVED — COMPANY DATA";
  if (normalized === "DERIVED") return "DERIVED — COMPANY DATA";
  if (normalized === "SOURCED") return "SOURCED — EXTERNAL EVIDENCE";
  if (normalized === "ASSUMED") return "ANALYST ASSUMPTION";
  if (normalized === "INFERRED") return "MODEL INFERENCE";
  return "UNKNOWN / DILIGENCE REQUIRED";
}

function includesAny(value: string | number | null | undefined, terms: string[]) {
  const normalized = String(value ?? "").toUpperCase();
  return terms.some((term) => normalized.includes(term));
}

function captureState(value: string | number | null | undefined) {
  const normalized = String(value ?? "").toUpperCase();
  if (!normalized || normalized.includes("UNKNOWN")) return "UNKNOWN";
  if (normalized.includes("0/") || normalized.includes("NO") || normalized.includes("NOT CAPTURED")) return "NOT CAPTURED";
  if (normalized.includes("PARTIAL") || normalized.includes("SAMPLE") || normalized.includes("EXCEPTION")) return "PARTIAL";
  return "CAPTURED";
}

function questionConfidence(provenance: string) {
  if (provenance.includes("SYNTHETIC") || provenance.includes("ARCHETYPE")) return "ASSUMPTION-DOMINATED";
  if (provenance.includes("UNKNOWN")) return "DILIGENCE REQUIRED";
  return "EVIDENCE-SUPPORTED";
}

function gateState(answer: string) {
  const normalized = answer.toUpperCase();
  if (normalized.includes("STRONG") || normalized.includes("CLOSED") || normalized.includes("DIFFICULT") || normalized.includes("HIGH") || normalized.includes("HARD") || normalized === "YES") return "favorable";
  if (normalized.includes("CONDITIONAL") || normalized.includes("PARTIAL")) return "mixed";
  if (normalized.includes("WEAK") || normalized.includes("OPEN") || normalized.includes("EASY") || normalized.includes("LOW") || normalized === "NO") return "weak";
  return "unknown";
}

function criticalUnknowns({
  learning,
  competitive
}: {
  learning: NonNullable<Awaited<ReturnType<typeof loadCompoundingAnalysis>>>["learningArchitecture"] | null | undefined;
  competitive: NonNullable<Awaited<ReturnType<typeof loadCompoundingAnalysis>>>["competitiveArchitecture"] | null | undefined;
}) {
  const unknowns = [
    ["cross-customer transfer", learning?.pooledAcrossCustomers],
    ["contractual learning rights", learning?.canTrainAcrossCustomers],
    ["actual grade → update loop", learning?.usesOutcomeGradesForLearning],
    ["deployment of learned improvements", learning?.deploymentCadence],
    ["challenger rebuildability", competitive?.competitorRelearningDifficulty],
    ["foundation-model substitution risk", competitive?.foundationModelSubstitutionRisk]
  ];
  return unknowns
    .filter(([, value]) => includesAny(value, ["UNKNOWN", ""]))
    .map(([label]) => label)
    .slice(0, 5);
}

function QuestionNarrative({
  title,
  questionLabel,
  whyItMatters,
  possibleAnswers,
  currentInterpretation,
  provenance,
  keyEvidence,
  whyThisAnswer,
  evidenceUsed,
  changeAnswer,
  implication,
  helmerConnection,
  editHref,
  children
}: {
  title: string;
  questionLabel?: string;
  whyItMatters: string;
  possibleAnswers: string[];
  currentInterpretation: string;
  provenance: string;
  keyEvidence?: string[];
  whyThisAnswer: string[];
  evidenceUsed: string[];
  changeAnswer: string[];
  implication: string;
  helmerConnection?: string;
  editHref?: string;
  children: ReactNode;
}) {
  const evidenceChain = keyEvidence ?? evidenceUsed.slice(0, 4);
  return (
    <div className="compoundingQuestionShell">
      <div className={`card compoundingGateDetailHeader compoundingGateState-${gateState(currentInterpretation)}`}>
        <div className="compoundingGateQuestion">
          <span>{questionLabel ?? title}</span>
          <h3>{title}</h3>
        </div>
        <div className="compoundingGateAnswer">
          <span>Current answer</span>
          <strong>{currentInterpretation}</strong>
          <small>{provenance}</small>
          <small>{questionConfidence(provenance)}</small>
        </div>
      </div>
      <div className="compoundingGateDefaultView">
        <div className="compoundingGateEvidenceChain" aria-label={`${questionLabel ?? title} key evidence chain`}>
          {evidenceChain.map((item, index) => (
            <span key={item}>
              <strong>{index + 1}</strong>
              <small>{item}</small>
            </span>
          ))}
        </div>
        <div className="card compoundingGateImplication">
          <p className="small">CE / Power implication</p>
          <p>{implication}</p>
          {helmerConnection ? <p className="small">{helmerConnection}</p> : null}
          {editHref ? <a className="btn" href={editHref}>Edit assumptions</a> : null}
        </div>
      </div>
      {children}
      <details className="card compoundingDisclosure">
        <summary>Open detailed reasoning, possible answers, evidence inventory, and change tests</summary>
        <div className="compoundingQuestionDetailsGrid">
          <div>
            <h3>Why it matters</h3>
            <p>{whyItMatters}</p>
          </div>
          <div>
            <h3>Possible answers</h3>
            <ul>{possibleAnswers.map((item) => <li key={item}>{item}</li>)}</ul>
          </div>
          <div>
            <h3>Detailed why this answer</h3>
            <ul>{whyThisAnswer.map((item) => <li key={item}>{item}</li>)}</ul>
          </div>
          <div>
            <h3>Full evidence / assumption inventory</h3>
            <ul>{evidenceUsed.map((item) => <li key={item}>{item}</li>)}</ul>
          </div>
          <div>
            <h3>What would change the answer</h3>
            <ul>{changeAnswer.map((item) => <li key={item}>{item}</li>)}</ul>
          </div>
        </div>
      </details>
    </div>
  );
}

export default async function CompoundingExpertiseInputsPage({
  searchParams
}: {
  searchParams: Promise<{ example?: string; analysisId?: string }>;
}) {
  const params = await searchParams;
  const accountUserId = await currentAccountUserId();
  const analysis = await loadCompoundingAnalysis(accountUserId, params.analysisId);
  const canonicalExample = canonicalExampleForCompany(analysis?.companyName);
  const profile = analysis ? profileFacts(analysis) : null;
  const selectedCaseSet = analysis?.caseSets[0] ?? null;
  const scorebookRows = analysis?.scorebookCases.map(caseInput) ?? [];
  const activeRows = casesForCaseSet(scorebookRows, selectedCaseSet?.id);
  const activeRowsAreSynthetic = activeRows.length > 0 && scorebookRowsAreSynthetic(activeRows);
  const derived = deriveDecisionSystemMetrics(activeRows);
  const evidenceCoverage = summarizeEvidenceCoverage(analysis?.evidenceRecords ?? []);
  const coverageTotal = Object.values(evidenceCoverage).reduce((sum, value) => sum + value, 0);
  const workflow = analysis?.workflows[0] ?? null;
  const decisionClasses = workflow?.decisionClasses ?? [];
  const fallbackDecisionClass = analysis ? [{
    id: "fallback",
    name: analysis.decisionDescription || "Principal decision",
    description: analysis.actionSpace,
    decisionFrequency: analysis.caseFrequency,
    economicStakes: analysis.economicCostWrongDecision ?? "UNKNOWN",
    gradeObjectivity: analysis.outcomeObjectivity ?? "UNKNOWN",
    naturalFeedbackLatencyDays: derived.medianDecisionToOutcomeLatencyDays,
    humanReviewMode: analysis.capturesOverrides ?? "UNKNOWN",
    currentAutonomyMode: analysis.controlsAction ?? "UNKNOWN",
    outcomeObservability: analysis.observesOutcome ?? "UNKNOWN",
    actions: []
  }] : [];
  const visibleDecisionClasses = decisionClasses.length ? decisionClasses : fallbackDecisionClass;
  const opportunity = analysis?.environment;
  const learning = analysis?.learningArchitecture;
  const competitive = analysis?.competitiveArchitecture;
  const loopProvenance = caseSetDerivedProvenanceLabel({ hasRows: activeRows.length > 0, rowsAreSynthetic: activeRowsAreSynthetic });
  const loopNode = (
    label: string,
    represented: number | null,
    denominator: number,
    fallback: string | number | null | undefined,
    provenance: GuidedProvenanceLabel,
    meaning: string
  ) => {
    const value = represented === null ? fallback : `${represented}/${denominator} cases represented`;
    return {
      label,
      value,
      state: captureState(value),
      provenance,
      meaning,
      coverage: represented === null ? null : `${represented}/${denominator} active CaseSet rows`
    };
  };
  const learningLoopNodes = [
    loopNode("CONTEXT", activeRows.length ? activeRows.length : null, activeRows.length, learning?.capturesContext, loopProvenance, "Can the system retain the facts and context needed to learn from a case?"),
    loopNode("DECISION", activeRows.length ? activeRows.filter((row) => row.agentDecision).length : null, activeRows.length, learning?.capturesAgentDecision, loopProvenance, "Is the agent recommendation or decision represented?"),
    loopNode("HUMAN", activeRows.length ? activeRows.filter((row) => row.humanDecision).length : null, activeRows.length, learning?.capturesHumanDecision, loopProvenance, "Are human interventions and corrections captured?"),
    loopNode("ACTION", activeRows.length ? activeRows.filter((row) => row.actionTaken).length : null, activeRows.length, learning?.capturesActionTaken, loopProvenance, "Is the action actually taken distinct from the recommendation?"),
    loopNode("OUTCOME", activeRows.length ? activeRows.filter((row) => row.outcome).length : null, activeRows.length, learning?.capturesOutcome, loopProvenance, "Can the company observe what happened after the action?"),
    loopNode("GRADE", activeRows.length ? activeRows.filter((row) => row.grade !== "UNRESOLVED").length : null, activeRows.length, learning?.capturesExplicitGrade, loopProvenance, "Is the decision graded against an outcome or standard?"),
    loopNode("UPDATE", null, activeRows.length, learning?.usesOutcomeGradesForLearning ?? "UNKNOWN", "UNKNOWN / DILIGENCE REQUIRED", "Do grades change future policy or model behavior?"),
    loopNode("DEPLOYMENT", null, activeRows.length, learning?.deploymentCadence ?? analysis?.deploysImprovementsQuickly ?? "UNKNOWN", "UNKNOWN / DILIGENCE REQUIRED", "Do learned changes reach production?")
  ];
  const repeatedDecision = derived.totalCases > 0 || visibleDecisionClasses.some((item) => !includesAny(item.decisionFrequency, ["LOW", "UNKNOWN", "NOT"]));
  const meaningfulStakes = visibleDecisionClasses.some((item) => includesAny(item.economicStakes, ["HIGH", "VERY"]));
  const gradeableDecision = visibleDecisionClasses.some((item) => includesAny(item.gradeObjectivity, ["OBJECTIVE", "MOSTLY"]));
  const observableDecision = visibleDecisionClasses.some((item) => includesAny(item.outcomeObservability, ["HIGH", "PARTIAL", "YES"]));
  const decisionInterpretation = repeatedDecision && meaningfulStakes && gradeableDecision && observableDecision
    ? "Strong learning opportunity"
    : repeatedDecision && (gradeableDecision || observableDecision)
      ? "Conditional learning opportunity"
      : repeatedDecision
        ? "Weak learning opportunity"
        : "Unknown";
  const feedbackInterpretation = derived.totalCases === 0 && !opportunity
    ? "Unknown"
    : (derived.gradeCoverage ?? 0) >= 0.6 && (derived.outcomeCompletionRate ?? 0) >= 0.6 && derived.medianDecisionToOutcomeLatencyDays !== null
      ? "Strong feedback environment"
      : gradeableDecision || observableDecision
        ? "Partial feedback environment"
        : "Weak feedback environment";
  const loopCapturedCount = learningLoopNodes.filter((node) => node.state === "CAPTURED" || node.state === "PARTIAL").length;
  const updateKnown = !includesAny(learning?.usesOutcomeGradesForLearning, ["UNKNOWN", "NO", "NOT"]);
  const deployKnown = !includesAny(learning?.deploymentCadence ?? analysis?.deploysImprovementsQuickly, ["UNKNOWN", "NO", "NOT"]);
  const loopInterpretation = loopCapturedCount >= 6 && updateKnown && deployKnown
    ? "Closed loop"
    : loopCapturedCount >= 4
      ? "Partially closed loop"
      : loopCapturedCount > 0
        ? "Open loop"
        : "Unknown";
  const hardToRebuild = includesAny(competitive?.competitorRelearningDifficulty ?? analysis?.rebuildability, ["HIGH", "DIFFICULT"])
    || includesAny(competitive?.crossCustomerPoolExclusive ?? analysis?.dataExclusivity, ["HIGH", "YES"]);
  const substitutionRisk = includesAny(competitive?.foundationModelSubstitutionRisk ?? analysis?.foundationModelDependence, ["HIGH", "FAST"])
    || includesAny(competitive?.syntheticDataSubstitutionRisk, ["HIGH", "YES"]);
  const competitiveInterpretation = hardToRebuild && !substitutionRisk
    ? "Difficult to reproduce"
    : hardToRebuild || substitutionRisk
      ? "Conditional / uncertain"
      : "Unknown";
  const modelProvenance = canonicalExample
    ? activeRowsAreSynthetic ? "ARCHETYPE ASSUMPTION + DERIVED — SYNTHETIC FIXTURE" : "ARCHETYPE ASSUMPTION"
    : activeRowsAreSynthetic ? "DERIVED — SYNTHETIC FIXTURE" : "MIXED / DILIGENCE REQUIRED";
  const importantUnknowns = criticalUnknowns({ learning, competitive });
  const gateSummaries = [
    {
      ...COMPANY_MODEL_GATES[0],
      href: "#gate-decision",
      answer: decisionInterpretation,
      explanation: repeatedDecision
        ? "Recurring decision classes appear to exist, but their strength depends on stakes, observability, and gradeability."
        : "The recurring decision class is not yet established.",
      provenance: modelProvenance
    },
    {
      ...COMPANY_MODEL_GATES[1],
      href: "#gate-feedback",
      answer: feedbackInterpretation,
      explanation: "Reality can teach only if outcomes are observed, graded, timely, and still relevant.",
      provenance: modelProvenance
    },
    {
      ...COMPANY_MODEL_GATES[2],
      href: "#gate-learning-loop",
      answer: loopInterpretation,
      explanation: updateKnown && deployKnown
        ? "The loop has represented capture, update, and deployment behavior."
        : "The loop breaks where grades must update future behavior and reach deployment.",
      provenance: modelProvenance
    },
    {
      ...COMPANY_MODEL_GATES[3],
      href: "#gate-defensibility",
      answer: competitiveInterpretation,
      explanation: "Durable Power requires more than useful learning; challengers must struggle to reproduce it.",
      provenance: modelProvenance
    }
  ];
  const ceThesis = `${profile?.name ?? "This analysis"} has ${decisionInterpretation.toLowerCase()} and a ${feedbackInterpretation.toLowerCase()}, but CE remains uncertain because the learning loop is ${loopInterpretation.toLowerCase()} and defensibility is ${competitiveInterpretation.toLowerCase()}.`;

  return (
    <>
      <LabWorkflowRail
        active="Company Model"
        analysisId={analysis?.id}
        activeAnalysisLabel={analysis?.companyName}
        activeAnalysisDetail={canonicalExample ? `${canonicalExample.testLabel}: ${canonicalExample.label}` : "Selected company analysis"}
      />
      <Section eyebrow="System & Environment" title="How could this company compound expertise?">
        <p>
          This page tests whether the company operates a decision system capable of converting repeated experience into durable expertise.
        </p>
        <div className="card compoundingStageOrientation">
          <div>
            <p className="small">What am I seeing?</p>
            <p>A structured model of the conditions that determine whether this company can turn operating experience into durable expertise.</p>
          </div>
          <div>
            <p className="small">Why does it matter?</p>
            <p>Compounding Expertise requires more than collecting data. There must be something valuable to learn, usable feedback, a company architecture that captures the feedback, and defensibility against capable challengers.</p>
          </div>
          <div>
            <p className="small">What should I do?</p>
            <p>Review the model below. Focus on what is supported by evidence, what is an assumption, and what remains unknown. Unknowns become diligence questions later.</p>
          </div>
        </div>
        {analysis && profile ? (
          <>
            <div className="compoundingGateHero">
              <div>
                <p className="small">Can experience become Power?</p>
                <h3>1 Decision Opportunity → 2 Feedback → 3 Learning Loop → 4 Defensibility</h3>
              </div>
              <a className="btn primary" href="#company-model-review">Review gates ↓</a>
            </div>
            <div className="compoundingGateBoard" aria-label="Company Model gate summary">
              {gateSummaries.map((gate) => (
                <a className={`compoundingGateCard compoundingGateState-${gateState(gate.answer)}`} href={gate.href} key={gate.id}>
                  <span>{gate.sequence}</span>
                  <strong>{gate.shortLabel}</strong>
                  <em>{gate.answer}</em>
                  <small>{gate.explanation}</small>
                  <i>{gate.provenance}</i>
                </a>
              ))}
            </div>
            <div className="card compoundingCurrentThesis">
              <p className="small">Current CE Thesis</p>
              <p>{ceThesis}</p>
              <p className="small">No numeric CE score is calculated. The question is which gate fails, which remains unproven, and what evidence would change the answer.</p>
            </div>
            <div className="compoundingEvidenceStrip compact">
              <span><strong>{activeRowsAreSynthetic ? 0 : derived.totalCases}</strong> company evidence</span>
              <span><strong>{evidenceCoverage.sourced}</strong> external evidence</span>
              <span><strong>{activeRowsAreSynthetic ? derived.totalCases : 0}</strong> synthetic-derived</span>
              <span><strong>{canonicalExample ? Math.max(evidenceCoverage.assumed, 1) : evidenceCoverage.assumed}</strong> assumptions</span>
              <span><strong>{coverageTotal ? evidenceCoverage.unknown : 8}</strong> unknowns</span>
            </div>
            <p className="small">
              Highest-value unknowns: {(importantUnknowns.length ? importantUnknowns.slice(0, 4) : [
                "measured improvement from accumulated cases",
                "cross-customer transfer",
                "contractual learning rights",
                "challenger rebuildability"
              ]).join(" · ")}
            </p>
            <details className="card compoundingDisclosure compoundingEvidenceInventory">
              <summary>View evidence</summary>
              <div className="compoundingEvidenceStrip">
                <span><strong>{activeRowsAreSynthetic ? 0 : derived.totalCases}</strong> company-observed / company-derived</span>
                <span><strong>{evidenceCoverage.sourced}</strong> externally sourced</span>
                <span><strong>{activeRowsAreSynthetic ? derived.totalCases : 0}</strong> synthetic-derived rows</span>
                <span><strong>{canonicalExample ? Math.max(evidenceCoverage.assumed, 1) : evidenceCoverage.assumed}</strong> archetype / analyst assumptions</span>
                <span><strong>{evidenceCoverage.inferred}</strong> model inference</span>
                <span><strong>{coverageTotal ? evidenceCoverage.unknown : 8}</strong> unknown / diligence required</span>
              </div>
              <h3>Most important unknowns</h3>
              <ul>
                {(importantUnknowns.length ? importantUnknowns : [
                  "measured improvement from accumulated cases",
                  "cross-customer transfer",
                  "contractual learning rights",
                  "actual grade → update loop",
                  "challenger rebuildability"
                ]).map((item) => <li key={item}>{item}</li>)}
              </ul>
              <h3>Provenance taxonomy</h3>
              <div className="compoundingActionPills">
                <span>OBSERVED — COMPANY DATA</span>
                <span>SOURCED — EXTERNAL EVIDENCE</span>
                <span>DERIVED — COMPANY DATA</span>
                <span>DERIVED — SYNTHETIC FIXTURE</span>
                <span>ANALYST ASSUMPTION</span>
                <span>ARCHETYPE ASSUMPTION</span>
                <span>MODEL INFERENCE</span>
                <span>UNKNOWN / DILIGENCE REQUIRED</span>
              </div>
              <p className="small">Derived from synthetic fixture means the canonical sample demonstrates what a dataset could look like. It is not observed company evidence.</p>
            </details>
          </>
        ) : null}
        {params.example ? (
          <div className="card compoundingSyntheticBanner">
            <strong>Example loaded.</strong>
            <p>
              Bundled scorebook rows are synthetic illustrative data, not company data.
              Inspect the Scorebook page before treating any diagnostic as evidence.
            </p>
          </div>
        ) : null}
        {canonicalExample ? (
          <div className="card compoundingCanonicalPanel">
            <p className="small">Why this is a canonical test</p>
            <h3>{canonicalExample.testLabel}: {canonicalExample.label}</h3>
            <p><strong>Canonical question:</strong> {canonicalExample.canonicalQuestion}</p>
            <p><strong>Why selected:</strong> {canonicalExample.whyCanonical}</p>
            <p><strong>Expected theoretical behavior:</strong> {canonicalExample.expectedTheoreticalBehavior}</p>
            <p><strong>Lab failure condition:</strong> {canonicalExample.labFailureCondition}</p>
            <p><strong>Primary Power hypothesis:</strong> {canonicalExample.primaryPowerHypothesis}</p>
            <p><strong>Competing Power hypothesis:</strong> {canonicalExample.competingPowerHypothesis}</p>
            <p className="small">This is explanatory metadata, not evidence about the company.</p>
          </div>
        ) : null}
      </Section>

        {analysis && profile ? (
        <>
          <div id="company-model-review" />
          <Section title="Company profile">
            <div className="card compoundingProfilePanel">
              <div>
                <p className="small">Company / system</p>
                <h3>{profile.name}</h3>
                <p>{display(profile.productDescription)}</p>
              </div>
              <div className="compoundingCaseSetFacts">
                <span><strong>Category</strong>{display(profile.category)}</span>
                <span><strong>Customer</strong>{display(profile.customer)}</span>
                <span><strong>Segments</strong>{display(profile.customerSegments)}</span>
                <span><strong>Business model</strong>{display(profile.businessModel)}</span>
                <span><strong>Stage</strong>{display(profile.stage)}</span>
                <span><strong>Website</strong>{profile.website ? <Link href={profile.website}>{profile.website}</Link> : "Unknown"}</span>
              </div>
              <p><strong>Analyst thesis:</strong> {display(profile.thesis)}</p>
            </div>
          </Section>

          <div id="gate-decision" />
          <Section title="1. Decision Opportunity">
            <QuestionNarrative
              title="What decisions create the opportunity to learn?"
              questionLabel="Decision Opportunity"
              whyItMatters="Compounding Expertise forms around recurring decision classes, not abstractly at the company level. A Decision Class is a recurring type of judgment the system makes under similar conditions."
              possibleAnswers={[
                "Strong learning opportunity",
                "Conditional learning opportunity",
                "Weak learning opportunity",
                "Unknown"
              ]}
              currentInterpretation={decisionInterpretation}
              provenance={modelProvenance}
              keyEvidence={[
                `Frequency: ${display(opportunity?.naturalCaseFrequency ?? analysis.caseFrequency)}.`,
                `Stakes: ${display(visibleDecisionClasses[0]?.economicStakes ?? analysis.economicCostWrongDecision)}.`,
                `Outcome observability: ${display(visibleDecisionClasses[0]?.outcomeObservability ?? opportunity?.outcomeObservability ?? analysis.observesOutcome)}.`,
                `Gradeability: ${display(visibleDecisionClasses[0]?.gradeObjectivity ?? opportunity?.outcomeObjectivity ?? analysis.outcomeObjectivity)}.`
              ]}
              whyThisAnswer={[
                `${visibleDecisionClasses.length} decision class${visibleDecisionClasses.length === 1 ? "" : "es"} represented.`,
                repeatedDecision ? "The model contains repeated decisions or an active CaseSet." : "Decision frequency is not established.",
                meaningfulStakes ? "At least one decision class is modeled as economically meaningful." : "Economic stakes are weak or unknown.",
                gradeableDecision || observableDecision ? "The model has at least partial observability or gradeability." : "Outcome observability and gradeability are weak or unknown."
              ]}
              evidenceUsed={[
                `Decision classes: ${visibleDecisionClasses.map((item) => item.name).join(", ") || "none"}.`,
                `Action evidence: ${derived.actionDistribution.slice(0, 3).map((item) => `${item.label} (${item.count})`).join(", ") || "unavailable"}.`,
                `CaseSet rows: ${derived.totalCases} (${activeRowsAreSynthetic ? "DERIVED — SYNTHETIC FIXTURE" : "DERIVED — COMPANY DATA"}).`,
                canonicalExample ? "Canonical-test structure is archetype metadata, not verified company operations." : "Custom analysis values may be analyst-entered unless supported by evidence."
              ]}
              changeAnswer={[
                "Observed company decision volume by decision class.",
                "Evidence that the action space contains meaningful alternatives.",
                "Observed economic consequences by action and outcome.",
                "Clear mapping from decision class to outcomes and grades."
              ]}
              implication="A strong recurring decision class creates the raw material for Compounding Expertise; weak or one-off decisions do not compound much even if the company stores data."
              helmerConnection="Could support Process Power or Network Economies if repeated decisions improve with accumulated cross-customer experience."
              editHref="#edit-company-model"
            >
            <div className="compoundingGateChain compoundingGateChain-4">
              <span><strong>Frequency</strong><small>{display(opportunity?.naturalCaseFrequency ?? analysis.caseFrequency)}</small><a href="#edit-opportunity">Edit</a></span>
              <span><strong>Stakes</strong><small>{display(visibleDecisionClasses[0]?.economicStakes ?? analysis.economicCostWrongDecision)}</small><a href="#edit-opportunity">Edit</a></span>
              <span><strong>Outcome observability</strong><small>{display(visibleDecisionClasses[0]?.outcomeObservability ?? opportunity?.outcomeObservability ?? analysis.observesOutcome)}</small><a href="#edit-opportunity">Edit</a></span>
              <span><strong>Gradeability</strong><small>{display(visibleDecisionClasses[0]?.gradeObjectivity ?? opportunity?.outcomeObjectivity ?? analysis.outcomeObjectivity)}</small><a href="#edit-opportunity">Edit</a></span>
            </div>
            <div className="card compoundingCanonicalPanel">
              <div className="compoundingCardHeader">
                <div>
                  <p className="small">Operational workflow · archetype model</p>
                  <h3>{workflow?.name ?? "Workflow not normalized yet"}</h3>
                  <p>{workflow?.description ?? analysis.workflow}</p>
                </div>
              </div>
              <div className="compoundingWorkflowMap">
                {(workflow?.stages.length ? workflow.stages : [
                  { id: "intake", name: "Intake", stageType: "INTAKE" },
                  { id: "decision", name: "Decision", stageType: "DECISION" },
                  { id: "human", name: "Human review", stageType: "HUMAN_REVIEW" },
                  { id: "action", name: "Action", stageType: "EXECUTION" },
                  { id: "outcome", name: "Outcome", stageType: "OUTCOME" },
                  { id: "grade", name: "Grade", stageType: "GRADING" }
                ]).map((stage) => (
                  <span key={stage.id}><strong>{stage.name}</strong><small>{stage.stageType.replaceAll("_", " ")}</small></span>
                ))}
              </div>
            </div>
            <div className="card compact">
              <p><strong>Decision Class</strong> = recurring type of judgment.</p>
              <p><strong>Action Space</strong> = possible actions available for that judgment.</p>
            </div>
            <div className="tableScroll compoundingDecisionClassTable">
              <table className="dataTable">
                <thead>
                  <tr>
                    <th>Decision Class</th>
                    <th>Question</th>
                    <th>Volume</th>
                    <th>Stakes</th>
                    <th>Gradeability</th>
                    <th>Feedback</th>
                    <th>Human Review</th>
                    <th>Autonomy</th>
                    <th>Evidence</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleDecisionClasses.map((decisionClass) => (
                    <tr key={decisionClass.id}>
                      <td><strong>{decisionClass.name}</strong></td>
                      <td>{display(decisionClass.description)}</td>
                      <td>{display(decisionClass.decisionFrequency ?? derived.observedDecisionVolume.casesPerMonth, "Unknown")}</td>
                      <td>{display(decisionClass.economicStakes)}</td>
                      <td>{display(decisionClass.gradeObjectivity)}</td>
                      <td>{days(decisionClass.naturalFeedbackLatencyDays ?? derived.medianDecisionToOutcomeLatencyDays)}</td>
                      <td>{display(decisionClass.humanReviewMode)}</td>
                      <td>{display(decisionClass.currentAutonomyMode)}</td>
                      <td><span className="miniTag">{decisionClasses.length ? "ARCHETYPE ASSUMPTION" : "ANALYST ASSUMPTION"}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {visibleDecisionClasses.map((decisionClass) => (
              <details className="card compoundingDisclosure" key={`${decisionClass.id}-detail`}>
                <summary>{decisionClass.name}: action space and provenance</summary>
                <p>{display(decisionClass.description)}</p>
                <p><strong>Why this matters:</strong> High-frequency, economically meaningful decisions with observable outcomes provide favorable raw material for Compounding Expertise.</p>
                <div className="compoundingCaseSetFacts">
                  <span><strong>Outcome observability</strong>{display(decisionClass.outcomeObservability)}</span>
                  <span><strong>Natural feedback</strong>{days(decisionClass.naturalFeedbackLatencyDays ?? derived.medianDecisionToOutcomeLatencyDays)}</span>
                  <span><strong>Action distribution</strong>{derived.actionDistribution.slice(0, 3).map((item) => `${item.label}: ${item.count}`).join(", ") || "Unavailable"}</span>
                  <span><strong>Grade distribution</strong>{derived.gradeDistribution.map((item) => `${item.label}: ${item.count}`).join(", ") || "Unavailable"}</span>
                </div>
                {"actions" in decisionClass && decisionClass.actions?.length ? (
                  <div className="compoundingActionPills">
                    {decisionClass.actions.map((action) => <span key={action.id}>{action.label}</span>)}
                  </div>
                ) : <p className="small">Action space is not normalized for this legacy analysis yet.</p>}
              </details>
            ))}
            </QuestionNarrative>
          </Section>

          <div id="gate-feedback" />
          <Section title="2. Feedback">
            <QuestionNarrative
              title="Can reality teach the system?"
              questionLabel="Feedback"
              whyItMatters="Experience only compounds when decisions occur, outcomes are observed, outcomes can be graded, feedback arrives, and the lesson remains relevant long enough to improve future decisions."
              possibleAnswers={[
                "Strong feedback environment",
                "Partial feedback environment",
                "Weak feedback environment",
                "Unknown"
              ]}
              currentInterpretation={feedbackInterpretation}
              provenance={modelProvenance}
              keyEvidence={[
                `Cases: ${derived.totalCases} active CaseSet rows.`,
                `Outcomes observed: ${derived.resolvedCases}/${derived.totalCases}.`,
                `Cases graded: ${derived.gradedCases}/${derived.totalCases}.`,
                `Median feedback time: ${days(derived.medianDecisionToOutcomeLatencyDays)}.`
              ]}
              whyThisAnswer={[
                `Outcome completion: ${pct(derived.outcomeCompletionRate)} (${derived.resolvedCases}/${derived.totalCases} active rows).`,
                `Grade coverage: ${pct(derived.gradeCoverage)} (${derived.gradedCases}/${derived.totalCases} active rows).`,
                `Median decision-to-outcome latency: ${days(derived.medianDecisionToOutcomeLatencyDays)}.`,
                `Nonstationarity is modeled as ${display(opportunity?.environmentalNonstationarity ?? analysis.environmentalChangeRate)}.`
              ]}
              evidenceUsed={[
                `Decision frequency: ${display(opportunity?.naturalCaseFrequency ?? analysis.caseFrequency)}.`,
                `Outcome observability: ${display(opportunity?.outcomeObservability ?? analysis.observesOutcome)}.`,
                `Outcome objectivity: ${display(opportunity?.outcomeObjectivity ?? analysis.outcomeObjectivity)}.`,
                activeRowsAreSynthetic ? "Completion and latency metrics are derived from synthetic fixture rows, not observed company operations." : "Completion and latency metrics are derived from the active CaseSet."
              ]}
              changeAnswer={[
                "Observed production cases showing decision, outcome, and grade completion.",
                "Evidence that feedback arrives fast enough to update the next relevant decisions.",
                "Evidence that the environment is stable enough for lessons to remain useful.",
                "Evidence that grades are objective rather than subjective or attribution-noisy."
              ]}
              implication="A strong feedback environment makes Compounding Expertise plausible. A weak feedback environment can leave the company with a filing cabinet rather than a scorebook."
              helmerConnection="Fast, objective feedback could support Process Power if the company repeatedly turns it into better operations."
              editHref="#edit-opportunity"
            >
            <div className="compoundingFeedbackFunnel">
              {[
                ["Cases", `${derived.totalCases}`, loopProvenance],
                ["Outcomes observed", `${derived.resolvedCases}/${derived.totalCases}`, loopProvenance],
                ["Cases graded", `${derived.gradedCases}/${derived.totalCases}`, loopProvenance],
                ["Median feedback time", days(derived.medianDecisionToOutcomeLatencyDays), derived.medianDecisionToOutcomeLatencyDays === null ? "UNKNOWN / DILIGENCE REQUIRED" : loopProvenance]
              ].map(([label, value, meaning]) => (
                <span key={label}>
                  <strong>{label}</strong>
                  <small>{value}</small>
                  <em>{meaning}</em>
                </span>
              ))}
            </div>
            <details className="card compoundingDisclosure">
              <summary>Review feedback assumptions</summary>
              <div className="compoundingProfileGrid">
                <div className="card"><strong>Case frequency</strong><p>{display(opportunity?.naturalCaseFrequency ?? analysis.caseFrequency)}</p><span className="miniTag">{canonicalExample ? "ARCHETYPE ASSUMPTION" : evidenceLabel("ASSUMED")}</span><a href="#edit-opportunity">Edit</a></div>
                <div className="card"><strong>{activeRowsAreSynthetic ? "Synthetic CaseSet volume" : "Active CaseSet volume"}</strong><p>{derived.observedDecisionVolume.count} cases{derived.observedDecisionVolume.casesPerMonth !== null ? ` / ${derived.observedDecisionVolume.casesPerMonth} per month in active CaseSet` : ""}</p><span className="miniTag">{loopProvenance}</span></div>
                <div className="card"><strong>Outcome observability</strong><p>{display(opportunity?.outcomeObservability ?? analysis.observesOutcome)}</p><span className="miniTag">{canonicalExample ? "ARCHETYPE ASSUMPTION" : evidenceLabel("ASSUMED")}</span><a href="#edit-opportunity">Edit</a></div>
                <div className="card"><strong>Outcome objectivity</strong><p>{display(opportunity?.outcomeObjectivity ?? analysis.outcomeObjectivity)}</p><span className="miniTag">{canonicalExample ? "ARCHETYPE ASSUMPTION" : evidenceLabel("ASSUMED")}</span><a href="#edit-opportunity">Edit</a></div>
                <div className="card"><strong>Feedback latency</strong><p>{days(opportunity?.naturalFeedbackLatencyDays ?? derived.medianDecisionToOutcomeLatencyDays)}</p><span className="miniTag">{derived.medianDecisionToOutcomeLatencyDays === null ? "UNKNOWN / DILIGENCE REQUIRED" : loopProvenance}</span><a href="#edit-opportunity">Edit</a></div>
                <div className="card"><strong>Nonstationarity</strong><p>{display(opportunity?.environmentalNonstationarity ?? analysis.environmentalChangeRate)}</p><span className="miniTag">{canonicalExample ? "ARCHETYPE ASSUMPTION" : evidenceLabel("ASSUMED")}</span><a href="#edit-opportunity">Edit</a></div>
                <div className="card"><strong>Foundation model improvement</strong><p>{display(opportunity?.foundationModelImprovementRate ?? analysis.foundationModelImprovementRate)}</p><span className="miniTag">{canonicalExample ? "ARCHETYPE ASSUMPTION" : evidenceLabel("ASSUMED")}</span><a href="#edit-opportunity">Edit</a></div>
              </div>
            </details>
            </QuestionNarrative>
          </Section>

          <div id="gate-learning-loop" />
          <Section title="3. Learning Loop">
            <QuestionNarrative
              title="Does the company close the learning loop?"
              questionLabel="Learning Loop"
              whyItMatters="Operational data becomes expertise only when context, decisions, human intervention, actions, outcomes, grades, updates, and deployment are materially connected."
              possibleAnswers={[
                "Closed loop",
                "Partially closed loop",
                "Open loop",
                "Unknown"
              ]}
              currentInterpretation={loopInterpretation}
              provenance={modelProvenance}
              keyEvidence={[
                `${loopCapturedCount}/${learningLoopNodes.length} loop nodes captured or partially captured.`,
                updateKnown ? "Update behavior is represented." : "UPDATE remains unknown.",
                deployKnown ? "Deployment cadence is represented." : "DEPLOY remains unknown.",
                activeRowsAreSynthetic ? "Synthetic fixture coverage cannot establish a real company learning loop." : "Active CaseSet coverage provides current evidence."
              ]}
              whyThisAnswer={[
                `${loopCapturedCount} of ${learningLoopNodes.length} learning-loop nodes are captured or partially captured.`,
                updateKnown ? "Update behavior is represented." : "Update behavior remains unverified.",
                deployKnown ? "Deployment cadence is represented." : "Deployment of learned improvements remains unverified.",
                activeRowsAreSynthetic ? "The CaseSet demonstrates what a closed-loop dataset could look like, not that the real company operates one." : "The active CaseSet provides the current coverage evidence."
              ]}
              evidenceUsed={[
                `Decision rows represented: ${activeRows.filter((row) => row.agentDecision).length}/${activeRows.length}.`,
                `Action rows represented: ${activeRows.filter((row) => row.actionTaken).length}/${activeRows.length}.`,
                `Outcome rows represented: ${activeRows.filter((row) => row.outcome).length}/${activeRows.length}.`,
                `Grade rows represented: ${activeRows.filter((row) => row.grade !== "UNRESOLVED").length}/${activeRows.length}.`
              ]}
              changeAnswer={[
                "Evidence that grades update future policy/model behavior.",
                "Evidence that updates are deployed into production quickly and safely.",
                "Observed human override capture and override outcome analysis.",
                "A production CaseSet, not only a synthetic fixture."
              ]}
              implication="A closed learning loop is necessary for durable Compounding Expertise. Without update and deployment evidence, the system may collect experience without converting it into future advantage."
              helmerConnection="Could support Process Power if the closed loop is embedded in operating routines competitors cannot easily copy."
              editHref="#edit-capability"
            >
            <p className="card compact"><strong>Capturing a scorebook ≠ compounding expertise.</strong> Grades must change future behavior and those improvements must be deployed.</p>
            <div className="compoundingLearningLoop">
              {learningLoopNodes.map((node) => (
                <span className={`compoundingLoopNode-${node.state.toLowerCase().replaceAll(" ", "-")}`} key={node.label}>
                  <strong>{node.label}</strong>
                  <small>{node.state}</small>
                  {node.coverage ? <small>{node.coverage}</small> : null}
                  <small>{node.provenance}</small>
                  <details>
                    <summary>Meaning</summary>
                    <em>{node.meaning}</em>
                    <small>{display(node.value)}</small>
                  </details>
                </span>
              ))}
            </div>
            <details className="card compoundingDisclosure">
              <summary>Review learning-loop assumptions</summary>
              <div className="compoundingProfileGrid">
                <div className="card"><strong>Cross-customer pooling</strong><p>{display(learning?.pooledAcrossCustomers ?? analysis.learnsAcrossCustomers)}</p><a href="#edit-capability">Edit</a></div>
                <div className="card"><strong>Customer-specific adaptation</strong><p>{display(learning?.customerSpecificAdaptation)}</p><a href="#edit-capability">Edit</a></div>
                <div className="card"><strong>Experimentation</strong><p>{display(learning?.experimentationMode ?? analysis.runsControlledExperiments)}</p><a href="#edit-capability">Edit</a></div>
                <div className="card"><strong>Model / policy cadence</strong><p>{display(learning?.modelUpdateCadence ?? analysis.updatesModelPolicyRegularly)} / {display(learning?.policyUpdateCadence)}</p><a href="#edit-capability">Edit</a></div>
                <div className="card"><strong>Deployment cadence</strong><p>{display(learning?.deploymentCadence ?? analysis.deploysImprovementsQuickly)}</p><a href="#edit-capability">Edit</a></div>
                <div className="card"><strong>Learning rights</strong><p>{display(learning?.canTrainAcrossCustomers ?? analysis.contractualLearningRights)}</p><a href="#edit-capability">Edit</a></div>
              </div>
            </details>
            </QuestionNarrative>
          </Section>

          <div id="gate-defensibility" />
          <Section title="4. Defensibility">
            <QuestionNarrative
              title="If it learns, can competitors reproduce it?"
              questionLabel="Defensibility"
              whyItMatters="A company can possess valuable expertise without possessing durable Power. The investment question is whether the learning advantage persists against capable challengers."
              possibleAnswers={[
                "Difficult to reproduce",
                "Conditional / uncertain",
                "Easy to reproduce",
                "Unknown"
              ]}
              currentInterpretation={competitiveInterpretation}
              provenance={modelProvenance}
              keyEvidence={[
                `Privileged experience: ${display(competitive?.rawCasesExclusive ?? analysis.dataExclusivity)}.`,
                `Cross-customer transfer: ${display(learning?.pooledAcrossCustomers ?? analysis.learnsAcrossCustomers)}.`,
                `Relearning / compression risk: ${display(competitive?.competitorRelearningDifficulty ?? analysis.rebuildability)} / ${display(competitive?.foundationModelSubstitutionRisk ?? analysis.foundationModelDependence)}.`,
                `Capture position: decision ${display(competitive?.systemOfDecision ?? analysis.ownsDecisionPoint)}, action ${display(competitive?.systemOfAction ?? analysis.controlsAction)}.`
              ]}
              whyThisAnswer={[
                hardToRebuild ? "The model includes some exclusivity or relearning-difficulty signal." : "The model does not yet establish a hard-to-rebuild advantage.",
                substitutionRisk ? "Model/synthetic-data substitution risk is present or unresolved." : "Substitution risk is not modeled as high.",
                "Durability depends on transfer, rights, workflow position, and resistance to compression or relearning.",
                "Synthetic fixtures cannot establish durable Power."
              ]}
              evidenceUsed={[
                `Raw case exclusivity: ${display(competitive?.rawCasesExclusive ?? analysis.dataExclusivity)}.`,
                `Cross-customer pool exclusivity: ${display(competitive?.crossCustomerPoolExclusive)}.`,
                `Learning rights: ${display(learning?.canTrainAcrossCustomers ?? analysis.contractualLearningRights)}.`,
                `Foundation-model substitution risk: ${display(competitive?.foundationModelSubstitutionRisk ?? analysis.foundationModelDependence)}.`
              ]}
              changeAnswer={[
                "Contractual proof that cases, outcomes, corrections, and derived learning can be retained and used.",
                "Cross-customer holdout evidence showing transfer to unseen customers.",
                "A challenger rebuild benchmark showing how quickly useful expertise can be relearned.",
                "Evidence that foundation models or synthetic data cannot cheaply compress the advantage."
              ]}
              implication="A plausible Compounding Expertise Power requires valuable learning, a closed loop, transfer to future decisions, continued new information, economic value, and resistance to compression, simulation, inference, or relearning."
              helmerConnection="Could support Network Economies, Process Power, Switching Costs, Cornered Resource, or Scale Economies only if supported by company evidence rather than archetype assumptions."
              editHref="#edit-competitive"
            >
            <div className="compoundingDefensibilityTests">
              {[
                ["Privileged Experience", display(competitive?.rawCasesExclusive ?? analysis.dataExclusivity), canonicalExample ? "ARCHETYPE ASSUMPTION" : evidenceLabel("ASSUMED")],
                ["Cross-Customer Transfer", display(learning?.pooledAcrossCustomers ?? analysis.learnsAcrossCustomers), canonicalExample ? "ARCHETYPE ASSUMPTION" : evidenceLabel("ASSUMED")],
                ["Resistance to Relearning / Compression", display(competitive?.competitorRelearningDifficulty ?? analysis.rebuildability), canonicalExample ? "ARCHETYPE ASSUMPTION" : evidenceLabel("ASSUMED")],
                ["Continuous Capture Advantage", display(competitive?.systemOfDecision ?? analysis.ownsDecisionPoint), canonicalExample ? "ARCHETYPE ASSUMPTION" : evidenceLabel("ASSUMED")]
              ].map(([label, value, provenance]) => (
                <span className={`compoundingGateState-${gateState(value)}`} key={label}>
                  <strong>{label}</strong>
                  <small>{value}</small>
                  <em>{provenance}</em>
                  <a href="#edit-competitive">Edit</a>
                </span>
              ))}
            </div>
            <div className="card compact">
              <h3>What pattern would support Power?</h3>
              <ol>
                <li>Valuable learning exists.</li>
                <li>The learning loop closes.</li>
                <li>Learning transfers to future relevant decisions.</li>
                <li>Useful new information continues accumulating.</li>
                <li>The learning is economically meaningful.</li>
                <li>Competitors cannot cheaply compress, simulate, infer, or relearn the useful expertise.</li>
              </ol>
              <div className="compoundingActionPills">
                <span>Network Economies</span>
                <span>Process Power</span>
                <span>Switching Costs</span>
                <span>Cornered Resource</span>
                <span>No demonstrated Power yet</span>
              </div>
              <p className="small">These are possible mechanisms to test. They are not asserted from archetype assumptions or synthetic fixtures.</p>
            </div>
            <details className="card compoundingDisclosure">
              <summary>Current and missing defensibility evidence</summary>
              <div className="grid grid-2">
                <div className="card">
                  <h3>Current evidence for this company</h3>
                  <ul>
                    <li>{activeRowsAreSynthetic ? "Synthetic fixture rows demonstrate a possible scorebook shape, not observed company performance." : `${derived.totalCases} active CaseSet rows are available for inspection.`}</li>
                    <li>Workflow position is modeled as {display(competitive?.systemOfDecision ?? analysis.ownsDecisionPoint)} for decisions and {display(competitive?.systemOfAction ?? analysis.controlsAction)} for actions.</li>
                    <li>Learning rights are currently {display(learning?.canTrainAcrossCustomers ?? analysis.contractualLearningRights)}.</li>
                  </ul>
                </div>
                <div className="card">
                  <h3>Missing evidence</h3>
                  <ul>
                    <li>Observed cross-customer transfer, not just plausible transfer.</li>
                    <li>Contractual proof of case, correction, outcome, and derived-feature usage rights.</li>
                    <li>Benchmark showing how quickly a capable challenger could relearn or simulate the useful expertise.</li>
                    <li>Evidence that stronger foundation models do not compress the advantage.</li>
                  </ul>
                </div>
              </div>
              <div className="compoundingProfileGrid">
                <div className="card"><strong>Data advantage</strong><p>Raw cases: {display(competitive?.rawCasesExclusive ?? analysis.dataExclusivity)}<br />Outcomes: {display(competitive?.outcomesExclusive)}<br />Corrections: {display(competitive?.humanCorrectionsExclusive)}</p><a href="#edit-competitive">Edit</a></div>
                <div className="card"><strong>Workflow position</strong><p>Decision: {display(competitive?.systemOfDecision ?? analysis.ownsDecisionPoint)}<br />Action: {display(competitive?.systemOfAction ?? analysis.controlsAction)}<br />Outcome capture: {display(competitive?.systemOfOutcomeCapture ?? analysis.observesOutcome)}</p><a href="#edit-competitive">Edit</a></div>
                <div className="card"><strong>Rebuildability / substitution</strong><p>Public data: {display(competitive?.publicDataSubstitutionRisk)}<br />Synthetic data: {display(competitive?.syntheticDataSubstitutionRisk)}<br />Foundation model: {display(competitive?.foundationModelSubstitutionRisk ?? analysis.foundationModelDependence)}</p><a href="#edit-competitive">Edit</a></div>
                <div className="card"><strong>Alternative Power</strong><p>Deterministic infrastructure: {display(competitive?.deterministicInfrastructureStrength ?? analysis.deterministicInfrastructure)}<br />Distribution: {display(competitive?.distributionAdvantage ?? analysis.distributionAdvantage)}<br />Regulatory / contractual: {display(competitive?.regulatoryBarrierStrength ?? analysis.regulatoryContractualBarriers)}</p><a href="#edit-competitive">Edit</a></div>
              </div>
            </details>
            </QuestionNarrative>
          </Section>

          <Section title="What we know now">
            <div className="grid grid-3">
              <div className="card">
                <h3>What we know</h3>
                <p>
                  {profile.name} currently shows <strong>{decisionInterpretation.toLowerCase()}</strong>, a <strong>{feedbackInterpretation.toLowerCase()}</strong>,
                  a <strong>{loopInterpretation.toLowerCase()}</strong>, and <strong>{competitiveInterpretation.toLowerCase()}</strong> defensibility under the current model.
                </p>
                {activeRowsAreSynthetic ? (
                  <p className="small">
                    The synthetic CaseSet demonstrates what a scorebook could look like; it does not establish that the real company operates this learning loop. Treat it as DERIVED — SYNTHETIC FIXTURE, not observed company evidence.
                  </p>
                ) : null}
              </div>
              <div className="card">
                <h3>What we don’t know</h3>
                <ul>
                  {(importantUnknowns.length ? importantUnknowns : [
                    "whether graded outcomes improve future decision behavior",
                    "whether learning transfers across customers and case types",
                    "whether learning rights and workflow position make the advantage defensible",
                    "whether stronger models, synthetic data, or competitor relearning can compress the advantage"
                  ]).map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
              <div className="card">
                <h3>Highest-value diligence questions</h3>
                <ul>
                  <li>Do graded outcomes improve future decisions?</li>
                  <li>Does learning transfer across customers?</li>
                  <li>Can the company retain and use the learning legally?</li>
                  <li>How quickly could a challenger relearn or compress the useful expertise?</li>
                </ul>
              </div>
            </div>
            <div className="card compoundingNextStep">
              <div>
                <h3>Next step</h3>
                <p><strong>Company Model:</strong> What would need to be true for expertise to compound?</p>
                <p><strong>Experience:</strong> Show me the cases and evidence that tell us whether it is true.</p>
              </div>
              <Link className="btn primary" href={`/compounding-expertise/scorebook?analysisId=${analysis.id}`}>Continue to Experience →</Link>
            </div>
          </Section>
        </>
      ) : (
        <Section title="Start an analysis">
          <p>Create or load a company analysis before the normalized company profile can be reviewed.</p>
        </Section>
      )}

      <Section title="View/Edit all assumptions">
        <form action={saveAnalysisAction} className="compoundingSystemForm">
          <input type="hidden" name="analysisId" value={analysis?.id ?? ""} />

          <details className="card compoundingDisclosure" id="edit-company-model">
            <summary>Company identity - What is this business/system?</summary>
            <p className="small">
              These fields are descriptive. For canonical tests, distinguish public/company description from archetype assumptions and synthetic case data.
            </p>
            <div className="compoundingFormGrid">
              <label>
                Company name
                <input name="companyName" defaultValue={analysis?.companyName ?? ""} placeholder="Company or product under review" />
              </label>
              <label>
                Website / company URL
                <input name="companyUrl" defaultValue={analysis?.companyUrl ?? ""} placeholder="https://..." />
              </label>
              <label>
                Product category
                <input name="productCategory" defaultValue={analysis?.productCategory ?? ""} placeholder="Disputes, research, pricing, etc." />
              </label>
              <label>
                Target customer
                <input name="targetCustomer" defaultValue={analysis?.targetCustomer ?? ""} placeholder="Buyer/user/operator" />
              </label>
              <label>
                Business model
                <input name="businessModel" defaultValue={analysis?.businessModel ?? ""} placeholder="Unknown allowed" />
              </label>
              <label>
                Company stage
                <input name="companyStage" defaultValue={analysis?.companyStage ?? ""} placeholder="Optional / unknown allowed" />
              </label>
              <label className="span-2">
                Product description
                <textarea name="productDescription" rows={3} defaultValue={analysis?.productDescription ?? ""} />
              </label>
              <label className="span-2">
                Workflow
                <textarea name="workflow" rows={3} defaultValue={analysis?.workflow ?? ""} placeholder="Where cases, decisions, outcomes, and grades are captured" />
              </label>
              <label className="span-2">
                Principal decision(s)
                <textarea name="decisionDescription" rows={3} defaultValue={analysis?.decisionDescription ?? ""} placeholder="What decision does the product make or recommend?" />
              </label>
              <label className="span-2">
                Action space / possible actions
                <textarea name="actionSpace" rows={3} defaultValue={analysis?.actionSpace ?? ""} placeholder="What actions can be recommended or executed?" />
              </label>
              <label className="span-2">
                Current investment thesis
                <textarea name="thesis" rows={4} defaultValue={analysis?.thesis ?? ""} placeholder="What would have to be true for accumulated graded experience to become Power?" />
              </label>
            </div>
          </details>

          <details className="card compoundingDisclosure" id="edit-opportunity">
            <summary>Compounding Opportunity - External / exogenous environment</summary>
            <p>
              Properties of the problem and market that largely determine whether valuable expertise can accumulate.
              A workflow producing 12 meaningful cases per year compounds differently from one producing millions.
            </p>
            <div className="compoundingStructuredGrid">
              {EXOGENOUS_INPUTS.map((definition) => (
                <StructuredControl analysis={analysis} definition={definition} key={definition.key} />
              ))}
            </div>
          </details>

          <details className="card compoundingDisclosure" id="edit-capability">
            <summary>Compounding Capability - Learning architecture</summary>
            <p>
              Properties the company can design or improve to turn experience into better future decisions.
              Recommendation is not the same thing as executed action.
            </p>
            <div className="compoundingStructuredGrid">
              {ENDOGENOUS_INPUTS.map((definition) => (
                <StructuredControl analysis={analysis} definition={definition} key={definition.key} />
              ))}
            </div>
          </details>

          <details className="card compoundingDisclosure" id="edit-competitive">
            <summary>Competitive architecture - Why can&apos;t others reproduce it?</summary>
            <p>
              Valuable learning is not the same as defensible learning. These assumptions support the Helmer analysis
              without replacing it.
            </p>
            <div className="compoundingStructuredGrid">
              {COMPETITIVE_INPUTS.map((definition) => (
                <StructuredControl analysis={analysis} definition={definition} key={definition.key} />
              ))}
            </div>
          </details>

          <div className="ctaRow">
            <button className="btn primary" type="submit">Save and inspect Experience</button>
            <Link className="btn" href={analysis ? `/compounding-expertise/overview?analysisId=${analysis.id}` : "/compounding-expertise/overview"}>Back to overview</Link>
          </div>
        </form>
      </Section>

      <Section title="Integrity note">
        <IntegrityNotice />
      </Section>
    </>
  );
}
