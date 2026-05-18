import { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { DemoWorkspaceTabs } from "@/components/demo-shell/DemoWorkspaceTabs";
import { Section } from "@/components/site/Section";
import { ACCOUNT_SESSION_COOKIE, verifyAccountSessionToken } from "@/lib/account-session";
import { db } from "@/lib/db";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { buildMetadata } from "@/lib/seo";
import {
  evaluateAgentCompliancePosture,
  evaluateSecretPosture
} from "@/lib/agent-platform-governance";
import {
  acquisitionProviderDryRunAdapterAvailable,
  buildAcquisitionProviderWriteReadiness
} from "@/lib/acquisition-agent-generalization";
import { AGENT_WORKER_QUEUE_ALLOWLIST, DEFAULT_AGENT_WORKER_QUEUES } from "@/lib/agent-worker";
import { buildCustomerReadinessReviewWorkflow } from "@/lib/customer-readiness-review-workflow";
import { isOAuthEncryptionAvailable } from "@/lib/oauth-tokens";
import { buildWorkspaceExecutionUiGate } from "@/lib/workspace-execution-ui-gates";
import { buildWorkspaceLaunchReadiness } from "@/lib/workspace-launch-readiness";
import { upsertWorkspaceLaunchReadinessRecord } from "@/lib/workspace-launch-readiness-records";
import { decideAgentApprovalAction, decideAgentJobAction, runAgentJobOnceAction, runAgentWorkerBatchAction } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  title: "Agent Operations | David Wolfe",
  description: "Workspace agent operations view for queued jobs, pending approvals, dead letters, and governance posture.",
  path: "/workspace/agents"
});

async function currentAccountUserId() {
  const cookieStore = await cookies();
  return verifyAccountSessionToken(cookieStore.get(ACCOUNT_SESSION_COOKIE)?.value)?.userId ?? null;
}

function formatDate(value: Date | null | undefined) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(value);
}

function statusClass(status: string) {
  if (["completed", "approved", "ready"].includes(status)) return "live";
  if (["failed", "dead_lettered", "rejected", "expired", "blocked"].includes(status)) return "warning";
  return "progress";
}

function isOpenApproval(status: string) {
  return status === "pending" || status === "escalated";
}

function jobActionsFor(status: string) {
  if (status === "queued") return ["claim", "cancel"];
  if (status === "running") return ["complete", "fail", "cancel"];
  if (status === "failed" || status === "dead_lettered" || status === "cancelled") return ["requeue"];
  return [];
}

function label(value: string) {
  return value.replace(/_/g, " ");
}

function formatCents(value: number) {
  return new Intl.NumberFormat("en", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value / 100);
}

function objectRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function stringField(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numericField(value: unknown) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount) : 0;
}

function approvalProviderContext(value: unknown) {
  const proposedAction = objectRecord(value);
  if (!proposedAction) return null;
  const provider = stringField(proposedAction.provider);
  const externalAccountId = stringField(proposedAction.externalAccountId);
  const externalCampaignId = stringField(proposedAction.externalCampaignId ?? proposedAction.campaignId);
  if (!provider && !externalAccountId && !externalCampaignId) return null;

  return {
    provider,
    operationType: stringField(proposedAction.operationType ?? proposedAction.type),
    externalAccountId,
    externalCampaignId,
    externalAdGroupId: stringField(proposedAction.externalAdGroupId),
    externalAdSetId: stringField(proposedAction.externalAdSetId),
    spendExposureCents: numericField(proposedAction.spendExposureCents ?? proposedAction.shiftAmountCents ?? proposedAction.amountCents)
  };
}

function approvalAcquisitionContext(value: unknown) {
  const proposedAction = objectRecord(value);
  if (!proposedAction) return null;
  const campaignId = stringField(proposedAction.campaignId);
  const fromTestCellId = stringField(proposedAction.fromTestCellId);
  const toTestCellId = stringField(proposedAction.toTestCellId);
  const amountCents = numericField(proposedAction.amountCents ?? proposedAction.shiftAmountCents);
  const shiftPct = Number(proposedAction.shiftPct ?? 0);
  if (!campaignId && !fromTestCellId && !toTestCellId && !amountCents) return null;

  return {
    campaignId,
    fromTestCellId,
    toTestCellId,
    amountCents,
    shiftPct: Number.isFinite(shiftPct) ? shiftPct : 0
  };
}

