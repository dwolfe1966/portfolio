import { NextRequest, NextResponse } from "next/server";
import { ACCOUNT_SESSION_COOKIE, verifyAccountSessionToken } from "@/lib/account-session";
import { buildAgentAuditExportRows, type AgentAuditExportRecord, type AgentAuditExportRow } from "@/lib/agent-platform-governance";
import { apiCompatibilityError, apiError, apiUnhandledError } from "@/lib/api-contract";
import { db } from "@/lib/db";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { createEventId, logApiEvent } from "@/lib/logging";
import { getDefaultWorkspace } from "@/lib/workspace";

const CSV_HEADERS: Array<keyof AgentAuditExportRow> = [
  "id",
  "workspaceId",
  "app",
  "action",
  "status",
  "evidenceType",
  "actorAccountUserId",
  "createdAt",
  "terminalAt",
  "riskLevel",
  "errorCode",
  "provider",
  "operationType",
  "externalAccountId",
  "externalCampaignId",
  "spendExposureCents",
  "rollbackSupported",
  "rollbackPlan",
  "mutationIdempotencyKey",
  "providerOperationId",
  "rollbackProviderOperationId",
  "reversalStatus",
  "retentionExpiresAt",
  "reviewDecision",
  "emergencyStopState",
  "mutationGateStatus",
  "relatedJobId"
];

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function rowsToCsv(rows: AgentAuditExportRow[]) {
  return [
    CSV_HEADERS.join(","),
    ...rows.map((row) => CSV_HEADERS.map((header) => csvCell(row[header])).join(","))
  ].join("\n");
}

function fileStamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

export async function GET(request: NextRequest) {
  const eventId = createEventId("agent_audit_export");
  const accountUserId = verifyAccountSessionToken(request.cookies.get(ACCOUNT_SESSION_COOKIE)?.value)?.userId ?? null;
  if (!accountUserId) return apiError(401, "UNAUTHORIZED", "Sign in to export agent audit evidence.", { eventId });

  try {
    const workspace = await getDefaultWorkspace();
    const [jobs, approvals, dryRuns, handoffs, rollbackRecords] = await Promise.all([
      db.agentJob.findMany({
        where: { workspaceId: workspace.id, OR: [{ accountUserId }, { accountUserId: null }] },
        orderBy: { createdAt: "desc" },
        take: 250
      }),
      db.agentApprovalRequest.findMany({
        where: { workspaceId: workspace.id, OR: [{ requestedByAccountUserId: accountUserId }, { requestedByAccountUserId: null }] },
        orderBy: { createdAt: "desc" },
        take: 250
      }),
      db.agentProviderWriteDryRun.findMany({
        where: { workspaceId: workspace.id, OR: [{ accountUserId }, { accountUserId: null }] },
        orderBy: { createdAt: "desc" },
        take: 250
      }),
      db.agentProviderWriteMeasurementHandoff.findMany({
        where: { workspaceId: workspace.id, OR: [{ accountUserId }, { accountUserId: null }] },
        orderBy: { createdAt: "desc" },
        take: 250
      }),
      db.agentProviderWriteRollbackRecord.findMany({
        where: { workspaceId: workspace.id, OR: [{ accountUserId }, { accountUserId: null }] },
        orderBy: { createdAt: "desc" },
        take: 250
      })
    ]);

    const records: AgentAuditExportRecord[] = [
      ...jobs.map((job) => ({
        id: job.id,
        workspaceId: job.workspaceId,
        app: job.app,
        action: job.jobType,
        status: job.status,
        evidenceType: "agent_job",
        actorAccountUserId: job.accountUserId,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
        errorCode: job.errorCode,
        relatedJobId: job.id
      })),
      ...approvals.map((approval) => ({
        id: approval.id,
        workspaceId: approval.workspaceId,
        app: approval.app,
        action: approval.actionType,
        status: approval.status,
        evidenceType: "approval",
        actorAccountUserId: approval.requestedByAccountUserId,
        createdAt: approval.createdAt,
        decidedAt: approval.decidedAt,
        riskLevel: approval.riskLevel,
        relatedJobId: approval.agentJobId
      })),
      ...dryRuns.map((dryRun) => ({
        id: dryRun.id,
        workspaceId: dryRun.workspaceId,
        app: dryRun.app,
        action: "provider_write_dry_run",
        status: dryRun.status,
        evidenceType: "provider_dry_run",
        actorAccountUserId: dryRun.accountUserId,
        createdAt: dryRun.createdAt,
        provider: dryRun.provider,
        operationType: dryRun.operationType,
        externalAccountId: dryRun.externalAccountId,
        externalCampaignId: dryRun.externalCampaignId,
        spendExposureCents: dryRun.spendExposureCents,
        rollbackSupported: dryRun.rollbackSupported,
        rollbackPlan: dryRun.rollbackPlan,
        relatedJobId: dryRun.agentJobId
      })),
      ...handoffs.map((handoff) => ({
        id: handoff.id,
        workspaceId: handoff.workspaceId,
        app: handoff.app,
        action: "provider_write_measurement_handoff",
        status: handoff.status,
        evidenceType: "measurement_handoff",
        actorAccountUserId: handoff.accountUserId,
        createdAt: handoff.createdAt,
        provider: handoff.provider,
        operationType: handoff.operationType,
        relatedJobId: handoff.measurementJobId ?? handoff.observationJobId ?? handoff.sourceAgentJobId
      })),
      ...rollbackRecords.map((record) => ({
        id: record.id,
        workspaceId: record.workspaceId,
        app: "acquisition",
        action: "provider_write_rollback_record",
        status: record.status,
        evidenceType: "rollback_record",
        actorAccountUserId: record.accountUserId,
        createdAt: record.createdAt,
        provider: record.provider,
        operationType: record.operationType,
        externalAccountId: record.externalAccountId,
        externalCampaignId: record.externalCampaignId,
        rollbackSupported: record.status !== "not_reversible",
        rollbackPlan: record.rollbackPlan,
        mutationIdempotencyKey: record.mutationIdempotencyKey,
        providerOperationId: record.providerOperationId,
        rollbackProviderOperationId: record.rollbackProviderOperationId,
        reversalStatus: record.reversalStatus,
        retentionExpiresAt: record.retentionExpiresAt,
        reviewDecision: record.reviewDecision,
        emergencyStopState: "clear_at_record_creation",
        mutationGateStatus: record.status === "blocked" ? "blocked" : "passed",
        relatedJobId: record.providerWriteDryRunId
      }))
    ];

    const rows = buildAgentAuditExportRows(records);
    logApiEvent("info", eventId, "agent.audit_export.completed", {
      workspaceId: workspace.id,
      accountUserId,
      rowCount: rows.length
    });

    return new NextResponse(rowsToCsv(rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="agent-audit-export-${fileStamp()}.csv"`,
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      logApiEvent("warn", eventId, "agent.audit_export.compatibility_mode");
      return apiCompatibilityError("Agent audit export tables are missing or unavailable.", { eventId });
    }

    logApiEvent("error", eventId, "agent.audit_export.unhandled_error");
    return apiUnhandledError(error, eventId);
  }
}
