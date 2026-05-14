import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { DemoWorkspaceTabs } from "@/components/demo-shell/DemoWorkspaceTabs";
import { Section } from "@/components/site/Section";
import { ACCOUNT_SESSION_COOKIE, verifyAccountSessionToken } from "@/lib/account-session";
import { db } from "@/lib/db";
import { buildMetadata } from "@/lib/seo";
import { runAgentJobOnceAction } from "../../actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  title: "Provider Dry Run | David Wolfe",
  description: "Inspect provider-write dry-run diffs, permission checks, rollback metadata, and measurement handoff records.",
  path: "/workspace/agents"
});

type PageProps = {
  params: Promise<{ id: string }>;
};

async function currentAccountUserId() {
  const cookieStore = await cookies();
  return verifyAccountSessionToken(cookieStore.get(ACCOUNT_SESSION_COOKIE)?.value)?.userId ?? null;
}

function label(value: string) {
  return value.replace(/_/g, " ");
}

function formatDate(value: Date | null | undefined) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(value);
}

function formatCents(value: number) {
  return new Intl.NumberFormat("en", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value / 100);
}

function jsonArray(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item)) : [];
}

function formatJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function objectRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function stringField(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberField(value: unknown) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount) : 0;
}

function acquisitionDryRunContext(payload: unknown) {
  const record = objectRecord(payload);
  const proposedAction = objectRecord(record?.proposedAction);
  if (!proposedAction) return null;

  const campaignId = stringField(proposedAction.campaignId);
  const fromTestCellId = stringField(proposedAction.fromTestCellId);
  const toTestCellId = stringField(proposedAction.toTestCellId);
  const amountCents = numberField(proposedAction.amountCents ?? proposedAction.shiftAmountCents ?? proposedAction.spendExposureCents);
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

function statusClass(status: string) {
  if (["completed", "approved", "ready", "queued"].includes(status)) return "live";
  if (["failed", "dead_lettered", "rejected", "expired", "blocked"].includes(status)) return "warning";
  return "progress";
}

function HandoffJobAction({
  jobId,
  jobStatus,
  returnPath
}: {
  jobId: string | null | undefined;
  jobStatus: string | null | undefined;
  returnPath: string;
}) {
  if (!jobId) return null;
  if (jobStatus !== "queued") return null;

  return (
    <form action={runAgentJobOnceAction} className="agentInlineAction">
      <input type="hidden" name="id" value={jobId} />
      <input type="hidden" name="returnPath" value={returnPath} />
      <button className="btn smallBtn" type="submit">Execute</button>
    </form>
  );
}

export default async function ProviderDryRunDetailPage({ params }: PageProps) {
  const { id } = await params;
  const accountUserId = await currentAccountUserId();
  const dryRun = await db.agentProviderWriteDryRun.findFirst({
    where: { id, OR: [{ accountUserId }, { accountUserId: null }] },
    include: {
      agentJob: true,
      measurementHandoff: true,
      rollbackRecords: {
        orderBy: { createdAt: "desc" }
      }
    }
  });

  if (!dryRun) notFound();

  const permissionChecks = jsonArray(dryRun.permissionChecks);
  const providerObjects = jsonArray(dryRun.providerObjects);
  const handoff = dryRun.measurementHandoff;
  const acquisitionContext = acquisitionDryRunContext(dryRun.agentJob.payload);
  const handoffJobIds = [handoff?.observationJobId, handoff?.measurementJobId].filter((value): value is string => Boolean(value));
  const handoffJobs = handoffJobIds.length
    ? await db.agentJob.findMany({
        where: {
          id: { in: handoffJobIds },
          OR: [{ accountUserId }, { accountUserId: null }]
        },
        select: { id: true, status: true, completedAt: true, failedAt: true, errorMessage: true }
      })
    : [];
  const handoffJobById = new Map(handoffJobs.map((job) => [job.id, job]));
  const observationJob = handoff?.observationJobId ? handoffJobById.get(handoff.observationJobId) : null;
  const measurementJob = handoff?.measurementJobId ? handoffJobById.get(handoff.measurementJobId) : null;
  const returnPath = `/workspace/agents/dry-runs/${dryRun.id}`;

  return (
    <>
      <DemoWorkspaceTabs />
      <Section eyebrow="Agent Operations" title="Provider dry run">
        <p>
          Inspect the proposed provider write before any real mutation path exists. This record is durable evidence for
          policy review, rollback planning, observation, and measurement handoff.
        </p>
        <div className="ctaRow">
          <Link className="btn secondary" href="/workspace/agents">Back to operations</Link>
        </div>
      </Section>

      {acquisitionContext ? (
        <Section title="Acquisition context">
          <div className="activitySummaryGrid">
            <div className="activitySummaryCard">
              <p className="small">Campaign</p>
              <strong>{acquisitionContext.campaignId ?? "Not linked"}</strong>
              {acquisitionContext.campaignId ? <Link className="btn smallBtn" href={`/acquisition/campaigns/${acquisitionContext.campaignId}`}>Open campaign</Link> : null}
            </div>
            <div className="activitySummaryCard">
              <p className="small">Shift</p>
              <strong>{formatCents(acquisitionContext.amountCents)}</strong>
              <span>{acquisitionContext.shiftPct ? `${(acquisitionContext.shiftPct * 100).toFixed(1)}% budget move` : "Approved provider-write dry run"}</span>
            </div>
            <div className="activitySummaryCard">
              <p className="small">From cell</p>
              <strong>{acquisitionContext.fromTestCellId ?? "Not captured"}</strong>
              <span>Budget source cell</span>
            </div>
            <div className="activitySummaryCard">
              <p className="small">To cell</p>
              <strong>{acquisitionContext.toTestCellId ?? "Not captured"}</strong>
              <span>Winning destination cell</span>
            </div>
          </div>
          {acquisitionContext.campaignId ? (
            <div className="ctaRow">
              <Link className="btn smallBtn" href={`/acquisition/audit?campaignId=${acquisitionContext.campaignId}&action=budget_shift_pending_approval&window=all`}>Review approval audit</Link>
              <Link className="btn smallBtn" href={`/acquisition/simulations?campaignId=${acquisitionContext.campaignId}`}>Run next iteration</Link>
            </div>
          ) : null}
        </Section>
      ) : null}

      <Section title="Summary">
        <div className="activitySummaryGrid">
          <div className="activitySummaryCard">
            <p className="small">Status</p>
            <strong>{label(dryRun.status)}</strong>
            <span>{dryRun.provider} · {label(dryRun.operationType)}</span>
          </div>
          <div className="activitySummaryCard">
            <p className="small">Spend exposure</p>
            <strong>{formatCents(dryRun.spendExposureCents)}</strong>
            <span>{dryRun.externalCampaignId ?? dryRun.externalAccountId ?? "No provider target resolved."}</span>
          </div>
          <div className="activitySummaryCard">
            <p className="small">Rollback</p>
            <strong>{dryRun.rollbackSupported ? "Supported" : "Not supported"}</strong>
            <span>{dryRun.rollbackPlan ?? "No rollback plan captured."}</span>
          </div>
          <div className="activitySummaryCard">
            <p className="small">Created</p>
            <strong>{formatDate(dryRun.createdAt)}</strong>
            <span>Idempotency: {dryRun.idempotencyKey ?? "none"}</span>
          </div>
        </div>
      </Section>

      <Section title="Review Gates">
        <div className="grid grid-2">
          <div className="card">
            <h3>Blockers</h3>
            {dryRun.blockers.length === 0 ? (
              <p>No blockers recorded.</p>
            ) : (
              <ul>
                {dryRun.blockers.map((blocker) => <li key={blocker}>{label(blocker)}</li>)}
              </ul>
            )}
          </div>
          <div className="card">
            <h3>Warnings</h3>
            {dryRun.warnings.length === 0 ? (
              <p>No warnings recorded.</p>
            ) : (
              <ul>
                {dryRun.warnings.map((warning) => <li key={warning}>{warning}</li>)}
              </ul>
            )}
          </div>
        </div>
      </Section>

      <Section title="Permission Checks">
        {permissionChecks.length === 0 ? (
          <div className="card"><p>No permission checks were captured.</p></div>
        ) : (
          <div className="activityFeed">
            {permissionChecks.map((check, index) => {
              const capability = typeof check.capability === "string" ? check.capability : `check_${index + 1}`;
              const ok = check.ok === true;
              const reason = typeof check.reason === "string" ? check.reason : "No reason provided.";
              return (
                <div className="activityFeedItem dryRunStaticItem" key={`${capability}-${index}`}>
                  <div className="dryRunStaticSummary">
                    <span className={`statusPill ${ok ? "live" : "warning"}`}>{ok ? "ok" : "blocked"}</span>
                    <span className="activityFeedTitle">
                      <strong>{label(capability)}</strong>
                      <span>{reason}</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      <Section title="Provider Diff">
        {providerObjects.length === 0 ? (
          <div className="card"><p>No provider object diffs were captured.</p></div>
        ) : (
          <div className="connectorObjectStack">
            {providerObjects.map((object, index) => {
              const resourceType = typeof object.resourceType === "string" ? object.resourceType : "provider_object";
              const resourceId = typeof object.resourceId === "string" ? object.resourceId : `object_${index + 1}`;
              return (
                <div className="card connectorEntityCard" key={`${resourceId}-${index}`}>
                  <div className="connectorEntityHeader">
                    <p className="small">{label(resourceType)}</p>
                    <h3>{resourceId}</h3>
                  </div>
                  <div className="grid grid-2">
                    <div className="dryRunJsonPanel">
                      <p className="small">Before</p>
                      <pre>{formatJson(object.before ?? {})}</pre>
                    </div>
                    <div className="dryRunJsonPanel">
                      <p className="small">After</p>
                      <pre>{formatJson(object.after ?? {})}</pre>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      <Section title="Rollback Records">
        {dryRun.rollbackRecords.length === 0 ? (
          <div className="card">
            <p>No rollback record exists yet. Sandbox mutation evidence will create one before any reversible provider write graduates beyond dry-run review.</p>
          </div>
        ) : (
          <div className="activityFeed">
            {dryRun.rollbackRecords.map((record) => (
              <details className="activityFeedItem" key={record.id}>
                <summary className="dryRunStaticSummary">
                  <span className={`statusPill ${statusClass(record.status)}`}>{label(record.status)}</span>
                  <span className="activityFeedTitle">
                    <strong>{record.providerOperationId}</strong>
                    <span>
                      Reversal {label(record.reversalStatus)} · Retain until {formatDate(record.retentionExpiresAt)}
                    </span>
                  </span>
                </summary>
                <div className="dryRunStaticSummary">
                  <div>
                    <p className="small">Rollback plan</p>
                    <p>{record.rollbackPlan ?? "No rollback plan captured."}</p>
                    <p className="small">
                      Rollback operation: {record.rollbackProviderOperationId ?? "not assigned"} · Review: {record.reviewDecision ? label(record.reviewDecision) : "pending"}
                    </p>
                  </div>
                </div>
                <div className="grid grid-2">
                  <div className="dryRunJsonPanel">
                    <p className="small">Before state</p>
                    <pre>{formatJson(record.beforeState)}</pre>
                  </div>
                  <div className="dryRunJsonPanel">
                    <p className="small">After state</p>
                    <pre>{formatJson(record.afterState)}</pre>
                  </div>
                </div>
              </details>
            ))}
          </div>
        )}
      </Section>

      <Section title="Measurement Handoff">
        {!handoff ? (
          <div className="card">
            <p>No measurement handoff exists for this dry run yet.</p>
          </div>
        ) : (
          <div className="activitySummaryGrid">
            <div className="activitySummaryCard">
              <p className="small">Handoff status</p>
              <strong>{label(handoff.status)}</strong>
              <span>{handoff.measurementOutputs.length} measurement outputs queued.</span>
            </div>
            <div className="activitySummaryCard">
              <p className="small">Observation job</p>
              <strong>{observationJob ? label(observationJob.status) : handoff.observationJobId ?? "Not queued"}</strong>
              <span>{observationJob?.errorMessage ?? "Queue: acquisition:observation"}</span>
              <HandoffJobAction jobId={handoff.observationJobId} jobStatus={observationJob?.status} returnPath={returnPath} />
            </div>
            <div className="activitySummaryCard">
              <p className="small">Measurement job</p>
              <strong>{measurementJob ? label(measurementJob.status) : handoff.measurementJobId ?? "Not queued"}</strong>
              <span>{measurementJob?.errorMessage ?? "Queue: acquisition:measurement"}</span>
              <HandoffJobAction jobId={handoff.measurementJobId} jobStatus={measurementJob?.status} returnPath={returnPath} />
            </div>
            <div className="activitySummaryCard">
              <p className="small">Outputs</p>
              <strong>{handoff.measurementOutputs.includes("revenue_impact_attribution") ? "Revenue attribution" : "Measurement"}</strong>
              <span>{handoff.measurementOutputs.map(label).join(" · ")}</span>
            </div>
          </div>
        )}
      </Section>

      <Section title="Raw Payload">
        <div className="dryRunJsonPanel">
          <pre>{formatJson(dryRun.rawResult)}</pre>
        </div>
        <p className="small">Source job: {dryRun.agentJobId} · Job status: <span className={`statusPill ${statusClass(dryRun.agentJob.status)}`}>{label(dryRun.agentJob.status)}</span></p>
      </Section>
    </>
  );
}
