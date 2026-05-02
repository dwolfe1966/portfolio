/**
 * Tiny inline bar-chart for trend arrays. Pure server component — renders
 * a horizontal sequence of vertically-scaled divs whose heights reflect
 * each value relative to the array max. No JS required at runtime.
 */
export function HealthTrendBars({
  values,
  label,
  format = (v) => v.toFixed(2),
  band = "neutral",
  max
}: {
  values: number[];
  label: string;
  format?: (v: number) => string;
  band?: "healthy" | "watch" | "unhealthy" | "neutral";
  max?: number;
}) {
  if (values.length === 0) {
    return (
      <div>
        <p className="small">{label}</p>
        <p className="small">No data yet.</p>
      </div>
    );
  }

  const peak = max ?? Math.max(...values, 0.0001);
  const latest = values[values.length - 1];

  return (
    <div>
      <p className="small">{label}</p>
      <div className={`kpi bandText--${band}`}>{format(latest)}</div>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 2,
          height: 36,
          marginTop: 4
        }}
        aria-label={`${label} trend, ${values.length} runs`}
      >
        {values.map((value, idx) => {
          const heightPct = Math.max(2, Math.round((value / peak) * 100));
          return (
            <div
              key={idx}
              title={format(value)}
              style={{
                width: 6,
                height: `${heightPct}%`,
                background: "var(--demo-accent, #1e6ddc)",
                opacity: idx === values.length - 1 ? 1 : 0.55,
                borderRadius: 1
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
