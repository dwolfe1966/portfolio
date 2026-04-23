import { Section } from "@/components/site/Section";
import { DemoWorkspaceNav } from "@/components/demo/DemoWorkspaceNav";
import { RunGeneratorCard } from "@/components/demo/RunGeneratorCard";
import { ScenarioLabCard } from "@/components/demo/ScenarioLabCard";

export const dynamic = "force-dynamic";

export default function DemoSimulationsPage() {
  return (
    <>
      <DemoWorkspaceNav />
      <Section title="Simulations: generate events, campaigns, and outcomes">
        <p>
          Use these controls to run experiments: inject fresh entity events, generate campaign opportunities,
          then model downstream opens, clicks, engagement, purchases, and revenue.
        </p>
      </Section>
      <Section title="How to use this tab">
        <div className="grid grid-3">
          <div className="card">
            <h3>1) Quick generation</h3>
            <p>
              Use this when you want a fast run with minimal configuration.
              It uses your active assumption set and generates a campaign run immediately.
            </p>
          </div>
          <div className="card">
            <h3>2) Scenario lab</h3>
            <p>
              Use this for controlled experiments. You can inject new deltas,
              tune scoring and funnel assumptions, and compare resulting revenue estimates.
            </p>
          </div>
          <div className="card">
            <h3>3) Read outputs</h3>
            <p>
              After a run, validate decisions in <code>/demo/campaigns</code> (candidate list/filtering),
              <code>/demo/campaigns/[id]</code> (run snapshot), and <code>/demo/outputs</code> (artifact stream).
            </p>
          </div>
        </div>
      </Section>
      <Section title="Quick generation">
        <RunGeneratorCard />
      </Section>
      <Section title="Scenario lab">
        <ScenarioLabCard />
      </Section>
    </>
  );
}
