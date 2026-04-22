import { Section } from "@/components/site/Section";
import { DemoWorkspaceNav } from "@/components/demo/DemoWorkspaceNav";

export default function DemoPage() {
  return (
    <>
      <DemoWorkspaceNav />
      <Section eyebrow="Demo" title="Lifecycle Engine Workspace">
        <p>
          This workspace is organized into four stages: Overview, Inputs, Simulations, and Outputs.
          Use the navigation above to walk the pipeline end-to-end.
        </p>
        <div className="grid grid-2" style={{ marginTop: 14 }}>
          <div className="card">
            <h3>What this app does</h3>
            <p>Turns real-world entity changes into scored lifecycle opportunities and generated outreach.</p>
          </div>
          <div className="card">
            <h3>What to do first</h3>
            <p>Start in Inputs, confirm assumptions, run Simulations, then inspect Runs/Candidates in Outputs.</p>
          </div>
        </div>
      </Section>
    </>
  );
}
