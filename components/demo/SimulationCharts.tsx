"use client";

type Counts = {
  delivered: number;
  opens: number;
  clicks: number;
  engagements: number;
  purchases: number;
};

export function SimulationCharts({ counts, monteCarlo }: { counts: Counts; monteCarlo: number[] }) {
  const stages = [
    { label: "Delivered", value: counts.delivered },
    { label: "Opened", value: counts.opens },
    { label: "Clicked", value: counts.clicks },
    { label: "Engaged", value: counts.engagements },
    { label: "Purchased", value: counts.purchases }
  ];

  const maxStage = Math.max(...stages.map((s) => s.value), 1);

  const min = Math.min(...monteCarlo, 0);
  const max = Math.max(...monteCarlo, 1);
  const bucketCount = 8;
  const buckets = new Array(bucketCount).fill(0);
  const span = Math.max(max - min, 1);

  monteCarlo.forEach((value) => {
    const idx = Math.min(bucketCount - 1, Math.floor(((value - min) / span) * bucketCount));
    buckets[idx] += 1;
  });

  const maxBucket = Math.max(...buckets, 1);

  return (
    <div className="grid grid-2">
      <div className="card">
        <h3>Conversion funnel</h3>
        <p className="small">Counts update as assumptions change.</p>
        <div className="chartColumns">
          {stages.map((stage) => (
            <div key={stage.label} className="chartBarWrap">
              <div className="chartBar" style={{ height: `${(stage.value / maxStage) * 140}px` }} />
              <p className="small" style={{ marginTop: 8 }}>{stage.label}</p>
              <p className="small">{stage.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3>Revenue distribution (Monte Carlo)</h3>
        <p className="small">50 runs with random variation around assumptions.</p>
        <div className="chartColumns">
          {buckets.map((bucket, index) => (
            <div key={index} className="chartBarWrap">
              <div className="chartBar secondary" style={{ height: `${(bucket / maxBucket) * 140}px` }} />
              <p className="small">B{index + 1}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
