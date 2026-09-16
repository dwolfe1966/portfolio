import Link from "next/link";
import { Section } from "@/components/site/Section";
import { LabWorkflowRail, SimulatorLineChart } from "@/components/compounding-expertise/CompoundingLabComponents";
import { DEFAULT_SCENARIOS, detectCrossover, scorebookDerivedSimulatorValues, simulateComparison, type ScorebookCaseInput } from "@/lib/compounding-expertise-lab";
import { applyScorebookDerivedValuesAction, saveScenariosAction } from "../actions";
import { currentAccountUserId, loadCompoundingAnalysis } from "../data";

export const dynamic = "force-dynamic";

export default async function CompoundingExpertiseSimulatorPage({
  searchParams
}: {
  searchParams: Promise<{ scorebook?: string }>;
}) {
  const params = await searchParams;
  const accountUserId = await currentAccountUserId();
  const analysis = await loadCompoundingAnalysis(accountUserId);
  if (!analysis) {
    return (
      <>
        <LabWorkflowRail active="Simulator" />
        <Section title="Start with company inputs">
          <p>Create or load an analysis before running scenarios.</p>
          <Link className="btn primary" href="/compounding-expertise/inputs">Go to inputs</Link>
        </Section>
      </>
    );
  }

  const scenarios = analysis.simulationScenarios.length >= 2
    ? analysis.simulationScenarios
    : DEFAULT_SCENARIOS.map((scenario, index) => ({ id: "", analysisId: analysis.id, createdAt: new Date(), updatedAt: new Date(), ...scenario, name: index === 0 ? "Incumbent A" : "Challenger B" }));
  const series = simulateComparison(scenarios, 36);
  const crossover = series.length >= 2 ? detectCrossover(series[0], series[1]) : null;
  const derived = scorebookDerivedSimulatorValues(analysis.scorebookCases.map((row) => ({ ...row })) as ScorebookCaseInput[]);

  return (
    <>
      <LabWorkflowRail active="Simulator" />
      <Section eyebrow="Stage 5" title="Compounding simulator">
        <p>
          Compare two scenarios with a transparent toy model. Feedback delay is modeled as a maturation lag:
          new cases do not become effective graded experience until their feedback arrives.
        </p>
        {params.scorebook === "applied" ? (
          <div className="card compoundingSyntheticBanner">
            <strong>Scorebook-derived values applied.</strong>
            <p>Only starting graded cases and feedback delay were populated. Theoretical assumptions remain user-controlled.</p>
          </div>
        ) : null}
      </Section>

      <Section title="Scorebook-derived inputs">
        <div className="card">
          <p>
            Current scorebook implies <strong>{derived.startingGradedCases}</strong> starting graded cases and
            {" "}<strong>{derived.feedbackDelayDays === null ? "unavailable" : `${derived.feedbackDelayDays} days`}</strong> median feedback delay
            {" "}(n={derived.feedbackDelaySampleSize}). Transferability, information value, and learning efficiency are not inferred in V0.1.1.
          </p>
          <form action={applyScorebookDerivedValuesAction}>
            <input type="hidden" name="analysisId" value={analysis.id} />
            <button className="btn" type="submit">Use scorebook-derived values</button>
          </form>
        </div>
      </Section>

      <Section title="Scenario variables">
        <form action={saveScenariosAction}>
          <input type="hidden" name="analysisId" value={analysis.id} />
          <div className="grid grid-2">
            {scenarios.slice(0, 2).map((scenario) => (
              <div className="card compoundingScenarioCard" key={scenario.id || scenario.name}>
                <input type="hidden" name="scenarioId" value={scenario.id} />
                <label>
                  Scenario name
                  <input name="name" defaultValue={scenario.name} />
                </label>
                <div className="grid grid-2">
                  <label>Starting graded cases<input name="startingCases" type="number" min="0" step="1" defaultValue={scenario.startingCases} /></label>
                  <label>New cases / month<input name="casesPerMonth" type="number" min="0" step="1" defaultValue={scenario.casesPerMonth} /></label>
                  <label>Feedback delay days<input name="feedbackDelayDays" type="number" min="0" step="1" defaultValue={scenario.feedbackDelayDays} /></label>
                  <label>Transferability<input name="transferability" type="number" min="0" max="1" step="0.05" defaultValue={scenario.transferability} /></label>
                  <label>Information value / case<input name="informationValue" type="number" min="0" max="1" step="0.05" defaultValue={scenario.informationValue} /></label>
                  <label>Learning efficiency<input name="learningEfficiency" type="number" min="0" max="1" step="0.05" defaultValue={scenario.learningEfficiency} /></label>
                  <label>Monthly staleness rate<input name="stalenessRate" type="number" min="0" max="1" step="0.005" defaultValue={scenario.stalenessRate} /></label>
                  <label>Base model capability<input name="baseCapability" type="number" min="0" max="5" step="0.1" defaultValue={scenario.baseCapability} /></label>
                </div>
              </div>
            ))}
          </div>
          <div className="ctaRow">
            <button className="btn primary" type="submit">Save and continue</button>
            <Link className="btn" href="/compounding-expertise/scorebook">Back</Link>
          </div>
        </form>
      </Section>

      <Section title="Trajectory">
        <SimulatorLineChart series={series} crossover={crossover} />
      </Section>

      <Section title="Methodology note">
        <div className="card">
          <p>
            Discretization is monthly over a 36-month horizon. `feedbackDelayDays` is converted to
            `ceil(feedbackDelayDays / 30)` monthly steps. Cases wait in a pending queue until they mature.
            `stalenessRate` is monthly decay on accumulated effective graded experience. Expertise uses a
            logarithmic response to effective experience so historical advantage can be compressed by better base capability,
            low transferability, slow feedback, or high staleness.
          </p>
          <pre className="code">{`N_eff(t+1) = (1 - staleness_rate) * N_eff(t)
             + cases_whose_feedback_matures_at_t

E(t) = base_capability
     + learning_efficiency * information_value * transferability * ln(1 + N_eff(t))`}</pre>
          <p className="small">Exploratory toy model only. A crossover is not a real-world forecast.</p>
        </div>
      </Section>
    </>
  );
}
