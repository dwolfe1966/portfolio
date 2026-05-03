type SegmentResult = {
  id: string;
  sampleSize: number;
  conversionRate: number;
  churnRate: number;
  arpuCents: number;
  grossMarginPercent: number;
  netRevenueLiftCents: number;
  guardrailBand: string;
  segment: { name: string };
  variant: { name: string };
};

type Run = {
  arpuLiftPercent: number;
  conversionDeltaPercent: number;
  churnDeltaPercent: number;
  grossMarginPercent: number;
  netRevenueLiftCents: number;
  supportLoadDelta: number;
  confidence: number;
  segmentResults: SegmentResult[];
};

function money(cents: number) {
  return `$${Math.round(cents / 100).toLocaleString()}`;
}

function percent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function barWidth(value: number, max: number) {
  return `${Math.max(6, Math.min(100, (Math.abs(value) / max) * 100))}%`;
}

export function PricingSimulationVisuals({ run }: { run: Run }) {
  const maxLift = Math.max(...run.segmentResults.map((row) => Math.abs(row.netRevenueLiftCents)), 1);
  const guardrails = [
    { label: "Confidence", value: `${Math.round(run.confidence * 100)}%`, width: run.confidence * 100 },
    { label: "Gross margin", value: percent(run.grossMarginPercent), width: run.grossMarginPercent * 100 },
    { label: "ARPU lift", value: percent(run.arpuLiftPercent), width: Math.min(100, Math.abs(run.arpuLiftPercent) * 8) },
    { label: "Churn delta", value: percent(run.churnDeltaPercent), width: Math.min(100, Math.abs(run.churnDeltaPercent) * 18) },
    { label: "Support load", value: percent(run.supportLoadDelta), width: Math.min(100, Math.abs(run.supportLoadDelta) * 18) }
  ];

  return (
    <div className="pricingVizGrid">
      <div className="card pricingVizPanel">
        <h3>Guardrail response</h3>
        <div className="pricingGuardrailStack">
          {guardrails.map((guardrail) => (
            <div className="pricingGuardrailRow" key={guardrail.label}>
              <span>{guardrail.label}</span>
              <div className="pricingGuardrailTrack" aria-label={`${guardrail.label} ${guardrail.value}`}>
                <i style={{ width: `${Math.max(6, guardrail.width)}%` }} />
              </div>
              <strong>{guardrail.value}</strong>
            </div>
          ))}
        </div>
      </div>
      <div className="card pricingVizPanel">
        <h3>Segment lift map</h3>
        <div className="pricingSegmentLift">
          {run.segmentResults.map((row) => (
            <div className="pricingSegmentLiftRow" key={row.id}>
              <div>
                <strong>{row.segment.name}</strong>
                <span>{row.variant.name} · n={row.sampleSize.toLocaleString()}</span>
              </div>
              <div className="pricingSegmentLiftTrack" aria-label={`${row.segment.name} lift ${money(row.netRevenueLiftCents)}`}>
                <i className={row.netRevenueLiftCents < 0 ? "negative" : undefined} style={{ width: barWidth(row.netRevenueLiftCents, maxLift) }} />
              </div>
              <em>{money(row.netRevenueLiftCents)} · {row.guardrailBand}</em>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
