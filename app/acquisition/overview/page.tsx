import { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { Section } from "@/components/site/Section";
import { AcquisitionFlowDiagram } from "@/components/acquisition/AcquisitionFlowDiagram";
import { OperatorDecisionCanvas } from "@/components/site/OperatorDecisionCanvas";

export const metadata: Metadata = buildMetadata({
  title: "Acquisition App Overview | David Wolfe",
  description: "Agent-managed acquisition architecture with budget guardrails, orchestration, and operator controls.",
  path: "/acquisition/overview"
});

const architecture = [
  {
    title: "Campaign manager",
    detail: "Stores campaign objective, constraints, channels, and state transitions (draft → testing → scaling)."
  },
  {
    title: "Creative generation",
    detail: "Produces headline/description variants and predictive quality signals for faster test-cell construction."
  },
  {
    title: "Audience + keyword selector",
    detail: "Builds target pools, exclusions, and testable combinations for channel-specific execution."
  },
  {
    title: "Agent orchestrator",
    detail: "Runs iteration loops: score cells, pause weak performers, shift budget, and request new variants."
  },
  {
    title: "Performance analytics",
    detail: "Aggregates spend, conversions, CAC, and ROAS to inform budget decisions and operator review."
  },
  {
    title: "Audit + controls",
    detail: "Logs budget actions and decision context so humans can override and tune safely."
  }
];

const flow = [
  "1) Define campaign objective, budget, channels, and economic constraints.",
  "2) Generate creatives and audience/keyword candidates.",
  "3) Assemble test cells and allocate initial spend.",
  "4) Ingest performance and compute score quality.",
  "5) Reallocate budget toward winners while enforcing guardrails.",
  "6) Promote winning cells to scaling and continue monitoring."
];

export default function AcquisitionOverviewPage() {
  return (
    <>
      <Section title="Agent-managed paid acquisition system">
        <p>
          This workspace demonstrates a paid-growth operating loop where experiments, economics checks, and budget movement are explicitly linked for operator review.
        </p>
        <div className="grid grid-3" style={{ marginTop: 12 }}>
          <div className="card"><div className="kpi">24h</div><p>Iteration cadence target for budget and creative updates.</p></div>
          <div className="card"><div className="kpi">&lt; 1.0</div><p>Target CAC/LTV ratio threshold for sustained scaling.</p></div>
          <div className="card"><div className="kpi">100%</div><p>Budget-shift actions recorded for operator auditability.</p></div>
        </div>
      </Section>

      <Section title="Architecture infographic">
        <AcquisitionFlowDiagram />
      </Section>

      <Section title="Architecture modules">
        <div className="grid grid-2">
          {architecture.map((item) => (
            <div className="card" key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.detail}</p>
            </div>
          ))}
        </div>
      </Section>


      <Section title="Operator decision canvas">
        <p className="small">A shared frame for how inputs become governed actions and measurable learning.</p>
        <OperatorDecisionCanvas />
      </Section>

      <Section title="Operating sequence">
        <div className="grid grid-2">
          {flow.map((step) => (
            <div className="card" key={step}>
              <p>{step}</p>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
