import Link from "next/link";
import { LAB_WORKFLOW_STEPS, type CompoundingFramework, type Crossover, type EpistemicKind, type SimulationSeries } from "@/lib/compounding-expertise-lab";

export function LabWorkflowRail({ active }: { active: string }) {
  return (
    <div className="compoundingWorkflowRail" aria-label="Compounding Expertise Lab workflow">
      {LAB_WORKFLOW_STEPS.map((step) => (
        <Link className={active === step.label ? "active" : ""} href={step.href} key={step.href}>
          <span>{step.stage}</span>
          <strong>{step.label}</strong>
        </Link>
      ))}
    </div>
  );
}

export function ProvenanceBadge({ framework }: { framework: CompoundingFramework }) {
  return <span className={`provenanceBadge provenanceBadge-${framework.toLowerCase()}`}>{framework}</span>;
}

const EPISTEMIC_LABELS: Record<EpistemicKind, string> = {
  OBSERVED_DERIVED: "Observed / derived",
  SOURCED: "Sourced",
  ENDOGENOUS_ASSUMPTION: "Endogenous assumption",
  EXOGENOUS_ASSUMPTION: "Exogenous assumption",
  UNKNOWN: "Unknown"
};

export function EpistemicBadge({ kind }: { kind: EpistemicKind }) {
  return <span className={`epistemicBadge epistemicBadge-${kind.toLowerCase().replaceAll("_", "-")}`}>{EPISTEMIC_LABELS[kind]}</span>;
}

export function IntegrityNotice() {
  return (
    <div className="card compoundingIntegrityNotice">
      <strong>Structured assessment, not empirical measurement.</strong>
      <p>
        This Lab represents, measures, stress-tests, and can falsify the Compounding Expertise thesis.
        Scores are explicit judgments with evidence provenance, not validated moat measurements.
      </p>
    </div>
  );
}

export function SimulatorLineChart({
  series,
  crossover
}: {
  series: SimulationSeries[];
  crossover: Crossover | null;
}) {
  const width = 820;
  const height = 280;
  const padding = 34;
  const allPoints = series.flatMap((item) => item.points);
  const maxMonth = Math.max(...allPoints.map((point) => point.month), 1);
  const minExpertise = Math.min(...allPoints.map((point) => point.expertise), 0);
  const maxExpertise = Math.max(...allPoints.map((point) => point.expertise), 1);
  const span = Math.max(maxExpertise - minExpertise, 1);
  const colors = ["#38bdf8", "#fbbf24", "#34d399"];

  function x(month: number) {
    return padding + (month / maxMonth) * (width - padding * 2);
  }

  function y(expertise: number) {
    return height - padding - ((expertise - minExpertise) / span) * (height - padding * 2);
  }

  function path(points: SimulationSeries["points"]) {
    return points.map((point, index) => `${index === 0 ? "M" : "L"}${x(point.month).toFixed(1)},${y(point.expertise).toFixed(1)}`).join(" ");
  }

  return (
    <div className="card compoundingChartCard">
      <div className="compoundingChartHeader">
        <div>
          <h3>Effective expertise trajectory</h3>
          <p className="small">Toy-model output for comparison only; not a forecast.</p>
        </div>
        {crossover ? (
          <span className="compoundingCrossover">Approx. crossover: month {crossover.month}</span>
        ) : (
          <span className="compoundingCrossover">No crossover in horizon</span>
        )}
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Simulator line chart comparing effective expertise">
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(148,163,184,.55)" />
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="rgba(148,163,184,.55)" />
        {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
          const yy = padding + tick * (height - padding * 2);
          return <line key={tick} x1={padding} x2={width - padding} y1={yy} y2={yy} stroke="rgba(148,163,184,.16)" />;
        })}
        {series.map((item, index) => (
          <path
            key={item.scenario.name}
            d={path(item.points)}
            fill="none"
            stroke={colors[index % colors.length]}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        {crossover ? (
          <line
            x1={x(crossover.month)}
            x2={x(crossover.month)}
            y1={padding}
            y2={height - padding}
            stroke="rgba(251,191,36,.68)"
            strokeDasharray="5 5"
          />
        ) : null}
      </svg>
      <div className="compoundingLegend">
        {series.map((item, index) => (
          <span key={item.scenario.name}>
            <i style={{ background: colors[index % colors.length] }} />
            {item.scenario.name}
          </span>
        ))}
      </div>
    </div>
  );
}
