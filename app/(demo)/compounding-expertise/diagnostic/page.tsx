import Link from "next/link";
import { Section } from "@/components/site/Section";
import { IntegrityNotice, LabWorkflowRail, ProvenanceBadge } from "@/components/compounding-expertise/CompoundingLabComponents";
import { ALL_DIMENSIONS, defaultAssessments, type CompoundingFramework } from "@/lib/compounding-expertise-lab";
import { saveDiagnosticAction } from "../actions";
import { currentAccountUserId, loadCompoundingAnalysis } from "../data";

export const dynamic = "force-dynamic";

const FRAMEWORK_COPY: Record<CompoundingFramework, string> = {
  HELMER: "Hamilton Helmer Seven Powers. This panel asks where durable Power may reside.",
  SUN: "Ben Sun Compounding Expertise dimensions. This panel tests the scorebook and capture-loop thesis.",
  WOLFE: "David Wolfe extensions. This panel stress-tests transferability, compressibility, causality, nonstationarity, and learning velocity."
};

export default async function CompoundingExpertiseDiagnosticPage() {
  const accountUserId = await currentAccountUserId();
  const analysis = await loadCompoundingAnalysis(accountUserId);
  if (!analysis) {
    return (
      <>
        <LabWorkflowRail active="Diagnostic" />
        <Section title="Start with company inputs">
          <p>Create or load an analysis before scoring dimensions.</p>
          <Link className="btn primary" href="/compounding-expertise/inputs">Go to inputs</Link>
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

  return (
    <>
      <LabWorkflowRail active="Diagnostic" />
      <Section eyebrow="Stage 3" title="Power + scorebook diagnostic">
        <p>
          Score each dimension from 0-5, attach confidence, and mark whether the support is observed, sourced, assumed, or unknown.
          Do not calculate a simplistic overall moat score.
        </p>
        <IntegrityNotice />
      </Section>

      <form action={saveDiagnosticAction}>
        <input type="hidden" name="analysisId" value={analysis.id} />
        {(["HELMER", "SUN", "WOLFE"] as const).map((framework) => (
          <Section key={framework} title={`${framework} assessment`}>
            <div className="card compoundingFrameworkIntro">
              <ProvenanceBadge framework={framework} />
              <p>{FRAMEWORK_COPY[framework]}</p>
            </div>
            <div className="compoundingAssessmentGrid">
              {rows.filter((row) => row.definition.framework === framework).map(({ definition, assessment }) => (
                <div className="card compoundingAssessmentCard" key={definition.dimension}>
                  <input type="hidden" name="assessmentId" value={assessment.id} />
                  <input type="hidden" name="framework" value={definition.framework} />
                  <input type="hidden" name="dimension" value={definition.dimension} />
                  <div className="compoundingCardHeader">
                    <div>
                      <h3>{definition.label}</h3>
                      <p className="small">{definition.description}</p>
                    </div>
                    <ProvenanceBadge framework={definition.framework} />
                  </div>
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
                </div>
              ))}
            </div>
          </Section>
        ))}
        <div className="ctaRow">
          <button className="btn primary" type="submit">Save and continue</button>
          <Link className="btn" href="/compounding-expertise/debates">Back</Link>
        </div>
      </form>
    </>
  );
}
