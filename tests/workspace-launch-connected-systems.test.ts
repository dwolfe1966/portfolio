import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeWorkspaceLaunchConnectedSystems,
  providerReadReadyFromConnectedSystems,
  providerWriteReadyFromConnectedSystems,
  WORKSPACE_LAUNCH_CONNECTED_SYSTEMS
} from "@/lib/workspace-launch-connected-systems";

test("normalizeWorkspaceLaunchConnectedSystems returns every launch system", () => {
  const systems = normalizeWorkspaceLaunchConnectedSystems([
    {
      provider: "google_ads",
      name: "  Google Ads  ",
      accountId: "  123-456  ",
      credentialGrantId: " grant_google ",
      readReady: true,
      writeReady: true
    }
  ]);

  assert.equal(systems.length, WORKSPACE_LAUNCH_CONNECTED_SYSTEMS.length);
  assert.deepEqual(systems.map((system) => system.provider), WORKSPACE_LAUNCH_CONNECTED_SYSTEMS.map((system) => system.provider));
  assert.deepEqual(
    systems.find((system) => system.provider === "google_ads"),
    {
      name: "Google Ads",
      systemType: "ad_platform",
      provider: "google_ads",
      accountId: "123-456",
      readReady: true,
      writeReady: true,
      credentialGrantId: "grant_google"
    }
  );
  assert.equal(systems.find((system) => system.provider === "meta_ads")?.readReady, false);
});

test("provider readiness is derived from connected ad-platform evidence", () => {
  const systems = normalizeWorkspaceLaunchConnectedSystems([
    { provider: "google_ads", readReady: true, writeReady: false },
    { provider: "meta_ads", readReady: false, writeReady: false }
  ]);

  assert.equal(providerReadReadyFromConnectedSystems(systems), true);
  assert.equal(providerWriteReadyFromConnectedSystems(systems), false);
});
