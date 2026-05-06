import assert from "node:assert/strict";
import test from "node:test";
import {
  createAccountSessionToken,
  hashAccountPassword,
  isValidAccountEmail,
  normalizeAccountEmail,
  normalizeAccountName,
  verifyAccountPassword,
  verifyAccountSessionToken
} from "@/lib/account-session";
import { verifyAccountSessionTokenEdge } from "@/lib/account-session-edge";

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

test("edge account session verifier accepts node-created tokens", async () => {
  const token = createAccountSessionToken({ userId: "user_456", email: "edge@example.com" });
  assert.deepEqual(await verifyAccountSessionTokenEdge(token), { userId: "user_456", email: "edge@example.com" });
  assert.equal(await verifyAccountSessionTokenEdge(`${token.slice(0, -2)}xx`), null);
});

test("account password hashes verify without storing the raw password", () => {
  const hash = hashAccountPassword("correct horse battery staple");
  assert.notEqual(hash, "correct horse battery staple");
  assert.equal(verifyAccountPassword("correct horse battery staple", hash), true);
  assert.equal(verifyAccountPassword("wrong password", hash), false);
});
