import Link from "next/link";
import { db } from "@/lib/db";
import { Section } from "@/components/site/Section";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";

export const dynamic = "force-dynamic";

const TIME_WINDOWS = {
  "24h": { label: "Last 24 hours", hours: 24 },
  "7d": { label: "Last 7 days", hours: 24 * 7 },
  "30d": { label: "Last 30 days", hours: 24 * 30 },
  all: { label: "All time", hours: null as number | null }
} as const;
type TimeWindow = keyof typeof TIME_WINDOWS;

type SearchParams = {
  action?: string;
  actor?: string;
  campaignId?: string;
  window?: string;
};

function parseWindow(value: string | undefined): TimeWindow {
  if (value && value in TIME_WINDOWS) return value as TimeWindow;
  return "7d";
}

function metadataRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function sourceTypeLabel(sourceType: unknown) {
  if (sourceType === "google_ads") return "Google Ads";
  if (sourceType === "meta_ads") return "Meta Ads";
  if (sourceType === "google_sheets") return "Google Sheets";
  if (sourceType === "csv") return "CSV";
  return typeof sourceType === "string" && sourceType ? sourceType.replaceAll("_", " ") : "Manual/sample";
}

function sourceFacts(metadata: unknown) {
  const record = metadataRecord(metadata);
  const sourceName = typeof record.sourceName === "string" ? record.sourceName : "";
  const datasetId = typeof record.datasetId === "string" ? record.datasetId : "";
  const connectionId = typeof record.connectionId === "string" ? record.connectionId : "";
  const externalAccountId = typeof record.externalAccountId === "string" ? record.externalAccountId : "";
  const provider = typeof record.provider === "string" ? record.provider : "";
  return {
    label: sourceTypeLabel(record.sourceType ?? provider),
    sourceName: sourceName || "",
    datasetId,
    connectionId,
    externalAccountId,
    provider
  };
}

