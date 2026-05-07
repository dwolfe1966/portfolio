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
import { isOAuthEncryptionAvailable } from "@/lib/oauth-tokens";
import { decideAgentApprovalAction, decideAgentJobAction } from "./actions";

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

async function loadAgentOperations(accountUserId: string | null) {
  try {
    const workspace = await db.workspace.findUnique({ where: { slug: "default-demo-workspace" } });
    if (!workspace) {
      return {
        compatibilityMode: false,
        workspace: null,
        jobs: [],
        approvals: [],
        counts: { queued: 0, running: 0, deadLettered: 0, pendingApprovals: 0 },
        posture: evaluateAgentCompliancePosture({
          tenantIsolationEnforced: false,
          secretPosture: evaluateSecretPosture({ encryptionAvailable: isOAuthEncryptionAvailable(), tokenPresent: false }),
          auditExportEnabled: false,
          approvalQueueEnabled: false,
          deadLetterReviewEnabled: false
        })
      };
    }

    const [jobs, approvals, queued, running, deadLettered, pendingApprovals] = await Promise.all([
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
      db.agentJob.count({ where: { workspaceId: workspace.id, status: "queued" } }),
      db.agentJob.count({ where: { workspaceId: workspace.id, status: "running" } }),
      db.agentJob.count({ where: { workspaceId: workspace.id, status: "dead_lettered" } }),
      db.agentApprovalRequest.count({ where: { workspaceId: workspace.id, status: { in: ["pending", "escalated"] } } })
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
      counts: { queued, running, deadLettered, pendingApprovals },
      posture
    };
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      return {
        compatibilityMode: true,
        workspace: null,
        jobs: [],
        approvals: [],
        counts: { queued: 0, running: 0, deadLettered: 0, pendingApprovals: 0 },
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

export default async function AgentOperationsPage() {
  const accountUserId = await currentAccountUserId();
  const operations = await loadAgentOperations(accountUserId);
  const postureReasons = [...operations.posture.blockers, ...operations.posture.warnings];

  return (
    <>
      <DemoWorkspaceTabs />
      <Section eyebrow="Workspace" title="Agent operations">
        <p>
          Inspect the durable work queue, customer approvals, dead-letter review state, and governance posture that sit
          behind lifecycle and acquisition agent execution.
        </p>
      </Section>

      <Section title="Operations status">
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

      <Section title="Queued and recent jobs">
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
                  </div>
                  {jobActionsFor(job.status).length > 0 ? (
                    <div className="agentApprovalActions" aria-label={`Transition actions for ${job.jobType}`}>
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

      <Section title="Approvals">
        {operations.approvals.length === 0 ? (
          <div className="card">
            <p>No approval requests are pending. Over-cap acquisition shifts and high-risk execution plans will appear here.</p>
          </div>
        ) : (
          <div className="activityFeed">
            {operations.approvals.map((approval) => (
              <details className="activityFeedItem" key={approval.id}>
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
                  </div>
                  {isOpenApproval(approval.status) ? (
                    <div className="agentApprovalActions" aria-label={`Decision actions for ${approval.title}`}>
                      <form action={decideAgentApprovalAction}>
                        <input type="hidden" name="id" value={approval.id} />
                        <input type="hidden" name="status" value="approved" />
                        <button className="btn smallBtn" type="submit">Approve</button>
                      </form>
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
