import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import {
  createOAuthState,
  verifyOAuthState,
  __resetOAuthStateKeyForTests
} from "@/lib/oauth-state";

function withKey(key: Buffer | null, fn: () => void) {
  const previous = process.env.OAUTH_ENCRYPTION_KEY;
  if (key === null) {
    delete process.env.OAUTH_ENCRYPTION_KEY;
  } else {
    process.env.OAUTH_ENCRYPTION_KEY = key.toString("base64");
  }
  __resetOAuthStateKeyForTests();
  try {
    fn();
  } finally {
    if (previous === undefined) {
      delete process.env.OAUTH_ENCRYPTION_KEY;
    } else {
      process.env.OAUTH_ENCRYPTION_KEY = previous;
    }
    __resetOAuthStateKeyForTests();
  }
}

test("createOAuthState + verifyOAuthState succeed for matching provider", () => {
  withKey(randomBytes(32), () => {
    const state = createOAuthState("google_ads");
    const result = verifyOAuthState(state, "google_ads");
    assert.equal(result.ok, true);
  });
});

test("verifyOAuthState rejects when provider differs", () => {
  withKey(randomBytes(32), () => {
    const state = createOAuthState("google_ads");
    const result = verifyOAuthState(state, "meta_ads");
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "provider_mismatch");
  });
});

test("verifyOAuthState rejects expired state", () => {
  withKey(randomBytes(32), () => {
    const past = Date.now() - 11 * 60 * 1000;
    const state = createOAuthState("google_ads", past);
    const result = verifyOAuthState(state, "google_ads");
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "expired");
  });
});

test("verifyOAuthState rejects tampered signature", () => {
  withKey(randomBytes(32), () => {
    const state = createOAuthState("google_ads");
    const [payload, sig] = state.split(".");
    // Flip a non-padding signature character so base64url decoding cannot preserve the same bytes.
    const tamperedChar = sig[0] === "A" ? "B" : "A";
    const tampered = `${payload}.${tamperedChar}${sig.slice(1)}`;
    const result = verifyOAuthState(tampered, "google_ads");
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "bad_signature");
  });
});

test("verifyOAuthState rejects malformed input", () => {
  withKey(randomBytes(32), () => {
    const result = verifyOAuthState("not-a-state-token", "google_ads");
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "malformed");
  });
});

test("verifyOAuthState fails closed when encryption key is missing", () => {
  withKey(null, () => {
    const result = verifyOAuthState("anything.atall", "google_ads");
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "encryption_key_missing");
  });
});

test("createOAuthState produces fresh nonce per call", () => {
  withKey(randomBytes(32), () => {
    const a = createOAuthState("google_ads");
    const b = createOAuthState("google_ads");
    assert.notEqual(a, b);
    assert.equal(verifyOAuthState(a, "google_ads").ok, true);
    assert.equal(verifyOAuthState(b, "google_ads").ok, true);
  });
});
