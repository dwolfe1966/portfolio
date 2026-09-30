"use client";

import { useState } from "react";
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

export function ExperimentLabPanel({ defaults, result, program, plan, analysisId, caseSetId, dataset, savedRuns }: {
  defaults: SyntheticWorldConfig;
  result: SyntheticExperimentLabResult | null;
  program: AutomatedExperimentProgramResult | null;
  plan: ReturnType<typeof import("@/lib/experience-experiment-program").buildAutomatedExperimentPlan>;
  analysisId: string;
  caseSetId?: string;
  dataset?: string;
  savedRuns: number;
}) {
  const [running, setRunning] = useState(false);
  const config = result?.config ?? defaults;
  return <div>
    <p>Use the selected experience dataset to choose the highest-value mechanism tests, then generate decision worlds with known alternative-action outcomes. Simulations establish conditional boundaries; they remain separate from observed company evidence.</p>
    <div className="card compoundingStageOrientation">
      <div><p className="small">Automatic plan for this dataset</p><p><strong>{plan.profile.cases} cases · {plan.profile.customers} customer groups · {plan.profile.patterns} patterns</strong></p><p>{plan.rationale}</p></div>
      <div><p className="small">Recommended program</p><ol>{plan.tests.map(test => <li key={test.family}><strong>{test.title}:</strong> {test.question}</li>)}</ol></div>
    </div>
    <form method="get" action="/compounding-expertise/scorebook" className="ctaRow" onSubmit={() => setRunning(true)}>
      <input type="hidden" name="analysisId" value={analysisId} /><input type="hidden" name="caseSetId" value={caseSetId ?? ""} /><input type="hidden" name="dataset" value={dataset ?? ""} /><input type="hidden" name="experimentProgram" value="1" />
      <button className="btn primary" type="submit" disabled={running}>{running ? "Running recommended experiments…" : "Run recommended experiment suite"}</button>
      {running ? <span className="small" role="status">Testing 16 parameter settings across repeated generated worlds. Results will appear here when complete.</span> : null}
    </form>

    {program ? <>
      <div className="card"><span className="miniTag">AUTOMATED SENSITIVITY PROGRAM</span><p><strong>{program.generatedCases.toLocaleString()} generated observations</strong> tested across pooling, staleness, and reconstruction boundaries.</p><p>{program.assumptions}</p></div>
      <div className="grid grid-3">{program.findings.map(finding => <article className="card" key={finding.id}>
        <span className="miniTag">{finding.verdict}</span><h3>{finding.headline}</h3><p>{finding.thesis}</p>
        <p><strong>Works when:</strong> {finding.worksWhen}</p><p><strong>Fails when:</strong> {finding.failsWhen}</p>
        <details><summary>Interpretation and next experiment</summary><p>{finding.detail}</p><p>{finding.implication}</p><p><strong>Next:</strong> {finding.nextExperiment}</p></details>
      </article>)}</div>
      <SweepTable title="Pooling sensitivity" axis="Shared structure" points={program.sweeps.sharedStructure} primary="Selective − local" secondary="Pooled − local" />
      <SweepTable title="Staleness sensitivity" axis="Environmental drift" points={program.sweeps.drift} primary="Recent − full" secondary="Balanced − full" />
      <SweepTable title="Reconstruction sensitivity" axis="Calibration cases" points={program.sweeps.calibration} primary="Incumbent gap" secondary="Challenger value" />
      <form action={saveAutomatedExperimentProgramAction} className="ctaRow">
        <input type="hidden" name="analysisId" value={analysisId} /><input type="hidden" name="caseSetId" value={caseSetId ?? ""} /><input type="hidden" name="dataset" value={dataset ?? ""} />
        <button className="btn primary" type="submit">Use suite conclusions across the analysis</button>
        <a className="btn" href={`data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(program, null, 2))}`} download="automated-experiment-program.json">Download suite</a>
      </form>
    </> : null}

    <details><summary>Run one custom synthetic world</summary><form method="get" action="/compounding-expertise/scorebook" className="compoundingFormGrid" onSubmit={() => setRunning(true)}>
      <input type="hidden" name="analysisId" value={analysisId} />
      <input type="hidden" name="caseSetId" value={caseSetId ?? ""} />
      <input type="hidden" name="dataset" value={dataset ?? ""} />
      <input type="hidden" name="experimentRun" value="1" />
      <label>Customers<input name="worldCustomers" type="number" min="2" max="12" defaultValue={config.customers} /></label>
      <label>Cases per customer<input name="worldCases" type="number" min="40" max="300" defaultValue={config.casesPerCustomer} /></label>
      <label>Decision patterns<input name="worldPatterns" type="number" min="2" max="30" defaultValue={config.patterns} /></label>
      <label>Shared structure<input name="worldShared" type="number" min="0" max="1" step="0.05" defaultValue={config.sharedStructure} /><small>0 = customer-specific; 1 = fully shared</small></label>
      <label>Environmental drift<input name="worldDrift" type="number" min="0" max="1" step="0.05" defaultValue={config.drift} /></label>
      <label>Outcome noise<input name="worldNoise" type="number" min="0" max="0.45" step="0.05" defaultValue={config.outcomeNoise} /></label>
      <label>Missing feedback<input name="worldMissing" type="number" min="0" max="0.8" step="0.05" defaultValue={config.missingFeedback} /></label>
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
