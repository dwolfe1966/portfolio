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
      <Section title="Quick generation">
        <RunGeneratorCard />
      </Section>
      <Section title="Scenario lab">
        <ScenarioLabCard />
      </Section>
    </>
  );
}
