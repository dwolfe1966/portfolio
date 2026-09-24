import Link from "next/link";
import { Section } from "@/components/site/Section";
import { EpistemicBadge, LabWorkflowRail, SimulatorLineChart } from "@/components/compounding-expertise/CompoundingLabComponents";
import {
  DEFAULT_SCENARIOS,
  SIMULATOR_PARAMETER_DEFINITIONS,
  STRESS_TEST_TEMPLATES,
  applyStressTestTemplate,
  casesForCaseSet,
  classifyStressTestResult,
  detectCrossover,
  deriveStressTestDrivers,
  deriveStressTestPowerImplication,
  getStressTestTemplate,
  sanitizeScenario,
  scorebookDerivedSimulatorValues,
  simulateComparison,
  summarizeTopStressTestDrivers,
  visibleStressTestChangedParameters,
  type ScorebookCaseInput,
  type SimulationScenarioInput
} from "@/lib/compounding-expertise-lab";
import { applyScorebookDerivedValuesAction, saveScenariosAction } from "../actions";
import { currentAccountUserId, loadCompoundingAnalysis } from "../data";

export const dynamic = "force-dynamic";

type SimulatorSearchParams = Record<string, string | string[] | undefined>;

function values(params: SimulatorSearchParams, key: string) {
  const value = params[key];
  if (Array.isArray(value)) return value;
  return value === undefined ? [] : [value];
}

function value(params: SimulatorSearchParams, key: string) {
  return values(params, key)[0] ?? "";
}

function numeric(value: string | undefined, fallback: number) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function scenarioFromQuery(params: SimulatorSearchParams, base: SimulationScenarioInput, index: number): SimulationScenarioInput {
  return sanitizeScenario({
    id: values(params, "scenarioId")[index] || base.id,
    name: values(params, "name")[index] || base.name,
    startingCases: numeric(values(params, "startingCases")[index], base.startingCases),
    casesPerMonth: numeric(values(params, "casesPerMonth")[index], base.casesPerMonth),
    feedbackDelayDays: numeric(values(params, "feedbackDelayDays")[index], base.feedbackDelayDays),
    transferability: numeric(values(params, "transferability")[index], base.transferability),
    informationValue: numeric(values(params, "informationValue")[index], base.informationValue),
    learningEfficiency: numeric(values(params, "learningEfficiency")[index], base.learningEfficiency),
    stalenessRate: numeric(values(params, "stalenessRate")[index], base.stalenessRate),
    baseCapability: numeric(values(params, "baseCapability")[index], base.baseCapability)
  });
}

