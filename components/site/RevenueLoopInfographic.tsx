export function RevenueLoopInfographic() {
  const steps = [
    "Signal detection",
    "Scoring & prioritization",
    "AI generation",
    "Operator review",
    "Revenue outcomes"
  ];

  return (
    <div className="card">
      <h3>Revenue system loop</h3>
      <p className="small">How strategy turns into measurable commercial outcomes.</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }} role="img" aria-label="Revenue system loop from signal detection to revenue outcomes">
        {steps.map((step, index) => (
          <div key={step} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="card" style={{ padding: "8px 12px" }}>{step}</div>
            {index < steps.length - 1 ? <span aria-hidden>→</span> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
