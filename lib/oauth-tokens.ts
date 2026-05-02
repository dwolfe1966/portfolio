import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * AES-256-GCM token encryption keyed off OAUTH_ENCRYPTION_KEY.
 *
 * Storage format (base64): version(1) | iv(12) | tag(16) | ciphertext(N)
 * Version byte allows future key/algorithm rotation.
 */

const VERSION = 1;
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

let cachedKey: Buffer | null | undefined;

export class OAuthEncryptionUnavailableError extends Error {
  constructor() {
    super("OAUTH_ENCRYPTION_KEY is not set or invalid (must decode to 32 bytes).");
    this.name = "OAuthEncryptionUnavailableError";
  }
}

function loadKey(): Buffer | null {
  if (cachedKey !== undefined) return cachedKey;

  const raw = process.env.OAUTH_ENCRYPTION_KEY;
  if (!raw) {
    cachedKey = null;
    return cachedKey;
  }

  try {
    const decoded = Buffer.from(raw.trim(), "base64");
    if (decoded.length !== KEY_LENGTH) {
      cachedKey = null;
      return cachedKey;
    }
    cachedKey = decoded;
  } catch {
    cachedKey = null;
  }
  return cachedKey;
}

export function isOAuthEncryptionAvailable(): boolean {
  return loadKey() !== null;
}

export function encryptOAuthToken(plaintext: string): string {
  const key = loadKey();
  if (!key) throw new OAuthEncryptionUnavailableError();

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([Buffer.from([VERSION]), iv, tag, ct]).toString("base64");
}

export function decryptOAuthToken(encoded: string): string {
  const key = loadKey();
  if (!key) throw new OAuthEncryptionUnavailableError();

  const buf = Buffer.from(encoded, "base64");
  if (buf.length < 1 + IV_LENGTH + TAG_LENGTH + 1) {
    throw new Error("Encrypted token is malformed.");
  }

  const version = buf[0];
  if (version !== VERSION) {
    throw new Error(`Unsupported encrypted token version: ${version}`);
  }

  const iv = buf.subarray(1, 1 + IV_LENGTH);
  const tag = buf.subarray(1 + IV_LENGTH, 1 + IV_LENGTH + TAG_LENGTH);
  const ct = buf.subarray(1 + IV_LENGTH + TAG_LENGTH);

  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}

/** Test-only: reset the cached key so env mutations are picked up between tests. */
export function __resetOAuthEncryptionKeyForTests() {
  cachedKey = undefined;
}
