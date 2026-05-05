import assert from "node:assert/strict";
import test from "node:test";
import {
  createAccountSessionToken,
  isValidAccountEmail,
  normalizeAccountEmail,
  normalizeAccountName,
  verifyAccountSessionToken
} from "@/lib/account-session";

test("normalizes account identity fields", () => {
  assert.equal(normalizeAccountEmail("  USER@Example.COM  "), "user@example.com");
  assert.equal(normalizeAccountName("  Revenue   Operator  ", "user@example.com"), "Revenue Operator");
  assert.equal(normalizeAccountName("", "user@example.com"), "user");
});

test("validates basic account email shape", () => {
  assert.equal(isValidAccountEmail("user@example.com"), true);
  assert.equal(isValidAccountEmail("user"), false);
  assert.equal(isValidAccountEmail("user@example"), false);
});

test("account session token verifies and rejects tampering", () => {
  const token = createAccountSessionToken({ userId: "user_123", email: "user@example.com" });
  assert.deepEqual(verifyAccountSessionToken(token), { userId: "user_123", email: "user@example.com" });

  const [body, signature] = token.split(".");
  assert.equal(verifyAccountSessionToken(`${body}.${signature.slice(0, -2)}xx`), null);
});
