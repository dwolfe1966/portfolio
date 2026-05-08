import assert from "node:assert/strict";
import test from "node:test";

import { isMissingDemoTableError } from "@/lib/demo-db-errors";

test("isMissingDemoTableError recognizes prisma and postgres schema/table codes", () => {
  assert.equal(isMissingDemoTableError({ code: "P1001" }), true);
  assert.equal(isMissingDemoTableError({ code: "P2021" }), true);
  assert.equal(isMissingDemoTableError({ code: "P2022" }), true);
  assert.equal(isMissingDemoTableError({ code: "3F000" }), true);
  assert.equal(isMissingDemoTableError({ code: "42P01" }), true);
});

test("isMissingDemoTableError recognizes demo database connectivity failures", () => {
  assert.equal(
    isMissingDemoTableError({
      message: "Can't reach database server at `ep-example.neon.tech:5432`"
    }),
    true
  );
  assert.equal(isMissingDemoTableError({ message: "Timed out fetching a new connection from the pool." }), true);
});

test("isMissingDemoTableError recognizes nested cause code", () => {
  assert.equal(isMissingDemoTableError({ cause: { code: "3F000" } }), true);
});

test("isMissingDemoTableError ignores unrelated errors", () => {
  assert.equal(isMissingDemoTableError({ code: "P2002", message: "Unique constraint failed" }), false);
});
