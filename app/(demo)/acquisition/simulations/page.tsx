import Link from "next/link";
import { Section } from "@/components/site/Section";
import { AcquisitionSimulationPanel } from "@/components/acquisition/AcquisitionSimulationPanel";
import { DemoAppMotionVisual } from "@/components/demo-shell/DemoAppMotionVisual";

export default function AcquisitionSimulationsPage() {
  return (
    <>
      <Section title="Simulations: orchestrator loop and budget decisions">
        <p>
          Simulations execute the core decision loop: pair creatives with audiences, evaluate cell performance,
          and move budget toward winners under CAC/LTV constraints.
        </p>
        <div className="grid grid-3" style={{ marginTop: 14 }}>
          <div className="card">
            <h3>Inputs consumed</h3>
            <p>Campaign goal, budget, channels, CAC/LTV targets, confidence threshold, and shift caps from Inputs.</p>
            <Link className="btn" href="/acquisition/inputs">Review inputs</Link>
          </div>
          <div className="card">
            <h3>Per-iteration actions</h3>
            <p>Score each test cell, pause weak cells, and reallocate spend to top performers with audit logs.</p>
          </div>
          <div className="card">
            <h3>Outputs generated</h3>
            <p>Updated campaign state, top-cell rankings, budget activity, and economics summary for operator review.</p>
            <Link className="btn" href="/acquisition/outputs">Open outputs</Link>
          </div>
        </div>
      </Section>

      <Section title="Optimization motion">
        <DemoAppMotionVisual app="acquisition" />
      </Section>

      <Section title="Interactive iteration panel">
        <AcquisitionSimulationPanel />
      </Section>
    </>
  );
}
