import Link from "next/link";
import { Section } from "@/components/site/Section";
import { LabWorkflowRail } from "@/components/compounding-expertise/CompoundingLabComponents";
import {
  ALL_DIMENSIONS,
  apparentPowerLocations,
  calculateScorebookMetrics,
  casesForCaseSet,
  composeMemo,
  defaultAssessments,
  summarizeConclusion,
  sortedHighLeverageDebates,
  strongestChallenges,
  strongestEvidence,
  type DimensionAssessmentInput,
  type KeyDebateInput
} from "@/lib/compounding-expertise-lab";
import { currentAccountUserId, loadCompoundingAnalysis } from "../data";

export const dynamic = "force-dynamic";

function assessmentInputs(analysis: NonNullable<Awaited<ReturnType<typeof loadCompoundingAnalysis>>>): DimensionAssessmentInput[] {
  const stored = new Map(analysis.dimensionAssessments.map((item) => [`${item.framework}:${item.dimension}`, item]));
  const defaults = defaultAssessments();
  return ALL_DIMENSIONS.map((definition) => {
    const row = stored.get(`${definition.framework}:${definition.dimension}`);
    const fallback = defaults.find((item) => item.framework === definition.framework && item.dimension === definition.dimension)!;
    return {
      framework: definition.framework,
      dimension: definition.dimension,
      score: row?.score ?? fallback.score,
      confidence: row?.confidence ?? fallback.confidence,
      rationale: row?.rationale ?? fallback.rationale,
      evidenceStatus: row?.evidenceStatus ?? fallback.evidenceStatus,
      source: row?.source ?? fallback.source
    };
  });
}

function debateInputs(analysis: NonNullable<Awaited<ReturnType<typeof loadCompoundingAnalysis>>>): KeyDebateInput[] {
  return analysis.keyDebates.map((debate) => ({
    question: debate.question,
    bullCase: debate.bullCase,
    bearCase: debate.bearCase,
    evidenceNeeded: debate.evidenceNeeded,
    increaseBelief: debate.increaseBelief,
    decreaseBelief: debate.decreaseBelief,
    probability: debate.probability,
    source: debate.source
  }));
}

function labelForDimension(dimension: string) {
  return ALL_DIMENSIONS.find((item) => item.dimension === dimension)?.label ?? dimension.replaceAll("_", " ");
}

function conclusionCard(title: string, value: string, why: string) {
  return (
    <div className="card compoundingConclusionCard">
      <p className="small">{title}</p>
      <h3>{value}</h3>
      <p>{why}</p>
    </div>
  );
}

