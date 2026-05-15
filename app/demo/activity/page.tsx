import { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { DemoWorkspaceTabs } from "@/components/demo-shell/DemoWorkspaceTabs";
import { Section } from "@/components/site/Section";
import { ACCOUNT_SESSION_COOKIE, verifyAccountSessionToken } from "@/lib/account-session";
import { db } from "@/lib/db";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { buildMetadata } from "@/lib/seo";
import { workspaceLaunchAuditDetail, workspaceLaunchAuditTitle } from "@/lib/workspace-launch-audit-events";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  title: "Tools Activity | David Wolfe",
  description: "Workspace activity feed for Tools imports, model runs, connector events, and audit logs.",
  path: "/workspace/activity"
});

type ActivityItem = {
  id: string;
  app: string;
  category: "Data" | "Model" | "Audit" | "Connection" | "Source";
  kind: string;
  title: string;
  detail: string;
  actor: string;
  href: string;
  createdAt: Date;
};

function sourceTypeLabel(sourceType: string) {
  if (sourceType === "google_sheets") return "Google Sheets";
  if (sourceType === "google_ads") return "Google Ads";
  if (sourceType === "meta_ads") return "Meta Ads";
  if (sourceType === "csv") return "CSV";
  if (sourceType === "oauth") return "OAuth";
  if (sourceType === "live") return "Live datasource";
  return sourceType.toUpperCase();
}

async function currentAccountUserId() {
  const cookieStore = await cookies();
  return verifyAccountSessionToken(cookieStore.get(ACCOUNT_SESSION_COOKIE)?.value)?.userId ?? null;
}

