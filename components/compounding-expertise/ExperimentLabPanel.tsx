"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import type { SyntheticExperimentLabResult, SyntheticWorldConfig } from "@/lib/experience-experiment-lab";
import type { AutomatedExperimentProgramResult } from "@/lib/experience-experiment-program";
import { saveAutomatedExperimentProgramAction, saveSyntheticExperimentRunAction } from "@/app/(demo)/compounding-expertise/actions";

const pct = (value: number) => `${Math.round(value * 100)}%`;
const score = (value: number) => value.toFixed(3);

function range(value: { mean: number; low: number; high: number }) {
  return `${score(value.mean)} (${score(value.low)}–${score(value.high)})`;
}

function SweepTable({ title, axis, points, primary, secondary }: { title: string; axis: string; points: Array<{ value: number; primary: number; secondary: number; verdict: string }>; primary: string; secondary: string }) {
  return <details><summary>{title}</summary><div className="tableScroll"><table className="dataTable"><thead><tr><th>{axis}</th><th>{primary}</th><th>{secondary}</th><th>Interpretation</th></tr></thead><tbody>{points.map(point => <tr key={point.value}><td>{axis.includes("structure") || axis.includes("drift") ? pct(point.value) : point.value}</td><td>{point.primary.toFixed(3)}</td><td>{point.secondary.toFixed(3)}</td><td><span className="miniTag">{point.verdict}</span></td></tr>)}</tbody></table></div></details>;
}

function ApplyProgramButton({ applied }: { applied: boolean }) {
  const { pending } = useFormStatus();
  return <button className="btn primary" type="submit" disabled={pending || applied}>{pending ? "Applying conclusions…" : applied ? "Suite already applied" : "Apply to Debates, Power & Conclusion"}</button>;
}

