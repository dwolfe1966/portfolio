type DemoSystemGraphProps = {
  title: string;
  nodes: string[];
  accent?: string;
};

export function DemoSystemGraph({ title, nodes, accent }: DemoSystemGraphProps) {
  return (
    <div className="demoSystemGraph" style={accent ? { "--graph-accent": accent } as CSSProperties : undefined}>
      <div className="demoSystemGraphHeader">
        <span>Live system map</span>
        <strong>{title}</strong>
      </div>
      <div className="demoSystemGraphRail" aria-hidden="true">
        {nodes.map((node, index) => (
          <div className="demoSystemGraphNodeWrap" key={node}>
            <div className="demoSystemGraphNode">
              <i>{String(index + 1).padStart(2, "0")}</i>
              <span>{node}</span>
            </div>
            {index < nodes.length - 1 ? <div className="demoSystemGraphEdge"><b /></div> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
import type { CSSProperties } from "react";
