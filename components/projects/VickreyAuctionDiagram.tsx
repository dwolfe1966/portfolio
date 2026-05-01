export function VickreyAuctionDiagram() {
  return (
    <div className="card">
      <h3>Vickrey (2nd-price) clearing flow</h3>
      <div className="grid grid-3" style={{ marginTop: 10 }}>
        <div className="card">
          <p className="small">Step 1</p>
          <h4>Quality-adjusted bid</h4>
          <p><code>score = bid × quality</code></p>
        </div>
        <div className="card">
          <p className="small">Step 2</p>
          <h4>Winner selected</h4>
          <p>Highest adjusted score wins the placement.</p>
        </div>
        <div className="card">
          <p className="small">Step 3</p>
          <h4>2nd-price paid</h4>
          <p><code>price = next_best_score / winner_quality + ε</code></p>
        </div>
      </div>
      <p style={{ marginTop: 10 }}>
        This preserves truthful bidding incentives while accounting for relevance/quality constraints in a closed marketplace.
      </p>
    </div>
  );
}
