import Link from "next/link";
import type { ReactNode } from "react";
import { Section } from "@/components/site/Section";
import { EpistemicBadge, IntegrityNotice, LabWorkflowRail } from "@/components/compounding-expertise/CompoundingLabComponents";
import {
  COMPETITIVE_INPUTS,
  ENDOGENOUS_INPUTS,
  EXOGENOUS_INPUTS,
  canonicalExampleForCompany,
  casesForCaseSet,
  deriveDecisionSystemMetrics,
  scorebookRowsAreSynthetic,
  summarizeEvidenceCoverage,
  type CompanyThesisInput,
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
  if (normalized === "OBSERVED" || normalized === "DERIVED") return "DERIVED";
  if (normalized === "SOURCED") return "SOURCED";
  if (normalized === "ASSUMED") return "ASSUMED";
  if (normalized === "INFERRED") return "INFERRED";
  return "UNKNOWN";
}

function includesAny(value: string | number | null | undefined, terms: string[]) {
  const normalized = String(value ?? "").toUpperCase();
  return terms.some((term) => normalized.includes(term));
}

function QuestionNarrative({
  title,
  whyItMatters,
  possibleAnswers,
  currentInterpretation,
  provenance,
  whyThisAnswer,
  evidenceUsed,
  changeAnswer,
  implication,
  helmerConnection,
  editHref,
  children
}: {
  title: string;
  whyItMatters: string;
  possibleAnswers: string[];
  currentInterpretation: string;
  provenance: string;
  whyThisAnswer: string[];
  evidenceUsed: string[];
  changeAnswer: string[];
  implication: string;
  helmerConnection?: string;
  editHref?: string;
  children: ReactNode;
}) {
  return (
    <div className="compoundingQuestionShell">
      <div className="card compoundingQuestionSummary">
        <div>
          <p className="small">Question</p>
          <h3>{title}</h3>
        </div>
        <div>
          <p className="small">Current interpretation</p>
          <h3>{currentInterpretation}</h3>
          <span className="miniTag">{provenance}</span>
        </div>
      </div>
      <div className="compoundingQuestionGrid">
        <div className="card">
          <h3>Why it matters</h3>
          <p>{whyItMatters}</p>
        </div>
        <div className="card">
          <h3>Possible answers</h3>
          <ul>{possibleAnswers.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
        <div className="card">
          <h3>Why this answer</h3>
          <ul>{whyThisAnswer.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
        <div className="card">
          <h3>Evidence / assumptions used</h3>
          <ul>{evidenceUsed.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
        <div className="card">
          <h3>What would change the answer</h3>
          <ul>{changeAnswer.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
        <div className="card">
          <h3>Power / CE implication</h3>
          <p>{implication}</p>
          {helmerConnection ? <p className="small">{helmerConnection}</p> : null}
          {editHref ? <a className="btn" href={editHref}>Edit / review relevant assumptions</a> : null}
        </div>
      </div>
      {children}
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
  const loopProvenance = activeRows.length
    ? activeRowsAreSynthetic ? "SYNTHETIC-FIXTURE DERIVED" : "COMPANY-DATA DERIVED"
    : "UNKNOWN / DILIGENCE REQUIRED";
  const learningLoopNodes: Array<[string, string | number | null | undefined, string]> = [
    ["CONTEXT", activeRows.length ? `${activeRows.length}/${activeRows.length} represented` : learning?.capturesContext, loopProvenance],
    ["DECISION", activeRows.length ? `${activeRows.filter((row) => row.agentDecision).length}/${activeRows.length} represented` : learning?.capturesAgentDecision, loopProvenance],
    ["HUMAN", activeRows.length ? `${activeRows.filter((row) => row.humanDecision).length}/${activeRows.length} represented` : learning?.capturesHumanDecision, loopProvenance],
    ["ACTION", activeRows.length ? `${activeRows.filter((row) => row.actionTaken).length}/${activeRows.length} represented` : learning?.capturesActionTaken, loopProvenance],
    ["OUTCOME", activeRows.length ? `${activeRows.filter((row) => row.outcome).length}/${activeRows.length} represented` : learning?.capturesOutcome, loopProvenance],
    ["GRADE", activeRows.length ? `${activeRows.filter((row) => row.grade !== "UNRESOLVED").length}/${activeRows.length} represented` : learning?.capturesExplicitGrade, loopProvenance],
    ["UPDATE", learning?.usesOutcomeGradesForLearning ?? "UNKNOWN", "UNKNOWN / DILIGENCE REQUIRED"],
    ["DEPLOYMENT", learning?.deploymentCadence ?? analysis?.deploysImprovementsQuickly ?? "UNKNOWN", "UNKNOWN / DILIGENCE REQUIRED"]
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
  const loopCapturedCount = learningLoopNodes.filter(([, value]) => !includesAny(value, ["UNKNOWN", "NO", "NOT"])).length;
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
    ? activeRowsAreSynthetic ? "ARCHETYPE-ASSUMPTION DOMINATED + SYNTHETIC-FIXTURE DERIVED" : "ARCHETYPE-ASSUMPTION DOMINATED"
    : activeRowsAreSynthetic ? "SYNTHETIC-FIXTURE DERIVED" : "MIXED / DILIGENCE REQUIRED";

  return (
    <>
      <LabWorkflowRail active="Company Model" analysisId={analysis?.id} />
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
        <div className="compoundingConceptFlow">
          <span>What decisions create the opportunity to learn?</span>
          <span>Can reality teach the system?</span>
          <span>Does the company close the learning loop?</span>
          <span>If it learns, can competitors reproduce it?</span>
        </div>
        <p className="small">
          Each section shows the current interpretation, the evidence and assumptions behind it, alternative interpretations,
          and what would change the answer. Your task is to review the model rather than fill out a form.
        </p>
        <a className="btn primary" href="#company-model-review">Review company model ↓</a>
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
          <Section title="Evidence coverage">
            <div className="compoundingEvidenceStrip">
              <span><strong>{activeRowsAreSynthetic ? 0 : derived.totalCases}</strong> company-observed / company-derived</span>
              <span><strong>{evidenceCoverage.sourced}</strong> externally sourced</span>
              <span><strong>{activeRowsAreSynthetic ? derived.totalCases : 0}</strong> synthetic-derived rows</span>
              <span><strong>{evidenceCoverage.assumed}</strong> analyst / archetype assumptions</span>
              <span><strong>{evidenceCoverage.inferred}</strong> model inference</span>
              <span><strong>{coverageTotal ? evidenceCoverage.unknown : 8}</strong> unknown / diligence required</span>
            </div>
            <details className="card compoundingDisclosure">
              <summary>Most important unknowns</summary>
              <ul>
                <li>Does performance improve from graded outcomes rather than merely storing cases?</li>
                <li>Does learning transfer across customers without washing out local context?</li>
                <li>Does the company have rights to retain, evaluate, and learn from cases?</li>
                <li>How quickly could a capable challenger rebuild, simulate, or compress the useful expertise?</li>
                <li>How much does foundation-model progress reduce the value of accumulated experience?</li>
              </ul>
            </details>
          </Section>

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

          <Section title="1. What decisions create the opportunity to learn?">
            <QuestionNarrative
              title="What decisions create the opportunity to learn?"
              whyItMatters="Compounding Expertise forms around recurring decision classes, not abstractly at the company level. A Decision Class is a recurring type of judgment the system makes under similar conditions."
              possibleAnswers={[
                "Strong learning opportunity",
                "Conditional learning opportunity",
                "Weak learning opportunity",
                "Unknown"
              ]}
              currentInterpretation={decisionInterpretation}
              provenance={modelProvenance}
              whyThisAnswer={[
                `${visibleDecisionClasses.length} decision class${visibleDecisionClasses.length === 1 ? "" : "es"} represented.`,
                repeatedDecision ? "The model contains repeated decisions or an active CaseSet." : "Decision frequency is not established.",
                meaningfulStakes ? "At least one decision class is modeled as economically meaningful." : "Economic stakes are weak or unknown.",
                gradeableDecision || observableDecision ? "The model has at least partial observability or gradeability." : "Outcome observability and gradeability are weak or unknown."
              ]}
              evidenceUsed={[
                `Decision classes: ${visibleDecisionClasses.map((item) => item.name).join(", ") || "none"}.`,
                `Action evidence: ${derived.actionDistribution.slice(0, 3).map((item) => `${item.label} (${item.count})`).join(", ") || "unavailable"}.`,
                `CaseSet rows: ${derived.totalCases} (${activeRowsAreSynthetic ? "synthetic fixture" : "active data"}).`,
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
                      <td><span className="miniTag">{decisionClasses.length ? "ASSUMED" : "LEGACY SUMMARY"}</span></td>
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

          <Section title="2. Can reality teach the system?">
            <QuestionNarrative
              title="Can reality teach the system?"
              whyItMatters="Experience only compounds when decisions occur, outcomes are observed, outcomes can be graded, feedback arrives, and the lesson remains relevant long enough to improve future decisions."
              possibleAnswers={[
                "Strong feedback environment",
                "Partial feedback environment",
                "Weak feedback environment",
                "Unknown"
              ]}
              currentInterpretation={feedbackInterpretation}
              provenance={modelProvenance}
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
            <div className="compoundingCausalChain">
              {[
                ["DECISIONS OCCUR", display(opportunity?.naturalCaseFrequency ?? analysis.caseFrequency), "Frequency determines how quickly experience can accumulate."],
                ["OUTCOMES ARE OBSERVED", display(opportunity?.outcomeObservability ?? analysis.observesOutcome), "Unobserved outcomes cannot teach the system."],
                ["OUTCOMES CAN BE GRADED", display(opportunity?.outcomeObjectivity ?? analysis.outcomeObjectivity), "Objective grades reduce ambiguity."],
                ["FEEDBACK ARRIVES", days(opportunity?.naturalFeedbackLatencyDays ?? derived.medianDecisionToOutcomeLatencyDays), "Long lags slow compounding."],
                ["LESSON REMAINS RELEVANT", display(opportunity?.environmentalNonstationarity ?? analysis.environmentalChangeRate), "High nonstationarity erodes accumulated expertise."]
              ].map(([label, value, meaning]) => (
                <span key={label}>
                  <strong>{label}</strong>
                  <small>{value}</small>
                  <em>{meaning}</em>
                </span>
              ))}
            </div>
            <div className="compoundingProfileGrid">
              <div className="card"><strong>Case frequency</strong><p>{display(opportunity?.naturalCaseFrequency ?? analysis.caseFrequency)}</p><span className="miniTag">{evidenceLabel("ASSUMED")}</span></div>
              <div className="card"><strong>Synthetic CaseSet volume</strong><p>{derived.observedDecisionVolume.count} cases{derived.observedDecisionVolume.casesPerMonth !== null ? ` / ${derived.observedDecisionVolume.casesPerMonth} per month in fixture` : ""}</p><span className="miniTag">SYNTHETIC-FIXTURE DERIVED</span></div>
              <div className="card"><strong>Outcome observability</strong><p>{display(opportunity?.outcomeObservability ?? analysis.observesOutcome)}</p><span className="miniTag">ASSUMED</span></div>
              <div className="card"><strong>Outcome objectivity</strong><p>{display(opportunity?.outcomeObjectivity ?? analysis.outcomeObjectivity)}</p><span className="miniTag">ASSUMED</span></div>
              <div className="card"><strong>Feedback latency</strong><p>{days(opportunity?.naturalFeedbackLatencyDays ?? derived.medianDecisionToOutcomeLatencyDays)}</p><span className="miniTag">{derived.medianDecisionToOutcomeLatencyDays === null ? "UNKNOWN" : activeRowsAreSynthetic ? "SYNTHETIC-FIXTURE DERIVED" : "COMPANY-DATA DERIVED"}</span></div>
              <div className="card"><strong>Nonstationarity</strong><p>{display(opportunity?.environmentalNonstationarity ?? analysis.environmentalChangeRate)}</p><span className="miniTag">ASSUMED</span></div>
              <div className="card"><strong>Foundation model improvement</strong><p>{display(opportunity?.foundationModelImprovementRate ?? analysis.foundationModelImprovementRate)}</p><span className="miniTag">ASSUMED</span></div>
            </div>
            <div className="card">
              <h3>Current interpretation</h3>
              <p>{canonicalExample ? "Potentially favorable learning environment under the archetype. Frequent, economically meaningful decisions and relatively objective feedback would support learning, but several conditions remain archetype assumptions rather than verified company evidence." : "Interpretation depends on replacing assumptions with observed or sourced evidence. No numeric Compounding Expertise score is calculated."}</p>
            </div>
            </QuestionNarrative>
          </Section>

          <Section title="3. Does the company close the learning loop?">
            <QuestionNarrative
              title="Does the company close the learning loop?"
              whyItMatters="Operational data becomes expertise only when context, decisions, human intervention, actions, outcomes, grades, updates, and deployment are materially connected."
              possibleAnswers={[
                "Closed loop",
                "Partially closed loop",
                "Open loop",
                "Unknown"
              ]}
              currentInterpretation={loopInterpretation}
              provenance={modelProvenance}
              whyThisAnswer={[
                `${loopCapturedCount} of ${learningLoopNodes.length} learning-loop nodes have some represented or assumed status.`,
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
            <p>The operational workflow generates experience. The learning loop determines whether that experience becomes expertise.</p>
            <div className="compoundingLearningLoop">
              {learningLoopNodes.map(([label, value, provenance]) => (
                <span key={label}>
                  <strong>{label}</strong>
                  <small>{display(value)}</small>
                  <small>{display(provenance)}</small>
                  <em>
                    {label === "UPDATE"
                      ? "Do grades change future policy or model behavior?"
                      : label === "DEPLOYMENT"
                        ? "Do learned changes reach production?"
                        : `${label.toLowerCase()} evidence captured in the loop.`}
                  </em>
                </span>
              ))}
            </div>
            <div className="card">
              <h3>Critical learning-loop question</h3>
              <p>We can model a scorebook, but do we have evidence that graded outcomes actually improve future decisions?</p>
              <p className="small">If cross-customer learning is unknown, the next question is whether those improvements transfer across customers.</p>
            </div>
            <div className="compoundingProfileGrid">
              <div className="card"><strong>Cross-customer pooling</strong><p>{display(learning?.pooledAcrossCustomers ?? analysis.learnsAcrossCustomers)}</p></div>
              <div className="card"><strong>Customer-specific adaptation</strong><p>{display(learning?.customerSpecificAdaptation)}</p></div>
              <div className="card"><strong>Experimentation</strong><p>{display(learning?.experimentationMode ?? analysis.runsControlledExperiments)}</p></div>
              <div className="card"><strong>Model / policy cadence</strong><p>{display(learning?.modelUpdateCadence ?? analysis.updatesModelPolicyRegularly)} / {display(learning?.policyUpdateCadence)}</p></div>
              <div className="card"><strong>Deployment cadence</strong><p>{display(learning?.deploymentCadence ?? analysis.deploysImprovementsQuickly)}</p></div>
              <div className="card"><strong>Learning rights</strong><p>{display(learning?.canTrainAcrossCustomers ?? analysis.contractualLearningRights)}</p></div>
            </div>
            </QuestionNarrative>
          </Section>

          <Section title="4. If it learns, can competitors reproduce it?">
            <QuestionNarrative
              title="If it learns, can competitors reproduce it?"
              whyItMatters="A company can possess valuable expertise without possessing durable Power. The investment question is whether the learning advantage persists against capable challengers."
              possibleAnswers={[
                "Difficult to reproduce",
                "Conditional / uncertain",
                "Easy to reproduce",
                "Unknown"
              ]}
              currentInterpretation={competitiveInterpretation}
              provenance={modelProvenance}
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
            <div className="card">
              <h3>What pattern would support Power?</h3>
              <ol>
                <li>Valuable learning exists.</li>
                <li>The learning loop closes.</li>
                <li>Learning transfers to future relevant decisions.</li>
                <li>Useful new information continues accumulating.</li>
                <li>The learning is economically meaningful.</li>
                <li>Competitors cannot cheaply compress, simulate, infer, or relearn the useful expertise.</li>
              </ol>
            </div>
            <div className="compoundingProfileGrid">
              <div className="card"><strong>Data advantage</strong><p>Raw cases: {display(competitive?.rawCasesExclusive ?? analysis.dataExclusivity)}<br />Outcomes: {display(competitive?.outcomesExclusive)}<br />Corrections: {display(competitive?.humanCorrectionsExclusive)}</p></div>
              <div className="card"><strong>Workflow position</strong><p>Decision: {display(competitive?.systemOfDecision ?? analysis.ownsDecisionPoint)}<br />Action: {display(competitive?.systemOfAction ?? analysis.controlsAction)}<br />Outcome capture: {display(competitive?.systemOfOutcomeCapture ?? analysis.observesOutcome)}</p></div>
              <div className="card"><strong>Rebuildability / substitution</strong><p>Public data: {display(competitive?.publicDataSubstitutionRisk)}<br />Synthetic data: {display(competitive?.syntheticDataSubstitutionRisk)}<br />Foundation model: {display(competitive?.foundationModelSubstitutionRisk ?? analysis.foundationModelDependence)}</p></div>
              <div className="card"><strong>Alternative Power</strong><p>Deterministic infrastructure: {display(competitive?.deterministicInfrastructureStrength ?? analysis.deterministicInfrastructure)}<br />Distribution: {display(competitive?.distributionAdvantage ?? analysis.distributionAdvantage)}<br />Regulatory / contractual: {display(competitive?.regulatoryBarrierStrength ?? analysis.regulatoryContractualBarriers)}</p></div>
            </div>
            </QuestionNarrative>
          </Section>

          <Section title="What we currently think">
            <div className="grid grid-2">
              <div className="card">
                <h3>Working synthesis</h3>
                <p>
                  {profile.name} currently shows <strong>{decisionInterpretation.toLowerCase()}</strong>, a <strong>{feedbackInterpretation.toLowerCase()}</strong>,
                  a <strong>{loopInterpretation.toLowerCase()}</strong>, and <strong>{competitiveInterpretation.toLowerCase()}</strong> defensibility.
                  {canonicalExample ? " Because this is a canonical test, much of that assessment is intentionally assumption-driven." : " The conclusion should update as assumptions are replaced with evidence."}
                </p>
                {activeRowsAreSynthetic ? (
                  <p className="small">
                    The synthetic CaseSet demonstrates what a scorebook could look like; it does not establish that the real company operates this learning loop.
                  </p>
                ) : null}
              </div>
              <div className="card">
                <h3>What we still need to know</h3>
                <ul>
                  <li>Whether graded outcomes improve future decision behavior.</li>
                  <li>Whether learning transfers across customers and case types.</li>
                  <li>Whether learning rights and workflow position make the advantage defensible.</li>
                  <li>Whether stronger models, synthetic data, or competitor relearning can compress the advantage.</li>
                </ul>
              </div>
            </div>
            <div className="card">
              <h3>Next step</h3>
              <p>Now inspect the cases that represent the proposed scorebook and ask what they actually teach.</p>
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