export default async function CompoundingExpertiseMemoPage({
  searchParams
}: {
  searchParams: Promise<{ analysisId?: string }>;
}) {
  const params = await searchParams;
  const accountUserId = await currentAccountUserId();
  const analysis = await loadCompoundingAnalysis(accountUserId, params.analysisId);
  if (!analysis) {
    return (
      <>
        <LabWorkflowRail active="Conclusion" />
        <Section title="Start with company inputs">
          <p>Create or load an analysis before generating a memo.</p>
          <Link className="btn primary" href="/compounding-expertise/inputs">Go to Company Model</Link>
        </Section>
      </>
    );
  }

  const assessments = assessmentInputs(analysis);
  const debates = debateInputs(analysis);
  const memo = composeMemo({ analysis, debates, assessments });
  const evidence = strongestEvidence(assessments);
  const challenges = strongestChallenges(assessments);
  const unresolved = sortedHighLeverageDebates(debates);
  const power = apparentPowerLocations(assessments);
  const selectedCaseSet = analysis.caseSets[0] ?? null;
  const scorebookRows = analysis.scorebookCases.map((row) => ({ ...row }));
  const activeRows = casesForCaseSet(scorebookRows, selectedCaseSet?.id);
  const scorebookMetrics = calculateScorebookMetrics(activeRows);
  const conclusion = summarizeConclusion({ analysis, metrics: scorebookMetrics, assessments, debates });
  const memoText = [
    `Current thesis\n${analysis.thesis || "No thesis supplied."}`,
    `\nStrongest evidence for Compounding Expertise\n${memo.strongestEvidence.length ? memo.strongestEvidence.slice(0, 3).map((item) => `- ${item}`).join("\n") : "- No strong evidence has been established yet."}`,
    `\nStrongest challenges\n${memo.strongestChallenges.length ? memo.strongestChallenges.slice(0, 3).map((item) => `- ${item}`).join("\n") : "- No strong challenges have been scored yet."}`,
    `\nScorebook Evidence\n- CaseSet: ${selectedCaseSet?.name ?? "All scorebook rows"}\n- Cases: ${scorebookMetrics.totalCases}\n- Grade coverage: ${scorebookMetrics.gradeCoverage === null ? "unavailable" : `${Math.round(scorebookMetrics.gradeCoverage * 100)}%`} (${scorebookMetrics.gradedCases}/${scorebookMetrics.totalCases})\n- Median feedback latency: ${scorebookMetrics.medianFeedbackLatencyDays === null ? "unavailable" : `${scorebookMetrics.medianFeedbackLatencyDays} days`} (n=${scorebookMetrics.feedbackLatencySampleSize})\n- Human override behavior: ${scorebookMetrics.humanOverrideValue.count} override rows; correct/partially correct rate ${scorebookMetrics.humanOverrideValue.correctRate === null ? "unavailable" : `${Math.round(scorebookMetrics.humanOverrideValue.correctRate * 100)}%`} where resolvable\n- Data limitations: unresolved outcomes, synthetic fixtures, subjective grades, or missing economic outcomes should be treated as limitations, not ignored.`,
    `\nHighest-leverage unresolved debates\n${memo.unresolvedDebates.map((item) => `- ${item.question} (${item.probability}%). Increase belief: ${item.increaseBelief || "not specified"}. Decrease belief: ${item.decreaseBelief || "not specified"}.`).join("\n")}`,
    `\nWhere Power appears to reside\n${power.map((item) => `- ${item}`).join("\n")}`,
    `\nWhat would change our mind?\n${memo.evidenceRequests.map((item) => `- ${item}`).join("\n")}`,
    `\nScorebook Question\nDoes the observed scorebook support the Compounding Expertise claim, or are we inferring Power from workflow position and data volume?`,
    `\nWolfe Stress Test\n${memo.wolfeStressTest}`
  ].join("\n");

  return (
    <>
      <LabWorkflowRail active="Conclusion" />
      <Section eyebrow="Stage 6" title="Conclusion">
        <p>
          The conclusion preserves uncertainty. It should show what is believed, what is assumed,
          where Power may actually reside, and what evidence would most change the thesis.
        </p>
      </Section>

      <Section title="What do we currently believe?">
        <div className="compoundingConclusionGrid">
          {conclusionCard("Compounding Opportunity", conclusion.opportunity, conclusion.opportunityWhy)}
          {conclusionCard("Company Compounding Capability", conclusion.capability, conclusion.capabilityWhy)}
          {conclusionCard("Evidence Quality", conclusion.evidenceQuality, conclusion.evidenceWhy)}
        </div>
      </Section>

      <Section title="Where Power may reside">
        <div className="card">
          <div className="compoundingPowerList">
            {power.map((item) => <span key={item}>{item}</span>)}
          </div>
          <p className="small">Compounding Expertise may reinforce or produce existing Helmer Powers. No demonstrated Power yet remains valid.</p>
        </div>
      </Section>

      <Section title="Biggest unresolved debate">
        <div className="card">
          <h3>{conclusion.biggestDebate?.question ?? "No key debate has been defined yet."}</h3>
          {conclusion.biggestDebate ? (
            <>
              <p><strong>Current belief:</strong> {conclusion.biggestDebate.probability}%</p>
              <p><strong>Evidence needed:</strong> {conclusion.biggestDebate.evidenceNeeded || "Not specified."}</p>
              <p><strong>Would increase belief:</strong> {conclusion.biggestDebate.increaseBelief || "Not specified."}</p>
              <p><strong>Would decrease belief:</strong> {conclusion.biggestDebate.decreaseBelief || "Not specified."}</p>
            </>
          ) : null}
        </div>
      </Section>

      <Section title="Best next experiment / evidence">
        <div className="card">
          <p>{conclusion.nextExperiment}</p>
        </div>
      </Section>

      <Section title="Scorebook evidence">
        <div className="card">
          <p><strong>Cases:</strong> {scorebookMetrics.totalCases}</p>
          <p><strong>CaseSet:</strong> {selectedCaseSet?.name ?? "All scorebook rows"}</p>
          <p><strong>Grade coverage:</strong> {scorebookMetrics.gradeCoverage === null ? "Unavailable" : `${Math.round(scorebookMetrics.gradeCoverage * 100)}%`} ({scorebookMetrics.gradedCases}/{scorebookMetrics.totalCases})</p>
          <p><strong>Feedback latency:</strong> {scorebookMetrics.medianFeedbackLatencyDays === null ? "Unavailable" : `${scorebookMetrics.medianFeedbackLatencyDays} days`} (n={scorebookMetrics.feedbackLatencySampleSize})</p>
          <p><strong>Override behavior:</strong> {scorebookMetrics.humanOverrideValue.count} human override rows; {scorebookMetrics.humanOverrideValue.resolvableCount} have resolvable grades.</p>
          <p><strong>Major data limitations:</strong> incomplete outcomes, unresolved grades, synthetic rows, subjective grading, and sparse economic outcomes should remain visible.</p>
          <p>
            <strong>Core question:</strong> Does the observed scorebook support the Compounding Expertise claim,
            or are we inferring Power from workflow position and data volume?
          </p>
        </div>
      </Section>

      <Section title="Current thesis">
        <div className="card">
          <p>{analysis.thesis || "No thesis supplied."}</p>
        </div>
      </Section>

      <Section title="Evidence and challenges">
        <div className="grid grid-2">
          <div className="card">
            <h3>Strongest evidence for Compounding Expertise</h3>
            {evidence.length ? evidence.slice(0, 3).map((item) => (
              <p key={`${item.framework}-${item.dimension}`}>
                <strong>{item.framework} · {labelForDimension(item.dimension)}:</strong> {item.score}/5 · {item.evidenceStatus.toLowerCase()} · {item.rationale || "No rationale supplied."}
              </p>
            )) : <p>No high-scoring evidence has been established yet.</p>}
          </div>
          <div className="card">
            <h3>Strongest challenges</h3>
            {challenges.length ? challenges.slice(0, 3).map((item) => (
              <p key={`${item.framework}-${item.dimension}`}>
                <strong>{item.framework} · {labelForDimension(item.dimension)}:</strong> {item.score}/5 · {item.evidenceStatus.toLowerCase()} · {item.rationale || "No rationale supplied."}
              </p>
            )) : <p>No low-scoring challenges have been established yet.</p>}
          </div>
        </div>
      </Section>

      <Section title="Highest-leverage unresolved debates">
        <div className="compoundingDebateStack">
          {unresolved.map((debate) => (
            <div className="card" key={debate.question}>
              <div className="compoundingCardHeader">
                <h3>{debate.question}</h3>
                <span className="provenanceBadge">{debate.probability}%</span>
              </div>
              <p><strong>Bull:</strong> {debate.bullCase}</p>
              <p><strong>Bear:</strong> {debate.bearCase}</p>
              <p><strong>Would increase belief:</strong> {debate.increaseBelief}</p>
              <p><strong>Would decrease belief:</strong> {debate.decreaseBelief}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Copyable memo">
        <textarea className="compoundingMemoText" readOnly rows={24} value={memoText} />
      </Section>

      <Section title="Next">
        <div className="ctaRow">
          <Link className="btn" href={`/compounding-expertise/simulator?analysisId=${analysis.id}`}>Back to Stress Test</Link>
          <Link className="btn primary" href={`/compounding-expertise/inputs?analysisId=${analysis.id}`}>Revise analysis</Link>
        </div>
      </Section>
    </>
  );
}
