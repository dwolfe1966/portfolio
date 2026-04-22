import { Section } from "@/components/site/Section";
import { AcquisitionWorkspaceNav } from "@/components/acquisition/AcquisitionWorkspaceNav";

export default function AcquisitionOutputsPage() {
  return (
    <>
      <AcquisitionWorkspaceNav />
      <Section title="Outputs: recommendations and expected economics">
        <div className="grid grid-3">
          <div className="card"><h3>Channel mix</h3><p>Prioritized spend shifts and pacing recommendations.</p></div>
          <div className="card"><h3>Creative backlog</h3><p>Next variants to generate/test by audience and offer.</p></div>
          <div className="card"><h3>Economic forecast</h3><p>Projected CAC, conversion lift, and payback changes.</p></div>
        </div>
      </Section>
    </>
  );
}
