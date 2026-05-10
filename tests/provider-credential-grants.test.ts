import assert from "node:assert/strict";
import test from "node:test";
import {
  providerGrantCapabilities,
  providerGrantEnvironment,
  providerTokenHealthStatus
} from "@/lib/provider-credential-grants";

test("providerGrantEnvironment separates test and live account grants", () => {
  assert.equal(providerGrantEnvironment(true), "test");
  assert.equal(providerGrantEnvironment(false), "live");
});

test("providerTokenHealthStatus treats missing or future expiry as valid", () => {
  const now = new Date("2026-05-10T12:00:00.000Z");
  assert.equal(providerTokenHealthStatus(null, now), "valid");
  assert.equal(providerTokenHealthStatus(new Date("2026-05-10T12:01:00.000Z"), now), "valid");
  assert.equal(providerTokenHealthStatus(new Date("2026-05-10T11:59:00.000Z"), now), "expired");
});

test("providerGrantCapabilities records provider read and dry-run capabilities", () => {
  const google = providerGrantCapabilities("google_ads", ["https://www.googleapis.com/auth/adwords"]);
  assert.ok(google.includes("google_ads.customer.read"));
  assert.ok(google.includes("google_ads.campaign.read"));
  assert.ok(google.includes("provider_write.dry_run"));
  assert.ok(google.includes("oauth.scoped"));

  const meta = providerGrantCapabilities("meta_ads", ["ads_read"]);
  assert.ok(meta.includes("meta_ads.account.read"));
  assert.ok(meta.includes("meta_ads.campaign.read"));
  assert.ok(meta.includes("provider.performance.read"));
});
