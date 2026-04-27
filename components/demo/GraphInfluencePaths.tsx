import {
  buildGraphInfluenceModel,
  CLUSTER_LABELS,
  getStrongestInfluencePath,
  GraphClusterId,
  rankInfluencePaths
} from "@/lib/graph-influence";

type GraphInfluencePathsProps = {
  users: number;
  entities: number;
  edges: number;
  events: number;
};

export function GraphInfluencePaths({ users, entities, edges, events }: GraphInfluencePathsProps) {
  const avgNeighbors = users > 0 ? (edges / users).toFixed(1) : "0.0";
  const eventPressure = entities > 0 ? (events / entities).toFixed(2) : "0.00";
  const { hasData, clusters, links } = buildGraphInfluenceModel({ users, entities, edges, events });
  const strongestPath = getStrongestInfluencePath(links);
  const rankedPaths = rankInfluencePaths(links);

  const clusterX: Record<GraphClusterId, number> = {
    discovery: 90,
    intent: 250,
    conversion: 410
  };

  return (
    <div className="card" style={{ marginTop: 12 }}>
      <h3>Influence path explorer (beta)</h3>
      <p className="small">Multi-hop relationship view with lightweight cluster and path-strength signals.</p>
      {!hasData && <p className="small">No graph activity yet. Run simulation steps to populate influence paths.</p>}

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
          <div className="kpi">{rankedPaths.length}</div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <p className="small" style={{ marginBottom: 8 }}>Cluster influence map</p>
        <svg viewBox="0 0 500 170" role="img" aria-label="Influence cluster map" style={{ width: "100%", height: "auto" }}>
          <title>Lifecycle influence cluster map</title>
          {links.map((link) => {
            const fromX = clusterX[link.from];
            const toX = clusterX[link.to];

            return (
              <g key={`${link.from}-${link.to}`}>
                <line
                  x1={fromX}
                  y1={85}
                  x2={toX}
                  y2={85}
                  stroke="currentColor"
                  strokeOpacity={0.45}
                  strokeWidth={Math.min(10, 2 + link.weight)}
                  strokeDasharray="4 4"
                />
                <text x={(fromX + toX) / 2} y={70} textAnchor="middle" fontSize="11" fill="currentColor">
                  w{link.weight}
                </text>
              </g>
            );
          })}

          {clusters.map((cluster) => (
            <g key={cluster.id}>
              <circle
                cx={clusterX[cluster.id]}
                cy={85}
                r={22 + Math.min(22, Math.round(cluster.nodeCount / 2))}
                fill="currentColor"
                fillOpacity={0.1 + cluster.influence / 200}
                stroke="currentColor"
              />
              <text x={clusterX[cluster.id]} y={82} textAnchor="middle" fontSize="11" fill="currentColor">
                {cluster.label.split(" ")[0]}
              </text>
              <text x={clusterX[cluster.id]} y={98} textAnchor="middle" fontSize="10" fill="currentColor">
                {cluster.nodeCount} nodes
              </text>
            </g>
          ))}
        </svg>
      </div>


      <div className="card" style={{ marginTop: 12 }}>
        <p className="small" style={{ marginBottom: 8 }}>Strongest current path</p>
        <p style={{ margin: 0 }}>{strongestPath}</p>
        <div className="grid grid-3" style={{ marginTop: 10 }}>
          {clusters.map((cluster) => (
            <div className="card" key={`${cluster.id}-stats`}>
              <p className="small">{CLUSTER_LABELS[cluster.id]}</p>
              <p className="small" style={{ margin: 0 }}>Nodes: {cluster.nodeCount}</p>
              <p className="small" style={{ margin: 0 }}>Influence: {cluster.influence}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="grid" style={{ marginTop: 10 }}>
        {rankedPaths.length > 0 ? (
          rankedPaths.map((path) => (
            <div className="card" key={path.label}>
              <p style={{ marginBottom: 6 }}>{path.label}</p>
              <p className="small" style={{ margin: 0 }}>Path strength: w{path.weight}</p>
            </div>
          ))
        ) : (
          <div className="card">
            <p className="small" style={{ margin: 0 }}>Influence path ranking will appear after first simulation run.</p>
          </div>
        )}
      </div>
    </div>
  );
}
