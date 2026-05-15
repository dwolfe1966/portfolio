import assert from "node:assert/strict";
import test from "node:test";
import { buildWorkspaceExecutionUiGate } from "@/lib/workspace-execution-ui-gates";
import { buildWorkspaceLaunchReadiness } from "@/lib/workspace-launch-readiness";

test("buildWorkspaceExecutionUiGate enables execution controls when launch readiness is complete", () => {
  const readiness = buildWorkspaceLaunchReadiness({
    customerName: "Acme Inc.",
    workspaceId: "workspace_1",
    generatedAt: "2026-05-14T12:00:00.000Z",
    providerReadReady: true,
    providerWriteReady: true
  });

  const gate = buildWorkspaceExecutionUiGate(readiness);

  assert.equal(gate.humanApprovedProviderExecutionEnabled, true);
  assert.equal(gate.agentManagedExecutionEnabled, true);
  assert.equal(gate.billableExecutionEnabled, true);
  assert.equal(gate.billableGateStatus, "ready");
});

test("buildWorkspaceExecutionUiGate downgrades execution when provider write evidence is incomplete", () => {
  const readiness = buildWorkspaceLaunchReadiness({
    customerName: "Acme Inc.",
    workspaceId: "workspace_1",
    generatedAt: "2026-05-14T12:00:00.000Z",
    providerReadReady: true,
    providerWriteReady: false
  });

  const gate = buildWorkspaceExecutionUiGate(readiness);

  assert.equal(gate.humanApprovedProviderExecutionEnabled, false);
  assert.equal(gate.agentManagedExecutionEnabled, false);
  assert.equal(gate.billableExecutionEnabled, false);
  assert.equal(gate.maxAllowedLaunchMode, "recommendation_only");
  assert.ok(gate.nextRequiredAction.includes("Approve channel write grants"));
  assert.equal(gate.controls.find((control) => control.key === "performance_billing")?.enabled, false);
});
