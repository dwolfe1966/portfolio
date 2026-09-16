import Link from "next/link";
import { Section } from "@/components/site/Section";
import { LabWorkflowRail } from "@/components/compounding-expertise/CompoundingLabComponents";
import { generateDebatesAction, saveDebatesAction } from "../actions";
import { currentAccountUserId, loadCompoundingAnalysis } from "../data";

export const dynamic = "force-dynamic";

export default async function CompoundingExpertiseDebatesPage({
  searchParams
}: {
  searchParams: Promise<{ ai?: string }>;
}) {
  const params = await searchParams;
  const accountUserId = await currentAccountUserId();
  const analysis = await loadCompoundingAnalysis(accountUserId);
  if (!analysis) {
    return (
      <>
        <LabWorkflowRail active="Key Debates" />
        <Section title="Start with company inputs">
          <p>Create or load an analysis before defining key debates.</p>
          <Link className="btn primary" href="/compounding-expertise/inputs">Go to inputs</Link>
        </Section>
      </>
    );
  }

  const debates = [...analysis.keyDebates];
  while (debates.length < 4) {
    debates.push({
      id: "",
      analysisId: analysis.id,
      question: "",
      bullCase: "",
      bearCase: "",
      evidenceNeeded: "",
      increaseBelief: "",
      decreaseBelief: "",
      probability: 50,
      source: "USER",
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  return (
    <>
      <LabWorkflowRail active="Key Debates" />
      <Section eyebrow="Stage 2" title="Key debates">
        <p>
          Define 2-4 load-bearing questions. These are the belief-revision levers for the thesis, not a scorecard.
        </p>
        {params.ai ? (
          <div className="card compoundingSyntheticBanner">
            <strong>{params.ai === "generated" ? "AI suggestions loaded." : "Manual fallback loaded."}</strong>
            <p>AI-generated debates are suggestions, not evidence. Edit them before relying on them.</p>
          </div>
        ) : null}
        <form action={generateDebatesAction} className="ctaRow">
          <input type="hidden" name="analysisId" value={analysis.id} />
          <button className="btn" type="submit">Suggest debates with AI</button>
          <span className="small">Works without AI; manual editing remains available.</span>
        </form>
      </Section>

      <Section title="Editable debate set">
        <form action={saveDebatesAction}>
          <input type="hidden" name="analysisId" value={analysis.id} />
          <div className="compoundingDebateStack">
            {debates.map((debate, index) => (
              <div className="card compoundingDebateCard" key={debate.id || `new-${index}`}>
                <div className="compoundingCardHeader">
                  <div>
                    <p className="small">Debate {index + 1}</p>
                    <h3>{debate.question || "New debate"}</h3>
                  </div>
                  <span className="provenanceBadge">{debate.source}</span>
                </div>
                <input type="hidden" name="debateId" value={debate.id} />
                <input type="hidden" name="source" value={debate.source || "USER"} />
                <label>
                  Question
                  <textarea name="question" rows={2} defaultValue={debate.question} />
                </label>
                <div className="grid grid-2">
                  <label>
                    Bull case
                    <textarea name="bullCase" rows={4} defaultValue={debate.bullCase} />
                  </label>
                  <label>
                    Bear case
                    <textarea name="bearCase" rows={4} defaultValue={debate.bearCase} />
                  </label>
                </div>
                <label>
                  Evidence needed
                  <textarea name="evidenceNeeded" rows={3} defaultValue={debate.evidenceNeeded} />
                </label>
                <div className="grid grid-2">
                  <label>
                    What would increase my belief?
                    <textarea name="increaseBelief" rows={3} defaultValue={debate.increaseBelief} />
                  </label>
                  <label>
                    What would decrease my belief?
                    <textarea name="decreaseBelief" rows={3} defaultValue={debate.decreaseBelief} />
                  </label>
                </div>
                <label className="compoundingRangeLabel">
                  Current probability that proposition is true: {debate.probability}%
                  <input name="probability" type="number" min="0" max="100" step="1" defaultValue={debate.probability} />
                </label>
              </div>
            ))}
          </div>
          <div className="ctaRow">
            <button className="btn primary" type="submit">Save and continue</button>
            <Link className="btn" href="/compounding-expertise/inputs">Back</Link>
          </div>
        </form>
      </Section>
    </>
  );
}
