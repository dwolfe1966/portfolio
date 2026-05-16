import assert from "node:assert/strict";
import test from "node:test";
import {
  buildWorkspaceLaunchCockpitSummary,
  buildWorkspaceLaunchPacketPreview,
  routeWorkspaceLaunchNextAction
} from "@/lib/workspace-launch-cockpit";

test("buildWorkspaceLaunchCockpitSummary summarizes a ready launch record", () => {
  const summary = buildWorkspaceLaunchCockpitSummary({
    record: {
      status: "ready",
      exportable: true,
      launchDecisionMode: "agent_managed_execution",
      nextRequiredAction: "Record billable execution gate approval.",
      launchPacket: {
        customerName: "Acme",
        generatedAt: "2026-05-15T12:00:00.000Z",
        sections: {
          owners: [{ approved: true }, { approved: false }],
          connectedSystems: [{ readReady: true, writeReady: false }, { readReady: true, writeReady: true }],
          baseline: { status: "ready" },
          revenueProof: { status: "warning", incrementalProfitCents: 1234500 },
          unresolvedRisks: [{ resolved: false }],
          evidenceExports: [{ href: "/api/workspace/agents/audit-export" }]
        }
      },
      updatedAt: new Date("2026-05-15T12:00:00.000Z")
    },
    events: [
      {
        id: "evt_1",
        eventType: "launch.baseline_evidence_saved",
        metadata: { summary: "Baseline saved with high confidence." },
        occurredAt: new Date("2026-05-15T11:00:00.000Z")
      }
    ]
  });

  assert.equal(summary.statusLabel, "ready");
  assert.equal(summary.statusTone, "live");
  assert.equal(summary.launchModeLabel, "agent managed execution");
  assert.equal(summary.packetLabel, "exportable");
  assert.equal(summary.nextActionHref, "/workspace/agents");
  assert.equal(summary.nextActionLabel, "Open agent operations");
  assert.equal(summary.recentEvents[0].title, "Baseline and revenue proof saved");
  assert.equal(summary.packetPreview.ownerApprovalLabel, "1 of 2 owners approved");
  assert.equal(summary.packetPreview.revenueProofLabel, "warning revenue proof · $12,345 incremental profit");
});

test("buildWorkspaceLaunchCockpitSummary handles missing launch records", () => {
  const summary = buildWorkspaceLaunchCockpitSummary({});

  assert.equal(summary.statusLabel, "not configured");
  assert.equal(summary.statusTone, "progress");
  assert.equal(summary.packetLabel, "not exportable");
  assert.equal(summary.nextActionHref, "/workspace/settings");
  assert.equal(summary.nextActionLabel, "Review launch settings");
  assert.deepEqual(summary.recentEvents, []);
  assert.equal(summary.packetPreview.available, false);
});

test("routeWorkspaceLaunchNextAction maps launch blockers to specific surfaces", () => {
  assert.deepEqual(routeWorkspaceLaunchNextAction("Approve owner roles: data_owner."), {
    href: "/workspace/settings#launch-owners",
    label: "Edit launch owners",
    routeKey: "owners"
  });
  assert.deepEqual(routeWorkspaceLaunchNextAction("Approve channel write grants before execution."), {
    href: "/workspace/settings#launch-systems",
    label: "Edit connected systems",
    routeKey: "systems"
  });
  assert.deepEqual(routeWorkspaceLaunchNextAction("Record last sync time for ad provider read snapshot."), {
    href: "/acquisition/connections",
    label: "Review provider connections",
    routeKey: "providers"
  });
  assert.deepEqual(routeWorkspaceLaunchNextAction("Record baseline freeze decision and attach it to the customer launch packet."), {
    href: "/workspace/settings#launch-baseline",
    label: "Edit baseline evidence",
    routeKey: "baseline"
  });
  assert.deepEqual(routeWorkspaceLaunchNextAction("Approve data mapping version."), {
    href: "/workspace/datasets",
    label: "Review datasets",
    routeKey: "datasets"
  });
  assert.deepEqual(routeWorkspaceLaunchNextAction("Enable audit evidence export."), {
    href: "/workspace/activity",
    label: "Review audit activity",
    routeKey: "activity"
  });
  assert.deepEqual(routeWorkspaceLaunchNextAction("Attach launch packet to a workspace."), {
    href: "/api/workspace/launch-packet?format=markdown",
    label: "Export launch packet",
    routeKey: "packet"
  });
});

test("buildWorkspaceLaunchPacketPreview summarizes packet sections from unknown JSON", () => {
  const preview = buildWorkspaceLaunchPacketPreview({
    customerName: "Launch Customer",
    generatedAt: "2026-05-15T12:00:00.000Z",
    sections: {
      owners: [{ approved: true }, { approved: true }],
      connectedSystems: [{ readReady: true, writeReady: false }],
      baseline: { status: "warning" },
      revenueProof: { status: "ready", incrementalProfitCents: -2500 },
      unresolvedRisks: [{ resolved: true }, { resolved: false }],
      evidenceExports: [{}, {}]
    }
  });

  assert.equal(preview.available, true);
  assert.equal(preview.customerName, "Launch Customer");
  assert.equal(preview.ownerApprovalLabel, "2 of 2 owners approved");
  assert.equal(preview.connectedSystemsLabel, "1 read ready · 0 write ready");
  assert.equal(preview.baselineLabel, "warning baseline");
  assert.equal(preview.unresolvedRiskLabel, "1 unresolved risk");
  assert.equal(preview.evidenceExportLabel, "2 evidence exports");
});
