import Link from "next/link";
import { Section } from "@/components/site/Section";
import { IntegrityNotice, LabWorkflowRail, ProvenanceBadge } from "@/components/compounding-expertise/CompoundingLabComponents";
import { ALL_DIMENSIONS, DIAGNOSTIC_QUESTIONS, defaultAssessments, type CompoundingFramework } from "@/lib/compounding-expertise-lab";
import { saveDiagnosticAction } from "../actions";
import { currentAccountUserId, loadCompoundingAnalysis } from "../data";

export const dynamic = "force-dynamic";

const FRAMEWORK_COPY: Record<CompoundingFramework, string> = {
  HELMER: "Hamilton Helmer Seven Powers. Strategic interpretation layer, not a claim that Compounding Expertise is automatically an eighth Power.",
  SUN: "Ben Sun Compounding Expertise dimensions. These test the scorebook and capture-loop thesis.",
  WOLFE: "David Wolfe extensions. These stress-test transferability, compressibility, causality, nonstationarity, and learning velocity."
};

export default async function CompoundingExpertiseDiagnosticPage({
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
        <LabWorkflowRail active="Power" analysisId={params.analysisId} />
        <Section title="Start with company inputs">
          <p>Create or load an analysis before scoring dimensions.</p>
          <Link className="btn primary" href="/compounding-expertise/inputs">Go to Company Model</Link>
        </Section>
      </>
    );
  }

  const stored = new Map(analysis.dimensionAssessments.map((item) => [`${item.framework}:${item.dimension}`, item]));
  const fallback = defaultAssessments();
  const rows = ALL_DIMENSIONS.map((definition) => {
    const storedAssessment = stored.get(`${definition.framework}:${definition.dimension}`);
    const defaultAssessment = fallback.find((item) => item.framework === definition.framework && item.dimension === definition.dimension)!;
    return { definition, assessment: storedAssessment ?? { id: "", ...defaultAssessment } };
  });

  function assessmentEditor(framework: CompoundingFramework, dimension: string) {
    const row = rows.find((item) => item.definition.framework === framework && item.definition.dimension === dimension);
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
      <LabWorkflowRail active="Power" analysisId={analysis?.id} />
      <Section eyebrow="Power · SUN + WOLFE + HELMER diagnostic" title="Where might durable Power reside?">
        <p>
          Use the scorebook and system context to assess three strategic questions. Keep evidence status visible;
          do not calculate a simplistic overall moat score.
        </p>
        <IntegrityNotice />
      </Section>

      <form action={saveDiagnosticAction}>
        <input type="hidden" name="analysisId" value={analysis.id} />
        {DIAGNOSTIC_QUESTIONS.map((question) => (
          <Section key={question.title} title={question.title}>
            <p>{question.description}</p>
            <div className="compoundingAssessmentGrid">
              {question.items.map((item) => assessmentEditor(item.framework, item.dimension))}
            </div>
          </Section>
        ))}

        <Section title="How might this create Helmer Power?">
          <div className="card compoundingFrameworkIntro">
            <ProvenanceBadge framework="HELMER" />
            <p>{FRAMEWORK_COPY.HELMER}</p>
          </div>
          <div className="compoundingAssessmentGrid">
            {rows.filter((row) => row.definition.framework === "HELMER").map(({ definition }) => assessmentEditor(definition.framework, definition.dimension))}
          </div>
          <p className="small">No demonstrated Power yet remains a valid conclusion.</p>
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

        <div className="ctaRow">
          <button className="btn primary" type="submit">Save and continue</button>
          <Link className="btn" href={`/compounding-expertise/debates?analysisId=${analysis.id}`}>Back</Link>
        </div>
      </form>
    </>
  );
}
