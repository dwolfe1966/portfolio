import { resolveExperienceContext } from "@/lib/experience-context";
import Link from "next/link";
import { Section } from "@/components/site/Section";
import { LabWorkflowRail } from "@/components/compounding-expertise/CompoundingLabComponents";
import { DebateSuggestionFeedback, DebateChangedBadge, DebateChangedSection, DebatePanel, DebateCard, DebateEditButton, DebateEditor, DebateEditingRegion } from "@/components/compounding-expertise/DebateSuggestionFeedback";
import { debateReviewSnapshots } from "@/lib/debate-suggestion-feedback";
import { DebateArgumentBrief } from "@/components/compounding-expertise/DebateArgumentBrief";
import { ACTION_POLICY_FAMILIES } from "@/lib/action-policy-experiment";
import {
  buildCasapPublicSimulationCases,
  CASAP_PUBLIC_EVIDENCE_ANALYSIS,
  CASAP_PUBLIC_SIMULATION_CASESET_KEY,
  casesForCaseSet,
  deriveDebateCandidates,
  type DebateDashboardBar,
  type DebateDashboardMetric,
  type DebateEvidenceDashboard,
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

function directionLabel(direction: DebateEvidenceItem["direction"]) {
  if (direction === "CONTEXT-DESCRIPTIVE") return "CONTEXT";
  if (direction === "SUPPORTS") return "SUPPORTS";
  if (direction === "CONTRADICTS") return "CONTRADICTS";
  return "MISSING";
}

function evidenceList(title: string, items: DebateEvidenceItem[]) {
  return (
    <div className="compoundingEvidenceList">
      <h4>{title}</h4>
      {items.length ? items.map((item) => (
        <div className={`card compact compoundingEvidenceItem compoundingEvidenceItem-${item.direction.toLowerCase()}`} key={`${item.source}-${item.value}-${item.direction}`}>
          <div className="compoundingCardHeader">
            <div>
              <p className="small">{directionLabel(item.direction)} · {item.strength}</p>
              <strong>{item.source}</strong>
            </div>
            <span className="miniTag">{item.provenance}</span>
          </div>
          <p><strong>Value / observation:</strong> {item.value}</p>
          <p><strong>Interpretation:</strong> {item.interpretation}</p>
          <p className="small"><strong>Limitation:</strong> {item.limitation}</p>
          {item.obtainVia ? <p className="small"><strong>Obtain via:</strong> {item.obtainVia}</p> : null}
          {item.expectedEvidence ? <p className="small"><strong>Expected evidence:</strong> {item.expectedEvidence}</p> : null}
          {item.href ? <Link className="btn" href={item.href}>Inspect source</Link> : null}
        </div>
      )) : <p className="small">No evidence in this category yet.</p>}
    </div>
  );
}

function metricCard(metric: DebateDashboardMetric) {
  const content = (
    <>
      <p className="small">{metric.label}</p>
      <strong>{metric.value}</strong>
      {metric.sample ? <p className="small">{metric.sample}</p> : null}

    </>
  );
  return metric.href && !metric.unavailable
    ? <Link className="card compact compoundingMetricCard" href={metric.href} key={metric.label}>{content}</Link>
    : <div className={`card compact compoundingMetricCard${metric.unavailable ? " compoundingMetricCard-unavailable" : ""}`} key={metric.label}>{content}</div>;
}

function barList(bars: DebateDashboardBar[] | undefined) {
  if (!bars?.length) return null;
  const max = Math.max(...bars.map((bar) => bar.count), 1);
  return (
    <div className="compoundingEvidenceBars">
      {bars.map((bar) => {
        const row = (
          <>
            <div className="compoundingEvidenceBarMeta">
              <strong>{bar.label}</strong>
              <span>{bar.value}</span>
            </div>
            <div className="compoundingEvidenceBarTrack" aria-hidden="true">
              <span style={{ width: `${Math.max(8, (bar.count / max) * 100)}%` }} />
            </div>
          </>
        );
        return bar.href
          ? <Link className="compoundingEvidenceBarRow" href={bar.href} key={bar.label}>{row}</Link>
          : <div className="compoundingEvidenceBarRow" key={bar.label}>{row}</div>;
      })}
    </div>
  );
}

function evidenceDashboard(dashboard: DebateEvidenceDashboard) {
  return (
    <div className="compoundingEvidenceDashboard">
      <div className="compoundingSectionHeader">
        <div>
          <p className="small">What the current evidence says</p>
          <h4>{dashboard.title}</h4>
        </div>
        <span className="miniTag">DATA</span>
      </div>
      <p>{dashboard.summary}</p>
      <div className="compoundingDashboardSections">
        {dashboard.sections.map((section) => (
          <div className="card compact compoundingDashboardSection" key={section.title}>
            <h4>{section.title}</h4>
            {section.note ? <p className="small">{section.note}</p> : null}
            {section.metrics?.length ? <div className="compoundingDashboardMetrics">{section.metrics.map(metricCard)}</div> : null}
            {barList(section.bars)}
          </div>
        ))}
      </div>
      <div className="card compact compoundingExternalEvidencePanel">
        <div className="compoundingCardHeader">
          <h4>External / market evidence</h4>
          <span className="miniTag">Separate from CaseSet</span>
        </div>
        {dashboard.externalEvidence.length ? (
          <div className="compoundingEvidenceList">
            {dashboard.externalEvidence.map((item) => (
              <div className={`card compact compoundingEvidenceItem compoundingEvidenceItem-${item.direction.toLowerCase()}`} key={`${item.source}-${item.value}-${item.direction}`}>
                <div className="compoundingCardHeader">
                  <strong>{item.source}</strong>
                  <span className="miniTag">{directionLabel(item.direction)}</span>
                </div>
                <p>{item.value}</p>
                <p className="small">{item.provenance} · {item.interpretation}</p>
                {item.href ? <Link className="btn" href={item.href}>Inspect source</Link> : null}
              </div>
            ))}
          </div>
        ) : (
          <div>
            <p>No external evidence has been attached to this debate yet.</p>
            <button className="btn" type="button" disabled>Add evidence</button>
            <p className="small">Future evidence can come from company documents, public research, data rooms, experiments, benchmarks, or upstream davidwolfe.app systems.</p>
          </div>
        )}
      </div>
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
  searchParams: Promise<{ ai?: string; analysisId?: string; caseSetId?: string; dataset?: string; experimentApplied?: string; policyApplied?: string; policyScenario?: string }>;
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

  const experienceContext = resolveExperienceContext(analysis, analysis.scorebookCases.map(caseInput), { caseSetId: params.caseSetId, dataset: params.dataset });
  const { selectedCaseSet, activeRows, datasetSuffix, dataset } = experienceContext;
  const activeDatasetName = experienceContext.selected.name;
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
    dataset,
    learningArchitecture: analysis.learningArchitecture,
    competitiveArchitecture: analysis.competitiveArchitecture,
    evidenceRecords: analysis.evidenceRecords
  });
  const appliedExperimentDebates = candidates.filter(candidate => candidate.contextEvidence.some(item => ["Experience → Automated Experiment Program", "Experience → Action-Policy Experiment"].includes(item.source)));
  const downstreamParams = new URLSearchParams({ analysisId: analysis.id });
  if (selectedCaseSet?.id) downstreamParams.set("caseSetId", selectedCaseSet.id);
  if (dataset) downstreamParams.set("dataset", dataset);

  return (
    <>
      <LabWorkflowRail
        active="Key Debates"
        analysisId={analysis.id}
        activeAnalysisLabel={analysis.companyName}
        datasetSuffix={datasetSuffix}
        activeAnalysisDetail={activeDatasetName}
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
            <p>Compare CE&apos;s categorical evidence assessment with your own belief, inspect typed evidence, and identify the next test most likely to change your mind.</p>
          </div>
        </div>
      </Section>

      {params.experimentApplied === "1" ? <Section title="Experiment suite applied">
        <div className="card" style={{ borderColor: "#16a34a" }}>
          <span className="statusPill live">APPLIED TO SELECTED DATASET</span>
          <h3>Conditional experiment conclusions are now part of the broader analysis.</h3>
          <p>Updated {appliedExperimentDebates.length} debate areas: {appliedExperimentDebates.map(candidate => candidate.title).join(", ") || "no matching debate families"}. The findings remain labeled synthetic experiment context—not observed company evidence—and your belief values were not changed.</p>
          <div className="ctaRow">
            <a className="btn primary" href="#debate-CROSS_CUSTOMER_TRANSFER">Review updated debates</a>
            <Link className="btn" href={`/compounding-expertise/diagnostic?${downstreamParams.toString()}`}>Review Power</Link>
            <Link className="btn" href={`/compounding-expertise/memo?${downstreamParams.toString()}`}>Review Conclusion</Link>
            <Link className="btn" href={`/compounding-expertise/scorebook?${downstreamParams.toString()}#experiment-lab`}>Back to Experiment Lab</Link>
          </div>
        </div>
      </Section> : null}

      {params.policyApplied ? <Section title="Action-policy result applied">
        <div className="card" style={{ borderColor: "#16a34a" }}>
          <span className="statusPill live">APPLIED TO SELECTED DATASET</span>
          <h3>The {params.policyApplied.replaceAll("_", " ").toLowerCase()} experiment now informs the broader analysis.</h3>
          {params.policyScenario === "CASAP_DISPUTES" ? <p>Casap workflow run: learning, cross-customer transfer, marginal information, and economic materiality were updated together using the same simulated worlds.</p> : null}
          <p>The reviewed conclusion is attached to this selected parent dataset, while its trial rows are available as a separate synthetic child CaseSet. Debate assessments, Power, Conclusion, and future AI suggestions can now use the conditional finding without confusing it with observed company outcomes.</p>
          <div className="ctaRow">
            <a className="btn primary" href={`#debate-${params.policyApplied}`}>Review updated debate</a>
            <Link className="btn" href={`/compounding-expertise/diagnostic?${downstreamParams.toString()}`}>Review Power</Link>
            <Link className="btn" href={`/compounding-expertise/memo?${downstreamParams.toString()}`}>Review Conclusion</Link>
            <Link className="btn" href={`/compounding-expertise/scorebook?${downstreamParams.toString()}#action-policy-lab`}>Inspect experiment</Link>
          </div>
        </div>
      </Section> : null}

      <DebateSuggestionFeedback
        key={`${analysis.id}:${params.caseSetId ?? params.dataset ?? "default"}`}
        analysisId={analysis.id}
        snapshots={debateReviewSnapshots(candidates)}
        action={generateDebatesAction}
        caseSetId={selectedCaseSet?.id}
        dataset={dataset}
      >
      <Section title="Key questions">
        <ol className="compoundingQuestionIndex">
          {candidates.map((candidate, index) => (
            <li key={candidate.family}>
              <a href={`#debate-${candidate.family}`}><span aria-hidden="true">{index + 1}</span><strong>{candidate.proposition}</strong></a>
              <div className="small">{candidate.assessment} · {candidate.thesisImpact} impact <DebateChangedBadge family={candidate.family} /></div>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="Evidence → belief debates">
        <form action={saveDebatesAction}>
          <DebateEditingRegion>
          <input type="hidden" name="analysisId" value={analysis.id} />
        <input type="hidden" name="dataset" value={dataset ?? ""} />
        <input type="hidden" name="caseSetId" value={selectedCaseSet?.id ?? ""} />
          <div className="compoundingDebateStack">
            {candidates.map((candidate, index) => (
              <DebateCard family={candidate.family} key={candidate.family}>
                <div className="compoundingCardHeader">
                  <DebateChangedSection family={candidate.family} section="proposition">
                    <p className="small">Debate {index + 1} · {candidate.title}</p>
                    <h3>{candidate.proposition}</h3>
                  </DebateChangedSection>
                  <div className="compoundingBadgeStack">
                    {params.policyApplied && (params.policyApplied === candidate.family || params.policyScenario === "CASAP_DISPUTES" && ACTION_POLICY_FAMILIES.some(family => family === candidate.family)) ? <span className="statusPill live">EXPERIMENT APPLIED</span> : null}
                    <span className="provenanceBadge">{candidate.assessment}</span>
                    <span className="provenanceBadge">{candidate.confidence} confidence</span>
                    <span className="provenanceBadge">{candidate.thesisImpact} impact</span>
                    <DebateEditButton />
                  </div>
                </div>
                <DebateArgumentBrief candidate={candidate} />
                {ACTION_POLICY_FAMILIES.some(family => family === candidate.family) ? <div className="card compact compoundingExperimentPrompt">
                  <div>
                    <p className="small">EXECUTABLE NEXT TEST</p>
                    <h4>Test whether a changed action policy improves outcomes</h4>
                    <p>{candidate.bestNextTest}</p>
                  </div>
                  <Link className="btn primary" href={`/compounding-expertise/scorebook?${downstreamParams.toString()}&policyFamily=${candidate.family}#action-policy-lab`}>Configure experiment</Link>
                </div> : null}
                <DebatePanel family={candidate.family} kind="evidence" title="Evidence details" description="Inspect measurements, provenance, and original sources.">
                  {evidenceDashboard(candidate.evidenceDashboard)}
                  <details className="compoundingEvidenceLedgerLink">
                    <summary>View all sources and evidence</summary>
                  <div className="grid grid-2">
                    {evidenceList("Evidence that supports", candidate.evidenceFor)}
                    {evidenceList("Evidence that contradicts / alternatives", candidate.evidenceAgainst)}
                    {evidenceList("Context, not proof", candidate.contextEvidence)}
                    {evidenceList("Missing evidence", candidate.missingEvidence)}
                  </div>
                  </details>
                </DebatePanel>
                <DebatePanel family={candidate.family} sections={["argument", "belief"]} kind="argument" title="Argument & implications" description="The case for and against, its consequences, and what would resolve it.">
                  <DebateChangedSection family={candidate.family} section="argument">
                    <div className="compoundingArgumentColumns">
                      <div>
                        <h4>Case for</h4>
                        <p>{candidate.sourceDebate?.bullCase || "No bull case supplied yet."}</p>
                      </div>
                      <div>
                        <h4>Case against</h4>
                        <p>{candidate.sourceDebate?.bearCase || "No bear case supplied yet."}</p>
                      </div>
                    </div>
                  </DebateChangedSection>
                  <div className="compoundingArgumentColumns compoundingConsequences">
                  <div className="card compact">
                    <h4>If true</h4>
                    <p>{candidate.ifTrue}</p>
                  </div>
                  <div className="card compact">
                    <h4>If false</h4>
                    <p>{candidate.ifFalse}</p>
                  </div>
                  </div>
                  <DebateChangedSection family={candidate.family} section="belief">
                  <h4>What would resolve this?</h4>
                  <div className="compoundingArgumentColumns">
                  <div className="card compact">
                    <h4>What would increase belief?</h4>
                    <p>{candidate.sourceDebate?.increaseBelief || candidate.increaseBelief}</p>
                  </div>
                  <div className="card compact">
                    <h4>What would decrease belief?</h4>
                    <p>{candidate.sourceDebate?.decreaseBelief || candidate.decreaseBelief}</p>
                  </div>
                  </div>
                  <p className="small"><strong>Next decisive test:</strong> {candidate.bestNextTest}</p>
                  </DebateChangedSection>
                </DebatePanel>
                <DebatePanel family={candidate.family} sections={["position"]} kind="assessment" title="Your assessment" description="Your recorded belief and working notes, separate from evidence.">
                  <DebateChangedSection family={candidate.family} section="position">
                    <div className="compoundingAssessmentReadout">
                      <strong>{candidate.investorBelief === null ? "Not set" : `${candidate.investorBelief}%`}</strong>
                      <span className="small">{candidate.investorBelief === null ? "No belief recorded" : candidate.sourceDebate?.source === "AI" ? "AI-suggested; review before adopting" : "Recorded belief · separate from evidence"}</span>
                    </div>
                    {candidate.investorBeliefDivergence ? <p>{candidate.investorBeliefDivergence}</p> : <p>Belief remains separate from the CE evidence assessment.</p>}
                    <p className="small">Use Edit debate to change and save your belief.</p>
                  </DebateChangedSection>
                  <label>
                    Working rationale (draft only — not saved)
                    <textarea rows={3} placeholder="Why do you hold this view? Draft notes do not change the evidence assessment." />
                  </label>
                </DebatePanel>
                <DebateEditor key={candidate.sourceDebate?.id ?? candidate.family}>
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
                </DebateEditor>
              </DebateCard>
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
            <Link className="btn" href={`/compounding-expertise/scorebook?analysisId=${analysis.id}${datasetSuffix}`}>Back to Experience</Link>
            <Link className="btn" href={`/compounding-expertise/diagnostic?analysisId=${analysis.id}${datasetSuffix}`}>Continue to Power</Link>
          </div>
          </DebateEditingRegion>
        </form>
      </Section>
      </DebateSuggestionFeedback>
    </>
  );
}
