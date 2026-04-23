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
    </div>
  );
}
