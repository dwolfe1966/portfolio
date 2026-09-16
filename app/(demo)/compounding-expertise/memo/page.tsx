import Link from "next/link";
import { Section } from "@/components/site/Section";
import { LabWorkflowRail } from "@/components/compounding-expertise/CompoundingLabComponents";
import {
  ALL_DIMENSIONS,
  apparentPowerLocations,
  composeMemo,
  defaultAssessments,
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

export default async function CompoundingExpertiseMemoPage() {
  const accountUserId = await currentAccountUserId();
  const analysis = await loadCompoundingAnalysis(accountUserId);
  if (!analysis) {
    return (
      <>
        <LabWorkflowRail active="Memo" />
        <Section title="Start with company inputs">
          <p>Create or load an analysis before generating a memo.</p>
          <Link className="btn primary" href="/compounding-expertise/inputs">Go to inputs</Link>
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
  const memoText = [
    `Current thesis\n${analysis.thesis || "No thesis supplied."}`,
    `\nStrongest evidence for Compounding Expertise\n${memo.strongestEvidence.length ? memo.strongestEvidence.slice(0, 3).map((item) => `- ${item}`).join("\n") : "- No strong evidence has been established yet."}`,
    `\nStrongest challenges\n${memo.strongestChallenges.length ? memo.strongestChallenges.slice(0, 3).map((item) => `- ${item}`).join("\n") : "- No strong challenges have been scored yet."}`,
    `\nHighest-leverage unresolved debates\n${memo.unresolvedDebates.map((item) => `- ${item.question} (${item.probability}%). Increase belief: ${item.increaseBelief || "not specified"}. Decrease belief: ${item.decreaseBelief || "not specified"}.`).join("\n")}`,
    `\nWhere Power appears to reside\n${power.map((item) => `- ${item}`).join("\n")}`,
    `\nWhat would change our mind?\n${memo.evidenceRequests.map((item) => `- ${item}`).join("\n")}`,
    `\nWolfe Stress Test\n${memo.wolfeStressTest}`
  ].join("\n");

  return (
    <>
      <LabWorkflowRail active="Memo" />
      <Section eyebrow="Stage 5" title="Analysis memo">
        <p>
          This memo preserves uncertainty. It should help a real conversation by showing what is believed,
          what is assumed, and what evidence would change the conclusion.
        </p>
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

      <Section title="Where Power appears to reside">
        <div className="card">
          <div className="compoundingPowerList">
            {power.map((item) => <span key={item}>{item}</span>)}
          </div>
        </div>
      </Section>

      <Section title="Copyable memo">
        <textarea className="compoundingMemoText" readOnly rows={24} value={memoText} />
      </Section>

      <Section title="Next">
        <div className="ctaRow">
          <Link className="btn" href="/compounding-expertise/simulator">Back to simulator</Link>
          <Link className="btn primary" href="/compounding-expertise/inputs">Revise analysis</Link>
        </div>
      </Section>
    </>
  );
}
