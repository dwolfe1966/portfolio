import Link from "next/link";
import { Section } from "@/components/site/Section";
import { IntegrityNotice, LabWorkflowRail, ProvenanceBadge } from "@/components/compounding-expertise/CompoundingLabComponents";
import {
  ALL_DIMENSIONS,
  DIAGNOSTIC_QUESTIONS,
  casesForCaseSet,
  defaultAssessments,
  derivePowerMap,
  type AnalystPowerAssessment,
  type CompoundingFramework,
  type DimensionAssessmentInput,
  type PowerEvidenceStrength,
  type PowerThesisStrength,
  type ScorebookCaseInput
} from "@/lib/compounding-expertise-lab";
import { saveDiagnosticAction } from "../actions";
import { currentAccountUserId, loadCompoundingAnalysis } from "../data";

export const dynamic = "force-dynamic";

const FRAMEWORK_COPY: Record<CompoundingFramework, string> = {
  HELMER: "Hamilton Helmer Seven Powers. Strategic interpretation layer, not a claim that Compounding Expertise is automatically an eighth Power.",
  SUN: "Ben Sun Compounding Expertise dimensions. These test the scorebook and capture-loop thesis.",
  WOLFE: "David Wolfe extensions. These stress-test transferability, compressibility, causality, nonstationarity, and learning velocity."
};

const THESIS_LEVEL: Record<PowerThesisStrength, number> = { NONE: 0, UNPROVEN: 12, WEAK: 34, MODERATE: 62, STRONG: 100 };
const EVIDENCE_LEVEL: Record<PowerEvidenceStrength, number> = { NONE: 0, LOW: 34, MEDIUM: 67, HIGH: 100 };

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

function evidenceList(title: string, items: Array<{ source: string; value: string; interpretation: string; limitation: string; href?: string }>) {
  return (
    <div className="compoundingEvidenceList">
      <h4>{title}</h4>
      {items.length ? items.map((item) => (
        <div className="card compact" key={`${title}-${item.source}-${item.value}`}>
          <strong>{item.source}</strong>
          <p>{item.value}</p>
          <p className="small">{item.interpretation}</p>
          <p className="small"><strong>Limitation:</strong> {item.limitation}</p>
          {item.href ? <Link className="btn" href={item.href}>Inspect source</Link> : null}
        </div>
      )) : <p className="small">No evidence in this category yet.</p>}
    </div>
  );
}

function powerBars(thesis: PowerThesisStrength, evidence: PowerEvidenceStrength) {
  return (
    <div className="compoundingPowerBars">
      <div>
        <div className="compoundingPowerBarLabel"><span>Thesis</span><strong>{thesis}</strong></div>
        <div className="compoundingPowerBar"><span style={{ width: `${THESIS_LEVEL[thesis]}%` }} /></div>
      </div>
      <div>
        <div className="compoundingPowerBarLabel"><span>Evidence</span><strong>{evidence}</strong></div>
        <div className="compoundingPowerBar compoundingPowerBar-evidence"><span style={{ width: `${EVIDENCE_LEVEL[evidence]}%` }} /></div>
      </div>
    </div>
  );
}

function analystSummary(assessment: AnalystPowerAssessment | null) {
  if (!assessment) return <p className="small">No analyst assessment recorded.</p>;
  return (
    <div className="card compact compoundingAnalystSummary">
      <p className="small">Analyst assessment</p>
      <strong>{assessment.score}/5 · {assessment.confidence} confidence · {assessment.evidenceStatus}</strong>
      <p>{assessment.rationale || "No rationale recorded."}</p>
    </div>
  );
}

