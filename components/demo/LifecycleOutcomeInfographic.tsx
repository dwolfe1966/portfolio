export function LifecycleOutcomeInfographic({
  deltas,
  candidates,
  messages
}: {
  deltas: number;
  candidates: number;
  messages: number;
}) {
  const conversionRate = deltas > 0 ? ((messages / deltas) * 100).toFixed(1) : "0.0";

  return (
    <div className="card">
      <h3>Lifecycle run infographic</h3>
      <div className="grid grid-3">
        <div className="card"><div className="kpi">{deltas}</div><p>Signals detected</p></div>
        <div className="card"><div className="kpi">{candidates}</div><p>Candidates scored</p></div>
        <div className="card"><div className="kpi">{messages}</div><p>Messages generated</p></div>
      </div>
      <p className="small" style={{ marginTop: 8 }}>Signal-to-message conversion: {conversionRate}%</p>
    </div>
  );
}
