import { Section } from "@/components/site/Section";

export default function DemoLoading() {
  return (
    <Section eyebrow="Tools" title="Loading workspace...">
      <div className="grid grid-3">
        <div className="card"><div className="kpi">...</div><p>Loading metrics</p></div>
        <div className="card"><div className="kpi">...</div><p>Loading candidates</p></div>
        <div className="card"><div className="kpi">...</div><p>Loading messages</p></div>
      </div>
    </Section>
  );
}
