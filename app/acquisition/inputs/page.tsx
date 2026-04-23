import { Section } from "@/components/site/Section";
import { AcquisitionWorkspaceNav } from "@/components/acquisition/AcquisitionWorkspaceNav";

export default function AcquisitionInputsPage() {
  return (
    <>
      <AcquisitionWorkspaceNav />
      <Section title="Inputs: audience, offers, and channel constraints">
        <div className="grid grid-3">
          <div className="card">
            <h3>Audience definitions</h3>
            <p>Seed ICP cohorts, exclusions, suppression windows, and lookalike boundaries.</p>
          </div>
          <div className="card">
            <h3>Offer strategy</h3>
            <p>Map offer type by segment: trial, annual discount, bundled upgrade, or proof-led CTA.</p>
          </div>
          <div className="card">
            <h3>Channel constraints</h3>
            <p>Define budget floors/ceilings, pacing limits, and CAC guardrails by channel.</p>
          </div>
        </div>
      </Section>
    </>
  );
}
