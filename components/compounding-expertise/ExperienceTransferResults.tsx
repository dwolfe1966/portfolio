import type { ExperienceTransferExperiment } from "@/lib/experience-transfer-experiment";

export function ExperienceTransferResults({ result: r }: { result: ExperienceTransferExperiment }) {
  const fmt = (n: number | null) => n === null ? "—" : n.toFixed(3);
  const adequate = r.bySegment.filter(item => item.count >= 5);
  const helped = adequate.filter(item => item.delta !== null && item.delta > 0.005).length;
  const harmed = adequate.filter(item => item.delta !== null && item.delta < -0.005).length;
  return <section className="card" aria-label="Cross-segment experiment results">
    <h4>What the selected cases tell us</h4>
    <ol>
      <li><strong>Shared patterns: {r.sharedPatterns ? "present" : "not found in eligible cases"}.</strong> {r.sharedPatterns} of {r.patternCount} patterns span segments, covering {r.sharedCases} of {r.eligible} eligible cases. The pattern excludes segment identity, allowing us to detect reusable structure.</li>
      <li><strong>Pooled learning: {r.finding.toLowerCase()}.</strong> On {r.scored} held-out cases, local Brier score is {fmt(r.local)} versus pooled {fmt(r.pooled)}. Lower is better. This directly tests whether sharing past grades improves prediction of future grades.</li>
      <li><strong>Generalization: {r.enough ? `${helped}/${adequate.length} adequately sampled segments benefit; ${harmed} worsen` : "too few evaluated cases"}.</strong> Segments with fewer than five scored cases remain unresolved. Negative transfer is shown rather than averaged away.</li>
    </ol>
    <div className="tableScroll"><table className="dataTable">
      <thead><tr><th>Segment</th><th>Test cases</th><th>Local Brier</th><th>Pooled Brier</th><th>Other segments only</th><th>Local − pooled</th></tr></thead>
      <tbody>{r.bySegment.map(item => <tr key={item.segment}><td>{item.segment}</td><td>{item.count}</td><td>{fmt(item.local)}</td><td>{fmt(item.pooled)}</td><td>{fmt(item.others)}</td><td>{fmt(item.delta)}</td></tr>)}</tbody>
    </table></div>
    <p><strong>Implication:</strong> {r.enough && r.delta !== null && r.delta > 0.005 ? "Pooling is a promising input to grade-risk estimation. Test whether using those estimates to route or revise decisions improves outcomes." : r.enough && r.delta !== null && r.delta < -0.005 ? "Unconditional pooling is a poor default for this estimator. Test segment-specific weighting before assuming a network benefit." : "The current estimator has not found a clear pooling advantage. Test richer pre-decision features and segment-aware pooling."}</p>
    <details><summary>Experiment design and remaining test</summary><p>{r.method}</p><p>{r.scope}</p><p>{r.training} training cases; {r.heldOut} held-out candidates; {r.excluded} rows excluded for missing segment, case type, resolved grade, or valid timestamps. Reported differences are descriptive; no significance claim is made.</p></details>
  </section>;
}
