import assert from "node:assert/strict";
import test from "node:test";
import { normalizePresetScope, validateWorkspacePresetInput } from "@/lib/workspace-presets";

test("normalizePresetScope accepts known values case-insensitively", () => {
  assert.equal(normalizePresetScope(" Acquisition ", ["acquisition"]), "acquisition");
  assert.equal(normalizePresetScope("unknown", ["acquisition"]), null);
});

test("validateWorkspacePresetInput accepts a valid scenario preset", () => {
  const parsed = validateWorkspacePresetInput({
    app: "acquisition",
    presetType: "scenario",
    name: "  Growth plan  ",
    values: { runCount: 100 },
    metadata: { source: "test" }
  });

  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.equal(parsed.value.name, "Growth plan");
    assert.equal(parsed.value.app, "acquisition");
    assert.deepEqual(parsed.value.values, { runCount: 100 });
  }
});

test("validateWorkspacePresetInput rejects invalid payloads", () => {
  const parsed = validateWorkspacePresetInput({
    app: "unknown",
    presetType: "scenario",
    name: "",
    values: []
  });

  assert.equal(parsed.ok, false);
  if (!parsed.ok) {
    assert.equal(parsed.errors.length, 3);
  }
});
