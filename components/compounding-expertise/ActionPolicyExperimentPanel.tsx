"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { applyActionPolicyExperimentAction } from "@/app/(demo)/compounding-expertise/actions";
import type { ActionPolicyExperimentConfig, ActionPolicyExperimentResult } from "@/lib/action-policy-experiment";

const number = (value: number) => value.toFixed(3);

function ApplyButton() {
  const { pending } = useFormStatus();
  return <button className="btn primary" type="submit" disabled={pending}>{pending ? "Creating CaseSet and applying conclusions…" : "Apply result and create synthetic CaseSet"}</button>;
}

export function ActionPolicyExperimentPanel({ defaults, result, analysisId, caseSetId, dataset }: {
  defaults: ActionPolicyExperimentConfig;
  result: ActionPolicyExperimentResult | null;
  analysisId: string;
  caseSetId?: string;
  dataset?: string;
}) {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!running) return;
    setElapsed(0);
    const timer = window.setInterval(() => setElapsed(value => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [running]);
  const phase = ["Generating potential outcomes for both actions", "Learning baseline, local, pooled, and selective policies", "Evaluating held-out actions and economic outcomes", "Checking repeat-run intervals and segment harm", "Preparing the inspectable child CaseSet"][Math.min(4, Math.floor(elapsed / 2))];
  const config = result?.config ?? defaults;
  return <div className="compoundingPolicyLab">
    <div className="card compoundingStageOrientation">
      <div><p className="small">Question</p><p><strong>Does changing the decision policy improve outcomes?</strong></p><p>Unlike the predictive probes, this simulator evaluates chosen actions against known potential outcomes.</p></div>
      <div><p className="small">Output</p><p><strong>Result + reusable CaseSet</strong></p><p>The run can create an explicitly synthetic child dataset and apply its conditional conclusion downstream.</p></div>
    </div>
    <details open={!result} className="compoundingDisclosure"><summary>1 · Configure experiment</summary>
      <form method="get" action="/compounding-expertise/scorebook" className="compoundingFormGrid" onSubmit={() => setRunning(true)}>
        <input type="hidden" name="analysisId" value={analysisId} /><input type="hidden" name="caseSetId" value={caseSetId ?? ""} /><input type="hidden" name="dataset" value={dataset ?? ""} /><input type="hidden" name="policyRun" value="1" />
        <label>Debate<select name="policyFamily" defaultValue={config.family}><option value="LEARNING_CAUSALITY">Learning causality</option><option value="CROSS_CUSTOMER_TRANSFER">Cross-customer transfer</option><option value="MARGINAL_INFORMATION_VALUE">Marginal information value</option><option value="ECONOMIC_MATERIALITY">Economic materiality</option></select></label>
        <label>Generated cases<input name="policyCases" type="number" min="120" max="1200" defaultValue={config.cases} /></label>
        <label>Customer groups<input name="policyCustomers" type="number" min="2" max="12" defaultValue={config.customers} /></label>
        <label>Decision patterns<input name="policyPatterns" type="number" min="3" max="30" defaultValue={config.patterns} /></label>
        <label>Shared structure<input name="policyShared" type="number" min="0" max="1" step="any" defaultValue={config.sharedStructure} /></label>
        <label>Environmental drift<input name="policyDrift" type="number" min="0" max="1" step="any" defaultValue={config.drift} /></label>
        <label>Action effect strength<input name="policyEffect" type="number" min="0.02" max="0.45" step="any" defaultValue={config.effectStrength} /></label>
        <label>Outcome noise<input name="policyNoise" type="number" min="0" max="0.45" step="any" defaultValue={config.outcomeNoise} /></label>
        <label>Intervention cost / decision<input name="policyCost" type="number" min="0" step="any" defaultValue={config.interventionCost} /></label>
        <label>Minimum material effect<input name="policyMinimum" type="number" min="0.001" max="0.2" step="any" defaultValue={config.minimumEffect} /></label>
        <label>Repeated worlds<input name="policyRepetitions" type="number" min="4" max="20" defaultValue={config.repetitions} /></label>
        <label>Seed<input name="policySeed" type="number" min="1" defaultValue={config.seed} /></label>
        <button className="btn primary span-2" type="submit">Run action-policy experiment</button>
      </form>
    </details>
    {running ? <div className="card" role="status" aria-live="polite" style={{ borderColor: "#3b82f6" }}><p className="small">ACTION-POLICY EXPERIMENT RUNNING · {elapsed}s</p><p><strong>{phase}</strong></p><progress style={{ width: "100%" }} /></div> : null}
    {result ? <>
      <div className="card"><span className="miniTag">2 · RUN COMPLETE · REVIEW BEFORE APPLYING</span><h3>{result.finding.headline}</h3><p>{result.finding.detail}</p><p>{result.finding.implication}</p><p className="small">{result.assumptions}</p></div>
      <div className="grid grid-3">
        <div className="card compact"><p className="small">Policy-value gain</p><h3>{number(result.gain.mean)}</h3><p>{number(result.gain.low)}–{number(result.gain.high)} repeat-run range</p></div>
        <div className="card compact"><p className="small">Accuracy gain</p><h3>{number(result.accuracyGain.mean)}</h3><p>Candidate versus comparison policy</p></div>
        <div className="card compact"><p className="small">Segment safety</p><h3>{result.harmedSegments}/{result.config.customers} harmed</h3><p>Materiality threshold {number(result.config.minimumEffect)}</p></div>
      </div>
      <details><summary>Compare every policy arm</summary><div className="tableScroll"><table className="dataTable"><thead><tr><th>Policy</th><th>Expected value</th><th>Correct-action rate</th></tr></thead><tbody>{Object.entries(result.arms).map(([name, metrics]) => <tr key={name}><td>{name}</td><td>{number(metrics.value.mean)} ({number(metrics.value.low)}–{number(metrics.value.high)})</td><td>{number(metrics.accuracy.mean)}</td></tr>)}</tbody></table></div></details>
      <details><summary>Segment harm check</summary><ul>{result.segmentGains.map((gain, index) => <li key={index}>Customer group {index + 1}: gain {number(gain.mean)} ({number(gain.low)}–{number(gain.high)})</li>)}</ul></details>
      <div className="card"><span className="miniTag">3 · APPLY</span><h3>Create an inspectable experiment dataset</h3><p>Applying saves this exact configuration and conclusion against the current dataset, creates a child CaseSet containing {result.generatedCaseCount} simulated trial rows, and updates Debates, Power, Conclusion, and future AI suggestions. It does not alter your belief or relabel synthetic outcomes as observed company evidence.</p>
        <form action={applyActionPolicyExperimentAction} className="ctaRow">
          <input type="hidden" name="analysisId" value={analysisId} /><input type="hidden" name="caseSetId" value={caseSetId ?? ""} /><input type="hidden" name="dataset" value={dataset ?? ""} />
          {Object.entries(result.config).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
          <ApplyButton />
          <a className="btn" href={`data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify({ ...result, generatedRows: undefined }, null, 2))}`} download="action-policy-experiment.json">Download result</a>
        </form>
      </div>
    </> : <div className="card"><strong>Ready to test a changed decision policy.</strong><p>Choose the debate and assumptions above. No downstream conclusion changes until you review and apply the run.</p></div>}
  </div>;
}
