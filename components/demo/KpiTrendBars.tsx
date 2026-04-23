type KpiTrendBarsProps = {
  deltas: number;
  candidates: number;
  generated: number;
};

type Metric = { label: string; value: number; color: string };

export function KpiTrendBars({ deltas, candidates, generated }: KpiTrendBarsProps) {
  const metrics: Metric[] = [
    { label: "Deltas", value: deltas, color: "#0ea5e9" },
    { label: "Candidates", value: candidates, color: "#6366f1" },
    { label: "Generated", value: generated, color: "#10b981" }
  ];
  const max = Math.max(...metrics.map((m) => m.value), 1);

  return (
    <div className="card">
      <h3>KPI Snapshot</h3>
      <p style={{ marginBottom: 12 }}>Quick visual of current funnel volume.</p>
      <div style={{ display: "grid", gap: 10 }}>
        {metrics.map((metric) => {
          const pct = Math.max(6, Math.round((metric.value / max) * 100));
          return (
            <div key={metric.label}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
              </div>
              <div style={{ height: 10, background: "#e5e7eb", borderRadius: 999 }}>
                <div
                  style={{
                    width: `${pct}%`,
                    height: "100%",
                    borderRadius: 999,
                    background: metric.color,
                    transition: "width 280ms ease"
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
