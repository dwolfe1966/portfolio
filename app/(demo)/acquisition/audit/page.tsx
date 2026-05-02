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
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td>{new Date(log.createdAt).toLocaleString()}</td>
                    <td>
                      <Link href={`/acquisition/campaigns/${log.campaign.id}`}>
                        {log.campaign.name}
                      </Link>
                    </td>
                    <td>{log.actor}</td>
                    <td><code className="small">{log.action}</code></td>
                    <td><code className="small">{JSON.stringify(log.metadata ?? {})}</code></td>
                  </tr>
                ))}
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
