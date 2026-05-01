type DataFlowMapProps = {
  users: number;
  entities: number;
  edges: number;
  events: number;
  candidates: number;
  messages: number;
};

const arrow = "→";

export function DataFlowMap({ users, entities, edges, events, candidates, messages }: DataFlowMapProps) {
  const edgesPerUser = users > 0 ? (edges / users).toFixed(2) : "0.00";
  const edgesPerEntity = entities > 0 ? (edges / entities).toFixed(2) : "0.00";
  const candidateLiftFromEvents = events > 0 ? (candidates / events).toFixed(2) : "0.00";
  const messageLiftFromCandidates = candidates > 0 ? (messages / candidates).toFixed(2) : "0.00";
  const clusterEstimate = Math.max(1, Math.round(Math.sqrt(Math.max(edges, 1)) / 2));

  return (
    <div className="card">
      <h3>Pipeline map</h3>
      <p style={{ marginBottom: 14 }}>
        Users and entities form relationship edges, events trigger scoring, then campaigns and messages are generated.
      </p>

      <div className="grid grid-3">
        <div className="card">
          <h3>Users</h3>
          <div className="kpi">{users}</div>
        </div>
        <div className="card">
          <h3>Entities</h3>
          <div className="kpi">{entities}</div>
        </div>
        <div className="card">
          <h3>Relationships</h3>
          <div className="kpi">{edges}</div>
        </div>
      </div>

      <div style={{ marginTop: 14, fontWeight: 600 }}>
        Users + Entities {arrow} Interest Edges {arrow} Events {arrow} Candidates {arrow} Messages
      </div>

      <div className="grid grid-3" style={{ marginTop: 10 }}>
        <div className="card">
          <h3>Events</h3>
          <div className="kpi">{events}</div>
        </div>
        <div className="card">
          <h3>Candidates</h3>
          <div className="kpi">{candidates}</div>
        </div>
        <div className="card">
          <h3>Messages</h3>
          <div className="kpi">{messages}</div>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <h3>Graph complexity view</h3>
        <div className="grid grid-4" style={{ marginTop: 8 }}>
          <div className="card">
            <p className="small">Edges / user</p>
            <div className="kpi">{edgesPerUser}</div>
          </div>
          <div className="card">
            <p className="small">Edges / entity</p>
            <div className="kpi">{edgesPerEntity}</div>
          </div>
          <div className="card">
            <p className="small">Candidates / event</p>
            <div className="kpi">{candidateLiftFromEvents}</div>
          </div>
          <div className="card">
            <p className="small">Messages / candidate</p>
            <div className="kpi">{messageLiftFromCandidates}</div>
          </div>
        </div>
        <p className="small" style={{ marginTop: 8 }}>
          Estimated active relationship clusters: <strong>{clusterEstimate}</strong>. This is a proxy to guide future multi-hop and cluster-based graph exploration.
        </p>
      </div>
    </div>
  );
}
