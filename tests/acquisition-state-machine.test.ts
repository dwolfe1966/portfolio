import test from "node:test";
import assert from "node:assert/strict";
import {
  isValidStateTransition,
  validTransitionsFrom,
  type AcquisitionCampaignState
} from "@/lib/acquisition";

test("DRAFT can only progress to TESTING or COMPLETED", () => {
  assert.deepEqual(validTransitionsFrom("DRAFT").sort(), ["COMPLETED", "TESTING"]);
});

test("TESTING can move to SCALING, PAUSED, or COMPLETED", () => {
  assert.deepEqual(validTransitionsFrom("TESTING").sort(), ["COMPLETED", "PAUSED", "SCALING"]);
});

test("SCALING can move to TESTING, PAUSED, or COMPLETED", () => {
  assert.deepEqual(validTransitionsFrom("SCALING").sort(), ["COMPLETED", "PAUSED", "TESTING"]);
});

test("PAUSED can resume to TESTING or be COMPLETED", () => {
  assert.deepEqual(validTransitionsFrom("PAUSED").sort(), ["COMPLETED", "TESTING"]);
});

test("COMPLETED is terminal", () => {
  assert.deepEqual(validTransitionsFrom("COMPLETED"), []);
});

test("DRAFT cannot skip directly to SCALING or PAUSED", () => {
  assert.equal(isValidStateTransition("DRAFT", "SCALING"), false);
  assert.equal(isValidStateTransition("DRAFT", "PAUSED"), false);
});

test("Self-transitions are never valid", () => {
  const states: AcquisitionCampaignState[] = ["DRAFT", "TESTING", "SCALING", "PAUSED", "COMPLETED"];
  for (const state of states) {
    assert.equal(isValidStateTransition(state, state), false);
  }
});

test("COMPLETED cannot transition to any other state", () => {
  const states: AcquisitionCampaignState[] = ["DRAFT", "TESTING", "SCALING", "PAUSED"];
  for (const target of states) {
    assert.equal(isValidStateTransition("COMPLETED", target), false);
  }
});

test("validTransitionsFrom returns a fresh array (cannot mutate internal state)", () => {
  const first = validTransitionsFrom("DRAFT");
  first.push("PAUSED");
  const second = validTransitionsFrom("DRAFT");
  assert.equal(second.includes("PAUSED"), false);
});
