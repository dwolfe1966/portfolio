const lanes = [
  {
    title: "Inputs",
    bullets: ["Market/entity signal stream", "User or audience intent graph", "Budget + policy constraints"]
  },
  {
    title: "Decisions",
    bullets: ["Priority scoring and ranking", "Intervention/playbook selection", "Budget and channel allocation"]
  },
  {
    title: "Actions",
    bullets: ["Message/creative generation", "Campaign launch + pacing", "Override and approval checkpoints"]
  },
  {
    title: "Learning",
    bullets: ["Outcome and efficiency metrics", "Counterfactual comparison", "Next-iteration policy updates"]
  }
];

export function OperatorDecisionCanvas() {
  return (
    <div className="grid grid-2" style={{ marginTop: 10 }}>
      {lanes.map((lane) => (
        <div className="card" key={lane.title}>
          <h3>{lane.title}</h3>
          <ul>
            {lane.bullets.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
