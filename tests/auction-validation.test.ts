import test from "node:test";
import assert from "node:assert/strict";
import {
  validateAdvertiserInput,
  validateBidInput,
  validateSlotInput
} from "@/lib/auction-engine";

test("validateAdvertiserInput accepts a complete truthful payload", () => {
  const result = validateAdvertiserInput({
    name: "ICP Brand",
    qualityScore: 0.8,
    dailyBudgetCents: 50000,
    smoothingFactor: 0.5,
    behaviorMode: "truthful"
  });
  assert.equal(result.ok, true);
});

test("validateAdvertiserInput requires targetCacCents when behaviorMode is auto_bid", () => {
  const missing = validateAdvertiserInput({
    name: "AutoBidder",
    qualityScore: 0.7,
    dailyBudgetCents: 50000,
    smoothingFactor: 0.5,
    behaviorMode: "auto_bid"
  });
  assert.equal(missing.ok, false);
  if (!missing.ok) {
    assert.ok(missing.errors.some((e) => /targetCacCents.*auto_bid/.test(e)));
  }

  const present = validateAdvertiserInput({
    name: "AutoBidder",
    qualityScore: 0.7,
    dailyBudgetCents: 50000,
    smoothingFactor: 0.5,
    behaviorMode: "auto_bid",
    targetCacCents: 12000
  });
  assert.equal(present.ok, true);
});

test("validateAdvertiserInput rejects out-of-range fields", () => {
  const result = validateAdvertiserInput({
    name: "Bad",
    qualityScore: 1.5,
    dailyBudgetCents: -100,
    smoothingFactor: 2,
    behaviorMode: "truthful"
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.errors.some((e) => /qualityScore/.test(e)));
    assert.ok(result.errors.some((e) => /dailyBudgetCents/.test(e)));
    assert.ok(result.errors.some((e) => /smoothingFactor/.test(e)));
  }
});

test("validateAdvertiserInput rejects unknown behaviorMode", () => {
  const result = validateAdvertiserInput({
    name: "Bad",
    qualityScore: 0.7,
    dailyBudgetCents: 5000,
    smoothingFactor: 0.5,
    behaviorMode: "lying"
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.errors.some((e) => /behaviorMode/.test(e)));
  }
});

test("validateSlotInput accepts a valid slot and rejects out-of-range values", () => {
  const ok = validateSlotInput({
    name: "Top banner",
    reservePriceCents: 200,
    expectedDailyVolume: 1000
  });
  assert.equal(ok.ok, true);

  const bad = validateSlotInput({
    name: "",
    reservePriceCents: -1,
    expectedDailyVolume: 0
  });
  assert.equal(bad.ok, false);
  if (!bad.ok) {
    assert.ok(bad.errors.some((e) => /name is required/.test(e)));
    assert.ok(bad.errors.some((e) => /reservePriceCents/.test(e)));
    assert.ok(bad.errors.some((e) => /expectedDailyVolume/.test(e)));
  }
});

test("validateBidInput requires both ids and a sane bid amount", () => {
  const ok = validateBidInput({ advertiserId: "adv-1", slotId: "slot-1", bidCents: 350 });
  assert.equal(ok.ok, true);

  const bad = validateBidInput({ advertiserId: "", slotId: "", bidCents: 9999999 });
  assert.equal(bad.ok, false);
  if (!bad.ok) {
    assert.ok(bad.errors.some((e) => /advertiserId/.test(e)));
    assert.ok(bad.errors.some((e) => /slotId/.test(e)));
    assert.ok(bad.errors.some((e) => /bidCents/.test(e)));
  }
});
