const capabilities = [
  { label: "Product", score: 92 },
  { label: "Growth", score: 95 },
  { label: "Data/AI", score: 90 },
  { label: "Execution", score: 96 }
];

export function OperatorProfileInfographic() {
  return (
    <div className="card">
      <h3>Operator capability profile</h3>
      <p className="small">Relative strengths across strategy, product, growth, and execution.</p>
      <div className="grid" style={{ gap: 10 }}>
        {capabilities.map((item) => (
          <div key={item.label}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span className="small">{item.label}</span>
              <span className="small">{item.score}</span>
            </div>
            <div style={{ width: "100%", background: "#e5e7eb", borderRadius: 999, height: 10 }}>
              <div style={{ width: `${item.score}%`, background: "#111827", borderRadius: 999, height: "100%" }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
