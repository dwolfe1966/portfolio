import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import {
  decryptOAuthToken,
  encryptOAuthToken,
  isOAuthEncryptionAvailable,
  OAuthEncryptionUnavailableError,
  __resetOAuthEncryptionKeyForTests
} from "@/lib/oauth-tokens";

function withKey(key: Buffer | null, fn: () => void) {
  const previous = process.env.OAUTH_ENCRYPTION_KEY;
  if (key === null) {
    delete process.env.OAUTH_ENCRYPTION_KEY;
  } else {
    process.env.OAUTH_ENCRYPTION_KEY = key.toString("base64");
  }
  __resetOAuthEncryptionKeyForTests();
  try {
    fn();
  } finally {
    if (previous === undefined) {
      delete process.env.OAUTH_ENCRYPTION_KEY;
    } else {
      process.env.OAUTH_ENCRYPTION_KEY = previous;
    }
    __resetOAuthEncryptionKeyForTests();
  }
}

test("encryptOAuthToken / decryptOAuthToken round-trips a refresh token", () => {
  withKey(randomBytes(32), () => {
    const plaintext = "1//refresh-token-abc123";
    const encrypted = encryptOAuthToken(plaintext);
    assert.notEqual(encrypted, plaintext);
    assert.equal(decryptOAuthToken(encrypted), plaintext);
  });
});

test("encryptOAuthToken produces fresh IV per call (different ciphertext)", () => {
  withKey(randomBytes(32), () => {
    const plaintext = "same-token";
    const a = encryptOAuthToken(plaintext);
    const b = encryptOAuthToken(plaintext);
    assert.notEqual(a, b);
    assert.equal(decryptOAuthToken(a), plaintext);
    assert.equal(decryptOAuthToken(b), plaintext);
  });
});

test("isOAuthEncryptionAvailable returns false when key is missing", () => {
  withKey(null, () => {
    assert.equal(isOAuthEncryptionAvailable(), false);
    assert.throws(() => encryptOAuthToken("anything"), OAuthEncryptionUnavailableError);
  });
});

test("isOAuthEncryptionAvailable returns false when key is wrong length", () => {
  withKey(randomBytes(16), () => {
    assert.equal(isOAuthEncryptionAvailable(), false);
  });
});

test("decryptOAuthToken rejects tampered ciphertext", () => {
  withKey(randomBytes(32), () => {
    const encrypted = encryptOAuthToken("secret");
    const buf = Buffer.from(encrypted, "base64");
    // Flip the last byte of ciphertext.
    buf[buf.length - 1] ^= 0xff;
    const tampered = buf.toString("base64");
    assert.throws(() => decryptOAuthToken(tampered));
  });
});

test("decryptOAuthToken rejects malformed payloads", () => {
  withKey(randomBytes(32), () => {
    assert.throws(() => decryptOAuthToken("not-base64-junk!!"));
    const tooShort = Buffer.alloc(5).toString("base64");
    assert.throws(() => decryptOAuthToken(tooShort));
  });
});
