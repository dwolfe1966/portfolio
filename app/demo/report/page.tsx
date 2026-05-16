import { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { DemoWorkspaceTabs } from "@/components/demo-shell/DemoWorkspaceTabs";
import { Section } from "@/components/site/Section";
import { ACCOUNT_SESSION_COOKIE, verifyAccountSessionToken } from "@/lib/account-session";
import { db } from "@/lib/db";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { buildMetadata } from "@/lib/seo";
import { buildWorkspaceLaunchReport } from "@/lib/workspace-launch-report";
import { DEFAULT_WORKSPACE } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  title: "Launch Readiness Report | David Wolfe",
  description: "Customer-facing workspace launch readiness report for execution, billing, evidence, and risk posture.",
  path: "/workspace/report"
});

function scopeKey(accountUserId: string | null) {
  return accountUserId ? `account:${accountUserId}` : "workspace";
}

async function currentAccountUserId() {
  const cookieStore = await cookies();
  return verifyAccountSessionToken(cookieStore.get(ACCOUNT_SESSION_COOKIE)?.value)?.userId ?? null;
}

async function loadReport(accountUserId: string | null) {
  try {
    const record = await db.workspaceLaunchReadinessRecord.findFirst({
      where: {
        workspace: { slug: DEFAULT_WORKSPACE.slug },
        scopeKey: scopeKey(accountUserId)
      },
      orderBy: { updatedAt: "desc" },
      select: {
        status: true,
        exportable: true,
        maxAllowedLaunchMode: true,
        launchDecisionMode: true,
        nextRequiredAction: true,
        launchPacket: true,
        updatedAt: true
      }
    });

    return { report: buildWorkspaceLaunchReport(record), compatibilityMode: false };
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      return { report: buildWorkspaceLaunchReport(null), compatibilityMode: true };
    }
    throw error;
  }
}

function formatDate(value: Date | null) {
  if (!value) return "Not evaluated";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(value);
}

function statusClass(status: string) {
  if (status === "ready") return "live";
  if (status === "blocked" || status === "missing") return "warning";
  return "progress";
}

export default async function WorkspaceLaunchReportPage() {
  const accountUserId = await currentAccountUserId();
  const { report, compatibilityMode } = await loadReport(accountUserId);

  return (
    <>
      <DemoWorkspaceTabs />
      <Section eyebrow="Workspace" title="Launch readiness report">
        <p>
          Customer-facing view of current launch posture, execution implications, billing readiness, evidence coverage,
          unresolved risks, and the next operating action.
        </p>
      </Section>

      <Section title="Launch posture">
        <div className="launchReportHero">
          <div>
            <p className="small">Customer</p>
            <h3>{report.customerName}</h3>
            <div className="launchReportPills">
              <span className={`statusPill ${statusClass(report.statusLabel)}`}>{report.statusLabel}</span>
              <span className="statusPill progress">{report.launchModeLabel}</span>
              <span className={`statusPill ${report.exportableLabel === "exportable" ? "live" : "progress"}`}>{report.exportableLabel}</span>
            </div>
            <p className="small">Last evaluated: {formatDate(report.updatedAt)}</p>
          </div>
          <div className="launchReportNextAction">
            <p className="small">Next action</p>
            <strong>{report.nextAction}</strong>
            <div className="toolReadinessActions">
              <Link className="btn smallBtn primary" href="/workspace/dashboard">Open cockpit</Link>
              <Link className="btn smallBtn" href="/workspace/settings">Edit evidence</Link>
            </div>
          </div>
        </div>
        {compatibilityMode ? (
          <p className="small">Run the latest Prisma migrations to enable launch readiness reporting.</p>
        ) : null}
      </Section>

      <Section title="Operating implications">
        <div className="launchReportImplications">
          <div className="card">
            <p className="small">Execution</p>
            <strong>{report.executionImplication}</strong>
          </div>
          <div className="card">
            <p className="small">Performance billing</p>
            <strong>{report.billingImplication}</strong>
          </div>
        </div>
      </Section>

      <Section title="Evidence status">
        {report.evidenceSections.length === 0 ? (
          <div className="card">
            <p>No launch packet evidence is available yet.</p>
            <Link className="btn smallBtn primary" href="/workspace/settings">Configure launch evidence</Link>
          </div>
        ) : (
          <div className="launchReportEvidenceGrid">
            {report.evidenceSections.map((section) => (
              <div className="launchReportEvidenceCard" key={section.key}>
                <span className={`statusPill ${statusClass(section.status)}`}>{section.status}</span>
                <h3>{section.label}</h3>
                <p>{section.detail}</p>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Blockers and warnings">
        <div className="launchReportLists">
          <div className="card">
            <p className="small">Blockers</p>
            {report.blockers.length === 0 ? (
              <p>No blocking launch issues.</p>
            ) : (
              <ul>
                {report.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}
              </ul>
            )}
          </div>
          <div className="card">
            <p className="small">Warnings</p>
            {report.warnings.length === 0 ? (
              <p>No warning-level launch issues.</p>
            ) : (
              <ul>
                {report.warnings.map((warning) => <li key={warning}>{warning}</li>)}
              </ul>
            )}
          </div>
        </div>
      </Section>

      <Section title="Exports and audit">
        <div className="toolReadinessActions">
          <Link className="btn smallBtn primary" href="/api/workspace/launch-packet?format=markdown">Export launch packet</Link>
          <Link className="btn smallBtn" href="/api/workspace/agents/audit-export">Export audit evidence</Link>
          <Link className="btn smallBtn" href="/workspace/activity">Review activity</Link>
          <Link className="btn smallBtn" href="/workspace/agents">Agent operations</Link>
        </div>
      </Section>
    </>
  );
}
