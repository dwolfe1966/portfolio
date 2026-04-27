type GraphInfluencePathsProps = {
  users: number;
  entities: number;
  edges: number;
  events: number;
};

export function GraphInfluencePaths({ users, entities, edges, events }: GraphInfluencePathsProps) {
  const avgNeighbors = users > 0 ? (edges / users).toFixed(1) : "0.0";
  const eventPressure = entities > 0 ? (events / entities).toFixed(2) : "0.00";

  const paths = [
    `User intent cluster → watched entity → high-intent change event`,
    `High-degree entity → multiple user edges → campaign candidate burst`,
    `Recent event streak → candidate scoring lift → prioritized outreach queue`
  ];

  return (
    <div className="card" style={{ marginTop: 12 }}>
      <h3>Influence path explorer (beta)</h3>
      <p className="small">Early multi-hop view to complement the core topology map.</p>

      <div className="grid grid-3" style={{ marginTop: 8 }}>
        <div className="card">
          <p className="small">Avg neighbors / user</p>
          <div className="kpi">{avgNeighbors}</div>
        </div>
        <div className="card">
          <p className="small">Event pressure / entity</p>
          <div className="kpi">{eventPressure}</div>
        </div>
        <div className="card">
          <p className="small">Path templates</p>
          <div className="kpi">{paths.length}</div>
        </div>
      </div>

      <div className="grid" style={{ marginTop: 10 }}>
        {paths.map((path) => (
          <div className="card" key={path}>
            <p>{path}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
