import type { CSSProperties } from "react";
import type { DemoApp } from "./DemoSideNav";

const copy: Record<DemoApp, { title: string; labels: string[] }> = {
  lifecycle: {
    title: "Signal stream",
    labels: ["Delta", "Graph", "Score", "Copy"]
  },
  acquisition: {
    title: "Budget optimizer",
    labels: ["Creative", "Audience", "Spend", "Winner"]
  },
  auction: {
    title: "Bid clearing",
    labels: ["Bid A", "Bid B", "Rank", "Clear"]
  },
  pricing: {
    title: "Cohort guardrails",
    labels: ["Control", "Treatment", "Margin", "Decision"]
  },
  retention: {
    title: "Risk intervention loop",
    labels: ["Usage", "Support", "Risk", "Save"]
  },
  expansion: {
    title: "Expansion lane flow",
    labels: ["Base", "Whitespace", "Lane", "ARR"]
  }
};

export function DemoAppMotionVisual({ app }: { app: DemoApp }) {
  const item = copy[app];
  return (
    <div className={`demoMotionVisual demoMotionVisual-${app}`}>
      <div className="demoMotionHeader">
        <span>Animated operating model</span>
        <strong>{item.title}</strong>
      </div>
      <div className="demoMotionStage" aria-label={`${item.title} animation`}>
        <div className="demoMotionGrid" aria-hidden>
          {Array.from({ length: 24 }).map((_, index) => <i key={index} />)}
        </div>
        <div className="demoMotionNodes">
          {item.labels.map((label, index) => (
            <div className="demoMotionNode" key={label} style={{ "--node-index": index } as CSSProperties}>
              <b>{label}</b>
              <span />
            </div>
          ))}
        </div>
        <div className="demoMotionTrace" aria-hidden>
          <i />
          <i />
          <i />
        </div>
      </div>
    </div>
  );
}
