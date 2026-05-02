import test from "node:test";
import assert from "node:assert/strict";
import { apiCompatibilityError, apiUnhandledError, readErrorMessage } from "@/lib/api-contract";
import { isDemoMutationAllowed } from "@/lib/env-guard";

test("readErrorMessage supports nested error contract", () => {
  const message = readErrorMessage(
    { ok: false, error: { code: "INVALID_INPUT", message: "Bad payload" } },
    "fallback"
  );
  assert.equal(message, "Bad payload");
});

test("readErrorMessage supports legacy string error", () => {
  const message = readErrorMessage({ ok: false, error: "Legacy error string" }, "fallback");
  assert.equal(message, "Legacy error string");
});

test("apiCompatibilityError returns structured schema fallback details", async () => {
  const response = apiCompatibilityError("Schema is missing.", { eventId: "evt_test", ready: false });
  const payload = await response.json();

  assert.equal(response.status, 503);
  assert.equal(payload.ok, false);
  assert.equal(payload.error.code, "COMPATIBILITY_MODE");
  assert.equal(payload.error.message, "Schema is missing.");
  assert.equal(payload.error.details.compatibilityMode, true);
  assert.equal(payload.error.details.eventId, "evt_test");
  assert.equal(payload.error.details.ready, false);
  assert.deepEqual(payload.error.details.fix, [
    "npm run db:generate",
    "npm run db:migrate:deploy",
    "npm run db:seed"
  ]);
});

test("apiUnhandledError preserves event id while hiding raw error as public message", async () => {
  const response = apiUnhandledError(new Error("database failed"), "evt_unhandled");
  const payload = await response.json();

  assert.equal(response.status, 500);
  assert.equal(payload.error.code, "INTERNAL_ERROR");
  assert.equal(payload.error.message, "Unexpected API error.");
  assert.equal(payload.error.details.eventId, "evt_unhandled");
  assert.equal(payload.error.details.message, "database failed");
});

test("isDemoMutationAllowed defaults to false in production", () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousFlag = process.env.DEMO_MUTATIONS_ENABLED;
  process.env.NODE_ENV = "production";
  delete process.env.DEMO_MUTATIONS_ENABLED;
  assert.equal(isDemoMutationAllowed(), false);
  process.env.NODE_ENV = previousNodeEnv;
  process.env.DEMO_MUTATIONS_ENABLED = previousFlag;
});

test("isDemoMutationAllowed obeys explicit environment override", () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousFlag = process.env.DEMO_MUTATIONS_ENABLED;
  process.env.NODE_ENV = "production";
  process.env.DEMO_MUTATIONS_ENABLED = "true";
  assert.equal(isDemoMutationAllowed(), true);
  process.env.NODE_ENV = previousNodeEnv;
  process.env.DEMO_MUTATIONS_ENABLED = previousFlag;
});
