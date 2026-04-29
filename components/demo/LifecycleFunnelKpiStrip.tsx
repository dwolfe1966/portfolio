import Link from "next/link";
import { DEMO_ASSUMPTION_DEFAULTS, normalizeDemoAssumptions } from "@/lib/demo-assumptions";

type FunnelAssumptions = Partial<{
  openRate: number;
  clickRate: number;
  engageRate: number;
  purchaseRate: number;
  avgOrderValue: number;
}>;

type FunnelActuals = Partial<{
  opens: number;
  clicks: number;
  engagements: number;
  conversions: number;
  revenue: number;
}>;

type LifecycleFunnelKpiStripProps = {
  users: number;
  entities: number;
  interestEdges: number;
  entityChangeEvents: number;
  candidates: number;
  sentMessages: number;
  assumptions?: FunnelAssumptions | null;
  actuals?: FunnelActuals | null;
};

export function LifecycleFunnelKpiStrip({
  users,
  entities,
  interestEdges,
  entityChangeEvents,
  candidates,
  sentMessages,
  assumptions,
  actuals
}: LifecycleFunnelKpiStripProps) {
  const normalized = normalizeDemoAssumptions({ ...DEMO_ASSUMPTION_DEFAULTS, ...(assumptions ?? {}) });

  const modeledOpens = Math.round(sentMessages * normalized.openRate);
  const modeledClicks = Math.round(modeledOpens * normalized.clickRate);
  const modeledEngagements = Math.round(modeledClicks * normalized.engageRate);
  const modeledConversions = Math.round(modeledEngagements * normalized.purchaseRate);
  const modeledRevenue = modeledConversions * normalized.avgOrderValue;

  const cards: Array<{ label: string; value: string; href: string }> = [
    { label: "Users", value: users.toLocaleString(), href: "/lifecycle/dashboard#recent-users" },
    { label: "Entities", value: entities.toLocaleString(), href: "/lifecycle/dashboard#recent-entities" },
    { label: "Interest edges", value: interestEdges.toLocaleString(), href: "/lifecycle/dashboard#recent-interest-edges" },
    { label: "Detected trigger events", value: entityChangeEvents.toLocaleString(), href: "/lifecycle/dashboard#recent-events" },
    { label: "Candidates", value: candidates.toLocaleString(), href: "/lifecycle/campaigns" },
    { label: "Sent messages", value: sentMessages.toLocaleString(), href: "/lifecycle/outputs#recent-generated-messages" },
    { label: "Opens", value: (actuals?.opens ?? modeledOpens).toLocaleString(), href: "/lifecycle/outputs#funnel-kpis" },
    { label: "Clicks", value: (actuals?.clicks ?? modeledClicks).toLocaleString(), href: "/lifecycle/outputs#funnel-kpis" },
    { label: "Engagements", value: (actuals?.engagements ?? modeledEngagements).toLocaleString(), href: "/lifecycle/outputs#funnel-kpis" },
    { label: "Conversions", value: (actuals?.conversions ?? modeledConversions).toLocaleString(), href: "/lifecycle/outputs#funnel-kpis" },
    { label: "Revenue", value: `$${(actuals?.revenue ?? modeledRevenue).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, href: "/lifecycle/outputs#recent-campaign-runs" }
  ];

  return (
    <div id="funnel-kpis" className="card">
      <h3 style={{ marginBottom: 8 }}>Lifecycle funnel KPI strip</h3>
      <p className="small" style={{ marginBottom: 12 }}>
        End-to-end view from graph foundation through response outcomes (modeled where direct telemetry is unavailable).
      </p>
      <div className="grid grid-4">
        {cards.map((card) => (
          <Link className="card" key={card.label} href={card.href} style={{ textDecoration: "none" }}>
            <p className="small">{card.label}</p>
            <div className="kpi">{card.value}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
