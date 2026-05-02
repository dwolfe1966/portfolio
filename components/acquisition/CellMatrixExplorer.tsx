import { computeCellSignificance, type SignificanceHint } from "@/lib/acquisition";

type Cell = {
  id: string;
  creativeId: string;
  audienceId: string;
  clicks: number;
  conversions: number;
  spendCents: number;
  cacCents: number;
  roas: number;
  score: number;
};

type Creative = { id: string; headline: string; channel: string };
type Audience = { id: string; name: string; audienceType: string };

const HINT_LABEL: Record<SignificanceHint, string> = {
  significant_high: "Significant↑",
  trending_high: "Trending↑",
  neutral: "Neutral",
  trending_low: "Trending↓",
  significant_low: "Significant↓",
  insufficient: "Need data"
};

const HINT_COLOR: Record<SignificanceHint, string> = {
  significant_high: "#0f6b3b",
  trending_high: "#3a7a3a",
  neutral: "#555",
  trending_low: "#a05a00",
  significant_low: "#a02020",
  insufficient: "#888"
};

export function CellMatrixExplorer({
  creatives,
  audiences,
  cells
}: {
  creatives: Creative[];
  audiences: Audience[];
  cells: Cell[];
}) {
  const totalClicks = cells.reduce((sum, cell) => sum + cell.clicks, 0);
  const totalConversions = cells.reduce((sum, cell) => sum + cell.conversions, 0);
  const meanRate = totalClicks > 0 ? totalConversions / totalClicks : 0;

  const cellByKey = new Map(cells.map((cell) => [`${cell.creativeId}::${cell.audienceId}`, cell]));

  if (creatives.length === 0 || audiences.length === 0) {
    return (
      <div className="card">
        <p>No creatives or audiences available yet — generate test cells via campaign creation first.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <p className="small">
        Each cell pairs one creative with one audience. Conversion rate is compared against the
        campaign-wide mean ({(meanRate * 100).toFixed(2)}%) using a one-sample z-test on cell clicks
        ({totalClicks.toLocaleString()} total). Cells with fewer than 30 clicks need more data
        before a hint is meaningful.
      </p>

      <div style={{ overflowX: "auto", marginTop: 12 }}>
        <table className="table">
          <thead>
            <tr>
              <th>Creative \\ Audience</th>
              {audiences.map((aud) => (
                <th key={aud.id} title={aud.audienceType}>{aud.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {creatives.map((creative) => (
              <tr key={creative.id}>
                <th style={{ textAlign: "left" }}>
                  <div>{creative.headline.slice(0, 48)}</div>
                  <div className="small">{creative.channel}</div>
                </th>
                {audiences.map((aud) => {
                  const cell = cellByKey.get(`${creative.id}::${aud.id}`);
                  if (!cell) {
                    return <td key={aud.id} className="small" style={{ color: "#aaa" }}>—</td>;
                  }
                  const sig = computeCellSignificance({
                    cellConversions: cell.conversions,
                    cellClicks: cell.clicks,
                    campaignMeanConversionRate: meanRate
                  });
                  const cellRate = cell.clicks > 0 ? (cell.conversions / cell.clicks) * 100 : 0;
                  return (
                    <td key={aud.id}>
                      <div>
                        <strong>{cellRate.toFixed(2)}%</strong> CR
                      </div>
                      <div className="small">
                        Score {cell.score.toFixed(2)} · CAC ${(cell.cacCents / 100).toFixed(0)} · ROAS {cell.roas.toFixed(2)}x
                      </div>
                      <div className="small" style={{ color: HINT_COLOR[sig.hint] }}>
                        {HINT_LABEL[sig.hint]}
                        {sig.hint !== "insufficient" && sig.hint !== "neutral"
                          ? ` (z=${sig.zScore.toFixed(2)}, n=${sig.sampleSize})`
                          : sig.hint === "insufficient"
                            ? ` (n=${sig.sampleSize})`
                            : ""}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
