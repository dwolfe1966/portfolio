import type { ExperienceAnalysis } from "@/lib/experience-analysis";
import type { ObservedExperimentAdapterResult } from "@/lib/observed-experiment-adapter";

export function ExperienceAnalysisPanel({ report, observed, savedCurrent, previousRuns }: { report: ExperienceAnalysis; observed: ObservedExperimentAdapterResult; savedCurrent: boolean; previousRuns: number }) {
  const number = (value: number | null) => value === null ? "—" : value.toFixed(3);
  return <div>
    <p><strong>{report.profile.total} cases → {report.profile.eligible} eligible for chronological experiments.</strong> {report.profile.groups} groups; {report.profile.decisionTypes} decision patterns; {report.profile.duplicateIdentityRows} rows with duplicate case IDs excluded from experiments.</p>
    <p>{savedCurrent ? "A saved run matches the current dataset and engine." : previousRuns ? "Saved runs exist for an earlier dataset revision or engine. Results below are recomputed from the current cases." : "Results below are computed from the selected cases. Save a run to preserve its inputs and results."}</p>
    <div className="grid grid-2">{report.findings.map(finding => <div className="card" key={finding.id}>
      <h3>{finding.id.replaceAll("-", " ")}</h3><span className="miniTag">{finding.status}</span>
      <p><strong>{finding.summary}</strong></p><p>{finding.interpretation}</p><p className="small">Next test: {finding.nextTest}</p>
    </div>)}</div>
    <details><summary>Model selection and final evaluation</summary>
      <p>{report.protocol.split} {report.protocol.selection}</p><p>{report.protocol.inference}</p>
      {!report.ready ? <p>{report.blockedReason}</p> : <div className="tableScroll"><table className="dataTable"><thead><tr><th>Model</th><th>Validation Brier</th><th>Final-test Brier</th><th>Selected before final evaluation</th></tr></thead><tbody>{report.scores.map(item => <tr key={item.model}><td>{item.model}</td><td>{number(report.validationScores.find(value => value.model === item.model)?.brier ?? null)}</td><td>{number(item.brier)}</td><td>{item.model === report.selected ? "Yes" : "No"}</td></tr>)}</tbody></table></div>}
      <p>Features: {report.protocol.features.join(", ")}. Target: {report.protocol.task}.</p>
    </details>
    <details><summary>Learning curve and group-level effects</summary>
      <ul>{report.curve.map(item => <li key={item.fraction}>{item.trainingCases} training cases → Brier {number(item.brier)} on the same final-test cases.</li>)}</ul>
      <ul>{report.segmentResults.map(item => <li key={item.segment}>{item.segment}: {item.count} test cases; local {number(item.local)}, pooled {number(item.pooled)}; local minus pooled {number(item.delta)}.</li>)}</ul>
    </details>
    <details><summary>Experiments requiring additional design</summary><ul>{report.nextExperiments.map(item => <li key={item.name}><strong>{item.name}:</strong> {item.required}.</li>)}</ul></details>
    <div className="card compoundingObservedAdapter">
      <p className="small">Observed-data experiment adapter · automatically applied to the selected dataset</p>
      <h3>What the selected cases resolve downstream</h3>
      <p>The adapter mapped available fields into {observed.mapping.length} tests. Results flow into each debate’s sub-thesis verdicts, the Power map, and investment synthesis; blocked questions become specific experiment requirements.</p>
      <div className="grid grid-2">{observed.experiments.map(experiment => <div className="card compact" key={experiment.id}>
        <div className="compoundingCardHeader"><strong>{experiment.title}</strong><span className="miniTag">{experiment.verdict}</span></div>
        <p>{experiment.headline}</p>
        <p className="small"><strong>Interpretation:</strong> {experiment.detail}</p>
        <p className="small"><strong>Boundary:</strong> {experiment.limitation}</p>
        <p className="small"><strong>Next:</strong> {experiment.nextExperiment}</p>
      </div>)}</div>
    </div>
  </div>;
}
