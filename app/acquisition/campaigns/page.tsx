import Link from "next/link";
import { db } from "@/lib/db";
import { Section } from "@/components/site/Section";
import { AcquisitionWorkspaceNav } from "@/components/acquisition/AcquisitionWorkspaceNav";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";

export const dynamic = "force-dynamic";

export default async function AcquisitionCampaignsPage() {
  try {
    const campaigns = await db.acquisitionCampaign.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { testCells: true, budgetActivities: true } } },
      take: 50
    });

    return (
      <>
        <AcquisitionWorkspaceNav />
        <Section title="Campaign workspace">
          <p>Review campaigns, open detail pages, and monitor orchestration status over time.</p>
          <div className="ctaRow">
            <Link href="/acquisition/create" className="btn primary">Create campaign</Link>
            <Link href="/acquisition/simulations" className="btn">Run simulations</Link>
          </div>
        </Section>

        <Section title="Campaign list">
          {campaigns.length === 0 ? (
            <div className="card"><p>No campaigns yet. Create your first campaign to begin simulation loops.</p></div>
          ) : (
            <table className="table">
              <thead><tr><th>Name</th><th>State</th><th>Budget</th><th>Cells</th><th>Budget actions</th><th>Open</th></tr></thead>
              <tbody>
                {campaigns.map((campaign) => (
                  <tr key={campaign.id}>
                    <td>{campaign.name}</td>
                    <td>{campaign.state}</td>
                    <td>${(campaign.budgetCents / 100).toLocaleString()}</td>
                    <td>{campaign._count.testCells}</td>
                    <td>{campaign._count.budgetActivities}</td>
                    <td><Link href={`/acquisition/campaigns/${campaign.id}`} className="btn">View details</Link></td>
                  </tr>
                ))}
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
          <AcquisitionWorkspaceNav />
          <Section title="Acquisition schema not yet applied">
            <div className="card">
              <p>Run migrations/schema apply before opening campaign workspace pages.</p>
              <pre className="code">npm run db:generate{"\n"}npx prisma db push{"\n"}npm run db:seed</pre>
            </div>
          </Section>
        </>
      );
    }
    throw error;
  }
}
