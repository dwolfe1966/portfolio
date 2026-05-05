import { Metadata } from "next";
import Link from "next/link";
import { DemoWorkspaceTabs } from "@/components/demo-shell/DemoWorkspaceTabs";
import { Section } from "@/components/site/Section";
import { db } from "@/lib/db";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { buildMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  title: "Tools Activity | David Wolfe",
  description: "Workspace activity feed for Tools imports, model runs, connector events, and audit logs.",
  path: "/workspace/activity"
});

type ActivityItem = {
  id: string;
  app: string;
  kind: string;
  title: string;
  detail: string;
  actor: string;
  href: string;
  createdAt: Date;
};

const activityLanes = [
  {
    title: "Source work",
    detail: "CSV and Sheets configs, connector changes, OAuth connections, and saved mappings.",
    href: "/workspace/connections",
    action: "Review connections"
  },
  {
    title: "Dataset work",
    detail: "Imports, validation results, row counts, and source readiness for tool runs.",
    href: "/workspace/datasets",
    action: "Review datasets"
  },
  {
    title: "Tool work",
    detail: "Model runs, simulations, pricing decisions, campaign audits, and operating logs.",
    href: "/workspace/dashboard",
    action: "Open workspace"
  }
];

function sourceTypeLabel(sourceType: string) {
  if (sourceType === "google_sheets") return "Google Sheets";
  if (sourceType === "csv") return "CSV";
  if (sourceType === "oauth") return "OAuth";
  if (sourceType === "live") return "Live datasource";
  return sourceType.toUpperCase();
}

function activityTone(kind: string) {
  if (kind === "Import" || kind === "Model run") return "live";
  if (kind === "Audit") return "progress";
  return "idle";
}

async function loadActivity() {
  try {
    const [
      imports,
      lifecycleRuns,
      acquisition,
      pricing,
      retention,
      expansion,
      auction,
      adConnections,
      sourceConfigs
    ] = await Promise.all([
      db.lifecycleImportLog.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
      db.campaignRun.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
      db.acquisitionAuditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { campaign: true } }),
      db.pricingAuditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { experiment: true } }),
      db.retentionAuditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
      db.expansionAuditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
      db.auctionAuditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
      db.adAccountConnection.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
      db.lifecycleMappingPreset.findMany({ orderBy: { updatedAt: "desc" }, take: 12, include: { workspace: true } })
    ]);

    const items: ActivityItem[] = [
      ...imports.map((log) => ({
        id: `import-${log.id}`,
        app: "Lifecycle",
        kind: "Import",
        title: log.sourceName,
        detail: `${log.usersImported + log.entitiesImported + log.interestEdgesImported + log.changeEventsImported} rows imported · ${log.validationErrors} validation issues`,
        actor: log.sourceType.toUpperCase(),
        href: "/workspace/datasets",
        createdAt: log.createdAt
      })),
      ...lifecycleRuns.map((run) => ({
        id: `lifecycle-run-${run.id}`,
        app: "Lifecycle",
        kind: "Model run",
        title: run.runName,
        detail: `${run.totalHighPriority} high-priority candidates · $${Math.round(run.estimatedRevenue).toLocaleString()} estimated revenue`,
        actor: "system",
        href: `/lifecycle/campaigns/${run.id}`,
        createdAt: run.createdAt
      })),
      ...acquisition.map((log) => ({
        id: `acquisition-${log.id}`,
        app: "Acquisition",
        kind: "Audit",
        title: log.action,
        detail: log.campaign?.name ?? "Campaign event",
        actor: log.actor,
        href: "/acquisition/audit",
        createdAt: log.createdAt
      })),
      ...pricing.map((log) => ({
        id: `pricing-${log.id}`,
        app: "Pricing",
        kind: "Audit",
        title: log.action,
        detail: log.detail || log.experiment?.name || "Pricing event",
        actor: log.actor,
        href: "/pricing/audit",
        createdAt: log.createdAt
      })),
      ...retention.map((log) => ({
        id: `retention-${log.id}`,
        app: "Retention",
        kind: "Audit",
        title: log.action,
        detail: log.detail,
        actor: log.actor,
        href: "/retention/audit",
        createdAt: log.createdAt
      })),
      ...expansion.map((log) => ({
        id: `expansion-${log.id}`,
        app: "Expansion",
        kind: "Audit",
        title: log.action,
        detail: log.detail,
        actor: log.actor,
        href: "/expansion/audit",
        createdAt: log.createdAt
      })),
      ...auction.map((log) => ({
        id: `auction-${log.id}`,
        app: "Auction",
        kind: "Audit",
        title: log.action,
        detail: "Auction run or reserve event",
        actor: log.actor,
        href: "/auction/audit",
        createdAt: log.createdAt
      })),
      ...adConnections.map((connection) => ({
        id: `ad-connection-${connection.id}`,
        app: "Acquisition",
        kind: "Connection",
        title: connection.accountName,
        detail: `${connection.provider} · ${connection.externalAccountId}`,
        actor: connection.isTestAccount ? "test account" : "live account",
        href: `/acquisition/connections/${connection.id}`,
        createdAt: connection.createdAt
      })),
      ...sourceConfigs.map((config) => ({
        id: `source-config-${config.id}`,
        app: config.app.charAt(0).toUpperCase() + config.app.slice(1),
        kind: "Source config",
        title: config.name,
        detail: `${sourceTypeLabel(config.sourceType)} mapping in ${config.workspace.name}`,
        actor: "workspace",
        href: `/workspace/datasets/${config.id}`,
        createdAt: config.updatedAt
      }))
    ];

    return {
      items: items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 30),
      counts: {
        imports: imports.length,
        lifecycleRuns: lifecycleRuns.length,
        audits: acquisition.length + pricing.length + retention.length + expansion.length + auction.length,
        connections: adConnections.length + sourceConfigs.length
      },
      compatibilityMode: false
    };
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      return {
        items: [],
        counts: { imports: 0, lifecycleRuns: 0, audits: 0, connections: 0 },
        compatibilityMode: true
      };
    }
    throw error;
  }
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(value);
}

