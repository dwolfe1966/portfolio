import assert from "node:assert/strict";
import test from "node:test";

import { resolveDemoResetRequest } from "@/lib/demo-reset";

test("resolveDemoResetRequest requires explicit confirmation token", () => {
  const result = resolveDemoResetRequest({ scope: "all" });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, "CONFIRMATION_REQUIRED");
  }
});

test("resolveDemoResetRequest defaults invalid scope to all", () => {
  const result = resolveDemoResetRequest({ confirm: "RESET_DEMO", scope: "unexpected" });
  assert.deepEqual(result, { ok: true, scope: "all" });
});

test("resolveDemoResetRequest accepts lifecycle and acquisition scopes", () => {
  assert.deepEqual(resolveDemoResetRequest({ confirm: "RESET_DEMO", scope: "lifecycle" }), {
    ok: true,
    scope: "lifecycle"
  });
  assert.deepEqual(resolveDemoResetRequest({ confirm: "RESET_DEMO", scope: "acquisition" }), {
    ok: true,
    scope: "acquisition"
  });
});
