import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Section } from "@/components/site/Section";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { AcquisitionOperatorControls } from "@/components/acquisition/AcquisitionOperatorControls";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function AcquisitionCampaignDetailPage({ params }: PageProps) {
  const { id } = await params;

  try {
    const campaign = await db.acquisitionCampaign.findUnique({
      where: { id },
      include: {
        creatives: true,
        audiences: true,
        testCells: {
          include: { creative: true, audience: true },
          orderBy: { score: "desc" }
        },
        budgetActivities: { orderBy: { createdAt: "desc" }, take: 30 },
        auditLogs: { orderBy: { createdAt: "desc" }, take: 30 }
      }
    });

    if (!campaign) notFound();

    const spend = campaign.testCells.reduce((sum, cell) => sum + cell.spendCents, 0);
    const revenue = campaign.testCells.reduce((sum, cell) => sum + cell.revenueCents, 0);
    const conversions = campaign.testCells.reduce((sum, cell) => sum + cell.conversions, 0);
    const cac = conversions ? Math.round(spend / conversions) : 0;
    const roas = spend > 0 ? revenue / spend : 0;

    return (
      <>
          <Section title={`Campaign detail: ${campaign.name}`}>
          <p>{campaign.objective}</p>
          <div className="grid grid-4" style={{ marginTop: 12 }}>
            <div className="card"><div className="kpi">{campaign.state}</div><p>Current state</p></div>
            <div className="card"><div className="kpi">${(cac / 100).toFixed(0)}</div><p>CAC</p></div>
            <div className="card"><div className="kpi">{roas.toFixed(2)}x</div><p>ROAS</p></div>
            <div className="card"><div className="kpi">{campaign.cooldownHours}h</div><p>Budget-shift cooldown</p></div>
          </div>
          <div className="ctaRow">
            <Link href="/acquisition/simulations" className="btn primary">Run iteration</Link>
            <Link href="/acquisition/campaigns" className="btn">Back to campaigns</Link>
          </div>
        </Section>


        <Section title="Operator overrides and guardrails">
          <AcquisitionOperatorControls
            campaignId={campaign.id}
            initialMaxShift={campaign.maxBudgetShiftPct}
            initialMinConfidence={campaign.minConfidence}
            initialCooldownHours={campaign.cooldownHours}
            cellOptions={campaign.testCells.slice(0, 25).map((cell) => ({
              id: cell.id,
              label: `${cell.creative.headline.slice(0, 36)} • ${cell.audience.name}`,
              budgetCents: cell.budgetCents
            }))}
            recentOverrideLogs={campaign.auditLogs.map((log) => ({
              id: log.id,
              action: log.action,
              createdAt: log.createdAt.toISOString(),
              metadata: log.metadata
            }))}
          />
        </Section>

        <Section title="Top test cells">
          <table className="table">
            <thead><tr><th>Creative</th><th>Audience</th><th>Score</th><th>Spend</th><th>Conversions</th><th>ROAS</th></tr></thead>
            <tbody>
              {campaign.testCells.slice(0, 15).map((cell) => (
                <tr key={cell.id}>
                  <td>{cell.creative.headline}</td>
                  <td>{cell.audience.name}</td>
                  <td>{cell.score.toFixed(3)}</td>
                  <td>${(cell.spendCents / 100).toFixed(0)}</td>
                  <td>{cell.conversions}</td>
                  <td>{cell.roas.toFixed(2)}x</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <Section title="Recent budget activities">
          {campaign.budgetActivities.length === 0 ? (
            <div className="card"><p>No budget activities yet. Run an iteration first.</p></div>
          ) : (
            <table className="table">
              <thead><tr><th>When</th><th>Amount</th><th>Reason</th></tr></thead>
              <tbody>
                {campaign.budgetActivities.map((activity) => (
                  <tr key={activity.id}>
                    <td>{new Date(activity.createdAt).toLocaleString()}</td>
                    <td>${(activity.amountCents / 100).toFixed(0)}</td>
                    <td>{activity.reason}</td>
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
              <p>Run migrations/schema apply before opening campaign detail pages.</p>
              <pre className="code">npm run db:generate{"\n"}npm run db:migrate:deploy{"\n"}npm run db:seed</pre>
            </div>
          </Section>
        </>
      );
    }
    throw error;
  }
}
