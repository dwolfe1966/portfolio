import assert from "node:assert/strict";
import test from "node:test";
import { buildWorkspaceLaunchCockpitSummary } from "@/lib/workspace-launch-cockpit";

test("buildWorkspaceLaunchCockpitSummary summarizes a ready launch record", () => {
  const summary = buildWorkspaceLaunchCockpitSummary({
    record: {
      status: "ready",
      exportable: true,
      launchDecisionMode: "agent_managed_execution",
      nextRequiredAction: "Record billable execution gate approval.",
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
  assert.equal(summary.recentEvents[0].title, "Baseline and revenue proof saved");
});

test("buildWorkspaceLaunchCockpitSummary handles missing launch records", () => {
  const summary = buildWorkspaceLaunchCockpitSummary({});

  assert.equal(summary.statusLabel, "not configured");
  assert.equal(summary.statusTone, "progress");
  assert.equal(summary.packetLabel, "not exportable");
  assert.equal(summary.nextActionHref, "/workspace/settings");
  assert.deepEqual(summary.recentEvents, []);
});
