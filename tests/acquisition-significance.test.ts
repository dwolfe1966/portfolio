import test from "node:test";
import assert from "node:assert/strict";
import { computeCellSignificance } from "@/lib/acquisition";

test("computeCellSignificance returns 'insufficient' when sample is below 30 clicks", () => {
  const result = computeCellSignificance({
    cellConversions: 5,
    cellClicks: 20,
    campaignMeanConversionRate: 0.1
  });
  assert.equal(result.hint, "insufficient");
  assert.equal(result.sampleSize, 20);
});

test("computeCellSignificance returns 'neutral' when mean is degenerate (0 or 1)", () => {
  const zeroMean = computeCellSignificance({
    cellConversions: 5,
    cellClicks: 100,
    campaignMeanConversionRate: 0
  });
  const oneMean = computeCellSignificance({
    cellConversions: 5,
    cellClicks: 100,
    campaignMeanConversionRate: 1
  });
  assert.equal(zeroMean.hint, "neutral");
  assert.equal(oneMean.hint, "neutral");
});

test("computeCellSignificance flags significant_high when z >= 1.96", () => {
  // mean rate 0.05; cell rate 0.12 with 100 clicks
  // SE = sqrt(0.05*0.95/100) ≈ 0.0218; z ≈ (0.12-0.05)/0.0218 ≈ 3.21
  const result = computeCellSignificance({
    cellConversions: 12,
    cellClicks: 100,
    campaignMeanConversionRate: 0.05
  });
  assert.equal(result.hint, "significant_high");
  assert.ok(result.zScore >= 1.96);
});

test("computeCellSignificance flags significant_low when z <= -1.96", () => {
  // mean rate 0.20; cell rate 0.05 with 200 clicks
  // SE = sqrt(0.2*0.8/200) ≈ 0.0283; z ≈ (0.05-0.2)/0.0283 ≈ -5.30
  const result = computeCellSignificance({
    cellConversions: 10,
    cellClicks: 200,
    campaignMeanConversionRate: 0.2
  });
  assert.equal(result.hint, "significant_low");
  assert.ok(result.zScore <= -1.96);
});

test("computeCellSignificance flags trending_high in the 1 <= z < 1.96 range", () => {
  // mean rate 0.10; cell rate 0.14 with 200 clicks
  // SE ≈ sqrt(0.1*0.9/200) ≈ 0.0212; z ≈ (0.14-0.10)/0.0212 ≈ 1.89
  const result = computeCellSignificance({
    cellConversions: 28,
    cellClicks: 200,
    campaignMeanConversionRate: 0.1
  });
  assert.equal(result.hint, "trending_high");
  assert.ok(result.zScore >= 1 && result.zScore < 1.96);
});

test("computeCellSignificance returns neutral when z is small in either direction", () => {
  // mean rate 0.10; cell rate 0.10 with 100 clicks → z = 0
  const result = computeCellSignificance({
    cellConversions: 10,
    cellClicks: 100,
    campaignMeanConversionRate: 0.1
  });
  assert.equal(result.hint, "neutral");
});

test("computeCellSignificance is deterministic for identical inputs", () => {
  const args = {
    cellConversions: 30,
    cellClicks: 250,
    campaignMeanConversionRate: 0.1
  };
  const first = computeCellSignificance(args);
  for (let i = 0; i < 50; i++) {
    assert.deepEqual(computeCellSignificance(args), first);
  }
});
