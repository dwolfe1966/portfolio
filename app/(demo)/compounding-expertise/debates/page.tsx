import Link from "next/link";
import { Section } from "@/components/site/Section";
import { LabWorkflowRail } from "@/components/compounding-expertise/CompoundingLabComponents";
import {
  casesForCaseSet,
  deriveDebateCandidates,
  type DebateEvidenceItem,
  type KeyDebateInput,
  type ScorebookCaseInput
} from "@/lib/compounding-expertise-lab";
import { generateDebatesAction, saveDebatesAction } from "../actions";
import { currentAccountUserId, loadCompoundingAnalysis } from "../data";

export const dynamic = "force-dynamic";

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

function evidenceCount(items: DebateEvidenceItem[]) {
  return items.length;
}

function evidenceList(title: string, items: DebateEvidenceItem[]) {
  return (
    <div className="compoundingEvidenceList">
      <h4>{title}</h4>
      {items.length ? items.map((item) => (
        <div className={`card compact compoundingEvidenceItem compoundingEvidenceItem-${item.direction.toLowerCase()}`} key={`${item.source}-${item.value}-${item.direction}`}>
          <div className="compoundingCardHeader">
            <div>
              <p className="small">{item.direction} · {item.strength}</p>
              <strong>{item.source}</strong>
            </div>
            <span className="miniTag">{item.provenance}</span>
          </div>
          <p><strong>Value / observation:</strong> {item.value}</p>
          <p><strong>Interpretation:</strong> {item.interpretation}</p>
          <p className="small"><strong>Limitation:</strong> {item.limitation}</p>
          {item.href ? <Link className="btn" href={item.href}>Inspect source</Link> : null}
        </div>
      )) : <p className="small">No evidence in this category yet.</p>}
    </div>
  );
}

function editDebateFields(debate: Partial<KeyDebateInput>, index: number) {
  return (
    <>
      <input type="hidden" name="debateId" value={debate.id ?? ""} />
      <input type="hidden" name="source" value={debate.source || "USER"} />
      <label>
        Proposition
        <textarea name="question" rows={2} defaultValue={debate.question ?? ""} placeholder="Load-bearing proposition" />
      </label>
      <div className="grid grid-2">
        <label>
          Bull case
          <textarea name="bullCase" rows={4} defaultValue={debate.bullCase ?? ""} />
        </label>
        <label>
          Bear case
          <textarea name="bearCase" rows={4} defaultValue={debate.bearCase ?? ""} />
        </label>
      </div>
      <label>
        Evidence needed / best next test
        <textarea name="evidenceNeeded" rows={3} defaultValue={debate.evidenceNeeded ?? ""} />
      </label>
      <div className="grid grid-2">
        <label>
          What would increase belief?
          <textarea name="increaseBelief" rows={3} defaultValue={debate.increaseBelief ?? ""} />
        </label>
        <label>
          What would decrease belief?
          <textarea name="decreaseBelief" rows={3} defaultValue={debate.decreaseBelief ?? ""} />
        </label>
      </div>
      <label className="compoundingRangeLabel">
        Your belief that proposition is true
        <input name="probability" type="number" min="0" max="100" step="1" defaultValue={debate.probability ?? 50} aria-label={`Investor belief ${index + 1}`} />
      </label>
    </>
  );
}

