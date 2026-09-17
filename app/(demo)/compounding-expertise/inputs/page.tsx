import Link from "next/link";
import { Section } from "@/components/site/Section";
import { EpistemicBadge, IntegrityNotice, LabWorkflowRail } from "@/components/compounding-expertise/CompoundingLabComponents";
import {
  COMPETITIVE_INPUTS,
  ENDOGENOUS_INPUTS,
  EXOGENOUS_INPUTS,
  canonicalExampleForCompany,
  casesForCaseSet,
  deriveDecisionSystemMetrics,
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

export default async function CompoundingExpertiseInputsPage({
  searchParams
}: {
  searchParams: Promise<{ example?: string }>;
}) {
  const params = await searchParams;
  const accountUserId = await currentAccountUserId();
  const analysis = await loadCompoundingAnalysis(accountUserId);
  const canonicalExample = canonicalExampleForCompany(analysis?.companyName);
  const profile = analysis ? profileFacts(analysis) : null;
  const selectedCaseSet = analysis?.caseSets[0] ?? null;
  const scorebookRows = analysis?.scorebookCases.map(caseInput) ?? [];
  const activeRows = casesForCaseSet(scorebookRows, selectedCaseSet?.id);
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

  return (
    <>
      <LabWorkflowRail active="System & Environment" />
      <Section eyebrow="Stage 1" title="System & Environment">
        <p>
          Review the system that generates experience, the environment it operates in, and the evidence behind each conclusion.
        </p>
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
          <Section title="Evidence coverage">
            <div className="compoundingEvidenceStrip">
              <span><strong>{evidenceCoverage.derived}</strong> derived / observed</span>
              <span><strong>{evidenceCoverage.sourced}</strong> sourced</span>
              <span><strong>{evidenceCoverage.assumed}</strong> analyst or synthetic assumptions</span>
              <span><strong>{evidenceCoverage.inferred}</strong> inferred</span>
              <span><strong>{coverageTotal ? evidenceCoverage.unknown : 8}</strong> unknown / diligence required</span>
            </div>
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

          <Section title="Decision system">
            <div className="card compoundingCanonicalPanel">
              <div className="compoundingCardHeader">
                <div>
                  <p className="small">Workflow</p>
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
                      <td><strong>{decisionClass.name}</strong><br />{display(decisionClass.description)}</td>
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
          </Section>

          <Section title="Compounding Opportunity">
            <div className="compoundingProfileGrid">
              <div className="card"><strong>Case frequency</strong><p>{display(opportunity?.naturalCaseFrequency ?? analysis.caseFrequency)}</p><span className="miniTag">{evidenceLabel("ASSUMED")}</span></div>
              <div className="card"><strong>Observed CaseSet volume</strong><p>{derived.observedDecisionVolume.count} cases{derived.observedDecisionVolume.casesPerMonth !== null ? ` / ${derived.observedDecisionVolume.casesPerMonth} per month observed` : ""}</p><span className="miniTag">DERIVED</span></div>
              <div className="card"><strong>Outcome observability</strong><p>{display(opportunity?.outcomeObservability ?? analysis.observesOutcome)}</p><span className="miniTag">ASSUMED</span></div>
              <div className="card"><strong>Outcome objectivity</strong><p>{display(opportunity?.outcomeObjectivity ?? analysis.outcomeObjectivity)}</p><span className="miniTag">ASSUMED</span></div>
              <div className="card"><strong>Feedback latency</strong><p>{days(opportunity?.naturalFeedbackLatencyDays ?? derived.medianDecisionToOutcomeLatencyDays)}</p><span className="miniTag">{derived.medianDecisionToOutcomeLatencyDays === null ? "UNKNOWN" : "DERIVED"}</span></div>
              <div className="card"><strong>Nonstationarity</strong><p>{display(opportunity?.environmentalNonstationarity ?? analysis.environmentalChangeRate)}</p><span className="miniTag">ASSUMED</span></div>
              <div className="card"><strong>Foundation model improvement</strong><p>{display(opportunity?.foundationModelImprovementRate ?? analysis.foundationModelImprovementRate)}</p><span className="miniTag">ASSUMED</span></div>
            </div>
          </Section>

          <Section title="Learning architecture">
            <div className="compoundingLearningLoop">
              {[
                ["CONTEXT", learning?.capturesContext],
                ["DECISION", learning?.capturesAgentDecision],
                ["HUMAN", learning?.capturesHumanDecision],
                ["ACTION", learning?.capturesActionTaken],
                ["OUTCOME", learning?.capturesOutcome],
                ["GRADE", learning?.capturesExplicitGrade],
                ["UPDATE", learning?.usesOutcomeGradesForLearning]
              ].map(([label, value]) => (
                <span key={label}><strong>{label}</strong><small>{display(value)}</small></span>
              ))}
            </div>
            <div className="compoundingProfileGrid">
              <div className="card"><strong>Cross-customer pooling</strong><p>{display(learning?.pooledAcrossCustomers ?? analysis.learnsAcrossCustomers)}</p></div>
              <div className="card"><strong>Customer-specific adaptation</strong><p>{display(learning?.customerSpecificAdaptation)}</p></div>
              <div className="card"><strong>Experimentation</strong><p>{display(learning?.experimentationMode ?? analysis.runsControlledExperiments)}</p></div>
              <div className="card"><strong>Model / policy cadence</strong><p>{display(learning?.modelUpdateCadence ?? analysis.updatesModelPolicyRegularly)} / {display(learning?.policyUpdateCadence)}</p></div>
              <div className="card"><strong>Deployment cadence</strong><p>{display(learning?.deploymentCadence ?? analysis.deploysImprovementsQuickly)}</p></div>
              <div className="card"><strong>Learning rights</strong><p>{display(learning?.canTrainAcrossCustomers ?? analysis.contractualLearningRights)}</p></div>
            </div>
          </Section>

          <Section title="Competitive architecture">
            <div className="compoundingProfileGrid">
              <div className="card"><strong>Data advantage</strong><p>Raw cases: {display(competitive?.rawCasesExclusive ?? analysis.dataExclusivity)}<br />Outcomes: {display(competitive?.outcomesExclusive)}<br />Corrections: {display(competitive?.humanCorrectionsExclusive)}</p></div>
              <div className="card"><strong>Workflow position</strong><p>Decision: {display(competitive?.systemOfDecision ?? analysis.ownsDecisionPoint)}<br />Action: {display(competitive?.systemOfAction ?? analysis.controlsAction)}<br />Outcome capture: {display(competitive?.systemOfOutcomeCapture ?? analysis.observesOutcome)}</p></div>
              <div className="card"><strong>Rebuildability / substitution</strong><p>Public data: {display(competitive?.publicDataSubstitutionRisk)}<br />Synthetic data: {display(competitive?.syntheticDataSubstitutionRisk)}<br />Foundation model: {display(competitive?.foundationModelSubstitutionRisk ?? analysis.foundationModelDependence)}</p></div>
              <div className="card"><strong>Alternative Power</strong><p>Deterministic infrastructure: {display(competitive?.deterministicInfrastructureStrength ?? analysis.deterministicInfrastructure)}<br />Distribution: {display(competitive?.distributionAdvantage ?? analysis.distributionAdvantage)}<br />Regulatory / contractual: {display(competitive?.regulatoryBarrierStrength ?? analysis.regulatoryContractualBarriers)}</p></div>
            </div>
          </Section>
        </>
      ) : (
        <Section title="Start an analysis">
          <p>Create or load a company analysis before the normalized company profile can be reviewed.</p>
        </Section>
      )}

      <Section title="Edit profile and assumptions">
        <form action={saveAnalysisAction} className="compoundingSystemForm">
          <input type="hidden" name="analysisId" value={analysis?.id ?? ""} />

          <details className="card compoundingDisclosure">
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

          <details className="card compoundingDisclosure">
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

          <details className="card compoundingDisclosure">
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

          <details className="card compoundingDisclosure">
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
            <button className="btn primary" type="submit">Save and inspect scorebook</button>
            <Link className="btn" href="/compounding-expertise/overview">Back to overview</Link>
          </div>
        </form>
      </Section>

      <Section title="Integrity note">
        <IntegrityNotice />
      </Section>
    </>
  );
}
