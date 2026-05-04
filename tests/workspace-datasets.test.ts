import assert from "node:assert/strict";
import test from "node:test";
import { WORKSPACE_DATASET_SCHEMAS, summarizeDatasetReadiness, type WorkspaceDatasetReadiness } from "@/lib/workspace-datasets";

test("workspace dataset schemas cover every tool", () => {
  assert.deepEqual(
    WORKSPACE_DATASET_SCHEMAS.map((schema) => schema.app),
    ["lifecycle", "acquisition", "pricing", "retention", "expansion", "auction"]
  );
});

test("every dataset schema has required objects and an import path", () => {
  for (const schema of WORKSPACE_DATASET_SCHEMAS) {
    assert.ok(schema.importPath.startsWith("/"));
    assert.ok(schema.objects.some((object) => object.required));
  }
});

test("summarizeDatasetReadiness counts statuses and imported datasets", () => {
  const base = WORKSPACE_DATASET_SCHEMAS[0];
  const readiness: WorkspaceDatasetReadiness[] = [
    { ...base, status: "available", availableObjects: 1, requiredObjects: 1, recordCount: 10, importCount: 1, presetCount: 1, gap: "" },
    { ...base, status: "partial", availableObjects: 1, requiredObjects: 2, recordCount: 2, importCount: 0, presetCount: 0, gap: "" },
    { ...base, status: "missing", availableObjects: 0, requiredObjects: 2, recordCount: 0, importCount: 0, presetCount: 0, gap: "" }
  ];

  assert.deepEqual(summarizeDatasetReadiness(readiness), {
    available: 1,
    partial: 1,
    missing: 1,
    imported: 1
  });
});
