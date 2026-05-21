import test from "node:test";
import assert from "node:assert/strict";
import {
  buildMetaAuthorizeUrl,
  isMetaOAuthConfigured,
  listMetaAdAccounts,
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
    META_APP_ID: " app_123 ",
    META_APP_SECRET: " secret ",
    META_OAUTH_REDIRECT_URI: " http://localhost:3000/api/connections/meta/callback ",
    META_GRAPH_API_VERSION: "25.0"
  }, () => {
    assert.equal(isMetaOAuthConfigured(), true);
    const config = loadMetaOAuthConfig();
    assert.equal(config.appId, "app_123");
    assert.equal(config.appSecret, "secret");
    assert.equal(config.redirectUri, "http://localhost:3000/api/connections/meta/callback");
    assert.equal(config.graphApiVersion, "v25.0");
    const url = new URL(buildMetaAuthorizeUrl("state_123"));
    assert.equal(url.hostname, "www.facebook.com");
    assert.equal(url.searchParams.get("client_id"), "app_123");
    assert.equal(url.searchParams.get("state"), "state_123");
    assert.equal(url.searchParams.get("scope"), "ads_read");
  });
});

test("listMetaAdAccounts preserves account status metadata", async () => {
  const originalFetch = globalThis.fetch;
  const urls: string[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    urls.push(url);
    if (url.includes("page=2")) {
      return new Response(JSON.stringify({
        data: [{ id: "act_789", name: "Second Page", currency: "EUR", account_status: 3 }]
      }), { status: 200 });
    }
    return new Response(JSON.stringify({
      data: [
        { id: "act_123", name: "Acme Ads", currency: "USD", account_status: 1 },
        { id: "act_456", account_status: "2" }
      ],
      paging: { next: "https://graph.facebook.com/v25.0/me/adaccounts?page=2" }
    }), { status: 200 });
  }) as typeof fetch;
  try {
    const accounts = await listMetaAdAccounts("token", {
      appId: "app_123",
      appSecret: "secret",
      redirectUri: "http://localhost:3000/api/connections/meta/callback",
      graphApiVersion: "25.0"
    });

    assert.deepEqual(accounts, [
      { id: "act_123", name: "Acme Ads", currency: "USD", accountStatus: 1 },
      { id: "act_456", name: "Meta Ads act_456", currency: "USD", accountStatus: 2 },
      { id: "act_789", name: "Second Page", currency: "EUR", accountStatus: 3 }
    ]);
    assert.equal(urls[0].startsWith("https://graph.facebook.com/v25.0/me/adaccounts?"), true);
    assert.equal(urls.length, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
