import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * OAuth state-token CSRF helper.
 *
 * Encoded form: base64url(payloadJson) . base64url(hmacSha256(payloadJson))
 * where payloadJson = { n: nonce, p: provider, exp: epochMs }.
 *
 * The HMAC key is derived from OAUTH_ENCRYPTION_KEY (the same env var used
 * for token encryption) so we don't sprawl secret material; HMAC of the key
 * bytes is used so we don't share the AES key directly.
 */

const STATE_TTL_MS = 10 * 60 * 1000;

let cachedHmacKey: Buffer | null | undefined;

export class OAuthStateError extends Error {}

function loadHmacKey(): Buffer | null {
  if (cachedHmacKey !== undefined) return cachedHmacKey;

  const raw = process.env.OAUTH_ENCRYPTION_KEY;
  if (!raw) {
    cachedHmacKey = null;
    return null;
  }

  try {
    const decoded = Buffer.from(raw.trim(), "base64");
    if (decoded.length !== 32) {
      cachedHmacKey = null;
      return null;
    }
    // Derive an HMAC key from the AES key so the two domains don't share
    // raw key material.
    cachedHmacKey = createHmac("sha256", decoded).update("oauth-state-v1").digest();
  } catch {
    cachedHmacKey = null;
  }
  return cachedHmacKey;
}

function b64urlEncode(buf: Buffer | string): string {
  const b = typeof buf === "string" ? Buffer.from(buf, "utf8") : buf;
  return b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): Buffer {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice(0, (4 - (s.length % 4)) % 4);
  return Buffer.from(padded, "base64");
}

export function createOAuthState(provider: string, now: number = Date.now()): string {
  const key = loadHmacKey();
  if (!key) throw new OAuthStateError("OAUTH_ENCRYPTION_KEY is not configured");

  const payload = {
    n: randomBytes(16).toString("hex"),
    p: provider,
    exp: now + STATE_TTL_MS
  };
  const json = JSON.stringify(payload);
  const sig = createHmac("sha256", key).update(json).digest();
  return `${b64urlEncode(json)}.${b64urlEncode(sig)}`;
}

export function verifyOAuthState(
  state: string,
  expectedProvider: string,
  now: number = Date.now()
): { ok: true } | { ok: false; reason: string } {
  const key = loadHmacKey();
  if (!key) return { ok: false, reason: "encryption_key_missing" };

  const parts = state.split(".");
  if (parts.length !== 2) return { ok: false, reason: "malformed" };
  const [encodedPayload, encodedSig] = parts;

  let payloadBuf: Buffer;
  let sigBuf: Buffer;
  try {
    payloadBuf = b64urlDecode(encodedPayload);
    sigBuf = b64urlDecode(encodedSig);
  } catch {
    return { ok: false, reason: "malformed" };
  }

  const expected = createHmac("sha256", key).update(payloadBuf).digest();
  if (sigBuf.length !== expected.length || !timingSafeEqual(sigBuf, expected)) {
    return { ok: false, reason: "bad_signature" };
  }

  let parsed: { n?: string; p?: string; exp?: number };
  try {
    parsed = JSON.parse(payloadBuf.toString("utf8"));
  } catch {
    return { ok: false, reason: "malformed" };
  }

  if (parsed.p !== expectedProvider) return { ok: false, reason: "provider_mismatch" };
  if (typeof parsed.exp !== "number" || parsed.exp < now) return { ok: false, reason: "expired" };

  return { ok: true };
}

/** Test-only: reset cached HMAC key when env mutations need to take effect. */
export function __resetOAuthStateKeyForTests() {
  cachedHmacKey = undefined;
}
