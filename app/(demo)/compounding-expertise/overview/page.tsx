import Link from "next/link";
import { Section } from "@/components/site/Section";
import { IntegrityNotice, LabWorkflowRail } from "@/components/compounding-expertise/CompoundingLabComponents";

export default function CompoundingExpertiseOverviewPage() {
  return (
    <>
      <LabWorkflowRail active="Overview" />
      <Section eyebrow="Compounding Expertise Lab" title="A research instrument for testing when graded experience becomes Power">
        <p>
          This Lab helps evaluate whether an AI application owns a learning loop that compounds into durable competitive advantage,
          or whether the useful knowledge can be compressed, inferred, simulated, or relearned by a capable challenger.
        </p>
        <div className="ctaRow">
          <Link className="btn primary" href="/compounding-expertise/inputs">Start analysis</Link>
          <Link className="btn" href="/compounding-expertise/docs">Read methodology</Link>
        </div>
      </Section>

      <Section title="Primary workflow">
        <div className="grid grid-5 compoundingStepGrid">
          {[
            ["1", "Inputs", "Company, product, workflow, decision, and thesis."],
            ["2", "Key Debates", "Load-bearing questions with belief revision fields."],
            ["3", "Diagnostic", "HELMER, SUN, and WOLFE assessments with provenance."],
            ["4", "Simulator", "Toy compounding model with feedback maturation lag."],
            ["5", "Memo", "Uncertainty-preserving synthesis for discussion."]
          ].map(([number, title, detail]) => (
            <div className="card" key={number}>
              <p className="small">Stage {number}</p>
              <h3>{title}</h3>
              <p>{detail}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Research integrity">
        <IntegrityNotice />
      </Section>
    </>
  );
}