export default async function DemoActivityPage() {
  const activity = await loadActivity();

  return (
    <>
      <DemoWorkspaceTabs />
      <Section eyebrow="Workspace" title="Workspace activity">
        <p>
          Track source changes, imports, model runs, connector events, and tool audit logs from one workspace-level event log.
        </p>
      </Section>

      <Section title="Event volume">
        <div className="grid grid-4">
          <div className="card"><p className="small">Imports</p><div className="kpi">{activity.counts.imports}</div></div>
          <div className="card"><p className="small">Model runs</p><div className="kpi">{activity.counts.lifecycleRuns}</div></div>
          <div className="card"><p className="small">Audit events</p><div className="kpi">{activity.counts.audits}</div></div>
          <div className="card"><p className="small">Connections</p><div className="kpi">{activity.counts.connections}</div></div>
        </div>
        {activity.compatibilityMode ? (
          <p className="small">Run the latest Prisma migrations to enable workspace activity history.</p>
        ) : null}
      </Section>

      <Section title="Activity lanes">
        <div className="grid grid-3">
          {activityLanes.map((lane) => (
            <div className="card sourceWorkflowCard" key={lane.title}>
              <p className="editorKicker">{lane.title}</p>
              <p>{lane.detail}</p>
              <Link className="btn smallBtn" href={lane.href}>{lane.action}</Link>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Event log">
        {activity.items.length === 0 ? (
          <div className="card">
            <p>No workspace activity is available yet. Import data, run a simulation, or connect a provider to populate this feed.</p>
          </div>
        ) : (
          <div className="activityFeed">
            {activity.items.map((item) => (
              <Link className="activityFeedItem" href={item.href} key={item.id}>
                <div className="activityFeedTime">
                  <strong>{formatDate(item.createdAt)}</strong>
                  <span>{item.app}</span>
                </div>
                <div>
                  <div className="activityFeedMeta">
                    <span className={`statusPill ${activityTone(item.kind)}`}>{item.kind}</span>
                    <span className="small">{item.actor}</span>
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.detail}</p>
                </div>
                <span className="btn smallBtn">Inspect</span>
              </Link>
            ))}
          </div>
        )}
      </Section>
    </>
  );
}
