import type { SyntheticExperimentLabResult, SyntheticWorldConfig } from "@/lib/experience-experiment-lab";
import { saveSyntheticExperimentRunAction } from "@/app/(demo)/compounding-expertise/actions";

const pct = (value: number) => `${Math.round(value * 100)}%`;
const score = (value: number) => value.toFixed(3);

function range(value: { mean: number; low: number; high: number }) {
  return `${score(value.mean)} (${score(value.low)}–${score(value.high)})`;
}

export function ExperimentLabPanel({ defaults, result, analysisId, caseSetId, dataset, savedRuns }: {
  defaults: SyntheticWorldConfig;
  result: SyntheticExperimentLabResult | null;
  analysisId: string;
  caseSetId?: string;
  dataset?: string;
  savedRuns: number;
}) {
  const config = result?.config ?? defaults;
  return <div>
    <p>Generate decision worlds with known alternative-action outcomes, then test when pooling, experience selection, and reconstruction create—or destroy—advantage. Defaults are calibrated to the selected dataset’s size and structure.</p>
    <form method="get" action="/compounding-expertise/scorebook" className="compoundingFormGrid">
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
    </form>

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
    </> : <div className="card"><strong>Ready to test the mechanism.</strong><p>Adjust the assumptions or run the calibrated defaults. The experiment will report negative and mixed findings as readily as positive ones.</p></div>}
  </div>;
}
