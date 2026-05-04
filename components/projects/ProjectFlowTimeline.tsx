type ProjectFlowTimelineProps = {
  steps: Array<{ title: string; detail: string }>;
};

export function ProjectFlowTimeline({ steps }: ProjectFlowTimelineProps) {
  return (
    <div className="grid" style={{ gap: 10 }}>
      {steps.map((step, index) => (
        <div className="card caseStudyCard" key={step.title}>
          <p className="small caseStudyLabel">Step {index + 1}</p>
          <h3 className="caseStudyCardTitle">{step.title.replace(/^\d+\.\s*/, "")}</h3>
          <p className="caseStudyBody">{step.detail}</p>
        </div>
      ))}
    </div>
  );
}
