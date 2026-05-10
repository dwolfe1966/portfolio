import test from "node:test";
import assert from "node:assert/strict";
import {
  buildMetaAuthorizeUrl,
  isMetaOAuthConfigured,
  loadMetaOAuthConfig
} from "@/lib/ad-connectors/meta-oauth";

function withMetaEnv(env: Record<string, string | undefined>, fn: () => void) {
  const keys = ["META_APP_ID", "META_APP_SECRET", "META_OAUTH_REDIRECT_URI", "META_GRAPH_API_VERSION"] as const;
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  for (const key of keys) {
    const value = env[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  try {
    fn();
  } finally {
    for (const key of keys) {
      const value = previous[key];
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

test("Meta OAuth config reports missing env vars", () => {
  withMetaEnv({
    META_APP_ID: undefined,
    META_APP_SECRET: undefined,
    META_OAUTH_REDIRECT_URI: undefined
  }, () => {
    assert.equal(isMetaOAuthConfigured(), false);
    assert.throws(() => loadMetaOAuthConfig(), /META_APP_ID/);
  });
});

test("buildMetaAuthorizeUrl includes ads_read scope and state", () => {
  withMetaEnv({
    META_APP_ID: "app_123",
    META_APP_SECRET: "secret",
    META_OAUTH_REDIRECT_URI: "http://localhost:3000/api/connections/meta/callback"
  }, () => {
    assert.equal(isMetaOAuthConfigured(), true);
    const url = new URL(buildMetaAuthorizeUrl("state_123"));
    assert.equal(url.hostname, "www.facebook.com");
    assert.equal(url.searchParams.get("client_id"), "app_123");
    assert.equal(url.searchParams.get("state"), "state_123");
    assert.equal(url.searchParams.get("scope"), "ads_read");
  });
});
