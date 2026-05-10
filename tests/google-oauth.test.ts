import test from "node:test";
import assert from "node:assert/strict";
import {
  buildGoogleAuthorizeUrl,
  getGoogleAdsApiBase,
  isGoogleOAuthConfigured,
  loadGoogleOAuthConfig
} from "@/lib/ad-connectors/google-oauth";

const GOOGLE_ENV_KEYS = [
  "GOOGLE_OAUTH_CLIENT_ID",
  "GOOGLE_OAUTH_CLIENT_SECRET",
  "GOOGLE_OAUTH_REDIRECT_URI",
  "GOOGLE_ADS_DEVELOPER_TOKEN",
  "GOOGLE_ADS_LOGIN_CUSTOMER_ID",
  "GOOGLE_ADS_API_VERSION"
] as const;

function withGoogleEnv(env: Partial<Record<(typeof GOOGLE_ENV_KEYS)[number], string | undefined>>, fn: () => void) {
  const previous = Object.fromEntries(GOOGLE_ENV_KEYS.map((key) => [key, process.env[key]]));
  for (const key of GOOGLE_ENV_KEYS) {
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
    for (const key of GOOGLE_ENV_KEYS) {
      const value = previous[key];
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

test("Google OAuth config reports missing env vars", () => {
  withGoogleEnv({}, () => {
    assert.equal(isGoogleOAuthConfigured(), false);
    assert.throws(() => loadGoogleOAuthConfig(), /GOOGLE_OAUTH_CLIENT_ID/);
  });
});

test("Google OAuth config trims env vars and defaults to a supported Ads API version", () => {
  withGoogleEnv(
    {
      GOOGLE_OAUTH_CLIENT_ID: " client-id ",
      GOOGLE_OAUTH_CLIENT_SECRET: " secret ",
      GOOGLE_OAUTH_REDIRECT_URI: " http://localhost:3000/api/connections/google/callback ",
      GOOGLE_ADS_DEVELOPER_TOKEN: " token "
    },
    () => {
      const config = loadGoogleOAuthConfig();
      assert.equal(config.clientId, "client-id");
      assert.equal(config.clientSecret, "secret");
      assert.equal(config.redirectUri, "http://localhost:3000/api/connections/google/callback");
      assert.equal(config.developerToken, "token");
      assert.equal(config.loginCustomerId, null);
      assert.equal(config.apiBase, "https://googleads.googleapis.com/v22");

      const url = new URL(buildGoogleAuthorizeUrl("state-123", config));
      assert.equal(url.hostname, "accounts.google.com");
      assert.equal(url.searchParams.get("scope"), "https://www.googleapis.com/auth/adwords");
      assert.equal(url.searchParams.get("state"), "state-123");
    }
  );
});

test("Google Ads API base accepts optional env version without v prefix", () => {
  assert.equal(getGoogleAdsApiBase("20"), "https://googleads.googleapis.com/v20");
  assert.equal(getGoogleAdsApiBase("v21"), "https://googleads.googleapis.com/v21");
});

test("Google OAuth config trims optional login customer id hyphens", () => {
  withGoogleEnv(
    {
      GOOGLE_OAUTH_CLIENT_ID: "client-id",
      GOOGLE_OAUTH_CLIENT_SECRET: "secret",
      GOOGLE_OAUTH_REDIRECT_URI: "http://localhost:3000/api/connections/google/callback",
      GOOGLE_ADS_DEVELOPER_TOKEN: "token",
      GOOGLE_ADS_LOGIN_CUSTOMER_ID: " 123-456-7890 "
    },
    () => {
      assert.equal(loadGoogleOAuthConfig().loginCustomerId, "1234567890");
    }
  );
});
