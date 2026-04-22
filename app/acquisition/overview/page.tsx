import { Section } from "@/components/site/Section";
import { AcquisitionWorkspaceNav } from "@/components/acquisition/AcquisitionWorkspaceNav";

export default function AcquisitionOverviewPage() {
  return (
    <>
      <AcquisitionWorkspaceNav />
      <Section title="Acquisition operating model">
        <div className="grid grid-3">
          <div className="card"><div className="kpi">3x</div><p>Creative iteration velocity target.</p></div>
          <div className="card"><div className="kpi">-18%</div><p>CAC reduction target via budget optimization.</p></div>
          <div className="card"><div className="kpi">+22%</div><p>Pipeline quality lift from intent-aware targeting.</p></div>
        </div>
      </Section>
      <Section title="How this app fits with lifecycle">
        <p>
          Acquisition feeds higher-quality users into lifecycle. Lifecycle then increases retention and LTV.
          Together they create a closed economic loop instead of isolated channel optimization.
        </p>
      </Section>
    </>
  );
}
