import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { DemoWorkspaceTabs } from "@/components/demo-shell/DemoWorkspaceTabs";
import { Section } from "@/components/site/Section";
import { ACCOUNT_SESSION_COOKIE, verifyAccountSessionToken } from "@/lib/account-session";
import { db } from "@/lib/db";
import { buildMetadata } from "@/lib/seo";

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

function statusClass(status: string) {
  if (["completed", "approved", "ready", "queued"].includes(status)) return "live";
  if (["failed", "dead_lettered", "rejected", "expired", "blocked"].includes(status)) return "warning";
  return "progress";
}

export default async function ProviderDryRunDetailPage({ params }: PageProps) {
  const { id } = await params;
  const accountUserId = await currentAccountUserId();
  const dryRun = await db.agentProviderWriteDryRun.findFirst({
    where: { id, OR: [{ accountUserId }, { accountUserId: null }] },
    include: {
      agentJob: true,
      measurementHandoff: true
    }
  });

  if (!dryRun) notFound();

  const permissionChecks = jsonArray(dryRun.permissionChecks);
  const providerObjects = jsonArray(dryRun.providerObjects);
  const handoff = dryRun.measurementHandoff;

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
              <strong>{handoff.observationJobId ?? "Not queued"}</strong>
              <span>Queue: acquisition:observation</span>
            </div>
            <div className="activitySummaryCard">
              <p className="small">Measurement job</p>
              <strong>{handoff.measurementJobId ?? "Not queued"}</strong>
              <span>Queue: acquisition:measurement</span>
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
