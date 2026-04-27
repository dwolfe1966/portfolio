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

type Position = { x: number; y: number };

const clusterPos: Record<GraphClusterId, Position> = {
  discovery: { x: 90, y: 88 },
  intent: { x: 250, y: 56 },
  conversion: { x: 410, y: 88 }
};

export function GraphInfluencePaths({ users, entities, edges, events }: GraphInfluencePathsProps) {
  const avgNeighbors = users > 0 ? (edges / users).toFixed(1) : "0.0";
  const eventPressure = entities > 0 ? (events / entities).toFixed(2) : "0.00";
  const { hasData, clusters, links } = buildGraphInfluenceModel({ users, entities, edges, events });
  const strongestPath = getStrongestInfluencePath(links);
  const rankedPaths = rankInfluencePaths(links);

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
        <svg
          viewBox="0 0 500 180"
          role="img"
          aria-label="Influence cluster map"
          style={{ width: "100%", height: "auto", overflow: "visible" }}
        >
          <title>Lifecycle influence cluster map</title>
          {links.map((link) => {
            const from = clusterPos[link.from];
            const to = clusterPos[link.to];
            const ctrlY = Math.min(from.y, to.y) - 28;

            return (
              <g key={`${link.from}-${link.to}`}>
                <path
                  d={`M ${from.x} ${from.y} Q ${(from.x + to.x) / 2} ${ctrlY}, ${to.x} ${to.y}`}
                  fill="none"
                  stroke="currentColor"
                  strokeOpacity={0.35}
                  strokeWidth={Math.min(8, 1.5 + link.weight)}
                />
                <text
                  x={(from.x + to.x) / 2}
                  y={ctrlY - 4}
                  textAnchor="middle"
                  fontSize="11"
                  fill="currentColor"
                >
                  w{link.weight}
                </text>
              </g>
            );
          })}

          {clusters.map((cluster) => {
            const pos = clusterPos[cluster.id];
            const radius = cluster.nodeCount > 0
              ? 14 + Math.min(18, Math.round(cluster.nodeCount / 2))
              : 12;

            return (
              <g key={cluster.id}>
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={radius}
                  fill="currentColor"
                  fillOpacity={cluster.influence > 0 ? 0.1 + cluster.influence / 250 : 0.08}
                  stroke="currentColor"
                />
                <text x={pos.x} y={pos.y - 2} textAnchor="middle" fontSize="11" fill="currentColor">
                  {CLUSTER_LABELS[cluster.id]}
                </text>
                <text x={pos.x} y={pos.y + 14} textAnchor="middle" fontSize="10" fill="currentColor">
                  {cluster.nodeCount} nodes
                </text>
              </g>
            );
          })}
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
