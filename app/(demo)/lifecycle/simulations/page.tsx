import { Section } from "@/components/site/Section";
import { ScenarioLabCard } from "@/components/demo/ScenarioLabCard";
import { DemoAppMotionVisual } from "@/components/demo-shell/DemoAppMotionVisual";
import { LifecycleWorkspaceDatasetPanel } from "@/components/demo/LifecycleWorkspaceDatasetPanel";

export const dynamic = "force-dynamic";

export default async function DemoSimulationsPage() {
  return (
    <>
      <Section title="Simulations: generate events, campaigns, and outcomes">
        <p>
          Run one guided lifecycle scenario: inject fresh entity events, generate campaign opportunities,
          then model downstream opens, clicks, engagement, purchases, and revenue.
        </p>
      </Section>
      <Section title="Current app data">
        <LifecycleWorkspaceDatasetPanel compact />
      </Section>
      <Section title="Simulation flow">
        <div className="grid grid-3">
          <div className="card">
            <h3>1) Create signals</h3>
            <p>
              Inject recent lifecycle events so the scoring engine has fresh behavioral and entity-interest changes to evaluate.
            </p>
          </div>
          <div className="card">
            <h3>2) Generate candidates</h3>
            <p>
              Rank users, select the highest-priority opportunities, and create a campaign run using the current assumptions.
            </p>
          </div>
          <div className="card">
            <h3>3) Model outcomes</h3>
            <p>
              Simulate the funnel, review projected revenue, and validate the generated run in Outputs and Campaigns.
            </p>
          </div>
        </div>
      </Section>
      <Section title="Signal motion">
        <DemoAppMotionVisual app="lifecycle" />
      </Section>
      <Section title="Run simulation">
        <ScenarioLabCard />
      </Section>
    </>
  );
}
