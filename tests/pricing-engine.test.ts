import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyHoldoutHealth,
  recommendPricingDecision,
  simulatePricingExperiment
} from "../lib/pricing-engine";

const experiment = {
  id: "exp_1",
  holdoutPercent: 0.15,
  minimumSampleSize: 1000,
  minGrossMarginPercent: 0.7,
  maxChurnDeltaPercent: 2,
  maxSupportLoadDelta: 0.3,
  minConfidence: 0.65
};

const segments = [
  {
    id: "seg_1",
    name: "Power users",
    baselineConversionRate: 0.12,
    baselineChurnRate: 0.02,
    baselineArpuCents: 10000,
    grossMarginPercent: 0.76,
    monthlyVolume: 3000,
    riskBand: "low" as const
  }
];

const control = {
  id: "var_control",
  name: "Control",
  monthlyPriceCents: 10000,
  marginImpactPercent: 0,
  expectedSupportLoadDelta: 0
};

const treatment = {
  id: "var_treatment",
  name: "Premium bundle",
  monthlyPriceCents: 11000,
  marginImpactPercent: 0.02,
  expectedSupportLoadDelta: 0.1
};

test("classifyHoldoutHealth flags missing holdout as unhealthy", () => {
  assert.equal(classifyHoldoutHealth(0.02), "unhealthy");
  assert.equal(classifyHoldoutHealth(0.08), "watch");
  assert.equal(classifyHoldoutHealth(0.15), "healthy");
});

test("simulatePricingExperiment returns stable aggregate KPIs and segment rows", () => {
  const result = simulatePricingExperiment(experiment, segments, control, [treatment], {
    conversionLiftPercent: 8,
    demandElasticity: 0.2,
    churnSensitivityPercent: 1,
    supportLoadSensitivity: 1
  });

  assert.equal(result.experimentId, "exp_1");
  assert.equal(result.segmentResults.length, 1);
  assert.equal(result.segmentResults[0].variantId, "var_treatment");
  assert.ok(Number.isFinite(result.arpuLiftPercent));
  assert.ok(result.confidence > 0);
});

test("recommendPricingDecision rolls back when margin floor is breached", () => {
  const decision = recommendPricingDecision({
    confidence: 0.9,
    minConfidence: 0.65,
    grossMarginPercent: 0.62,
    minGrossMarginPercent: 0.7,
    churnDeltaPercent: 0.5,
    maxChurnDeltaPercent: 2,
    supportLoadDelta: 0.1,
    maxSupportLoadDelta: 0.3,
    sampleSize: 2000,
    minimumSampleSize: 1000,
    holdoutHealth: "healthy"
  });
  assert.equal(decision, "rollback");
});
