export function LifecyclePipelineDiagram({
  deltas,
  candidates,
  messages,
  outcomes
}: {
  deltas: number;
  candidates: number;
  messages: number;
  outcomes: number;
}) {
  const boxes = [
    { label: "Entity Deltas", value: deltas },
    { label: "Campaign Candidates", value: candidates },
    { label: "Generated Messages", value: messages },
    { label: "Projected Outcomes", value: outcomes }
  ];

  return (
    <div className="card">
      <h3>Lifecycle pipeline diagram</h3>
      <p className="small">Signal flow from change detection to modeled commercial impact.</p>
      <div className="grid grid-4" role="img" aria-label="Pipeline from entity deltas to projected outcomes">
        {boxes.map((box) => (
          <div key={box.label} className="card" style={{ textAlign: "center", padding: 14 }}>
            <p className="small">{box.label}</p>
            <div className="kpi" style={{ marginBottom: 0 }}>{box.value}</div>
          </div>
        ))}
      </div>
      <p className="small" style={{ marginTop: 10 }}>
        Text alternative: Entity Deltas flow into Campaign Candidates, then Generated Messages, then Projected Outcomes.
      </p>
    </div>
  );
}