function ApprovalProviderContext({ proposedAction }: { proposedAction: unknown }) {
  const context = approvalProviderContext(proposedAction);
  if (!context) return null;
  const childTarget = context.externalAdSetId
    ? `Ad set: ${context.externalAdSetId}`
    : context.externalAdGroupId
      ? `Ad group: ${context.externalAdGroupId}`
      : null;

  return (
    <div className="agentJobResult">
      <span>Provider: {context.provider ? label(context.provider) : "unknown"}</span>
      <span>Operation: {context.operationType ? label(context.operationType) : "provider write"}</span>
      <span>Account: {context.externalAccountId ?? "not selected"}</span>
      <span>Campaign: {context.externalCampaignId ?? "not selected"}</span>
      {childTarget ? <span>{childTarget}</span> : null}
      <span>Exposure: {formatCents(context.spendExposureCents)}</span>
    </div>
  );
}

function ApprovalAcquisitionContext({ proposedAction }: { proposedAction: unknown }) {
  const context = approvalAcquisitionContext(proposedAction);
  if (!context) return null;

  return (
    <div className="agentJobResult">
      <span>Campaign: {context.campaignId ?? "not linked"}</span>
      <span>Shift: {formatCents(context.amountCents)}{context.shiftPct ? ` · ${(context.shiftPct * 100).toFixed(1)}%` : ""}</span>
      {context.fromTestCellId ? <span>From cell: {context.fromTestCellId}</span> : null}
      {context.toTestCellId ? <span>To cell: {context.toTestCellId}</span> : null}
      {context.campaignId ? (
        <div className="ctaRow" style={{ marginTop: 4 }}>
          <Link className="btn smallBtn" href={`/acquisition/campaigns/${context.campaignId}`}>Open campaign</Link>
          <Link className="btn smallBtn" href={`/acquisition/simulations?campaignId=${context.campaignId}`}>Simulate</Link>
          <Link className="btn smallBtn" href={`/acquisition/audit?campaignId=${context.campaignId}&action=budget_shift_pending_approval&window=all`}>Audit trail</Link>
        </div>
      ) : null}
    </div>
  );
}

function agentJobResultSummary(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const result = value as Record<string, unknown>;
  return {
    executor: typeof result.executor === "string" ? result.executor : null,
    action: typeof result.action === "string" ? result.action : null,
    providerMutation: typeof result.providerMutation === "string" ? result.providerMutation : null,
    summary: typeof result.summary === "string" ? result.summary : null
  };
}

function AgentJobResultDetail({ result }: { result: unknown }) {
  const summary = agentJobResultSummary(result);
  if (!summary) return null;

  return (
    <div className="agentJobResult">
      <span>Executor: {summary.executor ?? "unknown"}</span>
      <span>Action: {label(summary.action ?? "unknown")}</span>
      <span>Mutation: {label(summary.providerMutation ?? "none")}</span>
      {summary.summary ? <p>{summary.summary}</p> : null}
    </div>
  );
}

function loadSchedulerStatus() {
  return {
    cadence: "Daily 05:00 UTC",
    endpoint: "GET /api/workspace/agents/run-batch",
    maxJobs: 10,
    authReady: Boolean(process.env.CRON_SECRET?.trim() || process.env.AGENT_WORKER_SECRET?.trim()),
    allowlistSize: AGENT_WORKER_QUEUE_ALLOWLIST.size,
    queues: [...DEFAULT_AGENT_WORKER_QUEUES]
  };
}