function formatGap(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}`;
}

function scenarioQuery(basePath: string, analysisId: string, caseSetId: string | undefined, template: string, run = false) {
  const params = new URLSearchParams({ analysisId, template });
  if (caseSetId) params.set("caseSetId", caseSetId);
  if (run) params.set("run", "1");
  return `${basePath}?${params.toString()}`;
}

function resultSentence(result: ReturnType<typeof classifyStressTestResult>, incumbent: string, challenger: string) {
  if (result.classification === "ADVANTAGE_PERSISTS") return `${incumbent} retains a modeled advantage through month 36 under this scenario.`;
  if (result.classification === "ADVANTAGE_COMPRESSES") return `${challenger} narrows the modeled expertise gap, but does not fully overtake within 36 months.`;
  if (result.classification === "CHALLENGER_CATCHES_UP") return `${challenger} catches up to the modeled advantage within the 36-month horizon.`;
  if (result.classification === "CHALLENGER_OVERTAKES") return `${challenger} overtakes the modeled advantage around month ${result.crossoverMonth ?? "the modeled horizon"}.`;
  return `The modeled expertise index does not show a material initial advantage for ${incumbent}.`;
}

function changedValue(current: number, baseline: number) {
  if (current > baseline) return `${current} ↑`;
  if (current < baseline) return `${current} ↓`;
  return `${current}`;
}

export default async function CompoundingExpertiseSimulatorPage({
  searchParams
}: {
  searchParams: Promise<SimulatorSearchParams>;
}) {
  const params = await searchParams;
  const accountUserId = await currentAccountUserId();
  const analysisId = value(params, "analysisId");
  const analysis = await loadCompoundingAnalysis(accountUserId, analysisId);
  if (!analysis) {
    return (
      <>
        <LabWorkflowRail active="Stress Test" analysisId={analysisId} />
        <Section title="Start with company inputs">
          <p>Create or load an analysis before running scenarios.</p>
          <Link className="btn primary" href="/compounding-expertise/inputs">Go to Company Model</Link>
        </Section>
      </>
    );
  }

  const selectedCaseSet = value(params, "caseSetId")
    ? analysis.caseSets.find((caseSet) => caseSet.id === value(params, "caseSetId")) ?? null
    : analysis.caseSets[0] ?? null;
  const persistedScenarios = analysis.simulationScenarios.length >= 2
    ? analysis.simulationScenarios.slice(0, 2)
    : DEFAULT_SCENARIOS.map((scenario, index) => ({
      id: "",
      analysisId: analysis.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...scenario,
      name: index === 0 ? "Incumbent / Company" : "Challenger / Alternative"
    }));
  const selectedTemplateId = value(params, "template");
  const hasSelectedTemplate = selectedTemplateId.length > 0;
  const hasRun = value(params, "run") === "1" || values(params, "startingCases").length >= 2;
  const template = getStressTestTemplate(selectedTemplateId);
  const templatedScenarios = applyStressTestTemplate(persistedScenarios, template.id);
  const scenarios = values(params, "startingCases").length >= 2
    ? [scenarioFromQuery(params, templatedScenarios[0], 0), scenarioFromQuery(params, templatedScenarios[1], 1)]
    : templatedScenarios;
  const series = simulateComparison(scenarios, 36);
  const crossover = series.length >= 2 ? detectCrossover(series[0], series[1]) : null;
  const result = classifyStressTestResult(series, crossover);
  const drivers = deriveStressTestDrivers(series, result);
  const implication = deriveStressTestPowerImplication(template.id, result);
  const scorebookRows = analysis.scorebookCases.map((row) => ({ ...row })) as ScorebookCaseInput[];
  const activeRows = casesForCaseSet(scorebookRows, selectedCaseSet?.id);
  const derived = scorebookDerivedSimulatorValues(activeRows);
  const changedKeys = new Set(template.changedParameterKeys);
  const changedDefinitions = visibleStressTestChangedParameters(template.id);
  const baseQuery = "/compounding-expertise/simulator";
  const caseSetId = selectedCaseSet?.id;
  const canonicalTemplates = STRESS_TEST_TEMPLATES.filter((item) => item.id !== "baseline");
  const topDrivers = summarizeTopStressTestDrivers(drivers, 3);

  return (
    <>
      <LabWorkflowRail
        active="Stress Test"
        analysisId={analysis.id}
        activeAnalysisLabel={analysis.companyName}
        activeAnalysisDetail={selectedCaseSet?.name ?? "Selected company analysis"}
      />

      <Section eyebrow="Stress Test · Scenario Studio" title="Stress-test the Power thesis">
        <div className="compoundingStudioIntro compact">
          <p>Ask what happens to the modeled advantage when an important assumption changes.</p>
          <div className="compoundingScenarioFlow" aria-label="Scenario studio workflow">
            <span>Choose a question</span>
            <span>Change a condition</span>
            <span>Run</span>
            <span>See whether advantage survives</span>
          </div>
          <p className="small"><strong>Exploratory scenario model — not a forecast.</strong></p>
        </div>
        {value(params, "scorebook") === "applied" ? (
          <div className="card compoundingSyntheticBanner">
            <strong>Experience-derived values applied.</strong>
            <p>Only starting graded cases and feedback delay were populated. Theoretical assumptions remain user-controlled.</p>
          </div>
        ) : null}
        {value(params, "saved") === "1" ? (
          <div className="card compoundingSyntheticBanner">
            <strong>Scenario saved.</strong>
            <p>The current Incumbent / Challenger assumptions are now persisted for this analysis.</p>
          </div>
        ) : null}
      </Section>

      <Section eyebrow="Choose question" title="What could change the Power thesis?">
        <div className="compoundingScenarioSelector">
          {canonicalTemplates.map((item) => {
            const selected = hasSelectedTemplate && item.id === template.id;
            return (
              <Link
                className={`card compoundingScenarioQuestion ${selected ? "selected" : ""}`}
                href={scenarioQuery(baseQuery, analysis.id, caseSetId, item.id)}
                key={item.id}
              >
                <span className="badge">{item.name}</span>
                <strong>{item.question}</strong>
              </Link>
            );
          })}
        </div>
      </Section>

      {hasSelectedTemplate ? (
        <Section eyebrow="Review Scenario" title={template.id === "custom" ? "Custom scenario" : template.name}>
          <form method="get" action="/compounding-expertise/simulator" className="compoundingScenarioStudioForm">
            <input type="hidden" name="analysisId" value={analysis.id} />
            <input type="hidden" name="template" value={template.id} />
            {selectedCaseSet ? <input type="hidden" name="caseSetId" value={selectedCaseSet.id} /> : null}
            <input type="hidden" name="run" value="1" />

            <div className="card compoundingReviewScenarioCard">
              <div>
                <span className="badge">Question</span>
                <h3>{template.question}</h3>
              </div>
              <p>{template.whyMatters}</p>
              <div className="compoundingExperienceValues">
                <div>
                  <span>From Experience dataset</span>
                  <strong>{derived.startingGradedCases} graded cases</strong>
                </div>
                <div>
                  <span>Median feedback</span>
                  <strong>{derived.feedbackDelayDays === null ? "Unavailable" : `${derived.feedbackDelayDays} days`}</strong>
                </div>
                <small>{activeRows.length > 0 && activeRows.every((row) => row.isSynthetic) ? "DERIVED — SYNTHETIC FIXTURE" : "DERIVED FROM ACTIVE CASESET"}</small>
              </div>
            </div>

            {template.id !== "custom" ? (
              <div className="card">
                <h3>What changes</h3>
                {changedDefinitions.length === 0 ? (
                  <p>Baseline uses the current persisted assumptions. No parameters are changed.</p>
                ) : (
                  <div className="compoundingScenarioDiffTable compact">
                    <table className="dataTable">
                      <thead>
                        <tr>
                          <th>Assumption</th>
                          <th>Incumbent</th>
                          <th>Challenger</th>
                        </tr>
                      </thead>
                      <tbody>
                        {changedDefinitions.map((definition) => (
                          <tr className="differs" key={definition.key}>
                            <td>{definition.label}</td>
                            <td>{changedValue(Number(scenarios[0][definition.key]), Number(persistedScenarios[0][definition.key]))}</td>
                            <td>{changedValue(Number(scenarios[1][definition.key]), Number(persistedScenarios[1][definition.key]))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <p className="small">All other assumptions remain at baseline. Starting experience and feedback delay may be derived from the active Experience dataset when applied.</p>
              </div>
            ) : null}

            <details className="card compoundingDisclosure" open={template.id === "custom"}>
              <summary>Edit assumptions</summary>
              <div className="card compoundingSimulatorSourceCard">
                <div>
                  <h3>From Experience dataset</h3>
                  <p>
                    {selectedCaseSet ? `CaseSet "${selectedCaseSet.name}"` : "Current Experience"} supports
                    {" "}<strong>{derived.startingGradedCases}</strong> starting graded cases and
                    {" "}<strong>{derived.feedbackDelayDays === null ? "unavailable" : `${derived.feedbackDelayDays} days`}</strong> median feedback delay
                    {" "}(n={derived.feedbackDelaySampleSize}).
                  </p>
                  <p className="small">Only starting graded cases and feedback delay are derived from Experience. Information value, transferability, learning efficiency, staleness, and base capability remain assumptions.</p>
                </div>
                <button className="btn" type="submit" formAction={applyScorebookDerivedValuesAction} formMethod="post">Apply to persisted scenario</button>
              </div>

              <div className="compoundingScenarioDiffTable">
                <table className="dataTable">
                  <thead>
                    <tr>
                      <th>Variable</th>
                      <th>Incumbent / Company</th>
                      <th>Challenger / Alternative</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td>Name</td>{scenarios.map((scenario, index) => <td key={index}><input name="name" defaultValue={scenario.name} /></td>)}</tr>
                    {SIMULATOR_PARAMETER_DEFINITIONS.map((definition) => {
                      const differs = scenarios[0][definition.key] !== scenarios[1][definition.key];
                      const emphasized = changedKeys.has(definition.key);
                      return (
                        <tr className={differs || emphasized ? "differs" : ""} key={definition.key}>
                          <td>
                            <strong>{definition.label}</strong>
                            <span>{definition.help}</span>
                            <small><EpistemicBadge kind={
                              definition.epistemic === "OBSERVED / DERIVED"
                                ? "OBSERVED_DERIVED"
                                : definition.epistemic === "ENDOGENOUS ASSUMPTION"
                                  ? "ENDOGENOUS_ASSUMPTION"
                                  : "EXOGENOUS_ASSUMPTION"
                            } /></small>
                          </td>
                          {scenarios.map((scenario, index) => (
                            <td key={index}>
                              <input
                                name={definition.key}
                                type="number"
                                min={definition.min}
                                max={definition.max}
                                step={definition.step}
                                defaultValue={scenario[definition.key]}
                              />
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="compoundingParameterGroups">
                {["Experience advantage", "Learning dynamics", "Competitive / environmental conditions"].map((group) => (
                  <div className="card" key={group}>
                    <h3>{group}</h3>
                    {SIMULATOR_PARAMETER_DEFINITIONS.filter((definition) => definition.group === group).map((definition) => (
                      <p className="small" key={definition.key}><strong>{definition.label}:</strong> {definition.help}</p>
                    ))}
                  </div>
                ))}
              </div>
            </details>

            <div className="compoundingPrimaryRunBar">
              <button className="btn primary" type="submit">Run Stress Test</button>
              <Link className="btn" href={`/compounding-expertise/simulator?analysisId=${analysis.id}${selectedCaseSet ? `&caseSetId=${selectedCaseSet.id}` : ""}`}>Choose another test</Link>
            </div>
          </form>

          <details className="card compoundingDisclosure">
            <summary>Save / duplicate scenario</summary>
            <form action={saveScenariosAction} className="compoundingSaveScenarioForm">
              <input type="hidden" name="analysisId" value={analysis.id} />
              {selectedCaseSet ? <input type="hidden" name="caseSetId" value={selectedCaseSet.id} /> : null}
              {scenarios.map((scenario, index) => (
                <div key={`${scenario.name}-${index}`}>
                  <input type="hidden" name="scenarioId" value={scenario.id ?? ""} />
                  <input type="hidden" name="name" value={scenario.name} />
                  <input type="hidden" name="startingCases" value={scenario.startingCases} />
                  <input type="hidden" name="casesPerMonth" value={scenario.casesPerMonth} />
                  <input type="hidden" name="feedbackDelayDays" value={scenario.feedbackDelayDays} />
                  <input type="hidden" name="transferability" value={scenario.transferability} />
                  <input type="hidden" name="informationValue" value={scenario.informationValue} />
                  <input type="hidden" name="learningEfficiency" value={scenario.learningEfficiency} />
                  <input type="hidden" name="stalenessRate" value={scenario.stalenessRate} />
                  <input type="hidden" name="baseCapability" value={scenario.baseCapability} />
                </div>
              ))}
              <div className="ctaRow">
                <button className="btn" type="submit">Save scenario</button>
                <button className="btn" type="button" disabled>Duplicate pending scenario sets</button>
              </div>
              <p className="small">Persistence limitation: this version stores the current Incumbent / Challenger pair as the analysis scenario. It does not yet create named scenario sets.</p>
            </form>
          </details>
        </Section>
      ) : null}

      {hasRun ? (
        <>
          <Section eyebrow="Scenario Result" title={result.label}>
            <div className="card compoundingScenarioOutcomeHero">
              <h3>{result.label}</h3>
              <p>{resultSentence(result, scenarios[0].name, scenarios[1].name)}</p>
              <p className="small">Scenario output only. Modeled expertise index is unitless and is not a measured business metric.</p>
            </div>
            <div className="compoundingScenarioResultGrid compact">
              <div className="card"><strong>Initial gap</strong><span>{formatGap(result.initialGap)}</span><small>Modeled expertise index</small></div>
              <div className="card"><strong>12-month gap</strong><span>{formatGap(result.month12Gap)}</span><small>Modeled expertise index</small></div>
              <div className="card"><strong>36-month gap</strong><span>{formatGap(result.month36Gap)}</span><small>Modeled expertise index</small></div>
              <div className="card"><strong>Crossover</strong><span>{result.crossoverMonth === null ? "None within 36 months" : `Month ${result.crossoverMonth}`}</span></div>
            </div>
          </Section>

          <Section title="Trajectory">
            <SimulatorLineChart series={series} crossover={crossover} />
          </Section>

          <Section title="Why?">
            <div className="compoundingDriverGrid">
              {topDrivers.map((driver, index) => (
                <div className="card" key={driver.title}>
                  <span className="badge">{index + 1}</span>
                  <h3>{driver.title}</h3>
                  <p>{driver.detail}</p>
                </div>
              ))}
            </div>
            <details className="card compoundingDisclosure">
              <summary>View all model drivers</summary>
              <div className="compoundingDriverGrid">
                {drivers.map((driver) => (
                  <div className="card" key={driver.title}>
                    <h3>{driver.title}</h3>
                    <p>{driver.detail}</p>
                  </div>
                ))}
              </div>
            </details>
            <p className="small">Drivers within this scenario model. This is not formal causal attribution outside the toy model.</p>
          </Section>

          <Section title="What does this imply for Power?">
            <div className="card compoundingScenarioImplication">
              <p>{implication}</p>
              <span className="badge">SCENARIO IMPLICATION — NOT EMPIRICAL EVIDENCE</span>
              <div className="ctaRow">
                <Link className="btn" href={`/compounding-expertise/diagnostic?analysisId=${analysis.id}`}>View related Power →</Link>
                <Link className="btn" href={`/compounding-expertise/debates?analysisId=${analysis.id}${selectedCaseSet ? `&caseSetId=${selectedCaseSet.id}` : ""}`}>View related Debate →</Link>
              </div>
            </div>
          </Section>

          <Section title="Try another stress test">
            <div className="compoundingScenarioShortcutRow">
              {canonicalTemplates.map((item) => (
                <Link className="btn" href={scenarioQuery(baseQuery, analysis.id, caseSetId, item.id)} key={item.id}>{item.name}</Link>
              ))}
            </div>
          </Section>
        </>
      ) : null}

      <Section title="Secondary tools">
        <details className="card compoundingDisclosure">
          <summary>Compare saved scenarios</summary>
          <div className="compoundingScenarioDiffTable">
            <table className="dataTable">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Stress-test type</th>
                  <th>Result</th>
                  <th>Crossover</th>
                  <th>Final gap</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{scenarios.map((scenario) => scenario.name).join(" vs ")}</td>
                  <td>{template.name}</td>
                  <td>{result.label}</td>
                  <td>{result.crossoverMonth === null ? "None" : `Month ${result.crossoverMonth}`}</td>
                  <td>{formatGap(result.month36Gap)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </details>

        <details className="card compoundingDisclosure">
          <summary>How the model works</summary>
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
        </details>
      </Section>

      <Section title="Next: Synthesize the investment thesis">
        <div className="card">
          <p>
            Conclusion combines Company Model, Experience, Debates, Power, and Stress Tests into a concise statement of what appears true,
            what remains uncertain, and what evidence would most change the thesis.
          </p>
          <Link className="btn primary" href={`/compounding-expertise/memo?analysisId=${analysis.id}${selectedCaseSet ? `&caseSetId=${selectedCaseSet.id}` : ""}`}>Continue to Conclusion →</Link>
        </div>
      </Section>
    </>
  );
}