async function loadActivity(accountUserId: string | null) {
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
      sourceConfigs,
      providerDryRuns,
      launchAuditEvents
    ] = await Promise.all([
      db.lifecycleImportLog.findMany({ where: { accountUserId }, orderBy: { createdAt: "desc" }, take: 8 }),
      db.campaignRun.findMany({ where: { accountUserId }, orderBy: { createdAt: "desc" }, take: 8 }),
      db.acquisitionAuditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { campaign: true } }),
      db.pricingAuditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { experiment: true } }),
      db.retentionAuditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
      db.expansionAuditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
      db.auctionAuditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
      db.adAccountConnection.findMany({ where: { accountUserId }, orderBy: { createdAt: "desc" }, take: 8 }),
      db.lifecycleMappingPreset.findMany({ where: { accountUserId }, orderBy: { updatedAt: "desc" }, take: 12, include: { workspace: true } }),
      db.agentProviderWriteDryRun.findMany({ where: { OR: [{ accountUserId }, { accountUserId: null }] }, orderBy: { createdAt: "desc" }, take: 8 }),
      db.lifecycleConnectorAuditEvent.findMany({
        where: {
          provider: "workspace_launch",
          OR: [{ accountUserId }, { accountUserId: null }]
        },
        orderBy: { occurredAt: "desc" },
        take: 12
      })
    ]);

    const items: ActivityItem[] = [
      ...imports.map((log) => ({
        id: `import-${log.id}`,
        app: "Lifecycle",
        category: "Data" as const,
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
        category: "Model" as const,
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
        category: "Audit" as const,
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
        category: "Audit" as const,
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
        category: "Audit" as const,
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
        category: "Audit" as const,
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
        category: "Audit" as const,
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
        category: "Connection" as const,
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
        category: "Source" as const,
        kind: "Source config",
        title: config.name,
        detail: `${sourceTypeLabel(config.sourceType)} mapping in ${config.workspace.name}`,
        actor: "workspace",
        href: `/workspace/datasets/${config.id}`,
        createdAt: config.updatedAt
      })),
      ...providerDryRuns.map((dryRun) => ({
        id: `provider-dry-run-${dryRun.id}`,
        app: "Acquisition",
        category: "Audit" as const,
        kind: "Provider dry run",
        title: `${dryRun.provider} ${dryRun.operationType}`,
        detail: `${dryRun.status} · $${Math.round(dryRun.spendExposureCents / 100).toLocaleString()} exposure · ${dryRun.externalCampaignId ?? dryRun.externalAccountId ?? "target unresolved"}`,
        actor: "agent-worker",
        href: `/workspace/agents/dry-runs/${dryRun.id}`,
        createdAt: dryRun.createdAt
      })),
      ...launchAuditEvents.map((event) => ({
        id: `launch-audit-${event.id}`,
        app: "Workspace",
        category: "Audit" as const,
        kind: "Launch readiness",
        title: workspaceLaunchAuditTitle(event.eventType),
        detail: workspaceLaunchAuditDetail(event),
        actor: event.accountUserId ? "workspace user" : "workspace",
        href: "/workspace/settings",
        createdAt: event.occurredAt
      }))
    ];

    return {
      items: items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 30),
      counts: {
        imports: imports.length,
        lifecycleRuns: lifecycleRuns.length,
        audits: acquisition.length + pricing.length + retention.length + expansion.length + auction.length + providerDryRuns.length + launchAuditEvents.length,
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

function formatFullDate(value: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(value);
}

export default async function DemoActivityPage() {
  const accountUserId = await currentAccountUserId();
  const activity = await loadActivity(accountUserId);
  const latestEvent = activity.items[0];

  return (
    <>
      <DemoWorkspaceTabs />
      <Section eyebrow="Workspace" title="Workspace activity">
        <p>
          Track source changes, imports, model runs, connector events, and tool audit logs from one workspace-level event log.
        </p>
      </Section>

      <Section title="Activity summary">
        <div className="activitySummaryGrid">
          <div className="activitySummaryCard">
            <p className="small">Latest event</p>
            <strong>{latestEvent ? latestEvent.title : "No activity yet"}</strong>
            <span>{latestEvent ? `${latestEvent.kind} · ${formatFullDate(latestEvent.createdAt)}` : "Run a tool or import data to start the feed."}</span>
          </div>
          <div className="activitySummaryCard">
            <p className="small">Imports</p>
            <strong>{activity.counts.imports}</strong>
            <span>Dataset and source ingest events.</span>
          </div>
          <div className="activitySummaryCard">
            <p className="small">Model runs</p>
            <strong>{activity.counts.lifecycleRuns}</strong>
            <span>Simulation and campaign generation runs.</span>
          </div>
          <div className="activitySummaryCard">
            <p className="small">Audit + connection events</p>
            <strong>{activity.counts.audits + activity.counts.connections}</strong>
            <span>Tool actions, saved sources, and provider links.</span>
          </div>
        </div>
        {activity.compatibilityMode ? (
          <p className="small">Run the latest Prisma migrations to enable workspace activity history.</p>
        ) : null}
      </Section>

      <Section title="Event log">
        {activity.items.length === 0 ? (
          <div className="card">
            <p>No workspace activity is available yet. Import data, run a simulation, or connect a provider to populate this feed.</p>
          </div>
        ) : (
          <div className="activityFeed">
            {activity.items.map((item) => (
              <details className="activityFeedItem" key={item.id}>
                <summary>
                  <span className="activityFeedDate">{formatDate(item.createdAt)}</span>
                  <span className={`activityFeedBadge activityFeedBadge--${item.category.toLowerCase()}`}>{item.category}</span>
                  <span className="activityFeedTitle">
                    <strong>{item.title}</strong>
                    <span>{item.kind}</span>
                  </span>
                  <span className="activityFeedApp">{item.app}</span>
                </summary>
                <div className="activityFeedDetail">
                  <div>
                    <p>{item.detail}</p>
                    <p className="small">Actor: {item.actor} · Event time: {formatFullDate(item.createdAt)}</p>
                  </div>
                  <Link className="btn smallBtn" href={item.href}>Inspect event</Link>
                </div>
              </details>
            ))}
          </div>
        )}
      </Section>
    </>
  );
}