function loadAcquisitionProviderWriteReadiness() {
  return buildAcquisitionProviderWriteReadiness({
    providerDryRunAdapterAvailable: acquisitionProviderDryRunAdapterAvailable(),
    rollbackMetadataAvailable: Boolean(process.env.ACQUISITION_PROVIDER_ROLLBACK_METADATA_READY?.trim()),
    approvalPolicyConfigured: true,
    measurementConfigured: Boolean(process.env.ACQUISITION_PROVIDER_MEASUREMENT_READY?.trim()),
    protectedCampaignChecksEnabled: true,
    emergencyStopConfigured: true
  });
}

function buildFallbackWorkspaceLaunchReadiness(workspace: { id: string; name: string } | null, providerWriteReady: boolean) {
  return buildWorkspaceLaunchReadiness({
    customerName: workspace?.name ?? "Default demo workspace",
    workspaceId: workspace?.id ?? "default-demo-workspace",
    providerReadReady: true,
    providerWriteReady,
    auditExportHref: "/api/workspace/agents/audit-export"
  });
}

async function loadWorkspaceLaunchReadiness(workspace: { id: string; name: string } | null, accountUserId: string | null, providerWriteReady: boolean) {
  if (!workspace) return buildFallbackWorkspaceLaunchReadiness(null, providerWriteReady);
  const { readiness } = await upsertWorkspaceLaunchReadinessRecord({
    customerName: workspace.name,
    workspaceId: workspace.id,
    accountUserId,
    providerReadReady: true,
    providerWriteReady,
    auditExportHref: "/api/workspace/agents/audit-export"
  });
  return readiness;
}

async function loadAgentOperations(accountUserId: string | null) {
  const scheduler = loadSchedulerStatus();
  const acquisitionProviderWriteReadiness = loadAcquisitionProviderWriteReadiness();

  try {
    const workspace = await db.workspace.findUnique({ where: { slug: "default-demo-workspace" } });
    if (!workspace) {
      return {
        compatibilityMode: false,
        workspace: null,
        jobs: [],
        approvals: [],
        dryRuns: [],
        measurementHandoffs: [],
        counts: { queued: 0, running: 0, deadLettered: 0, pendingApprovals: 0 },
        scheduler,
        acquisitionProviderWriteReadiness,
        launchReadiness: buildFallbackWorkspaceLaunchReadiness(null, acquisitionProviderWriteReadiness.readyForApprovedMutation),
        posture: evaluateAgentCompliancePosture({
          tenantIsolationEnforced: false,
          secretPosture: evaluateSecretPosture({ encryptionAvailable: isOAuthEncryptionAvailable(), tokenPresent: false }),
          auditExportEnabled: false,
          approvalQueueEnabled: false,
          deadLetterReviewEnabled: false
        })
      };
    }

    const [jobs, approvals, dryRuns, measurementHandoffs, queued, running, deadLettered, pendingApprovals, launchReadiness] = await Promise.all([
      db.agentJob.findMany({
        where: { workspaceId: workspace.id, OR: [{ accountUserId }, { accountUserId: null }] },
        orderBy: [{ createdAt: "desc" }],
        take: 12
      }),
      db.agentApprovalRequest.findMany({
        where: {
          workspaceId: workspace.id,
          OR: [{ requestedByAccountUserId: accountUserId }, { requestedByAccountUserId: null }]
        },
        orderBy: [{ createdAt: "desc" }],
        take: 12
      }),
      db.agentProviderWriteDryRun.findMany({
        where: { workspaceId: workspace.id, OR: [{ accountUserId }, { accountUserId: null }] },
        orderBy: [{ createdAt: "desc" }],
        take: 6
      }),
      db.agentProviderWriteMeasurementHandoff.findMany({
        where: { workspaceId: workspace.id, OR: [{ accountUserId }, { accountUserId: null }] },
        orderBy: [{ createdAt: "desc" }],
        take: 6
      }),
      db.agentJob.count({ where: { workspaceId: workspace.id, status: "queued" } }),
      db.agentJob.count({ where: { workspaceId: workspace.id, status: "running" } }),
      db.agentJob.count({ where: { workspaceId: workspace.id, status: "dead_lettered" } }),
      db.agentApprovalRequest.count({ where: { workspaceId: workspace.id, status: { in: ["pending", "escalated"] } } }),
      loadWorkspaceLaunchReadiness(workspace, accountUserId, acquisitionProviderWriteReadiness.readyForApprovedMutation)
    ]);

    const secretPosture = evaluateSecretPosture({
      encryptionAvailable: isOAuthEncryptionAvailable(),
      tokenPresent: true,
      rotatedAt: new Date(),
      rotationWindowDays: 90
    });
    const posture = evaluateAgentCompliancePosture({
      tenantIsolationEnforced: Boolean(workspace.id),
      secretPosture,
      auditExportEnabled: true,
      approvalQueueEnabled: true,
      deadLetterReviewEnabled: true
    });

    return {
      compatibilityMode: false,
      workspace,
      jobs,
      approvals,
      dryRuns,
      measurementHandoffs,
      counts: { queued, running, deadLettered, pendingApprovals },
      scheduler,
      acquisitionProviderWriteReadiness,
      launchReadiness,
      posture
    };
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      return {
        compatibilityMode: true,
        workspace: null,
        jobs: [],
        approvals: [],
        dryRuns: [],
        measurementHandoffs: [],
        counts: { queued: 0, running: 0, deadLettered: 0, pendingApprovals: 0 },
        scheduler,
        acquisitionProviderWriteReadiness,
        launchReadiness: buildFallbackWorkspaceLaunchReadiness(null, acquisitionProviderWriteReadiness.readyForApprovedMutation),
        posture: evaluateAgentCompliancePosture({
          tenantIsolationEnforced: false,
          secretPosture: evaluateSecretPosture({ encryptionAvailable: false, tokenPresent: false }),
          auditExportEnabled: false,
          approvalQueueEnabled: false,
          deadLetterReviewEnabled: false
        })
      };
    }
    throw error;
  }
}

