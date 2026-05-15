import type { CustomerBaselineMetric, CustomerBaselineSnapshotInput } from "@/lib/customer-baseline-snapshots";
import type { RevenueProofDashboardInput } from "@/lib/revenue-proof-dashboard";

export type WorkspaceLaunchBaselineEvidence = {
  baseline: CustomerBaselineSnapshotInput;
  revenueProof: RevenueProofDashboardInput;
};

function clean(value: unknown, maxLength = 240) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function numberValue(value: unknown, fallback = 0) {
  if (value === null || value === undefined || String(value).trim() === "") return fallback;
  const parsed = typeof value === "number" ? value : Number(String(value ?? "").replace(/[$,%\s,]/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function centsFromDollars(value: unknown, fallback = 0) {
  return Math.round(numberValue(value, fallback / 100) * 100);
}

function rateValue(value: unknown, fallback = 0) {
  const parsed = numberValue(value, fallback);
  return parsed > 1 ? parsed / 100 : parsed;
}

function baselineMetricWithValue(
  metric: CustomerBaselineMetric | undefined,
  fallback: CustomerBaselineMetric,
  baselineValue: number
): CustomerBaselineMetric {
  return {
    ...fallback,
    ...(metric ?? {}),
    key: clean(metric?.key, 80) || fallback.key,
    label: clean(metric?.label, 120) || fallback.label,
    unit: metric?.unit ?? fallback.unit,
    sourceName: clean(metric?.sourceName, 120) || fallback.sourceName,
    baselineValue
  };
}

export function buildDefaultWorkspaceLaunchBaselineEvidence(input: {
  workspaceId: string;
  timestamp: string;
  auditExportHref: string;
}): WorkspaceLaunchBaselineEvidence {
  return {
    baseline: {
      baselineId: "baseline_workspace_launch_v1",
      workspaceId: input.workspaceId,
      app: "acquisition",
      method: "randomized_holdout",
      periodStartAt: "2026-02-01T00:00:00.000Z",
      periodEndAt: "2026-04-30T00:00:00.000Z",
      freezeAt: input.timestamp,
      eligiblePopulationName: "Qualified paid acquisition traffic",
      eligiblePopulationCount: 42000,
      treatmentDefinition: "Provider-write recommendations applied after approval.",
      eligibleRevenueDefinition: "Attributed gross revenue net of media spend.",
      currencyCode: "USD",
      metrics: [
        { key: "revenue", label: "Baseline revenue", baselineValue: 11800000, unit: "currency", sourceName: "billing warehouse" },
        { key: "conversion_rate", label: "Baseline conversion rate", baselineValue: 0.048, unit: "rate", sourceName: "analytics warehouse" }
      ],
      sourceSnapshots: [
        { sourceName: "billing warehouse", snapshotId: "billing_snapshot_v1", mappingVersion: "workspace_mapping_v1", rowCount: 42000, rejectedRowCount: 0, frozen: true },
        { sourceName: "ad provider read snapshot", snapshotId: "provider_snapshot_v1", mappingVersion: "workspace_mapping_v1", rowCount: 64, rejectedRowCount: 0, frozen: true }
      ],
      confidence: "high",
      confidenceRationale: "Holdout coverage is stable and source snapshots are frozen.",
      stablePrePeriod: true,
      controlDefinition: "Randomized 10% campaign holdout.",
      approvals: [
        { role: "data_owner", approved: true, approvedBy: "data-owner@example.com", approvedAt: input.timestamp },
        { role: "finance_owner", approved: true, approvedBy: "finance-owner@example.com", approvedAt: input.timestamp }
      ]
    },
    revenueProof: {
      app: "acquisition",
      baselineLabel: "Launch baseline v1",
      baselinePopulation: 42000,
      baselineConversionRate: 0.048,
      baselineRevenueCents: 11800000,
      treatmentPopulation: 4600,
      controlPopulation: 460,
      observedConversions: 256,
      observedRevenueCents: 1510000,
      spendCents: 280000,
      confidence: "high",
      actions: [
        { id: "approval_queue", label: "Approval queue configured", status: "approved", occurredAt: input.timestamp, auditUrl: "/workspace/agents" },
        { id: "provider_dry_run", label: "Provider dry-run evidence retained", status: "applied", occurredAt: input.timestamp, auditUrl: "/workspace/agents" }
      ],
      exportLinks: [
        { label: "Agent audit export", href: input.auditExportHref, evidenceType: "audit" }
      ]
    }
  };
}

export function normalizeWorkspaceLaunchBaselineEvidence(
  value: unknown,
  fallback: WorkspaceLaunchBaselineEvidence
): WorkspaceLaunchBaselineEvidence {
  const raw = value && typeof value === "object" ? value as Partial<WorkspaceLaunchBaselineEvidence> : {};
  const baseline = raw.baseline ?? {};
  const revenueProof = raw.revenueProof ?? {};
  const baselineMetric = fallback.baseline.metrics?.[0];
  const conversionMetric = fallback.baseline.metrics?.[1];
  const sourceSnapshot = fallback.baseline.sourceSnapshots?.[0];

  const rawBaselineRevenueCents = (revenueProof as RevenueProofDashboardInput).baselineRevenueCents;
  const baselineRevenueCents = typeof rawBaselineRevenueCents === "number"
    ? rawBaselineRevenueCents
    : fallback.revenueProof.baselineRevenueCents ?? Number(baselineMetric?.baselineValue ?? 0);

  return {
    baseline: {
      ...fallback.baseline,
      ...baseline,
      baselineId: clean((baseline as CustomerBaselineSnapshotInput).baselineId, 120) || fallback.baseline.baselineId,
      eligiblePopulationName: clean((baseline as CustomerBaselineSnapshotInput).eligiblePopulationName) || fallback.baseline.eligiblePopulationName,
      eligiblePopulationCount: numberValue((baseline as CustomerBaselineSnapshotInput).eligiblePopulationCount, fallback.baseline.eligiblePopulationCount ?? 0),
      eligibleRevenueDefinition: clean((baseline as CustomerBaselineSnapshotInput).eligibleRevenueDefinition) || fallback.baseline.eligibleRevenueDefinition,
      confidence: (baseline as CustomerBaselineSnapshotInput).confidence === "low" || (baseline as CustomerBaselineSnapshotInput).confidence === "medium" || (baseline as CustomerBaselineSnapshotInput).confidence === "high"
        ? (baseline as CustomerBaselineSnapshotInput).confidence
        : fallback.baseline.confidence,
      confidenceRationale: clean((baseline as CustomerBaselineSnapshotInput).confidenceRationale, 500) || fallback.baseline.confidenceRationale,
      stablePrePeriod: (baseline as CustomerBaselineSnapshotInput).stablePrePeriod !== false,
      metrics: [
        baselineMetricWithValue(
          (baseline as CustomerBaselineSnapshotInput).metrics?.[0],
          baselineMetric ?? { key: "revenue", label: "Baseline revenue", unit: "currency", sourceName: "billing warehouse" },
          baselineRevenueCents
        ),
        baselineMetricWithValue(
          (baseline as CustomerBaselineSnapshotInput).metrics?.[1],
          conversionMetric ?? { key: "conversion_rate", label: "Baseline conversion rate", unit: "rate", sourceName: "analytics warehouse" },
          rateValue((revenueProof as RevenueProofDashboardInput).baselineConversionRate, fallback.revenueProof.baselineConversionRate ?? 0)
        )
      ],
      sourceSnapshots: [
        {
          ...(sourceSnapshot ?? { sourceName: "billing warehouse" }),
          snapshotId: clean(sourceSnapshot?.snapshotId) || "billing_snapshot_v1",
          rowCount: numberValue((baseline as CustomerBaselineSnapshotInput).eligiblePopulationCount, fallback.baseline.eligiblePopulationCount ?? 0),
          frozen: true
        },
        ...(fallback.baseline.sourceSnapshots ?? []).slice(1)
      ],
      approvals: [
        { role: "data_owner", approved: true, approvedBy: "data-owner@example.com", approvedAt: fallback.baseline.freezeAt },
        { role: "finance_owner", approved: true, approvedBy: "finance-owner@example.com", approvedAt: fallback.baseline.freezeAt }
      ]
    },
    revenueProof: {
      ...fallback.revenueProof,
      ...revenueProof,
      baselineLabel: clean((revenueProof as RevenueProofDashboardInput).baselineLabel, 120) || fallback.revenueProof.baselineLabel,
      baselinePopulation: numberValue((revenueProof as RevenueProofDashboardInput).baselinePopulation, fallback.revenueProof.baselinePopulation ?? 0),
      baselineConversionRate: rateValue((revenueProof as RevenueProofDashboardInput).baselineConversionRate, fallback.revenueProof.baselineConversionRate ?? 0),
      baselineRevenueCents,
      treatmentPopulation: numberValue((revenueProof as RevenueProofDashboardInput).treatmentPopulation, fallback.revenueProof.treatmentPopulation ?? 0),
      controlPopulation: numberValue((revenueProof as RevenueProofDashboardInput).controlPopulation, fallback.revenueProof.controlPopulation ?? 0),
      observedConversions: numberValue((revenueProof as RevenueProofDashboardInput).observedConversions, fallback.revenueProof.observedConversions ?? 0),
      observedRevenueCents: typeof (revenueProof as RevenueProofDashboardInput).observedRevenueCents === "number"
        ? (revenueProof as RevenueProofDashboardInput).observedRevenueCents
        : fallback.revenueProof.observedRevenueCents,
      spendCents: typeof (revenueProof as RevenueProofDashboardInput).spendCents === "number"
        ? (revenueProof as RevenueProofDashboardInput).spendCents
        : fallback.revenueProof.spendCents,
      confidence: (revenueProof as RevenueProofDashboardInput).confidence === "low" || (revenueProof as RevenueProofDashboardInput).confidence === "medium" || (revenueProof as RevenueProofDashboardInput).confidence === "high"
        ? (revenueProof as RevenueProofDashboardInput).confidence
        : fallback.revenueProof.confidence
    }
  };
}

export function workspaceLaunchBaselineEvidenceFromForm(input: {
  baselineId: FormDataEntryValue | null;
  eligiblePopulationName: FormDataEntryValue | null;
  eligiblePopulationCount: FormDataEntryValue | null;
  baselineLabel: FormDataEntryValue | null;
  baselineRevenueDollars: FormDataEntryValue | null;
  baselineConversionRate: FormDataEntryValue | null;
  treatmentPopulation: FormDataEntryValue | null;
  controlPopulation: FormDataEntryValue | null;
  observedConversions: FormDataEntryValue | null;
  observedRevenueDollars: FormDataEntryValue | null;
  spendDollars: FormDataEntryValue | null;
  confidence: FormDataEntryValue | null;
  fallback: WorkspaceLaunchBaselineEvidence;
}) {
  return normalizeWorkspaceLaunchBaselineEvidence({
    baseline: {
      baselineId: input.baselineId,
      eligiblePopulationName: input.eligiblePopulationName,
      eligiblePopulationCount: numberValue(input.eligiblePopulationCount, input.fallback.baseline.eligiblePopulationCount ?? 0),
      confidence: clean(input.confidence, 20),
      confidenceRationale: input.fallback.baseline.confidenceRationale
    },
    revenueProof: {
      baselineLabel: input.baselineLabel,
      baselinePopulation: numberValue(input.eligiblePopulationCount, input.fallback.revenueProof.baselinePopulation ?? 0),
      baselineConversionRate: rateValue(input.baselineConversionRate, input.fallback.revenueProof.baselineConversionRate ?? 0),
      baselineRevenueCents: centsFromDollars(input.baselineRevenueDollars, input.fallback.revenueProof.baselineRevenueCents ?? 0),
      treatmentPopulation: numberValue(input.treatmentPopulation, input.fallback.revenueProof.treatmentPopulation ?? 0),
      controlPopulation: numberValue(input.controlPopulation, input.fallback.revenueProof.controlPopulation ?? 0),
      observedConversions: numberValue(input.observedConversions, input.fallback.revenueProof.observedConversions ?? 0),
      observedRevenueCents: centsFromDollars(input.observedRevenueDollars, input.fallback.revenueProof.observedRevenueCents ?? 0),
      spendCents: centsFromDollars(input.spendDollars, input.fallback.revenueProof.spendCents ?? 0),
      confidence: clean(input.confidence, 20)
    }
  }, input.fallback);
}
