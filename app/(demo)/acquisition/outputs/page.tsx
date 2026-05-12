import Link from "next/link";
import { Section } from "@/components/site/Section";
import { AcquisitionInsightsPanel } from "@/components/acquisition/AcquisitionInsightsPanel";
import { AcquisitionOperatorControls } from "@/components/acquisition/AcquisitionOperatorControls";
import { db } from "@/lib/db";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import {
  acquisitionLineageIsProviderBacked,
  acquisitionSourceLineageFromAuditLogs
} from "@/lib/acquisition-source-lineage";

export const dynamic = "force-dynamic";

export default async function AcquisitionOutputsPage() {
  try {
    const campaigns = await db.acquisitionCampaign.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        testCells: true,
        budgetActivities: true,
        auditLogs: {
          where: { action: "acquisition_dataset_applied" },
          orderBy: { createdAt: "desc" },
          take: 1
        }
      }
    });

    const top = campaigns[0];
    const topCampaign = top
      ? await db.acquisitionCampaign.findUnique({
        where: { id: top.id },
        include: {
          testCells: { include: { creative: true, audience: true }, orderBy: { score: "desc" } },
          audiences: true,
          auditLogs: { orderBy: { createdAt: "desc" }, take: 20 }
        }
      })
      : null;
    const spend = top?.testCells.reduce((sum, cell) => sum + cell.spendCents, 0) ?? 0;
    const revenue = top?.testCells.reduce((sum, cell) => sum + cell.revenueCents, 0) ?? 0;
    const conversions = top?.testCells.reduce((sum, cell) => sum + cell.conversions, 0) ?? 0;
    const cpa = conversions ? Math.round(spend / conversions) : 0;
    const topSource = top ? acquisitionSourceLineageFromAuditLogs(top.auditLogs) : null;
    const providerBackedCampaigns = campaigns.filter((campaign) => {
      const source = acquisitionSourceLineageFromAuditLogs(campaign.auditLogs);
      return acquisitionLineageIsProviderBacked(source);
    }).length;

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
          <div className="grid grid-3" style={{ marginTop: 12 }}>
            <div className="card">
              <p className="small">Top campaign source</p>
              <div className="workspaceSettingValue">{topSource?.label ?? "None"}</div>
              <p className="small">{topSource?.sourceName ?? "No campaign selected"}</p>
            </div>
            <div className="card">
              <p className="small">Provider-backed campaigns</p>
              <div className="kpi">{providerBackedCampaigns.toLocaleString()}</div>
              <p className="small">Google Ads or Meta Ads lineage</p>
            </div>
            <div className="card">
              <p className="small">Provider account</p>
              <div className="workspaceSettingValue">{topSource?.externalAccountId || "None"}</div>
              <p className="small">{topSource?.connectionId ? `Connection ${topSource.connectionId.slice(0, 8)}` : "No linked provider account"}</p>
            </div>
          </div>
        </Section>

        {topSource?.datasetId || topSource?.connectionId ? (
          <Section title="Top campaign lineage">
            <div className="card">
              <p>
                {top?.name} is currently tied to {topSource.label} data
                {topSource.sourceName ? ` from ${topSource.sourceName}` : ""}.
              </p>
              <div className="ctaRow">
                {topSource.datasetId ? <Link className="btn smallBtn" href={`/workspace/datasets/${topSource.datasetId}`}>Review dataset</Link> : null}
                {topSource.connectionId ? <Link className="btn smallBtn" href={`/acquisition/connections/${topSource.connectionId}`}>Open provider account</Link> : null}
                {top ? <Link className="btn smallBtn primary" href={`/acquisition/campaigns/${top.id}`}>Open campaign</Link> : null}
              </div>
            </div>
          </Section>
        ) : null}

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
              initialCacAutoPausePct={topCampaign.cacAutoPausePctOfTarget}
              initialMinLtvCacRatio={topCampaign.minLtvCacRatio}
              initialApprovalCapPct={topCampaign.approvalCapPct}
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
              <thead><tr><th>Name</th><th>Source</th><th>State</th><th>Budget</th><th>Test cells</th><th>Budget activities</th></tr></thead>
              <tbody>
                {campaigns.map((campaign) => {
                  const source = acquisitionSourceLineageFromAuditLogs(campaign.auditLogs);
                  return (
                    <tr key={campaign.id}>
                      <td><Link href={`/acquisition/campaigns/${campaign.id}`}>{campaign.name}</Link></td>
                      <td>
                        {source.label}
                        <p className="small">{source.sourceName}</p>
                      </td>
                      <td>{campaign.state}</td>
                      <td>${(campaign.budgetCents / 100).toLocaleString()}</td>
                      <td>{campaign.testCells.length}</td>
                      <td>{campaign.budgetActivities.length}</td>
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
              <p>Run the schema update before using acquisition outputs:</p>
              <pre className="code">npm run db:generate{"\n"}npm run db:migrate:deploy{"\n"}npm run db:seed</pre>
            </div>
          </Section>
        </>
      );
    }
    throw error;
  }
}