export default async function AcquisitionAuditPage({
  searchParams
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const window = parseWindow(params.window);
  const actionFilter = (params.action ?? "").trim();
  const actorFilter = (params.actor ?? "").trim();
  const campaignIdFilter = (params.campaignId ?? "").trim();

  try {
    const cutoff = TIME_WINDOWS[window].hours
      ? new Date(Date.now() - TIME_WINDOWS[window].hours! * 60 * 60 * 1000)
      : null;

    const where: Record<string, unknown> = {};
    if (actionFilter) where.action = actionFilter;
    if (actorFilter) where.actor = actorFilter;
    if (campaignIdFilter) where.campaignId = campaignIdFilter;
    if (cutoff) where.createdAt = { gte: cutoff };

    const [logs, allActions, allActors, allCampaigns, totalCount] = await Promise.all([
      db.acquisitionAuditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 200,
        include: { campaign: { select: { id: true, name: true } } }
      }),
      db.acquisitionAuditLog.findMany({
        distinct: ["action"],
        select: { action: true },
        orderBy: { action: "asc" }
      }),
      db.acquisitionAuditLog.findMany({
        distinct: ["actor"],
        select: { actor: true },
        orderBy: { actor: "asc" }
      }),
      db.acquisitionCampaign.findMany({
        select: { id: true, name: true },
        orderBy: { createdAt: "desc" },
        take: 50
      }),
      db.acquisitionAuditLog.count({ where })
    ]);
    const sourceLinkedLogs = logs.filter((log) => {
      const source = sourceFacts(log.metadata);
      return Boolean(source.datasetId || source.connectionId || source.externalAccountId);
    });
    const providerLinkedLogs = sourceLinkedLogs.filter((log) => {
      const source = sourceFacts(log.metadata);
      return source.label === "Google Ads" || source.label === "Meta Ads";
    });
    const datasetApplyLogs = logs.filter((log) => log.action === "acquisition_dataset_applied");

    return (
      <>
        <Section
          title="Acquisition audit feed"
          eyebrow={`${totalCount.toLocaleString()} events match`}
        >
          <p>
            Every automated and operator action against acquisition campaigns is recorded here.
            Filter by action type, actor, campaign, or time window to investigate decisions and
            policy outcomes.
          </p>

          <form method="get" className="card" style={{ marginTop: 12 }}>
            <div className="grid grid-4">
              <label>
                Action
                <select name="action" defaultValue={actionFilter}>
                  <option value="">All actions</option>
                  {allActions.map(({ action }) => (
                    <option key={action} value={action}>{action}</option>
                  ))}
                </select>
              </label>
              <label>
                Actor
                <select name="actor" defaultValue={actorFilter}>
                  <option value="">All actors</option>
                  {allActors.map(({ actor }) => (
                    <option key={actor} value={actor}>{actor}</option>
                  ))}
                </select>
              </label>
              <label>
                Campaign
                <select name="campaignId" defaultValue={campaignIdFilter}>
                  <option value="">All campaigns</option>
                  {allCampaigns.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </label>
              <label>
                Time window
                <select name="window" defaultValue={window}>
                  {(Object.keys(TIME_WINDOWS) as TimeWindow[]).map((key) => (
                    <option key={key} value={key}>{TIME_WINDOWS[key].label}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="ctaRow" style={{ marginTop: 10 }}>
              <button type="submit">Apply filters</button>
              <Link className="btn" href="/acquisition/audit">Reset</Link>
            </div>
          </form>
        </Section>

        <Section title="Audit source coverage">
          <div className="grid grid-4">
            <div className="card">
              <p className="small">Shown events</p>
              <div className="kpi">{logs.length.toLocaleString()}</div>
            </div>
            <div className="card">
              <p className="small">Source-linked</p>
              <div className="kpi">{sourceLinkedLogs.length.toLocaleString()}</div>
              <p className="small">Dataset, account, or connection metadata</p>
            </div>
            <div className="card">
              <p className="small">Provider-linked</p>
              <div className="kpi">{providerLinkedLogs.length.toLocaleString()}</div>
              <p className="small">Google Ads or Meta Ads lineage</p>
            </div>
            <div className="card">
              <p className="small">Dataset applies</p>
              <div className="kpi">{datasetApplyLogs.length.toLocaleString()}</div>
              <p className="small">Snapshots materialized into tool tables</p>
            </div>
          </div>
        </Section>

        <Section title={`Events (showing ${logs.length} of ${totalCount.toLocaleString()})`}>
          {logs.length === 0 ? (
            <div className="card">
              <p>No audit events match the current filters.</p>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Campaign</th>
                  <th>Source</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const source = sourceFacts(log.metadata);
                  return (
                    <tr key={log.id}>
                      <td>{new Date(log.createdAt).toLocaleString()}</td>
                      <td>
                        <Link href={`/acquisition/campaigns/${log.campaign.id}`}>
                          {log.campaign.name}
                        </Link>
                      </td>
                      <td>
                        <span>{source.label}</span>
                        {source.sourceName ? <p className="small">{source.sourceName}</p> : null}
                        {source.externalAccountId ? <p className="small">Account {source.externalAccountId}</p> : null}
                        <div className="importHistoryActions">
                          {source.datasetId ? <Link className="btn smallBtn" href={`/workspace/datasets/${source.datasetId}`}>Dataset</Link> : null}
                          {source.connectionId ? <Link className="btn smallBtn" href={`/acquisition/connections/${source.connectionId}`}>Provider</Link> : null}
                        </div>
                      </td>
                      <td>{log.actor}</td>
                      <td><code className="small">{log.action}</code></td>
                      <td>
                        <details className="importMetadataDetails">
                          <summary>Metadata</summary>
                          <pre>{JSON.stringify(log.metadata ?? {}, null, 2)}</pre>
                        </details>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {totalCount > logs.length ? (
            <p className="small" style={{ marginTop: 8 }}>
              Showing first {logs.length} events. Narrow the filters to see older entries.
            </p>
          ) : null}
        </Section>
      </>
    );
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      return (
        <Section title="Acquisition audit feed">
          <div className="card">
            <p>Audit log table is missing. Run database migrations before opening this page.</p>
            <pre className="code">npm run db:generate{"\n"}npm run db:migrate:deploy{"\n"}npm run db:seed</pre>
          </div>
        </Section>
      );
    }
    throw error;
  }
}
