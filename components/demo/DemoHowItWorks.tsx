import { Section } from "@/components/site/Section";

const flow = [
  {
    title: "1) Seed users and entities",
    detail:
      "Seed creates users, entities, interest edges, and entity deltas so the demo starts with realistic graph relationships."
  },
  {
    title: "2) Detect change deltas",
    detail:
      "New deltas represent high-intent changes (email updates, legal records, phone changes) that can trigger outreach."
  },
  {
    title: "3) Match + score candidates",
    detail:
      "Each delta is matched against user interest edges and scored for priority using segment, recency, and interest strength."
  },
  {
    title: "4) Generate lifecycle copy",
    detail:
      "Top candidates get generated subject lines, preview text, email body, and landing copy using OpenAI."
  },
  {
    title: "5) Review campaign run",
    detail:
      "The run stores KPIs (matches, high-priority opportunities, estimated revenue) so you can inspect performance over time."
  }
];


const businessContext = [
  {
    label: "Users",
    detail: "People with prior intent history. Context matters because monetization depends on sending relevant outreach to the right segment at the right time."
  },
  {
    label: "Entities",
    detail: "Products/companies/listings users care about. Entity-level context is what ties external change to a commercially meaningful trigger."
  },
  {
    label: "Change events",
    detail: "Observed deltas (new phone, updated record, status change). These events create urgency windows where conversion probability is materially higher."
  }
];

const metricGuide = [
  {
    label: "Deltas detected",
    description: "Number of entity profile changes currently in the demo graph."
  },
  {
    label: "Campaign candidates",
    description: "Total user-entity opportunities created from matching delta events to interest edges."
  },
  {
    label: "Generated messages",
    description: "Candidates that have generated copy assets ready for review or launch."
  }
];

export function DemoHowItWorks() {
  return (
    <Section title="Lifecycle workflow overview">
      <p>
        Think of this workspace as an operating rehearsal: signal intake, opportunity ranking, and campaign generation are shown as one continuous decision loop.
      </p>

      <div className="grid grid-2" style={{ marginTop: 16 }}>
        {flow.map((item) => (
          <div key={item.title} className="card">
            <h3>{item.title}</h3>
            <p>{item.detail}</p>
          </div>
        ))}
      </div>


      <div style={{ marginTop: 20 }}>
        <h3>Business context (why this matters)</h3>
        <div className="grid grid-3" style={{ marginTop: 8 }}>
          {businessContext.map((item) => (
            <div key={item.label} className="card">
              <h3>{item.label}</h3>
              <p>{item.detail}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <h3>Metric guide</h3>
        <div className="grid grid-3" style={{ marginTop: 8 }}>
          {metricGuide.map((metric) => (
            <div key={metric.label} className="card">
              <h3>{metric.label}</h3>
              <p>{metric.description}</p>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}
