import test from "node:test";
import assert from "node:assert/strict";
import { SimulatedConnector } from "@/lib/ad-connectors/simulated";
import { getConnector } from "@/lib/ad-connectors";

test("SimulatedConnector returns only test accounts", async () => {
  const connector = new SimulatedConnector();
  const accounts = await connector.fetchAccounts();
  assert.ok(accounts.length > 0);
  for (const account of accounts) {
    assert.equal(account.isTestAccount, true);
    assert.equal(account.provider, "simulated");
  }
});

test("SimulatedConnector returns deterministic campaign list per account", async () => {
  const connector = new SimulatedConnector();
  const first = await connector.fetchCampaigns("sim-acct-001");
  const second = await connector.fetchCampaigns("sim-acct-001");
  assert.deepEqual(first, second);
  assert.ok(first.length >= 1);
  assert.ok(first.every((c) => c.externalCampaignId.startsWith("sim-acct-001-")));
});

test("SimulatedConnector returns deterministic performance for the same range", async () => {
  const connector = new SimulatedConnector();
  const range = { start: "2026-04-01", end: "2026-04-07" };
  const a = await connector.fetchPerformance("sim-acct-001", "sim-acct-001-camp-1", range);
  const b = await connector.fetchPerformance("sim-acct-001", "sim-acct-001-camp-1", range);
  assert.deepEqual(a, b);
  assert.equal(a.daily.length, 7);
});

test("SimulatedConnector daily totals sum to the totals payload", async () => {
  const connector = new SimulatedConnector();
  const range = { start: "2026-04-01", end: "2026-04-05" };
  const result = await connector.fetchPerformance("sim-acct-001", "sim-acct-001-camp-1", range);

  const summed = result.daily.reduce(
    (acc, point) => ({
      impressions: acc.impressions + point.impressions,
      clicks: acc.clicks + point.clicks,
      conversions: acc.conversions + point.conversions,
      spendCents: acc.spendCents + point.spendCents
    }),
    { impressions: 0, clicks: 0, conversions: 0, spendCents: 0 }
  );

  assert.deepEqual(summed, result.totals);
});

test("SimulatedConnector returns empty daily list for invalid date ranges", async () => {
  const connector = new SimulatedConnector();
  const result = await connector.fetchPerformance("sim-acct-001", "sim-acct-001-camp-1", {
    start: "2026-04-10",
    end: "2026-04-01"
  });
  assert.equal(result.daily.length, 0);
});

test("getConnector falls back to SimulatedConnector for providers without real impls", () => {
  const google = getConnector("google_ads");
  const meta = getConnector("meta_ads");
  const sim = getConnector("simulated");

  // Until Phase 3, all providers resolve to the simulated impl.
  assert.equal(google.provider, "simulated");
  assert.equal(meta.provider, "simulated");
  assert.equal(sim.provider, "simulated");
});
