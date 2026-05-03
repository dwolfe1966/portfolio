type Row = {
  id: string;
  readinessScore: number;
  readinessBand: string;
  primaryMotion: string;
  expectedExpansionArrCents: number;
  paybackRatio: number;
  decision: string;
  account: { name: string; segment: string; currentArrCents: number };
  offer: { name: string } | null;
};

function money(cents: number) {
  return `$${Math.round(cents / 100).toLocaleString()}`;
}

const lanes = [
  { key: "pursue", title: "Pursue now" },
  { key: "nurture", title: "Sequence next" },
  { key: "defer", title: "Defer" }
];

export function ExpansionPipelineBoard({ rows }: { rows: Row[] }) {
  return (
    <div className="expansionBoard">
      {lanes.map((lane) => {
        const laneRows = rows.filter((row) => row.decision === lane.key);
        const laneArr = laneRows.reduce((sum, row) => sum + row.expectedExpansionArrCents, 0);
        return (
          <div className="expansionLane" key={lane.key}>
            <div className="expansionLaneHead">
              <span>{lane.title}</span>
              <strong>{money(laneArr)}</strong>
            </div>
            <div className="expansionLaneStack">
              {laneRows.map((row) => (
                <div className="expansionOpportunity" key={row.id}>
                  <p className="eyebrow">{row.account.segment} · {Math.round(row.readinessScore * 100)}%</p>
                  <h3>{row.account.name}</h3>
                  <p className="small">{row.primaryMotion} · {row.offer?.name ?? "No offer"}</p>
                  <div className="expansionOpportunityMetrics">
                    <span>{money(row.expectedExpansionArrCents)}</span>
                    <span>{row.paybackRatio.toFixed(1)}x</span>
                  </div>
                </div>
              ))}
              {laneRows.length === 0 ? <p className="small">No accounts in this lane.</p> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
