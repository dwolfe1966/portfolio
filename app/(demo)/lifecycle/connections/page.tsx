import Link from "next/link";
import { Section } from "@/components/site/Section";
import { LifecycleCsvUploadScaffold } from "@/components/demo/LifecycleCsvUploadScaffold";
import { db } from "@/lib/db";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";

export const dynamic = "force-dynamic";

const sourceModes = [
  {
    title: "Demo data",
    status: "Available now",
    detail: "Use the seeded lifecycle dataset: users, entities, interest edges, and change events. Best for exploring the workflow before connecting external data.",
    action: "Active default",
    href: "/lifecycle/inputs"
  },
  {
    title: "CSV / spreadsheet upload",
    status: "Available now",
    detail: "Upload users, entities, interest edges, and change events from CSV, validate rows, import them into the lifecycle model, and run simulations against the imported dataset.",
    action: "Import enabled",
    href: "#csv-upload"
  },
  {
    title: "Google Sheets",
    status: "Planned connector",
    detail: "Connect a live sheet, map tabs to lifecycle objects, and refresh the app from spreadsheet rows without replacing the demo schema.",
    action: "Design target",
    href: null
  },
  {
    title: "Direct data source",
    status: "Planned connector",
    detail: "Connect live data through an API, warehouse, or relational database standard. Map source fields into the lifecycle model and run simulations on current operating data.",
    action: "Design target",
    href: null
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

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(value);
}

function formatMetadata(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") return "No metadata recorded.";
  return JSON.stringify(metadata, null, 2);
}

export default async function LifecycleConnectionsPage() {
  const importLogs = await db.lifecycleImportLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 8
  }).catch((error) => {
    if (isMissingDemoTableError(error)) return [];
    throw error;
  });

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
              {mode.href ? (
                <Link className="btn" href={mode.href}>
                  {mode.title === "CSV / spreadsheet upload" ? "Connect CSV" : "Open data"}
                </Link>
              ) : (
                <button type="button" disabled>Coming soon</button>
              )}
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

      <div id="csv-upload" className="anchorTarget">
        <Section title="CSV / spreadsheet upload scaffold">
          <LifecycleCsvUploadScaffold />
        </Section>
      </div>

      <Section title="Recent import history">
        {importLogs.length === 0 ? (
          <div className="card">
            <p>No lifecycle imports have been recorded yet.</p>
          </div>
        ) : (
          <div className="tableScroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Dataset</th>
                  <th>Status</th>
                  <th>Rows imported</th>
                  <th>Validation issues</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {importLogs.map((log) => {
                  const rows =
                    log.usersImported +
                    log.entitiesImported +
                    log.interestEdgesImported +
                    log.changeEventsImported;
                  return (
                    <tr key={log.id}>
                      <td>
                        <strong>{log.sourceName}</strong>
                        <p className="small">{log.sourceType.toUpperCase()}</p>
                      </td>
                      <td><span className={`statusPill ${log.status === "imported" ? "live" : "progress"}`}>{log.status}</span></td>
                      <td>
                        {rows.toLocaleString()}
                        <p className="small">
                          {log.usersImported} users · {log.entitiesImported} entities · {log.interestEdgesImported} edges · {log.changeEventsImported} events
                        </p>
                      </td>
                      <td>{log.validationErrors}</td>
                      <td>{formatDate(log.createdAt)}</td>
                      <td>
                        <div className="importHistoryActions">
                          <Link className="btn smallBtn" href="/lifecycle/inputs?imported=1">Inputs</Link>
                          <Link className="btn smallBtn primary" href="/lifecycle/simulations?imported=1">Simulate</Link>
                        </div>
                        <details className="importMetadataDetails">
                          <summary>Import details</summary>
                          <pre>{formatMetadata(log.metadata)}</pre>
                        </details>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
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
