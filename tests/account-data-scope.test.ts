import assert from "node:assert/strict";
import test from "node:test";
import {
  ANONYMOUS_IMPORT_SENTINEL,
  accountOwnedImportWhere,
  canUseImportedData,
  resolveActiveDataSourceMode,
  shouldCreateAccountOwnedImportSnapshot
} from "@/lib/account-data-scope";

test("anonymous import lookups use a sentinel instead of legacy null-account rows", () => {
  assert.deepEqual(accountOwnedImportWhere(null), { accountUserId: ANONYMOUS_IMPORT_SENTINEL });
  assert.deepEqual(accountOwnedImportWhere(undefined), { accountUserId: ANONYMOUS_IMPORT_SENTINEL });
});

test("account import lookups are scoped to exactly that account", () => {
  assert.deepEqual(accountOwnedImportWhere("acct_123"), { accountUserId: "acct_123" });
});

test("imported data controls are available only for authenticated accounts", () => {
  assert.equal(canUseImportedData(null), false);
  assert.equal(canUseImportedData(undefined), false);
  assert.equal(canUseImportedData("acct_123"), true);
});

test("active imported source falls back to sample for anonymous users", () => {
  assert.equal(resolveActiveDataSourceMode(null, "imported"), "sample");
  assert.equal(resolveActiveDataSourceMode(undefined, "imported"), "sample");
  assert.equal(resolveActiveDataSourceMode("acct_123", "imported"), "imported");
  assert.equal(resolveActiveDataSourceMode("acct_123", "sample"), "sample");
});

test("import snapshots are created only when an account owns them", () => {
  assert.equal(shouldCreateAccountOwnedImportSnapshot(null), false);
  assert.equal(shouldCreateAccountOwnedImportSnapshot(undefined), false);
  assert.equal(shouldCreateAccountOwnedImportSnapshot("acct_123"), true);
});
