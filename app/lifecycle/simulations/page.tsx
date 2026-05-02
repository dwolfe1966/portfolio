import { Section } from "@/components/site/Section";
import { RunGeneratorCard } from "@/components/demo/RunGeneratorCard";
import { ScenarioLabCard } from "@/components/demo/ScenarioLabCard";
import { InfoTooltip } from "@/components/site/InfoTooltip";

export const dynamic = "force-dynamic";

export default function DemoSimulationsPage() {
  return (
    <>
      <Section title="Simulations: generate events, campaigns, and outcomes">
        <p>
          Use these controls to run experiments: inject fresh entity events, generate campaign opportunities,
          then model downstream opens, clicks, engagement, purchases, and revenue.
        </p>
      </Section>
      <Section title="How to use this tab">
        <div className="grid grid-3">
          <div className="card">
            <h3>
              1) Quick generation
              <InfoTooltip label="Quick generation context">
                Fast path for validating that seeded data, scoring, and copy generation are connected.
              </InfoTooltip>
            </h3>
            <p>
              Use this when you want a fast run with minimal configuration.
              It uses your active assumption set and generates a campaign run immediately.
            </p>
          </div>
          <div className="card">
            <h3>
              2) Scenario lab
              <InfoTooltip label="Scenario lab context">
                Controlled path for changing assumptions before comparing modeled revenue.
              </InfoTooltip>
            </h3>
            <p>
              Use this for controlled experiments. You can inject new deltas,
              tune scoring and funnel assumptions, and compare resulting revenue estimates.
            </p>
          </div>
          <div className="card">
            <h3>
              3) Read outputs
              <InfoTooltip label="Outputs context">
                Outputs are the audit surface for judging whether the run created credible opportunities.
              </InfoTooltip>
            </h3>
            <p>
              After a run, validate decisions in <code>/lifecycle/campaigns</code> (candidate list/filtering),
              <code>/lifecycle/campaigns/[id]</code> (run snapshot), and <code>/lifecycle/outputs</code> (artifact stream).
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
