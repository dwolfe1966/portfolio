import { Metadata } from "next";
import Link from "next/link";
import { DemoWorkspaceTabs } from "@/components/demo-shell/DemoWorkspaceTabs";
import { Section } from "@/components/site/Section";
import { db } from "@/lib/db";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { buildMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  title: "Tools Connections | David Wolfe",
  description: "Connection hub for bringing CSV, spreadsheet, OAuth, and live datasource data into Tools.",
  path: "/workspace/connections"
});

const connectionModes = [
  {
    title: "CSV / spreadsheet upload",
    status: "Available now",
    detail: "Upload files, map source columns to app entities, validate rows, and prepare tool-ready datasets.",
    tools: "All tools; lifecycle import wired now",
    href: "/workspace/connections/csv",
    action: "Open CSV flow"
  },
  {
    title: "Google Sheets",
    status: "Preview scaffold",
    detail: "Map sheet tabs to app entities and refresh datasets without manually replacing files.",
    tools: "All tools",
    href: "/workspace/connections/google-sheets",
    action: "Open Sheets flow"
  },
  {
    title: "Ad platform OAuth",
    status: "Available now",
    detail: "Connect read-only advertising accounts for acquisition analysis, with OAuth state, encryption checks, and connected-account history.",
    tools: "Acquisition",
    href: "/acquisition/connections",
    action: "Open OAuth flow"
  },
  {
    title: "Live datasource connector",
    status: "Planned",
    detail: "Connect APIs, relational databases, warehouses, CRMs, and event streams into the same mapping and validation pipeline.",
    tools: "All tools",
    href: "/workspace/settings",
    action: "View account layer"
  }
];

const rolloutSteps = [
  "Choose a source",
  "Map fields to app entities",
  "Validate data types and ranges",
  "Save a workspace preset",
  "Run a model with owned data"
];

async function loadConnectionSummary() {
  try {
    const [presets, imports, adConnections] = await Promise.all([
      db.lifecycleMappingPreset.count(),
      db.lifecycleImportLog.count(),
      db.adAccountConnection.count()
    ]);

    return { presets, imports, adConnections, compatibilityMode: false };
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      return { presets: 0, imports: 0, adConnections: 0, compatibilityMode: true };
    }
    throw error;
  }
}

export default async function DemoConnectionsPage() {
  const summary = await loadConnectionSummary();

  return (
    <>
      <DemoWorkspaceTabs />
      <Section eyebrow="Workspace" title="Connections hub">
        <p>
          This is the shared entry point for turning Tools into operating tools: bring your own data, map it into the app model,
          save the configuration, and run simulations against an owned operating context.
        </p>
      </Section>

      <Section title="Connection status">
        <div className="grid grid-4">
          <div className="card">
            <p className="small">Saved mappings</p>
            <div className="kpi">{summary.presets.toLocaleString()}</div>
          </div>
          <div className="card">
            <p className="small">Lifecycle imports</p>
            <div className="kpi">{summary.imports.toLocaleString()}</div>
          </div>
          <div className="card">
            <p className="small">Ad connections</p>
            <div className="kpi">{summary.adConnections.toLocaleString()}</div>
          </div>
          <div className="card">
            <p className="small">Persistence</p>
            <div className="kpi">{summary.compatibilityMode ? "Setup" : "Active"}</div>
          </div>
        </div>
        {summary.compatibilityMode ? (
          <p className="small">Run the latest Prisma migrations to enable connection persistence.</p>
        ) : null}
      </Section>

      <Section title="Connection flows">
        <div className="grid grid-4">
          {connectionModes.map((mode) => (
            <div className="card connectionModeCard" key={mode.title}>
              <p className={`statusPill ${mode.status === "Available now" ? "live" : "progress"}`}>{mode.status}</p>
              <h3>{mode.title}</h3>
              <p>{mode.detail}</p>
              <p className="small"><strong>{mode.tools}</strong></p>
              <Link className="btn smallBtn" href={mode.href}>{mode.action}</Link>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Reusable import workflow">
        <div className="signalStrip">
          {rolloutSteps.map((step, index) => (
            <div className="signalStep" key={step}>
              <strong>{index + 1}. {step}</strong>
              <p>
                {index === 0
                  ? "Select CSV, sheet, OAuth provider, API, database, warehouse, CRM, or stream."
                  : index === 1
                    ? "Translate source fields into users, accounts, campaigns, offers, events, prices, or auction objects."
                    : index === 2
                      ? "Check required fields, dates, enums, numeric ranges, and referential consistency."
                      : index === 3
                        ? "Persist the map so the user does not repeat setup work."
                        : "Route normalized data into the selected tool and generate outputs."}
              </p>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
