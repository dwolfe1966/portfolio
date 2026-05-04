import { Section } from "@/components/site/Section";
import { LifecycleCsvUploadScaffold } from "@/components/demo/LifecycleCsvUploadScaffold";

export const dynamic = "force-dynamic";

const sourceModes = [
  {
    title: "Demo data",
    status: "Available now",
    detail: "Use the seeded lifecycle dataset: users, entities, interest edges, and change events. Best for exploring the workflow before connecting external data.",
    action: "Active default"
  },
  {
    title: "CSV / spreadsheet upload",
    status: "Planned connector",
    detail: "Upload users, entities, interest edges, and change events from CSV or XLSX, map columns, validate rows, and run simulations against the imported dataset.",
    action: "Design target"
  },
  {
    title: "Google Sheets",
    status: "Planned connector",
    detail: "Connect a live sheet, map tabs to lifecycle objects, and refresh the app from spreadsheet rows without replacing the demo schema.",
    action: "Design target"
  },
  {
    title: "Direct data source",
    status: "Planned connector",
    detail: "Connect live data through an API, warehouse, or relational database standard. Map source fields into the lifecycle model and run simulations on current operating data.",
    action: "Design target"
  }
];

const schemaGroups = [
  {
    object: "Users",
    fields: "fullName, email, segment, subscriptionStatus, lastActiveAt",
    purpose: "Defines who can receive lifecycle messages and which commercial posture applies."
  },
  {
    object: "Entities",
    fields: "name, entityType, city, state",
    purpose: "Defines the people, properties, companies, or records users are tracking."
  },
  {
    object: "Interest edges",
    fields: "userEmail, entityName or entityId, interestScore, source",
    purpose: "Connects users to entities and provides the signal strength used in scoring."
  },
  {
    object: "Change events",
    fields: "entityName or entityId, changeType, oldValue, newValue, deltaSummary, detectedAt",
    purpose: "Creates the trigger events that become candidates for OpenAI-generated outreach."
  }
];

const directSources = [
  "REST API",
  "GraphQL API",
  "PostgreSQL",
  "MySQL",
  "Snowflake",
  "BigQuery",
  "Redshift",
  "Databricks",
  "Airtable",
  "HubSpot / Salesforce-style CRM API",
  "S3 / cloud object store",
  "Webhook event stream"
];

const connectionFlow = [
  "Choose data source",
  "Map source fields",
  "Validate required columns and ranges",
  "Preview normalized rows",
  "Save named dataset",
  "Run lifecycle simulation"
];

export default function LifecycleConnectionsPage() {
  return (
    <>
      <Section eyebrow="Operations" title="Use your own data">
        <p>
          Lifecycle should support both the built-in demo dataset and user-owned data.
          This page defines the connection surface: start with demo data, then move toward spreadsheet uploads,
          live sheets, and direct datasource connectors.
        </p>
      </Section>

      <Section title="Connection modes">
        <div className="grid grid-4">
          {sourceModes.map((mode) => (
            <div className="card" key={mode.title}>
              <p className={`statusPill ${mode.status === "Available now" ? "live" : "progress"}`}>{mode.status}</p>
              <h3 style={{ marginTop: 12 }}>{mode.title}</h3>
              <p>{mode.detail}</p>
              <p className="small"><strong>{mode.action}</strong></p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Lifecycle schema requirements">
        <p>
          Every connector maps external data into the same lifecycle model, so simulations, scoring, OpenAI message generation,
          outputs, and audit views can run consistently.
        </p>
        <table className="table">
          <thead>
            <tr><th>Object</th><th>Required fields</th><th>Why it matters</th></tr>
          </thead>
          <tbody>
            {schemaGroups.map((group) => (
              <tr key={group.object}>
                <td>{group.object}</td>
                <td><code className="small">{group.fields}</code></td>
                <td>{group.purpose}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="CSV / spreadsheet upload scaffold">
        <LifecycleCsvUploadScaffold />
      </Section>

      <Section title="Direct data source connector targets">
        <div className="card">
          <p>
            The direct connector is the bridge from demo app to operating tool: pull current lifecycle data from an existing
            API, warehouse, relational database, CRM, or event stream.
          </p>
          <div className="connectorChipGrid" aria-label="Direct datasource connector targets">
            {directSources.map((source) => (
              <span className="connectorChip" key={source}>{source}</span>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Connector workflow">
        <div className="signalStrip">
          {connectionFlow.map((step, index) => (
            <div className="signalStep" key={step}>
              <strong>{index + 1}. {step}</strong>
              <p>
                {index === 0
                  ? "Select demo, upload, sheet, or direct source."
                  : index === 1
                    ? "Map incoming columns or API fields into lifecycle objects."
                    : index === 2
                      ? "Check required fields, enums, date formats, and numeric ranges."
                      : index === 3
                        ? "Review the normalized rows before they affect simulations."
                        : index === 4
                          ? "Persist the mapped source as a reusable dataset."
                          : "Generate candidates, OpenAI messages, landing previews, and output KPIs."}
              </p>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
