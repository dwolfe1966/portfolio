"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { applyActionPolicyExperimentAction } from "@/app/(demo)/compounding-expertise/actions";
import type { ActionPolicyExperimentConfig, ActionPolicyExperimentResult } from "@/lib/action-policy-experiment";

const number = (value: number) => value.toFixed(3);

function ApplyButton() {
  const { pending } = useFormStatus();
  return <button className="btn primary" type="submit" disabled={pending}>{pending ? "Creating CaseSet and applying conclusions…" : "Apply result and create synthetic CaseSet"}</button>;
}

export function ActionPolicyExperimentPanel({ defaults, result, reviewToken, analysisId, caseSetId, dataset }: {
  defaults: ActionPolicyExperimentConfig;
  result: ActionPolicyExperimentResult | null;
  reviewToken?: string;
  analysisId: string;
  caseSetId?: string;
  dataset?: string;
}) {
  const [running, setRunning] = useState(false);
  const [applyState, applyAction] = useActionState(applyActionPolicyExperimentAction, null);
  const [elapsed, setElapsed] = useState(0);
  const [scenario, setScenario] = useState(defaults.scenario);
  useEffect(() => {
    if (!running) return;
    setElapsed(0);
    const timer = window.setInterval(() => setElapsed(value => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [running]);
  const phase = "Comparing policies across repeated worlds, bootstrapping effects, and checking time, case-mix, and customer holdouts. This page will update when the run finishes.";
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
        <label>Workflow scenario<select name="policyScenario" value={scenario} onChange={event => setScenario(event.target.value as typeof scenario)}><option value="GENERIC">Generic two-action workflow</option><option value="CASAP_DISPUTES">Casap dispute actions: refund / contest / review</option></select></label>
        {scenario === "CASAP_DISPUTES" ? <p className="small span-2">Runs four linked debate comparisons on identical worlds. The chosen debate controls the detailed view and saved trial arms. This is a configurable dispute-workflow model, not Casap&apos;s actual policy or fitted unit economics.</p> : null}
        <label>Cases per world (60% training / 40% trial)<input name="policyCases" type="number" min="120" max="1200" defaultValue={config.cases} /></label>
        <label>Customer groups<input name="policyCustomers" type="number" min="2" max="12" defaultValue={config.customers} /></label>
        <label>Decision patterns<input name="policyPatterns" type="number" min="3" max="30" defaultValue={config.patterns} /></label>
        <label>Shared structure<input name="policyShared" type="number" min="0" max="1" step="any" defaultValue={config.sharedStructure} /></label>
        <label>Environmental drift<input name="policyDrift" type="number" min="0" max="1" step="any" defaultValue={config.drift} /></label>
        <label>Action effect strength<input name="policyEffect" type="number" min="0.02" max="0.45" step="any" defaultValue={config.effectStrength} /></label>
        <label>Outcome noise<input name="policyNoise" type="number" min="0" max="0.45" step="any" defaultValue={config.outcomeNoise} /></label>
        <label>Intervention cost / decision<input name="policyCost" type="number" min="0" step="any" defaultValue={config.interventionCost} /></label>
        <label>{scenario === "CASAP_DISPUTES" ? "Dispute amount (scenario units)" : "Value per favorable outcome (scenario units)"}<input name="policyValue" type="number" min="1" max="100000" step="any" defaultValue={config.valuePerOutcome} /></label>
        {scenario === "CASAP_DISPUTES" ? <>
          <label>Contest operating cost<input name="policyContestCost" type="number" min="0" max="100000" step="any" defaultValue={config.contestCost} /></label>
          <label>Manual-review operating cost<input name="policyReviewCost" type="number" min="0" max="100000" step="any" defaultValue={config.reviewCost} /></label>
        </> : null}
        <label>Minimum material effect<input name="policyMinimum" type="number" min="0.001" max="0.2" step="any" defaultValue={config.minimumEffect} /></label>
        <label>Repeated worlds (12+ recommended)<input name="policyRepetitions" type="number" min="4" max="40" defaultValue={config.repetitions} /></label>
        <label>Seed<input name="policySeed" type="number" min="1" defaultValue={config.seed} /></label>
        <button className="btn primary span-2" type="submit" disabled={running}>{running ? "Running experiment…" : "Run action-policy experiment"}</button>
      </form>
    </details>
    {running ? <div className="card" role="status" aria-live="polite" style={{ borderColor: "#3b82f6" }}><p className="small">ACTION-POLICY EXPERIMENT RUNNING · {elapsed}s</p><p><strong>{phase}</strong></p><progress style={{ width: "100%" }} /></div> : null}
    {result ? <>
      <div className="card"><span className="miniTag">2 · RUN COMPLETE · REVIEW BEFORE APPLYING</span><h3>{result.finding.headline}</h3><p>{result.finding.detail}</p><p>{result.finding.implication}</p><p className="small">{result.assumptions}</p></div>
      <div className="grid grid-3">
        <div className="card compact"><p className="small">Normalized policy-value gain</p><h3>{number(result.gain.mean)}</h3><p>{number(result.robustness.ci.low)}–{number(result.robustness.ci.high)} · 95% world-bootstrap CI</p><p className="small">10th–90th repeat-world range: {number(result.gain.low)}–{number(result.gain.high)}</p></div>
        <div className="card compact"><p className="small">Net incremental value / decision</p><h3>{result.robustness.netInterval.mean.toFixed(2)}</h3><p>{result.robustness.netInterval.low.toFixed(2)}–{result.robustness.netInterval.high.toFixed(2)} scenario units after intervention cost</p></div>
        <div className="card compact"><p className="small">Segment safety</p><h3>{result.harmedSegments}/{result.config.customers} harmed</h3><p>{result.robustness.uncertainSegments} further segments have unresolved safety. Threshold {number(result.config.minimumEffect)}.</p></div>
      </div>
      {result.relatedComparisons.length > 1 ? <div className="card"><h3>Casap debate conclusions from this run</h3><div className="tableScroll"><table className="dataTable"><thead><tr><th>Debate</th><th>Comparison</th><th>Result</th><th>Value gain</th></tr></thead><tbody>{result.relatedComparisons.map(item => <tr key={item.family}><td>{item.family.replaceAll("_", " ")}</td><td>{item.comparator}</td><td>{item.verdict}</td><td>{number(item.gain)} ({number(item.ci.low)}–{number(item.ci.high)})</td></tr>)}</tbody></table></div><p className="small">Related comparisons from the same worlds—not four independent studies. Applying updates all four debate families.</p></div> : null}
      <details open><summary>What survives the robustness checks?</summary>
        {result.robustness.smallReplicationWarning ? <p>Only {config.repetitions} independent worlds: bootstrap endpoints may be unstable. Increase repetitions before relying on a narrow interval.</p> : null}
        <p className="small">{result.robustness.interpretation}</p>
        <div className="tableScroll"><table className="dataTable"><thead><tr><th>Stress condition</th><th>Mean gain</th><th>Net value gain</th><th>Clears minimum effect?</th></tr></thead><tbody>{result.robustness.sensitivities.map(item => <tr key={item.label}><td>{item.label}</td><td>{number(item.mean)}</td><td>{item.netGain.toFixed(2)}</td><td>{item.clearsThreshold ? "Yes" : "No"}</td></tr>)}</tbody></table></div>
      </details>
      <details><summary>Compare every policy arm and its actions</summary><div className="tableScroll"><table className="dataTable"><thead><tr><th>Policy</th><th>Expected net value</th><th>Optimal-action rate</th><th>Action mix</th></tr></thead><tbody>{Object.entries(result.arms).map(([name, metrics]) => <tr key={name}><td>{name}</td><td>{metrics.economicValue.toFixed(2)}</td><td>{Math.round(metrics.accuracy.mean * 100)}%</td><td>{metrics.actionShare.map(action => `${action.action}: ${Math.round(action.share * 100)}%`).join(" · ")}</td></tr>)}</tbody></table></div><p className="small">Policy values include action operating costs but exclude the incremental intervention charge. The headline net comparison subtracts that charge once. Optimal-action rate uses simulator truth, not noisy outcome success.</p></details>
      <details><summary>Segment harm check</summary><ul>{result.segmentGains.map((gain, index) => <li key={index}>Customer group {index + 1}: gain {number(gain.mean)}; pointwise 95% CI {number(gain.ci.low)}–{number(gain.ci.high)}</li>)}</ul></details>
      <details><summary>Dataset calibration and assumptions</summary><p>{result.calibration.sourceCases} selected source cases · {result.calibration.sourceGroups} segment labels.</p><p>{result.calibration.measured}</p><p>{result.calibration.assumed}</p></details>
      <div className="card"><span className="miniTag">3 · APPLY</span><h3>Create an inspectable experiment dataset</h3><p>Applying saves this exact configuration and conclusion against the current dataset, creates a child CaseSet containing {result.generatedCaseCount} simulated trial rows, and updates Debates, Power, Conclusion, and future AI suggestions. It does not alter your belief or relabel synthetic outcomes as observed company evidence.</p>
        {applyState?.error ? <p role="alert">{applyState.error}</p> : null}
        <form action={applyAction} className="ctaRow">
          <input type="hidden" name="analysisId" value={analysisId} /><input type="hidden" name="caseSetId" value={caseSetId ?? ""} /><input type="hidden" name="dataset" value={dataset ?? ""} />
          <input type="hidden" name="reviewToken" value={reviewToken ?? ""} />
          {Object.entries(result.config).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
          <ApplyButton />
          <a className="btn" href={`data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify({ ...result, generatedRows: undefined }, null, 2))}`} download="action-policy-experiment.json">Download result</a>
          <a className="btn" href={`data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(result.generatedRows, null, 2))}`} download="synthetic-trial-cases.json">Download trial cases</a>
        </form>
      </div>
    </> : <div className="card"><strong>Ready to test a changed decision policy.</strong><p>Choose the debate and assumptions above. No downstream conclusion changes until you review and apply the run.</p></div>}
  </div>;
}
