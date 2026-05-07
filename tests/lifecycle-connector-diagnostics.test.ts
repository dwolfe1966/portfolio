import assert from "node:assert/strict";
import test from "node:test";
import { buildLifecycleConnectorDiagnostics } from "@/lib/lifecycle-connectors/diagnostics";
import type { LifecycleConnectorHealth } from "@/lib/lifecycle-connectors";

const HEALTHY_WAREHOUSE: LifecycleConnectorHealth = {
  ok: true,
  provider: "fake_warehouse",
  kind: "warehouse",
  accountLabel: "Fake warehouse",
  capabilities: ["read_users", "read_entities", "read_events", "read_consent"],
  lastSyncAt: "2026-05-07T12:00:00.000Z",
  nextSyncAt: "2026-05-07T13:00:00.000Z",
  permissionWarnings: [],
  freshnessWarnings: []
};

test("buildLifecycleConnectorDiagnostics marks healthy fake connector ready for review because credentials are placeholders", () => {
  const result = buildLifecycleConnectorDiagnostics({
    health: HEALTHY_WAREHOUSE,
    configuredStatus: "configured",
    now: new Date("2026-05-07T12:30:00.000Z")
  });

  assert.equal(result.state, "review");
  assert.equal(result.healthStatus, "ok");
  assert.equal(result.permissionStatus, "ok");
  assert.equal(result.syncStatus, "ok");
  assert.equal(result.credentialStatus, "warning");
  assert.deepEqual(result.missingCapabilities, []);
});

test("buildLifecycleConnectorDiagnostics blocks missing required capabilities", () => {
  const result = buildLifecycleConnectorDiagnostics({
    health: { ...HEALTHY_WAREHOUSE, capabilities: ["read_users"] },
    configuredStatus: "configured",
    now: new Date("2026-05-07T12:30:00.000Z")
  });

  assert.equal(result.state, "blocked");
  assert.equal(result.permissionStatus, "blocked");
  assert.deepEqual(result.missingCapabilities, ["read_entities", "read_events"]);
});

test("buildLifecycleConnectorDiagnostics warns on stale sync timing and permission warnings", () => {
  const result = buildLifecycleConnectorDiagnostics({
    health: {
      ...HEALTHY_WAREHOUSE,
      permissionWarnings: ["Read-only warehouse role expires soon."],
      freshnessWarnings: ["Warehouse cursor is behind expected schedule."],
      nextSyncAt: "2026-05-07T11:00:00.000Z"
    },
    configuredStatus: "configured",
    credentialGrantId: "grant_123",
    now: new Date("2026-05-07T12:30:00.000Z")
  });

  assert.equal(result.state, "review");
  assert.equal(result.permissionStatus, "warning");
  assert.equal(result.syncStatus, "warning");
  assert.equal(result.credentialStatus, "ok");
  assert.equal(result.diagnostics.some((item) => item.detail.includes("Warehouse cursor")), true);
});