export default async function CompoundingExpertiseDebatesPage({
  searchParams
}: {
  searchParams: Promise<{ ai?: string; analysisId?: string; caseSetId?: string }>;
}) {
  const params = await searchParams;
  const accountUserId = await currentAccountUserId();
  const analysis = await loadCompoundingAnalysis(accountUserId, params.analysisId);
  if (!analysis) {
    return (
      <>
        <LabWorkflowRail active="Key Debates" analysisId={params.analysisId} />
        <Section title="Start with company inputs">
          <p>Create or load an analysis before defining key debates.</p>
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
  const debates: KeyDebateInput[] = analysis.keyDebates.map((debate) => ({
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
  const candidates = deriveDebateCandidates({
    analysis,
    debates,
    rows: activeRows,
    analysisId: analysis.id,
    caseSetId: selectedCaseSet?.id,
    learningArchitecture: analysis.learningArchitecture,
    competitiveArchitecture: analysis.competitiveArchitecture,
    evidenceRecords: analysis.evidenceRecords
  });

  return (
    <>
      <LabWorkflowRail
        active="Key Debates"
        analysisId={analysis.id}
        activeAnalysisLabel={analysis.companyName}
        activeAnalysisDetail={selectedCaseSet?.name ?? "Selected company analysis"}
      />
      <Section eyebrow="Key Debates" title="What would change the thesis?">
        <div className="card compoundingStageOrientation">
          <div>
            <p className="small">What am I seeing?</p>
            <p>The unresolved propositions with the greatest leverage over whether operating experience becomes durable Compounding Expertise.</p>
          </div>
          <div>
            <p className="small">Why does it matter?</p>
            <p>A company can have abundant cases, fast feedback, and a complete scorebook while still failing to create durable Power.</p>
          </div>
          <div>
            <p className="small">What should I do?</p>
            <p>Compare CE&apos;s evidence assessment with your own belief, inspect supporting and missing evidence, and identify the next test most likely to change your mind.</p>
          </div>
        </div>
        {params.ai ? (
          <div className="card compoundingSyntheticBanner">
            <strong>{params.ai === "generated" ? "AI suggestions loaded." : "Manual fallback loaded."}</strong>
            <p>AI-generated material is a SUGGESTION — NOT EVIDENCE. It does not create sourced evidence, recommended probabilities, or company facts.</p>
          </div>
        ) : null}
        <form action={generateDebatesAction} className="ctaRow">
          <input type="hidden" name="analysisId" value={analysis.id} />
          <button className="btn" type="submit">Suggest debates with AI</button>
          <span className="small">Optional. Deterministic CE evidence assessment remains separate from AI suggestions.</span>
        </form>
      </Section>

      <Section title="Debate control surface">
        <div className="tableScroll compoundingDebateSummaryTable">
          <table className="dataTable">
            <thead>
              <tr>
                <th>Debate</th>
                <th>CE assessment</th>
                <th>Confidence</th>
                <th>Evidence coverage</th>
                <th>Thesis impact</th>
                <th>Your belief</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((candidate, index) => (
                <tr key={candidate.family}>
                  <td><a href={`#debate-${candidate.family}`}>{index + 1}. {candidate.title}</a></td>
                  <td>{candidate.assessment}</td>
                  <td>{candidate.confidence}</td>
                  <td>{evidenceCount(candidate.evidenceFor)} supporting/descriptive · {evidenceCount(candidate.missingEvidence)} missing</td>
                  <td>{candidate.thesisImpact}</td>
                  <td>{candidate.investorBelief === null ? "—" : `${candidate.investorBelief}%`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Evidence → belief debates">
        <form action={saveDebatesAction}>
          <input type="hidden" name="analysisId" value={analysis.id} />
          <div className="compoundingDebateStack">
            {candidates.map((candidate, index) => (
              <article className="card compoundingDebateCard compoundingDebateAnalysisCard" id={`debate-${candidate.family}`} key={candidate.family}>
                <div className="compoundingCardHeader">
                  <div>
                    <p className="small">{candidate.title}</p>
                    <h3>{candidate.proposition}</h3>
                  </div>
                  <div className="compoundingBadgeStack">
                    <span className="provenanceBadge">{candidate.assessment}</span>
                    <span className="provenanceBadge">{candidate.confidence} confidence</span>
                    <span className="provenanceBadge">{candidate.thesisImpact} impact</span>
                  </div>
                </div>
                <p><strong>Why load-bearing:</strong> {candidate.whyLoadBearing}</p>
                <div className="grid grid-3">
                  <div className="card compact">
                    <p className="small">CE recommended evidence assessment</p>
                    <h3>{candidate.assessment}</h3>
                    <p>{candidate.assessmentReason}</p>
                  </div>
                  <div className="card compact">
                    <p className="small">Your belief</p>
                    <h3>{candidate.investorBelief === null ? "Not set" : `${candidate.investorBelief}%`}</h3>
                    {candidate.investorBeliefDivergence ? <p className="small">{candidate.investorBeliefDivergence}</p> : <p className="small">Investor belief remains separate from CE evidence.</p>}
                  </div>
                  <div className="card compact">
                    <p className="small">Best next test</p>
                    <p>{candidate.bestNextTest}</p>
                  </div>
                </div>
                <div className="grid grid-3">
                  {evidenceList("Evidence for", candidate.evidenceFor)}
                  {evidenceList("Evidence against / alternatives", candidate.evidenceAgainst)}
                  {evidenceList("Missing evidence", candidate.missingEvidence)}
                </div>
                <div className="grid grid-2">
                  <div className="card compact">
                    <h4>If true</h4>
                    <p>{candidate.ifTrue}</p>
                  </div>
                  <div className="card compact">
                    <h4>If false</h4>
                    <p>{candidate.ifFalse}</p>
                  </div>
                </div>
                <div className="grid grid-2">
                  <div className="card compact">
                    <h4>What would increase belief?</h4>
                    <p>{candidate.sourceDebate?.increaseBelief || candidate.increaseBelief}</p>
                  </div>
                  <div className="card compact">
                    <h4>What would decrease belief?</h4>
                    <p>{candidate.sourceDebate?.decreaseBelief || candidate.decreaseBelief}</p>
                  </div>
                </div>
                <details className="compoundingInlineEditor">
                  <summary>View argument</summary>
                  <div className="grid grid-2">
                    <div>
                      <p className="small">Bull case</p>
                      <p>{candidate.sourceDebate?.bullCase || "No bull case supplied yet."}</p>
                    </div>
                    <div>
                      <p className="small">Bear case</p>
                      <p>{candidate.sourceDebate?.bearCase || "No bear case supplied yet."}</p>
                    </div>
                  </div>
                </details>
                <details className="compoundingInlineEditor">
                  <summary>Edit proposition</summary>
                  {editDebateFields(candidate.sourceDebate ?? {
                    question: candidate.proposition,
                    bullCase: "",
                    bearCase: "",
                    evidenceNeeded: candidate.bestNextTest,
                    increaseBelief: candidate.increaseBelief,
                    decreaseBelief: candidate.decreaseBelief,
                    probability: candidate.investorBelief ?? 50,
                    source: "USER"
                  }, index)}
                  <label>
                    Investor note / private evidence reminder
                    <textarea rows={3} placeholder="Example: founder showed pooled-vs-local performance in meeting; upload/source later. This note is not converted into CE evidence by this form." />
                  </label>
                </details>
              </article>
            ))}
          </div>
          <details className="card compoundingDisclosure">
            <summary>+ Add debate</summary>
            {editDebateFields({
              question: "",
              bullCase: "",
              bearCase: "",
              evidenceNeeded: "",
              increaseBelief: "",
              decreaseBelief: "",
              probability: 50,
              source: "USER"
            }, candidates.length)}
          </details>
          <div className="ctaRow">
            <button className="btn primary" type="submit">Save debate edits</button>
            <Link className="btn" href={`/compounding-expertise/scorebook?analysisId=${analysis.id}${selectedCaseSet ? `&caseSetId=${selectedCaseSet.id}` : ""}`}>Back to Experience</Link>
            <Link className="btn" href={`/compounding-expertise/diagnostic?analysisId=${analysis.id}`}>Continue to Power</Link>
          </div>
        </form>
      </Section>
    </>
  );
}
