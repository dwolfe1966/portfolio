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

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(value);
}

function sourceTypeLabel(sourceType: string) {
  if (sourceType === "google_sheets") return "Google Sheets";
  if (sourceType === "csv") return "CSV";
  if (sourceType === "oauth") return "OAuth";
  if (sourceType === "live") return "Live datasource";
  return sourceType.toUpperCase();
}

function sourceConfigHref(sourceType: string, app: string, id: string) {
  const encodedApp = encodeURIComponent(app);
  const encodedId = encodeURIComponent(id);
  if (sourceType === "google_sheets") return `/workspace/connections/google-sheets?tool=${encodedApp}&config=${encodedId}`;
  if (sourceType === "csv") return `/workspace/connections/csv?tool=${encodedApp}&config=${encodedId}`;
  return "/workspace/settings";
}

async function loadConnectionSummary() {
  try {
    const [sourceConfigs, csvConfigs, sheetConfigs, adConnections, recentSourceConfigs] = await Promise.all([
      db.lifecycleMappingPreset.count(),
      db.lifecycleMappingPreset.count({ where: { sourceType: "csv" } }),
      db.lifecycleMappingPreset.count({ where: { sourceType: "google_sheets" } }),
      db.adAccountConnection.count(),
      db.lifecycleMappingPreset.findMany({
        orderBy: { updatedAt: "desc" },
        take: 6,
        include: { workspace: true }
      })
    ]);

    return { sourceConfigs, csvConfigs, sheetConfigs, adConnections, recentSourceConfigs, compatibilityMode: false };
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      return { sourceConfigs: 0, csvConfigs: 0, sheetConfigs: 0, adConnections: 0, recentSourceConfigs: [], compatibilityMode: true };
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
            <p className="small">Source configs</p>
            <div className="kpi">{summary.sourceConfigs.toLocaleString()}</div>
          </div>
          <div className="card">
            <p className="small">CSV configs</p>
            <div className="kpi">{summary.csvConfigs.toLocaleString()}</div>
          </div>
          <div className="card">
            <p className="small">Sheet configs</p>
            <div className="kpi">{summary.sheetConfigs.toLocaleString()}</div>
          </div>
          <div className="card">
            <p className="small">Ad connections</p>
            <div className="kpi">{summary.adConnections.toLocaleString()}</div>
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

      <Section title="Recent saved sources">
        {summary.recentSourceConfigs.length === 0 ? (
          <div className="card">
            <p>No saved source configs yet. Open CSV or Google Sheets to save reusable mappings for any tool.</p>
          </div>
        ) : (
          <div className="tableScroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Source</th>
                  <th>Tool</th>
                  <th>Type</th>
                  <th>Workspace</th>
                  <th>Updated</th>
                  <th>Manage</th>
                </tr>
              </thead>
              <tbody>
                {summary.recentSourceConfigs.map((config) => (
                  <tr key={config.id}>
                    <td><strong>{config.name}</strong></td>
                    <td>{config.app}</td>
                    <td>{sourceTypeLabel(config.sourceType)}</td>
                    <td>{config.workspace.name}</td>
                    <td>{formatDate(config.updatedAt)}</td>
                    <td>
                      <div className="importHistoryActions">
                        <Link className="btn smallBtn primary" href={`/workspace/datasets/${encodeURIComponent(config.id)}`}>Manage source</Link>
                        <Link className="btn smallBtn" href={sourceConfigHref(config.sourceType, config.app, config.id)}>Open connector</Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
