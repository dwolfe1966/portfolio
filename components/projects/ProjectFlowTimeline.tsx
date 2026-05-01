type ProjectFlowTimelineProps = {
  steps: Array<{ title: string; detail: string }>;
};

export function ProjectFlowTimeline({ steps }: ProjectFlowTimelineProps) {
  return (
    <div className="grid" style={{ gap: 10 }}>
      {steps.map((step, index) => (
        <div className="card" key={step.title}>
          <p className="small">Step {index + 1}</p>
          <h3>{step.title.replace(/^\d+\.\s*/, "")}</h3>
          <p>{step.detail}</p>
        </div>
      ))}
    </div>
  );
}
