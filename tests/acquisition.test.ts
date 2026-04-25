import test from "node:test";
import assert from "node:assert/strict";
import { scoreTestCell, validateCreateCampaignInput } from "@/lib/acquisition";

test("validateCreateCampaignInput accepts valid payload", () => {
  const parsed = validateCreateCampaignInput({
    name: "Test",
    objective: "Acquire trial users",
    budgetCents: 100000,
    startAt: "2026-05-01T00:00:00.000Z",
    endAt: "2026-05-15T00:00:00.000Z",
    channels: ["SEARCH"],
    targetCacCents: 12000,
    targetLtvCents: 60000,
    maxBudgetShiftPct: 0.2,
    minConfidence: 0.7,
    cooldownHours: 24
  });

  assert.equal(parsed.ok, true);
});

test("validateCreateCampaignInput rejects invalid economics", () => {
  const parsed = validateCreateCampaignInput({
    name: "Bad",
    objective: "x",
    budgetCents: 500,
    startAt: "2026-05-10T00:00:00.000Z",
    endAt: "2026-05-01T00:00:00.000Z",
    targetCacCents: 30000,
    targetLtvCents: 10000,
    maxBudgetShiftPct: 0.9,
    minConfidence: 0.1,
    cooldownHours: 0
  });

  assert.equal(parsed.ok, false);
  if (!parsed.ok) {
    assert(parsed.errors.length >= 4);
  }
});

test("scoreTestCell favors efficient cell", () => {
  const efficient = scoreTestCell({
    ctr: 0.03,
    conversionRate: 0.12,
    cpaCents: 10000,
    roas: 6,
    targetCacCents: 12000,
    targetLtvCents: 60000
  });

  const weak = scoreTestCell({
    ctr: 0.004,
    conversionRate: 0.01,
    cpaCents: 45000,
    roas: 0.5,
    targetCacCents: 12000,
    targetLtvCents: 60000
  });

  assert(efficient > weak);
});