export default async function AgentOperationsPage({ searchParams }: { searchParams?: Promise<{ approvalId?: string }> }) {
  const accountUserId = await currentAccountUserId();
  const selectedParams = await searchParams;
  const selectedApprovalId = selectedParams?.approvalId ?? null;
  const operations = await loadAgentOperations(accountUserId);
  const postureReasons = [...operations.posture.blockers, ...operations.posture.warnings];
  const acquisitionBlockers = operations.acquisitionProviderWriteReadiness.blockers.map(label);
  const executionGate = buildWorkspaceExecutionUiGate(operations.launchReadiness);
  const reviewWorkflow = buildCustomerReadinessReviewWorkflow({
    owners: operations.launchReadiness.packet.sections.owners,
    launchMode: operations.launchReadiness.maxAllowedLaunchMode
  });
  const launchStatusClass = operations.launchReadiness.status === "ready"
    ? "live"
    : operations.launchReadiness.status === "blocked"
      ? "warning"
      : "progress";

  return (
    <>
      <DemoWorkspaceTabs />
      <Section eyebrow="Workspace" title="Agent operations">
        <p>
          Inspect the durable work queue, customer approvals, dead-letter review state, and governance posture that sit
          behind lifecycle and acquisition agent execution.
        </p>
        <div className="workspacePageGuide" aria-label="Agent operations sections">
          <a href="#agent-status">Status</a>
          <a href="#agent-approvals">Approvals</a>
          <a href="#agent-jobs">Jobs</a>
          <a href="#provider-writes">Provider writes</a>
          <a href="#launch-readiness">Launch readiness</a>
          <a href="#agent-evidence">Evidence</a>
        </div>
      </Section>

      <Section title="Status" id="agent-status">
        <div className="grid grid-4 workspaceCompactMetricGrid">
          <div className="card workspaceCompactMetric"><p className="small">Queued jobs</p><div className="kpi">{operations.counts.queued}</div></div>
          <div className="card workspaceCompactMetric"><p className="small">Running jobs</p><div className="kpi">{operations.counts.running}</div></div>
          <div className="card workspaceCompactMetric"><p className="small">Pending approvals</p><div className="kpi">{operations.counts.pendingApprovals}</div></div>
          <div className="card workspaceCompactMetric"><p className="small">Dead letters</p><div className="kpi">{operations.counts.deadLettered}</div></div>
        </div>
        {operations.compatibilityMode ? (
          <p className="small">Run the latest Prisma migrations to enable agent operations persistence.</p>
        ) : null}
      </Section>

      <Section title="Governance posture">
        <div className="activitySummaryGrid">
          <div className="activitySummaryCard">
            <p className="small">Compliance status</p>
            <strong>{label(operations.posture.status)}</strong>
            <span>{postureReasons.length ? postureReasons.map(label).join(" · ") : "Execution controls are ready."}</span>
            <Link className="btn smallBtn" href="/api/workspace/agents/audit-export">Export evidence</Link>
          </div>
          <div className="activitySummaryCard">
            <p className="small">Tenant isolation</p>
            <strong>{operations.workspace ? "Enabled" : "Missing"}</strong>
            <span>Jobs and approvals are scoped to the active workspace.</span>
          </div>
          <div className="activitySummaryCard">
            <p className="small">Approval queue</p>
            <strong>{operations.counts.pendingApprovals > 0 ? "Action needed" : "Clear"}</strong>
            <span>High-risk actions wait for explicit operator review.</span>
          </div>
          <div className="activitySummaryCard">
            <p className="small">Dead-letter review</p>
            <strong>{operations.counts.deadLettered > 0 ? "Review" : "Clear"}</strong>
            <span>Failed max-attempt work is separated for inspection.</span>
          </div>
        </div>
      </Section>

      <Section title="Scheduled worker" id="agent-worker">
        <div className="activitySummaryGrid">
          <div className="activitySummaryCard">
            <p className="small">Cron cadence</p>
            <strong>{operations.scheduler.cadence}</strong>
            <span>Registered in Vercel config for production deployments.</span>
          </div>
          <div className="activitySummaryCard">
            <p className="small">Worker endpoint</p>
            <strong>{operations.scheduler.endpoint}</strong>
            <span>Drains up to {operations.scheduler.maxJobs} jobs per invocation.</span>
            <form action={runAgentWorkerBatchAction} className="agentInlineAction">
              <button className="btn smallBtn" type="submit">Run batch now</button>
            </form>
          </div>
          <div className="activitySummaryCard">
            <p className="small">Scheduler auth</p>
            <strong>{operations.scheduler.authReady ? "Ready" : "Needs secret"}</strong>
            <span>{operations.scheduler.authReady ? "Bearer secret is configured." : "Set CRON_SECRET or AGENT_WORKER_SECRET in production."}</span>
            {!operations.scheduler.authReady ? (
              <span className="agentConfigWarning">Scheduled cron calls will be rejected until a worker secret is configured.</span>
            ) : null}
          </div>
          <div className="activitySummaryCard">
            <p className="small">Queue coverage</p>
            <strong>{operations.scheduler.queues.length} queues</strong>
            <span>{operations.scheduler.allowlistSize} allowed · {operations.scheduler.queues.slice(0, 3).join(" · ")} · more</span>
          </div>
        </div>
      </Section>

      <Section title="Provider writes" id="provider-writes">
        <div className="activitySummaryGrid">
          <div className="activitySummaryCard">
            <p className="small">Execution mode</p>
            <strong>{label(operations.acquisitionProviderWriteReadiness.currentMode)}</strong>
            <span>Next mode: {label(operations.acquisitionProviderWriteReadiness.nextMode)}.</span>
          </div>
          <div className="activitySummaryCard">
            <p className="small">Queue ownership</p>
            <strong>{operations.acquisitionProviderWriteReadiness.queueName}</strong>
            <span>Follow-on queues: {operations.acquisitionProviderWriteReadiness.followOnQueues.join(" · ")}.</span>
          </div>
          <div className="activitySummaryCard">
            <p className="small">Dry-run readiness</p>
            <strong>{operations.acquisitionProviderWriteReadiness.readyForDryRun ? "Ready" : "Blocked"}</strong>
            <span>
              {operations.acquisitionProviderWriteReadiness.readyForDryRun
                ? "Provider dry-run adapters can be exercised without real mutation."
                : "Provider dry-run adapter is not configured."}
            </span>
          </div>
          <div className="activitySummaryCard">
            <p className="small">Approved mutation</p>
            <strong>{operations.acquisitionProviderWriteReadiness.readyForApprovedMutation ? "Ready" : "Blocked"}</strong>
            <span>{acquisitionBlockers.length ? acquisitionBlockers.join(" · ") : "All mutation controls are configured."}</span>
          </div>
        </div>
      </Section>

      <Section title="Launch readiness" id="launch-readiness">
        <div className="activitySummaryGrid">
          <div className="activitySummaryCard">
            <p className="small">Launch packet</p>
            <strong>{label(operations.launchReadiness.status)}</strong>
            <span className={`statusPill ${launchStatusClass}`}>
              {operations.launchReadiness.exportable ? "exportable" : "blocked"}
            </span>
            <div className="ctaRow" style={{ marginTop: 8 }}>
              <Link className="btn smallBtn" href="/api/workspace/launch-packet?format=markdown">Markdown</Link>
              <Link className="btn smallBtn secondary" href="/api/workspace/launch-packet?format=json">JSON</Link>
            </div>
          </div>
          <div className="activitySummaryCard">
            <p className="small">Max launch mode</p>
            <strong>{label(operations.launchReadiness.maxAllowedLaunchMode)}</strong>
            <span>Customer execution cannot move beyond this mode until every launch gate passes.</span>
          </div>
          <div className="activitySummaryCard">
            <p className="small">Execution controls</p>
            <strong>{executionGate.humanApprovedProviderExecutionEnabled ? "Enabled" : "Downgraded"}</strong>
            <span>{executionGate.controls.find((control) => control.key === "human_approved_provider_execution")?.reason}</span>
          </div>
          <div className="activitySummaryCard">
            <p className="small">Billable gate</p>
            <strong>{label(executionGate.billableGateStatus)}</strong>
            <span>{executionGate.controls.find((control) => control.key === "performance_billing")?.reason}</span>
          </div>
        </div>
      </Section>

      <Section title="Customer readiness review">
        <div className="activitySummaryGrid">
          <div className="activitySummaryCard">
            <p className="small">Review status</p>
            <strong>{label(reviewWorkflow.status)}</strong>
            <span>{reviewWorkflow.approvedCount} of {reviewWorkflow.totalCount} required reviewers approved.</span>
          </div>
          <div className="activitySummaryCard">
            <p className="small">Launch escalation</p>
            <strong>{reviewWorkflow.launchEscalationAllowed ? "Allowed" : "Blocked"}</strong>
            <span>{reviewWorkflow.nextRequiredAction}</span>
          </div>
          {reviewWorkflow.reviews.slice(0, 6).map((review) => (
            <div className="activitySummaryCard" key={review.role}>
              <p className="small">{review.label}</p>
              <strong>{review.reviewer}</strong>
              <span className={`statusPill ${statusClass(review.status)}`}>{label(review.status)}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Provider dry runs" id="agent-evidence">
        {operations.dryRuns.length === 0 ? (
          <div className="card">
            <p>No provider dry-run records yet. Approved acquisition provider-write jobs will persist their diffs here before any real mutation is possible.</p>
          </div>
        ) : (
          <div className="activityFeed">
            {operations.dryRuns.map((dryRun) => (
              <details className="activityFeedItem" key={dryRun.id}>
                <summary>
                  <span className="activityFeedDate">{formatDate(dryRun.createdAt)}</span>
                  <span className={`statusPill ${statusClass(dryRun.status)}`}>{label(dryRun.status)}</span>
                  <span className="activityFeedTitle">
                    <strong>{label(dryRun.operationType)}</strong>
                    <span>{dryRun.provider} · {formatCents(dryRun.spendExposureCents)} exposure</span>
                  </span>
                  <span className="activityFeedApp">{dryRun.app}</span>
                </summary>
                <div className="activityFeedDetail">
                  <div>
                    <p>{dryRun.externalCampaignId ?? dryRun.externalAccountId ?? "Provider target not resolved yet."}</p>
                    <p className="small">
                      Rollback: {dryRun.rollbackSupported ? "supported" : "not supported"} · Idempotency: {dryRun.idempotencyKey ?? "none"}
                    </p>
                    {dryRun.rollbackPlan ? <p className="small">{dryRun.rollbackPlan}</p> : null}
                    {dryRun.blockers.length > 0 ? <p className="small">Blockers: {dryRun.blockers.map(label).join(" · ")}</p> : null}
                    {dryRun.warnings.length > 0 ? <p className="small">Warnings: {dryRun.warnings.join(" · ")}</p> : null}
                  </div>
                  <Link className="btn smallBtn" href={`/workspace/agents/dry-runs/${dryRun.id}`}>Inspect dry run</Link>
                </div>
              </details>
            ))}
          </div>
        )}
      </Section>

      <Section title="Measurement handoffs">
        {operations.measurementHandoffs.length === 0 ? (
          <div className="card">
            <p>No measurement handoffs yet. Ready provider dry-runs will enqueue observation and measurement work here.</p>
          </div>
        ) : (
          <div className="activityFeed">
            {operations.measurementHandoffs.map((handoff) => (
              <details className="activityFeedItem" key={handoff.id}>
                <summary>
                  <span className="activityFeedDate">{formatDate(handoff.createdAt)}</span>
                  <span className={`statusPill ${statusClass(handoff.status)}`}>{label(handoff.status)}</span>
                  <span className="activityFeedTitle">
                    <strong>{label(handoff.operationType)}</strong>
                    <span>{handoff.provider} · {handoff.measurementOutputs.length} outputs</span>
                  </span>
                  <span className="activityFeedApp">{handoff.app}</span>
                </summary>
                <div className="activityFeedDetail">
                  <div>
                    <p>Dry run: {handoff.providerWriteDryRunId}</p>
                    <p className="small">Observation job: {handoff.observationJobId ?? "not queued"} · Measurement job: {handoff.measurementJobId ?? "not queued"}</p>
                    <p className="small">Outputs: {handoff.measurementOutputs.map(label).join(" · ")}</p>
                  </div>
                  <Link className="btn smallBtn" href="/workspace/activity">Review audit trail</Link>
                </div>
              </details>
            ))}
          </div>
        )}
      </Section>

      <Section title="Queued and recent jobs" id="agent-jobs">
        {operations.jobs.length === 0 ? (
          <div className="card">
            <p>No agent jobs are queued yet. Generate lifecycle campaigns or run acquisition iterations to populate the queue.</p>
          </div>
        ) : (
          <div className="activityFeed">
            {operations.jobs.map((job) => (
              <details className="activityFeedItem" key={job.id}>
                <summary>
                  <span className="activityFeedDate">{formatDate(job.createdAt)}</span>
                  <span className={`statusPill ${statusClass(job.status)}`}>{label(job.status)}</span>
                  <span className="activityFeedTitle">
                    <strong>{label(job.jobType)}</strong>
                    <span>{job.queueName}</span>
                  </span>
                  <span className="activityFeedApp">{job.app}</span>
                </summary>
                <div className="activityFeedDetail">
                  <div>
                    <p>{job.errorMessage || `Run after ${formatDate(job.runAfter)} · attempts ${job.attemptCount}/${job.maxAttempts}`}</p>
                    <p className="small">Idempotency: {job.idempotencyKey ?? "none"} · Worker: {job.lockedBy ?? "unclaimed"}</p>
                    {job.errorCode ? (
                      <p className="small">Error code: {job.errorCode}</p>
                    ) : null}
                    <AgentJobResultDetail result={job.result} />
                  </div>
                  {jobActionsFor(job.status).length > 0 ? (
                    <div className="agentApprovalActions" aria-label={`Transition actions for ${job.jobType}`}>
                      {job.status === "queued" ? (
                        <form action={runAgentJobOnceAction}>
                          <input type="hidden" name="id" value={job.id} />
                          <button
                            className="btn smallBtn"
                            type="submit"
                            disabled={job.app === "acquisition" && job.jobType === "provider_write" && !executionGate.humanApprovedProviderExecutionEnabled}
                          >
                            Execute
                          </button>
                        </form>
                      ) : null}
                      {job.app === "acquisition" && job.jobType === "provider_write" && !executionGate.humanApprovedProviderExecutionEnabled ? (
                        <span className="agentConfigWarning">{executionGate.nextRequiredAction}</span>
                      ) : null}
                      {jobActionsFor(job.status).map((action) => (
                        <form action={decideAgentJobAction} key={action}>
                          <input type="hidden" name="id" value={job.id} />
                          <input type="hidden" name="action" value={action} />
                          <button className={`btn smallBtn ${action === "claim" || action === "complete" ? "" : "secondary"}`} type="submit">
                            {label(action)}
                          </button>
                        </form>
                      ))}
                    </div>
                  ) : null}
                </div>
              </details>
            ))}
          </div>
        )}
      </Section>

      <Section title="Approvals" id="agent-approvals">
        {operations.approvals.length === 0 ? (
          <div className="card">
            <p>No approval requests are pending. Over-cap acquisition shifts and high-risk execution plans will appear here.</p>
          </div>
        ) : (
          <div className="activityFeed">
            {operations.approvals.map((approval) => (
              <details className="activityFeedItem" key={approval.id} open={approval.id === selectedApprovalId}>
                <summary>
                  <span className="activityFeedDate">{formatDate(approval.createdAt)}</span>
                  <span className={`statusPill ${statusClass(approval.status)}`}>{label(approval.status)}</span>
                  <span className="activityFeedTitle">
                    <strong>{approval.title}</strong>
                    <span>{label(approval.actionType)} · {label(approval.riskLevel)}</span>
                  </span>
                  <span className="activityFeedApp">{approval.app}</span>
                </summary>
                <div className="activityFeedDetail">
                  <div>
                    <p>{approval.summary}</p>
                    <p className="small">Due: {formatDate(approval.dueAt)} · Expires: {formatDate(approval.expiresAt)} · Role: {approval.requiredApproverRole ?? "owner"}</p>
                    <ApprovalAcquisitionContext proposedAction={approval.proposedAction} />
                    <ApprovalProviderContext proposedAction={approval.proposedAction} />
                  </div>
                  {isOpenApproval(approval.status) ? (
                    <div className="agentApprovalActions" aria-label={`Decision actions for ${approval.title}`}>
                      <form action={decideAgentApprovalAction}>
                        <input type="hidden" name="id" value={approval.id} />
                        <input type="hidden" name="status" value="approved" />
                        <button className="btn smallBtn" type="submit">Approve</button>
                      </form>
                      {approval.app === "acquisition" ? (
                        <form action={decideAgentApprovalAction}>
                          <input type="hidden" name="id" value={approval.id} />
                          <input type="hidden" name="status" value="approved" />
                          <input type="hidden" name="runAfterApproval" value="true" />
                          <button className="btn smallBtn" type="submit" disabled={!executionGate.humanApprovedProviderExecutionEnabled}>
                            Approve and run dry run
                          </button>
                        </form>
                      ) : null}
                      {approval.app === "acquisition" && !executionGate.humanApprovedProviderExecutionEnabled ? (
                        <span className="agentConfigWarning">Approval remains available; immediate provider execution is downgraded until {executionGate.nextRequiredAction}</span>
                      ) : null}
                      <form action={decideAgentApprovalAction}>
                        <input type="hidden" name="id" value={approval.id} />
                        <input type="hidden" name="status" value="rejected" />
                        <button className="btn secondary smallBtn" type="submit">Reject</button>
                      </form>
                      <form action={decideAgentApprovalAction}>
                        <input type="hidden" name="id" value={approval.id} />
                        <input type="hidden" name="status" value="cancelled" />
                        <button className="btn secondary smallBtn" type="submit">Cancel</button>
                      </form>
                    </div>
                  ) : (
                    <Link className="btn smallBtn" href="/workspace/activity">Review audit trail</Link>
                  )}
                </div>
              </details>
            ))}
          </div>
        )}
      </Section>
    </>
  );
}
