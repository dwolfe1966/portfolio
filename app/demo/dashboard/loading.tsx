import { Section } from "@/components/site/Section";

export default function DashboardLoading() {
  return (
    <>
      <Section title="How this tool works">
        <div className="card"><p>Loading explainer...</p></div>
      </Section>
      <Section eyebrow="Tools" title="Loading dashboard...">
        <div className="grid grid-3">
          <div className="card"><div className="kpi">...</div><p>Loading deltas</p></div>
          <div className="card"><div className="kpi">...</div><p>Loading candidates</p></div>
          <div className="card"><div className="kpi">...</div><p>Loading messages</p></div>
        </div>
      </Section>
    </>
  );
}
