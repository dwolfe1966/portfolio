import { NextRequest, NextResponse } from "next/server";
import { ACCOUNT_SESSION_COOKIE, verifyAccountSessionToken } from "@/lib/account-session";
import { apiCompatibilityError, apiError, apiUnhandledError } from "@/lib/api-contract";
import { buildAcquisitionProviderWriteReadiness, acquisitionProviderDryRunAdapterAvailable } from "@/lib/acquisition-agent-generalization";
import { db } from "@/lib/db";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { createEventId, logApiEvent } from "@/lib/logging";
import { getDefaultWorkspace } from "@/lib/workspace";
import { upsertWorkspaceLaunchReadinessRecord } from "@/lib/workspace-launch-readiness-records";

function fileStamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function filenamePart(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "workspace";
}

function scopeKey(accountUserId: string) {
  return `account:${accountUserId}`;
}

function providerWriteReady() {
  return buildAcquisitionProviderWriteReadiness({
    providerDryRunAdapterAvailable: acquisitionProviderDryRunAdapterAvailable(),
    rollbackMetadataAvailable: Boolean(process.env.ACQUISITION_PROVIDER_ROLLBACK_METADATA_READY?.trim()),
    approvalPolicyConfigured: true,
    measurementConfigured: Boolean(process.env.ACQUISITION_PROVIDER_MEASUREMENT_READY?.trim()),
    protectedCampaignChecksEnabled: true,
    emergencyStopConfigured: true
  }).readyForApprovedMutation;
}

function readMarkdown(packet: unknown) {
  if (!packet || typeof packet !== "object" || Array.isArray(packet)) return null;
  const markdown = (packet as { markdown?: unknown }).markdown;
  return typeof markdown === "string" && markdown.trim() ? markdown : null;
}

export async function GET(request: NextRequest) {
  const eventId = createEventId("launch_packet_export");
  const accountUserId = verifyAccountSessionToken(request.cookies.get(ACCOUNT_SESSION_COOKIE)?.value)?.userId ?? null;
  if (!accountUserId) return apiError(401, "UNAUTHORIZED", "Sign in to export the customer launch packet.", { eventId });

  try {
    const workspace = await getDefaultWorkspace();
    const format = request.nextUrl.searchParams.get("format") === "markdown" ? "markdown" : "json";
    const { record } = await upsertWorkspaceLaunchReadinessRecord({
      customerName: workspace.name,
      workspaceId: workspace.id,
      accountUserId,
      providerReadReady: true,
      providerWriteReady: providerWriteReady(),
      auditExportHref: "/api/workspace/agents/audit-export"
    });
    const stored = await db.workspaceLaunchReadinessRecord.findFirst({
      where: { workspaceId: workspace.id, scopeKey: scopeKey(accountUserId) },
      orderBy: { updatedAt: "desc" }
    });
    const exportRecord = stored ?? record;
    const packet = exportRecord.launchPacket;
    const baseName = `${filenamePart(exportRecord.customerName)}-launch-packet-${fileStamp()}`;

    logApiEvent("info", eventId, "workspace.launch_packet_export.completed", {
      workspaceId: workspace.id,
      accountUserId,
      format,
      status: exportRecord.status
    });

    if (format === "markdown") {
      return new NextResponse(readMarkdown(packet) ?? "# Customer Launch Packet\n\nNo markdown launch packet was stored.", {
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `attachment; filename="${baseName}.md"`,
          "Cache-Control": "no-store"
        }
      });
    }

    return NextResponse.json(
      {
        ok: true,
        launchPacket: packet,
        record: {
          id: exportRecord.id,
          workspaceId: exportRecord.workspaceId,
          customerName: exportRecord.customerName,
          status: exportRecord.status,
          exportable: exportRecord.exportable,
          maxAllowedLaunchMode: exportRecord.maxAllowedLaunchMode,
          nextRequiredAction: exportRecord.nextRequiredAction,
          lastEvaluatedAt: exportRecord.lastEvaluatedAt
        }
      },
      {
        headers: {
          "Content-Disposition": `attachment; filename="${baseName}.json"`,
          "Cache-Control": "no-store"
        }
      }
    );
  } catch (error) {
    if (isMissingDemoTableError(error)) {
      logApiEvent("warn", eventId, "workspace.launch_packet_export.compatibility_mode");
      return apiCompatibilityError("Workspace launch readiness tables are missing or unavailable.", { eventId });
    }

    logApiEvent("error", eventId, "workspace.launch_packet_export.unhandled_error");
    return apiUnhandledError(error, eventId);
  }
}