export default async function CompoundingExpertiseDiagnosticPage({
  searchParams
}: {
  searchParams: Promise<{ analysisId?: string; caseSetId?: string }>;
}) {
  const params = await searchParams;
  const accountUserId = await currentAccountUserId();
  const analysis = await loadCompoundingAnalysis(accountUserId, params.analysisId);
  if (!analysis) {
    return (
      <>
        <LabWorkflowRail active="Power" analysisId={params.analysisId} />
        <Section title="Start with company inputs">
          <p>Create or load an analysis before scoring dimensions.</p>
          <Link className="btn primary" href="/compounding-expertise/inputs">Go to Company Model</Link>
        </Section>
      </>
    );
  }

  const selectedCaseSet = params.caseSetId
    ? analysis.caseSets.find((caseSet) => caseSet.id === params.caseSetId) ?? null
    : analysis.caseSets[0] ?? null;
  const rows = analysis.scorebookCases.map(caseInput);
  const activeRows = casesForCaseSet(rows, selectedCaseSet?.id);
  const debates = analysis.keyDebates.map((debate) => ({
    id: debate.id,
    question: debate.question,
    bullCase: debate.bullCase,
    bearCase: debate.bearCase,
    evidenceNeeded: debate.evidenceNeeded,
    increaseBelief: debate.increaseBelief,
    decreaseBelief: debate.decreaseBelief,
    probability: debate.probability,
    source: debate.source
  }));
  const storedAssessments: DimensionAssessmentInput[] = analysis.dimensionAssessments.map((item) => ({
    id: item.id,
    framework: item.framework as CompoundingFramework,
    dimension: item.dimension,
    score: item.score,
    confidence: item.confidence,
    rationale: item.rationale,
    evidenceStatus: item.evidenceStatus,
    source: item.source
  }));
  const powerMap = derivePowerMap({
    analysis,
    debates,
    rows: activeRows,
    analysisId: analysis.id,
    caseSetId: selectedCaseSet?.id,
    learningArchitecture: analysis.learningArchitecture,
    competitiveArchitecture: analysis.competitiveArchitecture,
    evidenceRecords: analysis.evidenceRecords,
    assessments: storedAssessments
  });
  const stored = new Map(analysis.dimensionAssessments.map((item) => [`${item.framework}:${item.dimension}`, item]));
  const fallback = defaultAssessments();
  const assessmentRows = ALL_DIMENSIONS.map((definition) => {
    const storedAssessment = stored.get(`${definition.framework}:${definition.dimension}`);
    const defaultAssessment = fallback.find((item) => item.framework === definition.framework && item.dimension === definition.dimension)!;
    return { definition, assessment: storedAssessment ?? { id: "", ...defaultAssessment } };
  });

  function assessmentEditor(framework: CompoundingFramework, dimension: string) {
    const row = assessmentRows.find((item) => item.definition.framework === framework && item.definition.dimension === dimension);
    if (!row) return null;
    const { definition, assessment } = row;
    return (
      <details className="card compoundingAssessmentCard" key={`${framework}-${dimension}`}>
        <summary>
          <span>
            <strong>{definition.label}</strong>
            <small>{definition.description}</small>
          </span>
          <ProvenanceBadge framework={definition.framework} />
        </summary>
        <input type="hidden" name="assessmentId" value={assessment.id} />
        <input type="hidden" name="framework" value={definition.framework} />
        <input type="hidden" name="dimension" value={definition.dimension} />
        <div className="grid grid-3">
          <label>
            Score
            <input name="score" type="number" min="0" max="5" step="1" defaultValue={assessment.score} />
          </label>
          <label>
            Confidence
            <select name="confidence" defaultValue={assessment.confidence}>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </label>
          <label>
            Evidence
            <select name="evidenceStatus" defaultValue={assessment.evidenceStatus}>
              <option value="UNKNOWN">Unknown</option>
              <option value="ASSUMED">Assumed</option>
              <option value="SOURCED">Sourced</option>
              <option value="OBSERVED">Observed</option>
            </select>
          </label>
        </div>
        <label>
          Rationale
          <textarea name="rationale" rows={4} defaultValue={assessment.rationale} />
        </label>
      </details>
    );
  }

  return (
    <>
      <LabWorkflowRail
        active="Power"
        analysisId={analysis.id}
        activeAnalysisLabel={analysis.companyName}
        activeAnalysisDetail={selectedCaseSet?.name ?? "Selected company analysis"}
      />
      <Section eyebrow="Power Map" title="Where does durable Power appear to reside?">
        <p>
          This page derives Power hypotheses from the Company Model, active Experience, Key Debates, and attached evidence.
          It keeps thesis strength separate from evidence strength and does not compute an overall moat score.
        </p>
        <IntegrityNotice />
      </Section>

      <Section title="Current Power conclusion">
        <div className="card compoundingPowerConclusion">
          <h3>{powerMap.conclusion}</h3>
          <p>{powerMap.ceMechanism.summary}</p>
          <div className="compoundingBadgeStack">
            {powerMap.ceMechanism.classifications.map((classification) => <span className="provenanceBadge" key={classification}>{classification}</span>)}
          </div>
        </div>
      </Section>

      <Section title="Power fingerprint">
        <div className="compoundingPowerFingerprint">
          {powerMap.powers.map((power) => (
            <a className="card compact compoundingPowerFingerprintRow" href={`#power-${power.key}`} key={power.key}>
              <div>
                <strong>{power.label}</strong>
                <p className="small">{power.mechanism}</p>
              </div>
              {powerBars(power.thesisStrength, power.evidenceStrength)}
            </a>
          ))}
        </div>
      </Section>

      <Section title="Power mechanism map">
        <div className="compoundingMechanismMap">
          {powerMap.mechanismEdges.map((edge) => (
            <div className="card compact compoundingMechanismEdge" key={`${edge.from}-${edge.to}`}>
              <strong>{edge.from}</strong>
              <span>→</span>
              <strong>{edge.to}</strong>
              <small>{edge.state} thesis · {edge.evidence} evidence</small>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Power cards">
        <div className="compoundingPowerCardGrid">
          {powerMap.powers.map((power) => (
            <article className="card compoundingPowerCard" id={`power-${power.key}`} key={power.key}>
              <div className="compoundingCardHeader">
                <div>
                  <p className="small">HELMER POWER</p>
                  <h3>{power.label}</h3>
                </div>
                <div className="compoundingBadgeStack">
                  <span className="provenanceBadge">Thesis {power.thesisStrength}</span>
                  <span className="provenanceBadge">Evidence {power.evidenceStrength}</span>
                </div>
              </div>
              {powerBars(power.thesisStrength, power.evidenceStrength)}
              <p><strong>Mechanism:</strong> {power.mechanism}</p>
              <p><strong>Why:</strong> {power.why}</p>
              <div className="compoundingSubdimensionGrid">
                {power.subdimensions.map((item) => (
                  <div className="card compact" key={`${power.key}-${item.label}`}>
                    <p className="small">{item.label}</p>
                    <strong>{item.state}</strong>
                    <span className="miniTag">{item.evidence} evidence</span>
                  </div>
                ))}
              </div>
              {power.analystDiverges ? <div className="card compact compoundingSyntheticBanner"><strong>Analyst view differs from CE evidence model.</strong><p>Manual analyst input is preserved separately and does not overwrite the derived assessment.</p></div> : null}
              {analystSummary(power.analystAssessment)}
              <details className="compoundingInlineEditor">
                <summary>Full evidence</summary>
                <div className="grid grid-3">
                  {evidenceList("Evidence for", power.evidenceFor)}
                  {evidenceList("Evidence against", power.evidenceAgainst)}
                  {evidenceList("Missing evidence", power.missingEvidence)}
                </div>
                <p className="small">Relevant debates: {power.relevantDebates.length ? power.relevantDebates.join(", ") : "None attached yet."}</p>
              </details>
            </article>
          ))}
        </div>
      </Section>

      <Section title="Framework provenance">
        <div className="grid grid-3">
          {(["HELMER", "SUN", "WOLFE"] as const).map((framework) => (
            <div className="card compoundingFrameworkIntro" key={framework}>
              <ProvenanceBadge framework={framework} />
              <p>{FRAMEWORK_COPY[framework]}</p>
            </div>
          ))}
        </div>
      </Section>

      <form action={saveDiagnosticAction}>
        <input type="hidden" name="analysisId" value={analysis.id} />
        <Section title="Analyst override / advanced assessment">
          <p>
            Existing manual SUN / WOLFE / HELMER assessments remain editable for backward compatibility. They are treated as analyst judgment,
            not as a silent replacement for CE-derived Power evidence.
          </p>
          {DIAGNOSTIC_QUESTIONS.map((question) => (
            <details className="card compoundingDisclosure" key={question.title}>
              <summary>{question.title}</summary>
              <p>{question.description}</p>
              <div className="compoundingAssessmentGrid">
                {question.items.map((item) => assessmentEditor(item.framework, item.dimension))}
              </div>
            </details>
          ))}
          <details className="card compoundingDisclosure">
            <summary>Helmer manual assessments</summary>
            <div className="compoundingAssessmentGrid">
              {assessmentRows.filter((row) => row.definition.framework === "HELMER").map(({ definition }) => assessmentEditor(definition.framework, definition.dimension))}
            </div>
          </details>
        </Section>

        <div className="ctaRow">
          <button className="btn" type="submit">Save analyst assessments</button>
          <Link className="btn" href={`/compounding-expertise/debates?analysisId=${analysis.id}${selectedCaseSet ? `&caseSetId=${selectedCaseSet.id}` : ""}`}>Back to Key Debates</Link>
          <Link className="btn primary" href={`/compounding-expertise/simulator?analysisId=${analysis.id}`}>Continue to Stress Test →</Link>
        </div>
      </form>
    </>
  );
}
