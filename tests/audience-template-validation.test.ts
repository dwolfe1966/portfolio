import test from "node:test";
import assert from "node:assert/strict";
import { validateAudienceTemplateInput } from "@/lib/acquisition";

test("validateAudienceTemplateInput accepts a complete valid payload", () => {
  const result = validateAudienceTemplateInput({
    name: "ICP Operators",
    audienceType: "lookalike",
    targetingJson: { seniority: ["director", "vp"] },
    predictedCpcCents: 320,
    predictedCacCents: 14500,
    description: "Senior buyers"
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.name, "ICP Operators");
    assert.equal(result.value.audienceType, "lookalike");
    assert.equal(result.value.predictedCpcCents, 320);
    assert.equal(result.value.predictedCacCents, 14500);
    assert.equal(result.value.description, "Senior buyers");
    assert.deepEqual(result.value.targetingJson, { seniority: ["director", "vp"] });
  }
});

test("validateAudienceTemplateInput parses targetingJson when given as a string", () => {
  const result = validateAudienceTemplateInput({
    name: "Growth Leaders",
    audienceType: "interest",
    targetingJson: '{"interests":["growth"]}',
    predictedCpcCents: 260,
    predictedCacCents: 15200
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.deepEqual(result.value.targetingJson, { interests: ["growth"] });
  }
});

test("validateAudienceTemplateInput rejects malformed JSON string", () => {
  const result = validateAudienceTemplateInput({
    name: "Broken",
    audienceType: "interest",
    targetingJson: "{ not valid json",
    predictedCpcCents: 260,
    predictedCacCents: 15200
  });

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.errors.some((e) => /targetingJson.*JSON/i.test(e)));
  }
});

test("validateAudienceTemplateInput requires non-empty name and audienceType", () => {
  const result = validateAudienceTemplateInput({
    name: "  ",
    audienceType: "",
    targetingJson: {},
    predictedCpcCents: 100,
    predictedCacCents: 1000
  });

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.errors.some((e) => /name is required/.test(e)));
    assert.ok(result.errors.some((e) => /audienceType is required/.test(e)));
  }
});

test("validateAudienceTemplateInput rejects out-of-range cents fields", () => {
  const result = validateAudienceTemplateInput({
    name: "Bad",
    audienceType: "lookalike",
    targetingJson: {},
    predictedCpcCents: -1,
    predictedCacCents: 9999999
  });

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.errors.some((e) => /predictedCpcCents/.test(e)));
    assert.ok(result.errors.some((e) => /predictedCacCents/.test(e)));
  }
});

test("validateAudienceTemplateInput defaults missing targetingJson to empty object", () => {
  const result = validateAudienceTemplateInput({
    name: "Minimal",
    audienceType: "custom",
    predictedCpcCents: 100,
    predictedCacCents: 5000
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.deepEqual(result.value.targetingJson, {});
  }
});

test("validateAudienceTemplateInput trims and truncates description", () => {
  const longDescription = "x".repeat(700);
  const result = validateAudienceTemplateInput({
    name: "Trim Test",
    audienceType: "lookalike",
    targetingJson: {},
    predictedCpcCents: 100,
    predictedCacCents: 5000,
    description: `   ${longDescription}   `
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.description?.length, 500);
  }
});

test("validateAudienceTemplateInput keeps description null when empty", () => {
  const result = validateAudienceTemplateInput({
    name: "No description",
    audienceType: "lookalike",
    targetingJson: {},
    predictedCpcCents: 100,
    predictedCacCents: 5000,
    description: "   "
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.description, null);
  }
});

test("validateAudienceTemplateInput rounds non-integer cents inputs", () => {
  const result = validateAudienceTemplateInput({
    name: "Rounded",
    audienceType: "lookalike",
    targetingJson: {},
    predictedCpcCents: 299.7,
    predictedCacCents: 14500.4
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.predictedCpcCents, 300);
    assert.equal(result.value.predictedCacCents, 14500);
  }
});
