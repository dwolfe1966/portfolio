export function AcquisitionAssumptionsCard() {
  return (
    <div className="card">
      <h3>Model assumptions (editable in this prototype)</h3>
      <ul className="small" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8 }}>
        <li>Initial budget is evenly distributed across test cells.</li>
        <li>Scores combine CTR, conversion rate, CAC efficiency, and ROAS quality.</li>
        <li>Bottom 30% cells donate budget to top 30% each iteration.</li>
        <li>Maximum single reallocation is capped by maxBudgetShiftPct.</li>
        <li>Campaign state progresses from Testing to Scaling when score quality is sustained.</li>
      </ul>
    </div>
  );
}
