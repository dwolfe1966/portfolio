import { DEMO_ASSUMPTION_DEFAULTS, normalizeDemoAssumptions } from "@/lib/demo-assumptions";

type FunnelAssumptions = Partial<{
  openRate: number;
  clickRate: number;
  engageRate: number;
  purchaseRate: number;
  avgOrderValue: number;
}>;

type LifecycleFunnelKpiStripProps = {
  users: number;
  entities: number;
  interestEdges: number;
  entityChangeEvents: number;
  candidates: number;
  sentMessages: number;
  assumptions?: FunnelAssumptions | null;
};

export function LifecycleFunnelKpiStrip({
  users,
  entities,
  interestEdges,
  entityChangeEvents,
  candidates,
  sentMessages,
  assumptions
}: LifecycleFunnelKpiStripProps) {
  const normalized = normalizeDemoAssumptions({
    ...DEMO_ASSUMPTION_DEFAULTS,
    ...(assumptions ?? {})
  });

  const opens = Math.round(sentMessages * normalized.openRate);
  const clicks = Math.round(opens * normalized.clickRate);
  const engagements = Math.round(clicks * normalized.engageRate);
  const conversions = Math.round(engagements * normalized.purchaseRate);
  const revenue = conversions * normalized.avgOrderValue;

  const cards: Array<{ label: string; value: string }> = [
    { label: "Users", value: users.toLocaleString() },
    { label: "Entities", value: entities.toLocaleString() },
    { label: "Interest edges", value: interestEdges.toLocaleString() },
    { label: "Entity change events", value: entityChangeEvents.toLocaleString() },
    { label: "Candidates", value: candidates.toLocaleString() },
    { label: "Sent messages", value: sentMessages.toLocaleString() },
    { label: "Opens", value: opens.toLocaleString() },
    { label: "Clicks", value: clicks.toLocaleString() },
    { label: "Engagements", value: engagements.toLocaleString() },
    { label: "Conversions", value: conversions.toLocaleString() },
    { label: "Revenue", value: `$${revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}` }
  ];

  return (
    <div className="card">
      <h3 style={{ marginBottom: 8 }}>Lifecycle funnel KPI strip</h3>
      <p className="small" style={{ marginBottom: 12 }}>
        End-to-end view from graph foundation through response outcomes.
      </p>
      <div className="grid grid-4">
        {cards.map((card) => (
          <div className="card" key={card.label}>
            <p className="small">{card.label}</p>
            <div className="kpi">{card.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
