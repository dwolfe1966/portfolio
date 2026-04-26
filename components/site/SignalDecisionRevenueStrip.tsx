const stages = [
  {
    title: "Signal intake",
    detail: "Capture market, behavioral, and entity-change signals with confidence scoring."
  },
  {
    title: "Decisioning",
    detail: "Prioritize opportunities using economics, recency, and fit constraints."
  },
  {
    title: "Execution",
    detail: "Launch channel actions with transparent policy checks and audit context."
  },
  {
    title: "Revenue learning",
    detail: "Measure outcome quality and feed results back into the next operating cycle."
  }
];

export function SignalDecisionRevenueStrip() {
  return (
    <div className="grid grid-4" style={{ marginTop: 10 }}>
      {stages.map((stage, index) => (
        <div className="card" key={stage.title}>
          <p className="small">Phase {index + 1}</p>
          <h3>{stage.title}</h3>
          <p>{stage.detail}</p>
        </div>
      ))}
    </div>
  );
}
