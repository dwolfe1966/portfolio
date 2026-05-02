import Link from "next/link";
import type { ProjectEntry } from "@/lib/projects";

type CaseStudyArtifactsProps = {
  artifacts: ProjectEntry["artifacts"];
};

export function CaseStudyArtifacts({ artifacts }: CaseStudyArtifactsProps) {
  return (
    <div className="caseStudyArtifacts">
      <div className="grid grid-3">
        {artifacts.outcomeStrip.map((item) => (
          <div className="card" key={item.label}>
            <p className="small">{item.label}</p>
            <div className="kpi">{item.value}</div>
            <p>{item.note}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-3" style={{ marginTop: 18 }}>
        {artifacts.decisionFrame.map((item, index) => (
          <div className="card" key={item.label}>
            <p className="small">Decision frame {index + 1}</p>
            <h3>{item.label}</h3>
            <p>{item.detail}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-2" style={{ marginTop: 18 }}>
        <div className="card">
          <h3>Evidence links</h3>
          <div className="grid" style={{ gap: 10 }}>
            {artifacts.evidenceLinks.map((item) => (
              <div key={item.label}>
                <Link className="btn" href={item.href}>{item.label}</Link>
                <p className="small" style={{ marginTop: 6 }}>{item.detail}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3>Guardrails</h3>
          <div className="grid" style={{ gap: 10 }}>
            {artifacts.guardrails.map((item) => (
              <div key={item.label} className="guardrailRow">
                <strong>{item.label}</strong>
                <p className="small">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
