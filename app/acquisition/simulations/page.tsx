import { Section } from "@/components/site/Section";
import { AcquisitionWorkspaceNav } from "@/components/acquisition/AcquisitionWorkspaceNav";

export default function AcquisitionSimulationsPage() {
  return (
    <>
      <AcquisitionWorkspaceNav />
      <Section title="Simulations: creative, bids, and budget reallocations">
        <div className="grid grid-2">
          <div className="card">
            <h3>Creative simulation</h3>
            <p>Test multiple hooks and creative variants by persona to predict CTR and conversion movement.</p>
          </div>
          <div className="card">
            <h3>Budget simulation</h3>
            <p>Reallocate spend toward high-performing combinations while respecting CAC/LTV constraints.</p>
          </div>
        </div>
      </Section>
    </>
  );
}
