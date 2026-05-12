import Link from "next/link";
import { db } from "@/lib/db";
import { Section } from "@/components/site/Section";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { acquisitionSourceLineageFromAuditLogs } from "@/lib/acquisition-source-lineage";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    q?: string;
    state?: string;
  }>;
};

export default async function AcquisitionCampaignsPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const q = (query.q ?? "").trim();
  const state = (query.state ?? "").trim();
  const validStates = new Set(["DRAFT", "TESTING", "SCALING", "PAUSED", "COMPLETED"]);
  const stateFilter = validStates.has(state) ? state : "";

  try {
    const campaigns = await db.acquisitionCampaign.findMany({
      where: {
        ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
        ...(stateFilter ? { state: stateFilter as "DRAFT" | "TESTING" | "SCALING" | "PAUSED" | "COMPLETED" } : {})
      },
      orderBy: [{ createdAt: "desc" }],
      include: {
        auditLogs: {
          where: { action: "acquisition_dataset_applied" },
          orderBy: { createdAt: "desc" },
          take: 1
        },
        _count: { select: { testCells: true, budgetActivities: true } }
      },
      take: 50
    });

    return (
      <>
          <Section title="Campaign workspace">
          <p>Review campaigns, open detail pages, and monitor orchestration status over time.</p>
          <div className="ctaRow">
            <Link href="/acquisition/create" className="btn primary">Create campaign</Link>
            <Link href="/acquisition/simulations" className="btn">Run simulations</Link>
          </div>
        </Section>

        <Section title="Campaign list">
          <form method="GET" className="card" style={{ marginBottom: 12 }}>
            <div className="grid grid-3">
              <label>
                Search campaign
                <input name="q" defaultValue={q} placeholder="e.g. sprint or q2" />
              </label>
              <label>
                State
                <select name="state" defaultValue={stateFilter}>
                  <option value="">All</option>
                  <option value="DRAFT">DRAFT</option>
                  <option value="TESTING">TESTING</option>
                  <option value="SCALING">SCALING</option>
                  <option value="PAUSED">PAUSED</option>
                  <option value="COMPLETED">COMPLETED</option>
                </select>
              </label>
              <div className="ctaRow" style={{ alignItems: "end" }}>
                <button type="submit">Apply filters</button>
                <Link href="/acquisition/campaigns" className="btn">Reset</Link>
              </div>
            </div>
          </form>

          {campaigns.length === 0 ? (
            <div className="card"><p>No campaigns yet. Create your first campaign to begin simulation loops.</p></div>
          ) : (
            <table className="table">
              <thead><tr><th>Name</th><th>Source</th><th>State</th><th>Budget</th><th>Cells</th><th>Budget actions</th><th>Open</th></tr></thead>
              <tbody>
                {campaigns.map((campaign) => {
                  const source = acquisitionSourceLineageFromAuditLogs(campaign.auditLogs);
                  return (
                    <tr key={campaign.id}>
                      <td><Link href={`/acquisition/campaigns/${campaign.id}`}>{campaign.name}</Link></td>
                      <td>
                        {source.label}
                        <p className="small">{source.sourceName}</p>
                        {source.datasetId || source.connectionId ? (
                          <div className="ctaRow">
                            {source.datasetId ? <Link className="btn smallBtn" href={`/workspace/datasets/${source.datasetId}`}>Dataset</Link> : null}
                            {source.connectionId ? <Link className="btn smallBtn" href={`/acquisition/connections/${source.connectionId}`}>Provider</Link> : null}
                          </div>
                        ) : null}
                      </td>
                      <td>{campaign.state}</td>
                      <td>${(campaign.budgetCents / 100).toLocaleString()}</td>
                      <td>{campaign._count.testCells}</td>
                      <td>{campaign._count.budgetActivities}</td>
                      <td><Link href={`/acquisition/campaigns/${campaign.id}`} className="btn">View details</Link></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Section>
      </>
    );
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      return (
        <>
              <Section title="Acquisition schema not yet applied">
            <div className="card">
              <p>Run migrations/schema apply before opening campaign workspace pages.</p>
              <pre className="code">npm run db:generate{"\n"}npm run db:migrate:deploy{"\n"}npm run db:seed</pre>
            </div>
          </Section>
        </>
      );
    }
    throw error;
  }
}
