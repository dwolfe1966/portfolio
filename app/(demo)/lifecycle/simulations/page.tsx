import Link from "next/link";
import { Section } from "@/components/site/Section";
import { ScenarioLabCard } from "@/components/demo/ScenarioLabCard";
import { DemoAppMotionVisual } from "@/components/demo-shell/DemoAppMotionVisual";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ imported?: string }>;
};

export default async function DemoSimulationsPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const imported = query.imported === "1";
  return (
    <>
      <Section title="Simulations: generate events, campaigns, and outcomes">
        <p>
          Run one guided lifecycle scenario: inject fresh entity events, generate campaign opportunities,
          then model downstream opens, clicks, engagement, purchases, and revenue.
        </p>
      </Section>
      {imported ? (
        <Section title="Imported dataset ready">
          <div className="card lifecycleImportBanner">
            <div>
              <p className="editorKicker">Current data source</p>
              <h3>The lifecycle model now includes your imported users, entities, relations, and events.</h3>
              <p>
                Generate campaign opportunities next, then inspect message output, landing-page copy, and modeled revenue.
              </p>
            </div>
            <Link className="btn" href="/lifecycle/inputs?imported=1">Review inputs</Link>
          </div>
        </Section>
      ) : null}
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
