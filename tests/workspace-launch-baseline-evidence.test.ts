import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDefaultWorkspaceLaunchBaselineEvidence,
  normalizeWorkspaceLaunchBaselineEvidence,
  workspaceLaunchBaselineEvidenceFromForm
} from "@/lib/workspace-launch-baseline-evidence";

const FALLBACK = buildDefaultWorkspaceLaunchBaselineEvidence({
  workspaceId: "workspace_1",
  timestamp: "2026-05-14T12:00:00.000Z",
  auditExportHref: "/api/workspace/agents/audit-export"
});

test("normalizeWorkspaceLaunchBaselineEvidence preserves editable baseline and proof inputs", () => {
  const evidence = normalizeWorkspaceLaunchBaselineEvidence({
    baseline: {
      baselineId: "  launch_baseline_custom  ",
      eligiblePopulationName: "  Paid search visitors  ",
      eligiblePopulationCount: 50000,
      confidence: "medium"
    },
    revenueProof: {
      baselineLabel: "  Custom baseline  ",
      baselinePopulation: 50000,
      baselineConversionRate: 0.052,
      baselineRevenueCents: 20000000,
      treatmentPopulation: 6000,
      observedConversions: 400,
      observedRevenueCents: 2600000,
      spendCents: 300000,
      confidence: "medium"
    }
  }, FALLBACK);

  assert.equal(evidence.baseline.baselineId, "launch_baseline_custom");
  assert.equal(evidence.baseline.eligiblePopulationName, "Paid search visitors");
  assert.equal(evidence.revenueProof.baselineLabel, "Custom baseline");
  assert.equal(evidence.revenueProof.baselineRevenueCents, 20000000);
  assert.equal(evidence.revenueProof.confidence, "medium");
});

test("workspaceLaunchBaselineEvidenceFromForm converts dollars and percentages", () => {
  const formEvidence = workspaceLaunchBaselineEvidenceFromForm({
    baselineId: "baseline_form",
    eligiblePopulationName: "Qualified traffic",
    eligiblePopulationCount: "10000",
    baselineLabel: "Form baseline",
    baselineRevenueDollars: "123456.78",
    baselineConversionRate: "4.5",
    treatmentPopulation: "1000",
    controlPopulation: "100",
    observedConversions: "55",
    observedRevenueDollars: "15000",
    spendDollars: "2500",
    confidence: "high",
    fallback: FALLBACK
  });

  assert.equal(formEvidence.revenueProof.baselineRevenueCents, 12345678);
  assert.equal(formEvidence.revenueProof.baselineConversionRate, 0.045);
  assert.equal(formEvidence.revenueProof.observedRevenueCents, 1500000);
  assert.equal(formEvidence.revenueProof.spendCents, 250000);
});
