import assert from "node:assert/strict";
import test from "node:test";

import { isMissingDemoTableError } from "@/lib/demo-db-errors";

test("isMissingDemoTableError recognizes prisma and postgres schema/table codes", () => {
  assert.equal(isMissingDemoTableError({ code: "P2021" }), true);
  assert.equal(isMissingDemoTableError({ code: "P2022" }), true);
  assert.equal(isMissingDemoTableError({ code: "3F000" }), true);
  assert.equal(isMissingDemoTableError({ code: "42P01" }), true);
});

test("isMissingDemoTableError recognizes nested cause code", () => {
  assert.equal(isMissingDemoTableError({ cause: { code: "3F000" } }), true);
});

test("isMissingDemoTableError ignores unrelated errors", () => {
  assert.equal(isMissingDemoTableError({ code: "P2002", message: "Unique constraint failed" }), false);
});
