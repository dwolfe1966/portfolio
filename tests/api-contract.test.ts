import test from "node:test";
import assert from "node:assert/strict";
import { readErrorMessage } from "@/lib/api-contract";
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
