import type { ExperienceEnrichmentPlan } from "@/lib/experience-enrichment";

export function ExperienceEnrichmentPanel({ plan }: { plan: ExperienceEnrichmentPlan }) {
  return <div className="compoundingPolicyLab" id="experience-enrichment">
    <div className="card">
      <p className="small">EXPERIENCE ENRICHMENT · {plan.datasetName}</p>
      <h3>What would make this dataset answer more?</h3>
      <p>{plan.summary}</p>
      <p>{plan.caution}</p>
      <p className="small">This is a field-coverage assistant. It does not change your cases or infer missing facts.</p>
    </div>
    <div className="grid grid-3">{plan.priorities.map((item, index) => <div className="card compact" key={item.key}>
      <p className="small">PRIORITY {index + 1} · {item.present}/{plan.total} cases covered</p>
      <h4>{item.label}</h4><p>{item.why}</p><p><strong>Next action:</strong> {item.collect}</p>
      <p className="small">Unlocks: {item.families.map(family => family.replaceAll("_", " ").toLowerCase()).join(", ")}</p>
    </div>)}</div>
    <details><summary>Inspect field coverage and collection plan</summary><div className="tableScroll"><table className="dataTable">
      <thead><tr><th>Field group</th><th>Coverage</th><th>Source fields</th><th>Collection action</th></tr></thead>
      <tbody>{plan.checks.map(item => <tr key={item.key}><td>{item.label}</td><td>{item.present}/{plan.total} · {item.status}</td><td>{item.fields}</td><td>{item.collect}</td></tr>)}</tbody>
    </table></div></details>
    <details><summary>Use the enrichment template</summary>
      <p>{plan.schema.storage} {plan.schema.instruction}</p>
      <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{plan.template.notes}</pre>
      <a className="btn" href="#case-explorer">Open case ledger</a>
    </details>
    <div className="ctaRow">
      <a className="btn" download="experience-enrichment-plan.json" href={`data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(plan, null, 2))}`}>Download field plan and template</a>
    </div>
  </div>;
}
