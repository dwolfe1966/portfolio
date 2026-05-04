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
          <div className="card caseStudyCard caseStudyMetricCard" key={item.label}>
            <p className="small caseStudyLabel">{item.label}</p>
            <div className="kpi caseStudyKpi">{item.value}</div>
            <p className="caseStudyBody">{item.note}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-3" style={{ marginTop: 18 }}>
        {artifacts.decisionFrame.map((item, index) => (
          <div className="card caseStudyCard" key={item.label}>
            <p className="small caseStudyLabel">Decision frame {index + 1}</p>
            <h3 className="caseStudyCardTitle">{item.label}</h3>
            <p className="caseStudyBody">{item.detail}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-2" style={{ marginTop: 18 }}>
        <div className="card caseStudyCard">
          <h3 className="caseStudyCardTitle">Evidence links</h3>
          <div className="grid" style={{ gap: 10 }}>
            {artifacts.evidenceLinks.map((item) => (
              <div key={item.label}>
                <Link className="btn" href={item.href}>{item.label}</Link>
                <p className="small caseStudyBodySmall" style={{ marginTop: 6 }}>{item.detail}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="card caseStudyCard">
          <h3 className="caseStudyCardTitle">Guardrails</h3>
          <div className="grid" style={{ gap: 10 }}>
            {artifacts.guardrails.map((item) => (
              <div key={item.label} className="guardrailRow">
                <strong>{item.label}</strong>
                <p className="small caseStudyBodySmall">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
