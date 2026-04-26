const flow = [
  "Campaign Setup",
  "Creative Generation",
  "Audience Selection",
  "Test Cells",
  "Agent Orchestrator",
  "Ad Platforms",
  "Performance Analytics"
];

export function AcquisitionFlowDiagram() {
  return (
    <div className="card">
      <h3>Acquisition flow diagram</h3>
      <p className="small">High-level architecture for agent-managed paid acquisition.</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        {flow.map((step, index) => (
          <div key={step} style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div className="card" style={{ padding: "8px 12px" }}>{step}</div>
            {index < flow.length - 1 ? <span aria-hidden>→</span> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
