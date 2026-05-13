import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Section } from "@/components/site/Section";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { AcquisitionOperatorControls } from "@/components/acquisition/AcquisitionOperatorControls";
import { CampaignStateControls } from "@/components/acquisition/CampaignStateControls";
import { CellMatrixExplorer } from "@/components/acquisition/CellMatrixExplorer";
import { AcquisitionCampaignEditor } from "@/components/acquisition/AcquisitionCampaignEditor";
import { AcquisitionCreativeEditor } from "@/components/acquisition/AcquisitionCreativeEditor";
import { AcquisitionTestCellEditor } from "@/components/acquisition/AcquisitionTestCellEditor";
import { StatusDot, type StatusBand } from "@/components/demo-shell/StatusDot";
import { evaluateCampaignPolicy, type AcquisitionCampaignState } from "@/lib/acquisition";
import {
  ACQUISITION_DEFAULT_SOURCE_NAME,
  acquisitionMetadataRecord,
  acquisitionProviderAudienceLineage,
  acquisitionProviderLabel,
  acquisitionProviderTargetingFacts,
  acquisitionSourceLineageFromMetadata,
  acquisitionSourceTypeLabel
} from "@/lib/acquisition-source-lineage";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

function formatDateTime(value: unknown) {
  const date = typeof value === "string" || value instanceof Date ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleString() : "Unknown";
}

function formatCents(value: number) {
  return new Intl.NumberFormat("en", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value / 100);
}

function objectRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function stringField(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function providerDryRunCampaignId(payload: unknown) {
  const record = objectRecord(payload);
  const proposedAction = objectRecord(record?.proposedAction);
  return stringField(proposedAction?.campaignId);
}

function handoffJobSummary(result: unknown, fallback: string) {
  const record = objectRecord(result);
  const output = objectRecord(record?.output);
  if (!output) return fallback;

  if (output.observed === true) {
    return `Observed ${stringField(output.externalCampaignId) || "provider target"}.`;
  }

  if (output.attributed === true) {
    const outputs = Array.isArray(output.measurementOutputs)
      ? output.measurementOutputs.map((item) => String(item ?? "").replaceAll("_", " ")).filter(Boolean)
      : [];
    const exposure = Number(output.spendExposureCents ?? 0);
    return `${outputs.length} outputs${Number.isFinite(exposure) && exposure > 0 ? ` · ${formatCents(exposure)} exposure` : ""}.`;
  }

  return fallback;
}

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

    const policy = evaluateCampaignPolicy({
      observedCacCents: cac,
      observedRevenueCents: revenue,
      conversions,
      targetCacCents: campaign.targetCacCents,
      targetLtvCents: campaign.targetLtvCents,
      cacAutoPausePctOfTarget: campaign.cacAutoPausePctOfTarget,
      minLtvCacRatio: campaign.minLtvCacRatio
    });
    const targetRatio = campaign.targetLtvCents / Math.max(campaign.targetCacCents, 1);
    const bandLabel: Record<typeof policy.band, string> = {
      healthy: "Healthy",
      watch: "Watch",
      unhealthy: "Unhealthy"
    };
    const policyBand: StatusBand = policy.band;
    const pendingApprovalCount = campaign.auditLogs.filter(
      (log) => log.action === "budget_shift_pending_approval"
    ).length;
    const sourceLog = campaign.auditLogs.find((log) => log.action === "acquisition_dataset_applied");
    const sourceLineage = acquisitionSourceLineageFromMetadata(sourceLog?.metadata, sourceLog?.createdAt ?? null);
    const sourceDatasetId = sourceLineage.datasetId;
    const sourceDataset = sourceDatasetId
      ? await db.workspaceDataset.findUnique({
          where: { id: sourceDatasetId },
          select: { id: true, name: true, sourceType: true, metadata: true, createdAt: true }
        })
      : null;
    const datasetLineage = acquisitionSourceLineageFromMetadata(
      sourceDataset
        ? {
            ...acquisitionMetadataRecord(sourceDataset.metadata),
            sourceName: sourceDataset.name,
            sourceType: sourceDataset.sourceType
          }
        : null,
      null
    );
    const providerAudience = acquisitionProviderAudienceLineage(campaign.audiences);
    const provider = sourceLineage.provider || datasetLineage.provider || providerAudience.provider;
    const externalAccountId = sourceLineage.externalAccountId || datasetLineage.externalAccountId;
    const connectionId = sourceLineage.connectionId || datasetLineage.connectionId;
    const syncedAt = sourceLineage.syncedAt || datasetLineage.syncedAt || sourceDataset?.createdAt;
    const externalCampaignId = providerAudience.externalCampaignId || (
      typeof campaign.objective === "string" && campaign.objective.includes(" campaign ")
        ? campaign.objective.split(" campaign ").at(-1) ?? ""
        : ""
    );
    const recentProviderDryRuns = await db.agentProviderWriteDryRun.findMany({
      where: { app: "acquisition" },
      include: {
        agentJob: {
          select: {
            status: true,
            payload: true,
            completedAt: true
          }
        },
        measurementHandoff: {
          select: {
            id: true,
            status: true,
            observationJobId: true,
            measurementJobId: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 50
    });
    const campaignProviderDryRuns = recentProviderDryRuns
      .filter((dryRun) => {
        const payloadCampaignId = providerDryRunCampaignId(dryRun.agentJob.payload);
        return payloadCampaignId === campaign.id || Boolean(externalCampaignId && dryRun.externalCampaignId === externalCampaignId);
      })
      .slice(0, 8);
    const handoffJobIds = new Set<string>();
    for (const dryRun of campaignProviderDryRuns) {
      if (dryRun.measurementHandoff?.observationJobId) handoffJobIds.add(dryRun.measurementHandoff.observationJobId);
      if (dryRun.measurementHandoff?.measurementJobId) handoffJobIds.add(dryRun.measurementHandoff.measurementJobId);
    }
    const handoffJobs = handoffJobIds.size
      ? await db.agentJob.findMany({
          where: { id: { in: [...handoffJobIds] } },
          select: { id: true, status: true, result: true, completedAt: true, errorMessage: true }
        })
      : [];
    const handoffJobById = new Map(handoffJobs.map((job) => [job.id, job]));

    const transitionHistory = campaign.auditLogs
      .filter((log) => log.action === "campaign_state_change")
      .map((log) => {
        const meta = (log.metadata ?? {}) as { from?: unknown; to?: unknown; reason?: unknown };
        return {
          id: log.id,
          actor: log.actor,
          createdAt: log.createdAt.toISOString(),
          from: String(meta.from ?? "—"),
          to: String(meta.to ?? "—"),
          reason: String(meta.reason ?? "—")
        };
      });

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
            <Link href={`/acquisition/simulations?campaignId=${campaign.id}`} className="btn primary">Run iteration</Link>
            <Link href="/acquisition/campaigns" className="btn">Back to campaigns</Link>
          </div>
        </Section>

        <Section title="Campaign input editor">
          <AcquisitionCampaignEditor campaign={campaign} />
        </Section>

        <Section title="Source lineage">
          <div className="grid grid-4">
            <div className="card">
              <p className="small">Source</p>
              <div className="workspaceSettingValue">{sourceLineage.label !== "Manual/sample" ? sourceLineage.label : datasetLineage.label}</div>
              <p className="small">{sourceLineage.sourceName !== ACQUISITION_DEFAULT_SOURCE_NAME ? sourceLineage.sourceName : datasetLineage.sourceName}</p>
            </div>
            <div className="card">
              <p className="small">Provider campaign</p>
              <div className="workspaceSettingValue">{externalCampaignId || "None"}</div>
              <p className="small">{acquisitionSourceTypeLabel(provider)}</p>
            </div>
            <div className="card">
              <p className="small">Provider account</p>
              <div className="workspaceSettingValue">{typeof externalAccountId === "string" && externalAccountId ? externalAccountId : "None"}</div>
              <p className="small">Connection {typeof connectionId === "string" && connectionId ? connectionId.slice(0, 8) : "not linked"}</p>
            </div>
            <div className="card">
              <p className="small">Applied</p>
              <div className="workspaceSettingValue">{sourceLog ? formatDateTime(sourceLog.createdAt) : "Sample/manual"}</div>
              <p className="small">Synced {formatDateTime(syncedAt)}</p>
            </div>
          </div>
          <div className="ctaRow">
            {sourceDataset ? <Link className="btn smallBtn" href={`/workspace/datasets/${sourceDataset.id}`}>Review dataset</Link> : null}
            {typeof connectionId === "string" && connectionId ? <Link className="btn smallBtn" href={`/acquisition/connections/${connectionId}`}>Open provider account</Link> : null}
          </div>
        </Section>

        <Section title="Policy engine status">
          <div className="grid grid-4">
            <div className="card">
              <div className={`kpi bandText--${policyBand}`}>
                <StatusDot band={policyBand} /> {bandLabel[policy.band]}
              </div>
              <p>LTV : CAC band</p>
            </div>
            <div className="card">
              <div className="kpi">
                {policy.observedRatio > 0 ? `${policy.observedRatio.toFixed(2)}x` : "—"}
              </div>
              <p>Observed ratio (target {targetRatio.toFixed(2)}x, floor {campaign.minLtvCacRatio.toFixed(2)}x)</p>
            </div>
            <div className="card">
              <div className="kpi">
                {policy.cacOverrunPct > 0 ? `${(policy.cacOverrunPct * 100).toFixed(0)}%` : "—"}
              </div>
              <p>CAC vs. target (auto-pause at {(campaign.cacAutoPausePctOfTarget * 100).toFixed(0)}%)</p>
            </div>
            <div className="card">
              <div className="kpi">{pendingApprovalCount}</div>
              <p>Budget shifts pending approval</p>
            </div>
          </div>
          {policy.reasons.length > 0 ? (
            <div className="card" style={{ marginTop: 12 }}>
              <h3>Policy alerts</h3>
              <ul>
                {policy.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </Section>

        <Section title="Campaign state machine">
          <CampaignStateControls
            campaignId={campaign.id}
            currentState={campaign.state as AcquisitionCampaignState}
            history={transitionHistory}
          />
        </Section>

        <Section title="Operator overrides and guardrails">
          <AcquisitionOperatorControls
            campaignId={campaign.id}
            initialMaxShift={campaign.maxBudgetShiftPct}
            initialMinConfidence={campaign.minConfidence}
            initialCooldownHours={campaign.cooldownHours}
            initialCacAutoPausePct={campaign.cacAutoPausePctOfTarget}
            initialMinLtvCacRatio={campaign.minLtvCacRatio}
            initialApprovalCapPct={campaign.approvalCapPct}
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

        <Section title="Provider write evidence">
          {campaignProviderDryRuns.length === 0 ? (
            <div className="card">
              <p>No provider-write dry-runs are linked to this campaign yet. Approve an over-cap acquisition shift and run the dry-run worker to generate evidence here.</p>
            </div>
          ) : (
            <div className="activityFeed">
              {campaignProviderDryRuns.map((dryRun) => (
                <details className="activityFeedItem" key={dryRun.id}>
                  <summary>
                    <span className="activityFeedDate">{formatDateTime(dryRun.createdAt)}</span>
                    <span className={`statusPill ${dryRun.status === "ready" ? "live" : "warning"}`}>{dryRun.status.replaceAll("_", " ")}</span>
                    <span className="activityFeedTitle">
                      <strong>{dryRun.operationType.replaceAll("_", " ")}</strong>
                      <span>{acquisitionProviderLabel(dryRun.provider)} · {formatCents(dryRun.spendExposureCents)} exposure</span>
                    </span>
                    <span className="activityFeedApp">{dryRun.agentJob.status.replaceAll("_", " ")}</span>
                  </summary>
                  <div className="activityFeedDetail">
                    <div>
                      <p>{dryRun.externalCampaignId ?? dryRun.externalAccountId ?? "Provider target not resolved yet."}</p>
                      <p className="small">
                        Account: {dryRun.externalAccountId ?? "none"} · Rollback: {dryRun.rollbackSupported ? "supported" : "not supported"}
                      </p>
                      {dryRun.rollbackPlan ? <p className="small">{dryRun.rollbackPlan}</p> : null}
                      {dryRun.blockers.length > 0 ? <p className="small">Blockers: {dryRun.blockers.map((blocker) => blocker.replaceAll("_", " ")).join(" · ")}</p> : null}
                      {dryRun.measurementHandoff ? (
                        <div>
                          <p className="small">Measurement: {dryRun.measurementHandoff.status.replaceAll("_", " ")}</p>
                          {dryRun.measurementHandoff.observationJobId ? (() => {
                            const observationJob = handoffJobById.get(dryRun.measurementHandoff.observationJobId!);
                            return (
                              <p className="small">
                                Observation: {observationJob?.status.replaceAll("_", " ") ?? "queued"} · {handoffJobSummary(observationJob?.result, observationJob?.errorMessage ?? "No observation output yet.")}
                              </p>
                            );
                          })() : null}
                          {dryRun.measurementHandoff.measurementJobId ? (() => {
                            const measurementJob = handoffJobById.get(dryRun.measurementHandoff.measurementJobId!);
                            return (
                              <p className="small">
                                Attribution: {measurementJob?.status.replaceAll("_", " ") ?? "queued"} · {handoffJobSummary(measurementJob?.result, measurementJob?.errorMessage ?? "No attribution output yet.")}
                              </p>
                            );
                          })() : null}
                        </div>
                      ) : null}
                    </div>
                    <Link className="btn smallBtn" href={`/workspace/agents/dry-runs/${dryRun.id}`}>Inspect dry run</Link>
                  </div>
                </details>
              ))}
            </div>
          )}
        </Section>

        <Section title="Audience provider targeting">
          {campaign.audiences.length === 0 ? (
            <div className="card"><p>No audience segments are attached to this campaign.</p></div>
          ) : (
            <div className="tableScroll">
              <table className="table">
                <thead>
                  <tr>
                    <th>Audience</th>
                    <th>Template</th>
                    <th>Provider</th>
                    <th>Provider campaign</th>
                    <th>Child object</th>
                  </tr>
                </thead>
                <tbody>
                  {campaign.audiences.map((audience) => {
                    const facts = acquisitionProviderTargetingFacts(audience.targetingJson);
                    return (
                      <tr key={audience.id}>
                        <td>
                          <strong>{audience.name}</strong>
                          <div className="small">{audience.audienceType}</div>
                        </td>
                        <td>
                          {audience.templateId ? (
                            <Link href={`/acquisition/audiences/${audience.templateId}`}>Open template</Link>
                          ) : (
                            <span className="small">Default segment</span>
                          )}
                        </td>
                        <td>{acquisitionProviderLabel(facts.provider)}</td>
                        <td>{facts.externalCampaignId || "None"}</td>
                        <td>{facts.externalChildId || "None"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <Section title="Test cell matrix (creative × audience)">
          <CellMatrixExplorer
            creatives={campaign.creatives.map((c) => ({
              id: c.id,
              headline: c.headline,
              channel: c.channel
            }))}
            audiences={campaign.audiences.map((a) => ({
              id: a.id,
              name: a.name,
              audienceType: a.audienceType
            }))}
            cells={campaign.testCells.map((cell) => ({
              id: cell.id,
              creativeId: cell.creativeId,
              audienceId: cell.audienceId,
              clicks: cell.clicks,
              conversions: cell.conversions,
              spendCents: cell.spendCents,
              cacCents: cell.cacCents,
              roas: cell.roas,
              score: cell.score
            }))}
          />
        </Section>

        <Section title="Creative inputs">
          <div className="grid grid-2">
            {campaign.creatives.map((creative) => (
              <AcquisitionCreativeEditor creative={creative} key={creative.id} />
            ))}
          </div>
        </Section>

        <Section title="Editable test cells">
          <div className="tableScroll">
            <table className="table editableTable">
              <thead><tr><th>Cell</th><th>Budget $</th><th>Impr.</th><th>Clicks</th><th>Conv.</th><th>Spend $</th><th>Revenue $</th><th>Score</th><th>Action</th></tr></thead>
              <tbody>
                {campaign.testCells.slice(0, 15).map((cell) => (
                  <AcquisitionTestCellEditor cell={cell} key={cell.id} />
                ))}
              </tbody>
            </table>
          </div>
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
