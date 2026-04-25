import Link from "next/link";
import { Section } from "@/components/site/Section";
import { AcquisitionInsightsPanel } from "@/components/acquisition/AcquisitionInsightsPanel";
import { AcquisitionOperatorControls } from "@/components/acquisition/AcquisitionOperatorControls";
import { db } from "@/lib/db";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";

export const dynamic = "force-dynamic";

export default async function AcquisitionOutputsPage() {
  try {
    const campaigns = await db.acquisitionCampaign.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        testCells: true,
        budgetActivities: true
      }
    });

    const top = campaigns[0];
    const topCampaign = top
      ? await db.acquisitionCampaign.findUnique({
        where: { id: top.id },
        include: {
          testCells: { include: { creative: true, audience: true }, orderBy: { score: "desc" } },
          auditLogs: { orderBy: { createdAt: "desc" }, take: 20 }
        }
      })
      : null;
    const spend = top?.testCells.reduce((sum, cell) => sum + cell.spendCents, 0) ?? 0;
    const revenue = top?.testCells.reduce((sum, cell) => sum + cell.revenueCents, 0) ?? 0;
    const conversions = top?.testCells.reduce((sum, cell) => sum + cell.conversions, 0) ?? 0;
    const cpa = conversions ? Math.round(spend / conversions) : 0;

    return (
      <>
          <Section title="Outputs: campaign economics and decision audit trail">
          <p>
            Outputs include campaign-level metrics, top-performing cells, and budget-activity logs used to explain every automated action.
          </p>
          <div className="grid grid-4" style={{ marginTop: 12 }}>
            <div className="card"><div className="kpi">{campaigns.length}</div><p>Campaigns tracked</p></div>
            <div className="card"><div className="kpi">${(spend / 100).toFixed(0)}</div><p>Spend (top campaign)</p></div>
            <div className="card"><div className="kpi">${(revenue / 100).toFixed(0)}</div><p>Revenue (top campaign)</p></div>
            <div className="card"><div className="kpi">${(cpa / 100).toFixed(0)}</div><p>CPA (top campaign)</p></div>
          </div>
        </Section>

        <Section title="Interactive insights">
          <AcquisitionInsightsPanel />
        </Section>

        {topCampaign ? (
          <Section title="Operator controls (top campaign)">
            <AcquisitionOperatorControls
              campaignId={topCampaign.id}
              initialMaxShift={topCampaign.maxBudgetShiftPct}
              initialMinConfidence={topCampaign.minConfidence}
              initialCooldownHours={topCampaign.cooldownHours}
              cellOptions={topCampaign.testCells.slice(0, 25).map((cell) => ({
                id: cell.id,
                label: `${cell.creative.headline.slice(0, 36)} • ${cell.audience.name}`,
                budgetCents: cell.budgetCents
              }))}
              recentOverrideLogs={topCampaign.auditLogs.map((log) => ({
                id: log.id,
                action: log.action,
                createdAt: log.createdAt.toISOString(),
                metadata: log.metadata
              }))}
            />
          </Section>
        ) : null}

        <Section title="Recent campaigns">
          {campaigns.length === 0 ? (
            <div className="card"><p>No acquisition campaigns yet. Create one from Inputs and run iterations from Simulations.</p></div>
          ) : (
            <table className="table">
              <thead><tr><th>Name</th><th>State</th><th>Budget</th><th>Test cells</th><th>Budget activities</th></tr></thead>
              <tbody>
                {campaigns.map((campaign) => (
                  <tr key={campaign.id}>
                    <td><Link href={`/acquisition/campaigns/${campaign.id}`}>{campaign.name}</Link></td>
                    <td>{campaign.state}</td>
                    <td>${(campaign.budgetCents / 100).toLocaleString()}</td>
                    <td>{campaign.testCells.length}</td>
                    <td>{campaign.budgetActivities.length}</td>
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
              <Section title="Acquisition schema not yet applied">
            <div className="card">
              <p>Run the schema update before using acquisition outputs:</p>
              <pre className="code">npm run db:generate{"\n"}npx prisma db push{"\n"}npm run db:seed</pre>
            </div>
          </Section>
        </>
      );
    }
    throw error;
  }
}