export function ExperimentLabPanel({ defaults, result, program, plan, programApplied, analysisId, caseSetId, dataset, savedRuns }: {
  defaults: SyntheticWorldConfig;
  result: SyntheticExperimentLabResult | null;
  program: AutomatedExperimentProgramResult | null;
  plan: ReturnType<typeof import("@/lib/experience-experiment-program").buildAutomatedExperimentPlan>;
  programApplied: boolean;
  analysisId: string;
  caseSetId?: string;
  dataset?: string;
  savedRuns: number;
}) {
  const [running, setRunning] = useState<"suite" | "custom" | null>(null);
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!running) return;
    setElapsed(0);
    const timer = window.setInterval(() => setElapsed(value => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [running]);
  const suitePhases = ["Reading the selected dataset and calibrating the world", "Generating repeated decision worlds", "Testing pooling and negative transfer", "Testing staleness and experience selection", "Benchmarking challenger reconstruction", "Synthesizing thresholds and failure regions"];
  const customPhases = ["Validating the world assumptions", "Generating repeated decision worlds", "Comparing local, pooled, and selective policies", "Testing history selection and reconstruction", "Synthesizing the experiment findings"];
  const phases = running === "custom" ? customPhases : suitePhases;
  const phaseIndex = Math.min(phases.length - 1, Math.floor(elapsed / 2));
  const config = result?.config ?? defaults;
  return <div>
    <p>Use the selected experience dataset to choose the highest-value mechanism tests, then generate decision worlds with known alternative-action outcomes. Simulations establish conditional boundaries; they remain separate from observed company evidence.</p>
    <div className="card compoundingStageOrientation">
      <div><p className="small">Automatic plan for this dataset</p><p><strong>{plan.profile.cases} cases · {plan.profile.customers} customer groups · {plan.profile.patterns} patterns</strong></p><p>{plan.rationale}</p></div>
      <div><p className="small">Recommended program</p><ol>{plan.tests.map(test => <li key={test.family}><strong>{test.title}:</strong> {test.question}</li>)}</ol></div>
    </div>
    <div className="compoundingStageOrientation">
      <div><span className="statusPill live">1 · PLAN</span><p><strong>Dataset calibrated</strong></p><p className="small">The app selected the mechanisms and parameter ranges most useful for this dataset.</p></div>
      <div><span className={`statusPill ${program ? "live" : "progress"}`}>2 · RUN & REVIEW</span><p><strong>{program ? "Results ready" : "Run the suite"}</strong></p><p className="small">Inspect thresholds, negative results, and the assumptions under which each mechanism works.</p></div>
      <div><span className={`statusPill ${programApplied ? "live" : "progress"}`}>3 · APPLY</span><p><strong>{programApplied ? "Applied downstream" : "Your confirmation required"}</strong></p><p className="small">Nothing changes elsewhere until you apply the reviewed conclusions.</p></div>
    </div>
    <form method="get" action="/compounding-expertise/scorebook" className="ctaRow" onSubmit={() => setRunning("suite")}>
      <input type="hidden" name="analysisId" value={analysisId} /><input type="hidden" name="caseSetId" value={caseSetId ?? ""} /><input type="hidden" name="dataset" value={dataset ?? ""} /><input type="hidden" name="experimentProgram" value="1" />
      <button className="btn primary" type="submit" disabled={running !== null}>{running === "suite" ? "Running recommended experiments…" : "Run recommended experiment suite"}</button>
    </form>

    {running ? <div className="card" role="status" aria-live="polite" style={{ marginTop: 12, borderColor: "#3b82f6" }}>
      <p className="small">{running === "suite" ? "Recommended experiment suite in progress" : "Custom synthetic experiment in progress"}</p>
      <p><strong>{phases[phaseIndex]}</strong></p>
      <progress style={{ width: "100%" }} aria-label="Experiment running" />
      <p className="small">{elapsed}s elapsed · Keep this page open. {running === "suite" ? "The app is testing 16 parameter settings across repeated worlds." : "The app is evaluating the configured world across repeated seeds."}</p>
    </div> : null}

    {program ? <>
      <div className="card"><span className="miniTag">RUN COMPLETE · {programApplied ? "APPLIED" : "PREVIEW NOT YET APPLIED"}</span><p><strong>{program.generatedCases.toLocaleString()} generated observations</strong> tested across pooling, staleness, and reconstruction boundaries.</p><p>{program.assumptions}</p></div>
      <div className="grid grid-3">{program.findings.map(finding => <article className="card" key={finding.id}>
        <span className="miniTag">{finding.verdict}</span><h3>{finding.headline}</h3><p>{finding.thesis}</p>
        <p><strong>Works when:</strong> {finding.worksWhen}</p><p><strong>Fails when:</strong> {finding.failsWhen}</p>
        <details><summary>Interpretation and next experiment</summary><p>{finding.detail}</p><p>{finding.implication}</p><p><strong>Next:</strong> {finding.nextExperiment}</p></details>
      </article>)}</div>
      <SweepTable title="Pooling sensitivity" axis="Shared structure" points={program.sweeps.sharedStructure} primary="Selective − local" secondary="Pooled − local" />
      <SweepTable title="Staleness sensitivity" axis="Environmental drift" points={program.sweeps.drift} primary="Recent − full" secondary="Balanced − full" />
      <SweepTable title="Reconstruction sensitivity" axis="Calibration cases" points={program.sweeps.calibration} primary="Incumbent gap" secondary="Challenger value" />
      <div className="card">
        <h3>{programApplied ? "These conclusions are active across the analysis" : "Apply the reviewed conclusions"}</h3>
        <p>{programApplied ? "The saved suite is available as conditional context throughout the selected dataset’s analysis." : "Applying saves this exact suite against the selected dataset and recalculates the relevant downstream interpretation. It does not overwrite your belief or convert simulated outcomes into observed evidence."}</p>
        <div className="compoundingStageOrientation">
          <div><strong>Debates</strong><p className="small">Adds explicit works-when, fails-when, threshold, and next-experiment context to transfer, information value, and rebuildability.</p></div>
          <div><strong>Power</strong><p className="small">Carries conditional findings into Network Economies, Process Power, and Cornered Resource.</p></div>
          <div><strong>Conclusion + AI</strong><p className="small">Updates investment synthesis and supplies the boundaries to future AI debate suggestions.</p></div>
        </div>
      </div>
      <form action={saveAutomatedExperimentProgramAction} className="ctaRow">
        <input type="hidden" name="analysisId" value={analysisId} /><input type="hidden" name="caseSetId" value={caseSetId ?? ""} /><input type="hidden" name="dataset" value={dataset ?? ""} />
        <ApplyProgramButton applied={programApplied} />
        <a className="btn" href={`data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(program, null, 2))}`} download="automated-experiment-program.json">Download suite</a>
      </form>
    </> : null}

    <details><summary>Run one custom synthetic world</summary><form method="get" action="/compounding-expertise/scorebook" className="compoundingFormGrid" onSubmit={() => setRunning("custom")}>
      <input type="hidden" name="analysisId" value={analysisId} />
      <input type="hidden" name="caseSetId" value={caseSetId ?? ""} />
      <input type="hidden" name="dataset" value={dataset ?? ""} />
      <input type="hidden" name="experimentRun" value="1" />
      <label>Customers<input name="worldCustomers" type="number" min="2" max="12" defaultValue={config.customers} /></label>
      <label>Cases per customer<input name="worldCases" type="number" min="40" max="300" defaultValue={config.casesPerCustomer} /></label>
      <label>Decision patterns<input name="worldPatterns" type="number" min="2" max="30" defaultValue={config.patterns} /></label>
      <label>Shared structure<input name="worldShared" type="number" min="0" max="1" step="any" defaultValue={config.sharedStructure} /><small>0 = customer-specific; 1 = fully shared</small></label>
      <label>Environmental drift<input name="worldDrift" type="number" min="0" max="1" step="any" defaultValue={config.drift} /></label>
      <label>Outcome noise<input name="worldNoise" type="number" min="0" max="0.45" step="any" defaultValue={config.outcomeNoise} /></label>
      <label>Missing feedback<input name="worldMissing" type="number" min="0" max="0.8" step="any" defaultValue={config.missingFeedback} /></label>
      <label>Challenger calibration cases<input name="worldCalibration" type="number" min="0" max="500" defaultValue={config.challengerCalibration} /></label>
      <label>Repeated worlds<input name="worldRepetitions" type="number" min="3" max="12" defaultValue={config.repetitions} /><small>Large worlds are automatically capped at 24,000 generated observations.</small></label>
      <label>Seed<input name="worldSeed" type="number" min="1" defaultValue={config.seed} /></label>
      <div className="ctaRow span-2"><button className="btn primary" type="submit">Run synthetic experiments</button>{savedRuns ? <span className="small">{savedRuns} saved experiment run{savedRuns === 1 ? "" : "s"} for this dataset.</span> : null}</div>
    </form></details>

    {result ? <>
      <div className="card compoundingStageOrientation">
        <div><p className="small">Generated experiment</p><p><strong>{result.generatedCases.toLocaleString()} simulated case observations</strong> across {result.config.repetitions} independently seeded worlds.</p></div>
        <div><p className="small">Assumption boundary</p><p>{result.assumptions}</p></div>
      </div>
      <div className="grid grid-3">{result.findings.map(finding => <article className="card" key={finding.id}>
        <span className="miniTag">{finding.verdict}</span>
        <h3>{finding.id === "pooling" ? "Pooling strategy" : finding.id === "selection" ? "Experience selection" : "Challenger reconstruction"}</h3>
        <p><strong>{finding.headline}</strong></p><p>{finding.detail}</p><p>{finding.implication}</p>
      </article>)}</div>
      <details open><summary>Compare policies and uncertainty across runs</summary>
        <div className="tableScroll"><table className="dataTable"><thead><tr><th>Experiment</th><th>Strategy</th><th>Mean expected value (10th–90th percentile)</th></tr></thead><tbody>
          <tr><td rowSpan={3}>Pooling</td><td>Local only</td><td>{range(result.pooling.local)}</td></tr>
          <tr><td>Unconditional pooled</td><td>{range(result.pooling.pooled)}</td></tr>
          <tr><td>Selective local/pooled</td><td>{range(result.pooling.selective)}</td></tr>
          <tr><td rowSpan={3}>Experience selection</td><td>Full history</td><td>{range(result.selection.full)}</td></tr>
          <tr><td>Recent history</td><td>{range(result.selection.recent)}</td></tr>
          <tr><td>Pattern-balanced history</td><td>{range(result.selection.balanced)}</td></tr>
          <tr><td rowSpan={3}>Reconstruction</td><td>Incumbent</td><td>{range(result.reconstruction.incumbent)}</td></tr>
          <tr><td>Restricted challenger</td><td>{range(result.reconstruction.challenger)}</td></tr>
          <tr><td>Incumbent advantage</td><td>{range(result.reconstruction.gap)}</td></tr>
        </tbody></table></div>
      </details>
      <details><summary>World assumptions</summary><ul>
        <li>{config.customers} customers × {config.casesPerCustomer} cases; {config.patterns} recurring decision patterns.</li>
        <li>{pct(config.sharedStructure)} shared structure; {pct(config.drift)} drift; {pct(config.outcomeNoise)} outcome noise; {pct(config.missingFeedback)} missing feedback.</li>
        <li>Challenger sees one public-reference customer plus {config.challengerCalibration} calibration cases. Incumbent uses selectively weighted full experience.</li>
      </ul></details>
      <form action={saveSyntheticExperimentRunAction} className="ctaRow">
        <input type="hidden" name="analysisId" value={analysisId} /><input type="hidden" name="caseSetId" value={caseSetId ?? ""} /><input type="hidden" name="dataset" value={dataset ?? ""} />
        {Object.entries(config).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
        <button className="btn" type="submit">Use findings as debate context</button>
        <a className="btn" href={`data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(result, null, 2))}`} download="synthetic-experiment-run.json">Download run</a>
      </form>
    </> : program ? null : <div className="card"><strong>Ready to test the mechanism.</strong><p>Run the recommended suite for automatic boundaries, or open the custom controls to test one specific world.</p></div>}
  </div>;
}
