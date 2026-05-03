type Row = {
  id: string;
  riskScore: number;
  riskBand: string;
  primaryDriver: string;
  expectedSavedRevenueCents: number;
  interventionCostCents: number;
  paybackRatio: number;
  account: { name: string; mrrCents: number };
};

function money(cents: number) {
  return `$${Math.round(cents / 100).toLocaleString()}`;
}

export function RetentionSimulationVisuals({ rows }: { rows: Row[] }) {
  const maxSave = Math.max(...rows.map((row) => row.expectedSavedRevenueCents), 1);
  const driverTotals = rows.reduce<Record<string, { count: number; save: number }>>((acc, row) => {
    acc[row.primaryDriver] ??= { count: 0, save: 0 };
    acc[row.primaryDriver].count += 1;
    acc[row.primaryDriver].save += row.expectedSavedRevenueCents;
    return acc;
  }, {});
  const drivers = Object.entries(driverTotals).sort((a, b) => b[1].save - a[1].save);

  return (
    <div className="retentionVizGrid">
      <div className="card retentionVizPanel">
        <h3>Risk x save value</h3>
        <div className="retentionBarStack">
          {rows.map((row) => (
            <div className="retentionBarRow" key={row.id}>
              <div>
                <strong>{row.account.name}</strong>
                <span>{row.riskBand} · {row.primaryDriver} · {Math.round(row.riskScore * 100)}%</span>
              </div>
              <div className="retentionBarTrack" aria-label={`${row.account.name} expected save ${money(row.expectedSavedRevenueCents)}`}>
                <i style={{ width: `${Math.max(6, (row.expectedSavedRevenueCents / maxSave) * 100)}%` }} />
              </div>
              <em>{money(row.expectedSavedRevenueCents)}</em>
            </div>
          ))}
        </div>
      </div>
      <div className="card retentionVizPanel">
        <h3>Driver mix</h3>
        <div className="retentionDriverList">
          {drivers.map(([driver, value]) => (
            <div className="retentionDriverItem" key={driver}>
              <span>{driver}</span>
              <strong>{value.count} acct</strong>
              <em>{money(value.save)}</em>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
