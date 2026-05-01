import { DEMO_ASSUMPTION_DEFAULTS, normalizeDemoAssumptions } from "@/lib/demo-assumptions";

type LifecycleMessageMetricsStripProps = {
  assumptions?: Partial<{
    openRate: number;
    clickRate: number;
    engageRate: number;
    purchaseRate: number;
    avgOrderValue: number;
  }> | null;
  title?: string;
  caption?: string;
};

function toPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

export function LifecycleMessageMetricsStrip({
  assumptions,
  title = "Message response metrics",
  caption = "Core funnel assumptions used by explanation, simulation, campaign, and output workflows."
}: LifecycleMessageMetricsStripProps) {
  const metrics = normalizeDemoAssumptions({
    ...DEMO_ASSUMPTION_DEFAULTS,
    ...(assumptions ?? {})
  });

  return (
    <div className="card">
      <h3 style={{ marginBottom: 8 }}>{title}</h3>
      <p className="small" style={{ marginBottom: 12 }}>{caption}</p>
      <div className="grid grid-3">
        <div className="card"><p className="small">Open rate</p><div className="kpi">{toPercent(metrics.openRate)}</div></div>
        <div className="card"><p className="small">Click rate</p><div className="kpi">{toPercent(metrics.clickRate)}</div></div>
        <div className="card"><p className="small">Engagement rate</p><div className="kpi">{toPercent(metrics.engageRate)}</div></div>
        <div className="card"><p className="small">Conversion rate</p><div className="kpi">{toPercent(metrics.purchaseRate)}</div></div>
        <div className="card"><p className="small">AOV</p><div className="kpi">${metrics.avgOrderValue.toFixed(0)}</div></div>
      </div>
    </div>
  );
}
