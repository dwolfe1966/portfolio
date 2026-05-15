import assert from "node:assert/strict";
import test from "node:test";
import { buildWorkspaceLaunchEvidenceSettings } from "@/lib/workspace-launch-evidence-settings";
import { buildWorkspaceLaunchReadiness } from "@/lib/workspace-launch-readiness";

test("buildWorkspaceLaunchEvidenceSettings summarizes launch evidence counters", () => {
  const readiness = buildWorkspaceLaunchReadiness({
    customerName: "Acme Inc.",
    workspaceId: "workspace_1",
    generatedAt: "2026-05-14T12:00:00.000Z",
    providerWriteReady: true
  });
  const settings = buildWorkspaceLaunchEvidenceSettings(readiness);

  assert.equal(settings.status, "incomplete");
  assert.equal(settings.approvedReviewerCount, settings.reviewerCount);
  assert.equal(settings.approvedMappingsCount, readiness.packet.sections.mappings.length);
  assert.equal(settings.evidenceExportsCount, 1);
  assert.ok(settings.editableSections.some((section) => section.key === "systems"));
  assert.ok(settings.nextRequiredAction.includes("Attach read evidence"));
});

test("buildWorkspaceLaunchEvidenceSettings flags missing provider write evidence", () => {
  const readiness = buildWorkspaceLaunchReadiness({
    customerName: "Acme Inc.",
    workspaceId: "workspace_1",
    generatedAt: "2026-05-14T12:00:00.000Z",
    providerWriteReady: false
  });
  const settings = buildWorkspaceLaunchEvidenceSettings(readiness);
  const systems = settings.editableSections.find((section) => section.key === "systems");
  const policy = settings.editableSections.find((section) => section.key === "policy");

  assert.equal(settings.status, "incomplete");
  assert.equal(systems?.status, "needs_evidence");
  assert.equal(policy?.status, "needs_evidence");
  assert.ok(settings.nextRequiredAction.includes("Attach read evidence"));
});
