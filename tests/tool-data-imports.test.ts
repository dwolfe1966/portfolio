import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  TOOL_IMPORT_SCHEMAS,
  createEmptyMappings,
  getToolImportSchema,
  inferMapping,
  parseMappedCsvObject,
  parseSourceCsv,
  sourceRowsToCsv
} from "@/lib/tool-data-imports";

describe("tool data import schemas", () => {
  it("exposes lifecycle objects as a reusable import schema", () => {
    const schema = getToolImportSchema("lifecycle");
    assert.equal(schema.objects.length, 4);
    assert.deepEqual(schema.objects.map((object) => object.key), ["users", "entities", "interestEdges", "changeEvents"]);
    assert.ok(schema.sourceTypes.includes("csv"));
    assert.ok(schema.sourceTypes.includes("google_sheets"));
    assert.ok(schema.sourceTypes.includes("live"));
  });

  it("defines import schemas for every tool", () => {
    assert.deepEqual(
      TOOL_IMPORT_SCHEMAS.map((schema) => schema.tool),
      ["lifecycle", "acquisition", "pricing", "retention", "expansion", "auction"]
    );
    TOOL_IMPORT_SCHEMAS.forEach((schema) => {
      assert.ok(schema.objects.length > 0);
      schema.objects.forEach((object) => {
        assert.ok(object.fields.length > 0);
        assert.ok(object.requiredFields.length > 0);
        assert.ok(object.maxRows > 0);
      });
    });
  });

  it("infers field mappings from common source column names", () => {
    const schema = getToolImportSchema("lifecycle");
    const users = schema.objects.find((object) => object.key === "users");
    assert.ok(users);
    assert.equal(inferMapping(["Customer Name", "Email Address", "Plan Status"], "fullName", users), "Customer Name");
    assert.equal(inferMapping(["Customer Name", "Email Address", "Plan Status"], "subscriptionStatus", users), "Plan Status");
  });

  it("parses quoted CSV cells and validates mapped lifecycle rows", () => {
    const schema = getToolImportSchema("lifecycle");
    const users = schema.objects.find((object) => object.key === "users");
    assert.ok(users);

    const source = "Customer Name,Email Address,Segment,Plan Status\n\"Lee, Jordan\",jordan@example.com,TRIAL,TRIALING";
    const parsedSource = parseSourceCsv(source);
    assert.equal(parsedSource.sourceRows[0]["Customer Name"], "Lee, Jordan");

    const parsed = parseMappedCsvObject(source, users, {
      fullName: "Customer Name",
      email: "Email Address",
      segment: "Segment",
      subscriptionStatus: "Plan Status",
      lastActiveAt: ""
    });

    assert.deepEqual(parsed.errors, []);
    assert.equal(parsed.rows[0].fullName, "Lee, Jordan");
    assert.equal(parsed.rows[0].email, "jordan@example.com");
  });

  it("normalizes enum-like imported values regardless of case", () => {
    const schema = getToolImportSchema("lifecycle");
    const users = schema.objects.find((object) => object.key === "users");
    const changeEvents = schema.objects.find((object) => object.key === "changeEvents");
    assert.ok(users);
    assert.ok(changeEvents);

    const parsedUser = parseMappedCsvObject(
      "Name,Email,Segment,Status\nJordan Lee,jordan@example.com,trial,trialing",
      users,
      { fullName: "Name", email: "Email", segment: "Segment", subscriptionStatus: "Status", lastActiveAt: "" }
    );
    assert.deepEqual(parsedUser.errors, []);
    assert.equal(parsedUser.rows[0].segment, "TRIAL");
    assert.equal(parsedUser.rows[0].subscriptionStatus, "TRIALING");

    const parsedEvent = parseMappedCsvObject(
      "Entity,Type,Summary,Date\nAcme,employee_record_added,Employee record added,2026-05-01",
      changeEvents,
      { entityName: "Entity", changeType: "Type", oldValue: "", newValue: "", deltaSummary: "Summary", detectedAt: "Date" }
    );
    assert.deepEqual(parsedEvent.errors, []);
    assert.equal(parsedEvent.rows[0].changeType, "EMPLOYEE_RECORD_ADDED");
  });

  it("rejects out-of-range spreadsheet dates instead of relying on JavaScript date rollover", () => {
    const schema = getToolImportSchema("lifecycle");
    const changeEvents = schema.objects.find((object) => object.key === "changeEvents");
    assert.ok(changeEvents);

    const parsedValidDate = parseMappedCsvObject(
      "Entity,Type,Summary,Date\nAcme,EMPLOYEE_RECORD_ADDED,Employee record added,5-1-2026",
      changeEvents,
      { entityName: "Entity", changeType: "Type", oldValue: "", newValue: "", deltaSummary: "Summary", detectedAt: "Date" }
    );
    assert.deepEqual(parsedValidDate.errors, []);

    const parsedInvalidDate = parseMappedCsvObject(
      "Entity,Type,Summary,Date\nAcme,EMPLOYEE_RECORD_ADDED,Employee record added,5-1-20206",
      changeEvents,
      { entityName: "Entity", changeType: "Type", oldValue: "", newValue: "", deltaSummary: "Summary", detectedAt: "Date" }
    );
    assert.deepEqual(parsedInvalidDate.errors, ["Row 2: detectedAt must be a date."]);
  });

  it("serializes edited source rows back to CSV", () => {
    const csv = sourceRowsToCsv(["name", "note"], [
      { name: "Acme", note: "quoted, comma" },
      { name: "Beta", note: "plain" }
    ]);

    assert.equal(csv, "name,note\nAcme,\"quoted, comma\"\nBeta,plain");
    assert.deepEqual(parseSourceCsv(csv).sourceRows[0], { name: "Acme", note: "quoted, comma" });
  });

  it("creates empty mappings for every object and field", () => {
    const schema = getToolImportSchema("lifecycle");
    const mappings = createEmptyMappings(schema);
    assert.equal(mappings.users.email, "");
    assert.equal(mappings.changeEvents.detectedAt, "");
  });
});
