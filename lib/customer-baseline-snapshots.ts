export type CustomerBaselineStatus = "ready" | "warning" | "blocked";

export type CustomerBaselineMethod =
  | "randomized_holdout"
  | "matched_cohort"
  | "geo_or_platform_split"
  | "pre_post";

export type CustomerBaselineConfidence = "low" | "medium" | "high";

export type CustomerBaselineApprovalRole = "data_owner" | "finance_owner" | "workspace_owner" | "operator_approver";

export type CustomerBaselineMetric = {
  key: string;
  label?: string | null;
  baselineValue?: number | null;
  unit?: "count" | "rate" | "currency" | "ratio" | string | null;
  sourceName?: string | null;
};

export type CustomerBaselineExclusion = {
  id: string;
  reason?: string | null;
  startAt?: Date | string | null;
  endAt?: Date | string | null;
  approved?: boolean | null;
};

export type CustomerBaselineSourceSnapshot = {
  sourceName: string;
  snapshotId?: string | null;
  mappingVersion?: string | null;
  rowCount?: number | null;
  rejectedRowCount?: number | null;
  frozen?: boolean | null;
};

export type CustomerBaselineApproval = {
  role: CustomerBaselineApprovalRole;
  approved?: boolean | null;
  approvedBy?: string | null;
  approvedAt?: Date | string | null;
};

export type CustomerBaselineSnapshotInput = {
  baselineId?: string | null;
  workspaceId?: string | null;
  app?: string | null;
  method?: CustomerBaselineMethod | string | null;
  periodStartAt?: Date | string | null;
  periodEndAt?: Date | string | null;
  freezeAt?: Date | string | null;
  eligiblePopulationName?: string | null;
  eligiblePopulationCount?: number | null;
  treatmentDefinition?: string | null;
  eligibleRevenueDefinition?: string | null;
  currencyCode?: string | null;
  metrics?: CustomerBaselineMetric[];
  exclusions?: CustomerBaselineExclusion[];
  sourceSnapshots?: CustomerBaselineSourceSnapshot[];
  confidence?: CustomerBaselineConfidence | string | null;
  confidenceRationale?: string | null;
  stablePrePeriod?: boolean | null;
  controlDefinition?: string | null;
  lowConfidenceManualApprovalRequired?: boolean | null;
  approvals?: CustomerBaselineApproval[];
};

export type CustomerBaselineSnapshotDecision = {
  status: CustomerBaselineStatus;
  frozen: boolean;
  billingReady: boolean;
  reportable: boolean;
  confidence: CustomerBaselineConfidence;
  method: CustomerBaselineMethod;
  blockers: string[];
  warnings: string[];
  missingApprovals: CustomerBaselineApprovalRole[];
  nextRequiredAction: string;
};

const BASELINE_METHODS: CustomerBaselineMethod[] = [
  "randomized_holdout",
  "matched_cohort",
  "geo_or_platform_split",
  "pre_post"
];

const CONFIDENCE_RANK: Record<CustomerBaselineConfidence, number> = {
  low: 0,
  medium: 1,
  high: 2
};

const REQUIRED_APPROVALS: CustomerBaselineApprovalRole[] = ["data_owner", "finance_owner"];

function normalizedDate(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function finiteNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function normalizeMethod(value: CustomerBaselineSnapshotInput["method"]): CustomerBaselineMethod {
  return BASELINE_METHODS.includes(value as CustomerBaselineMethod) ? value as CustomerBaselineMethod : "pre_post";
}

function normalizeConfidence(value: CustomerBaselineSnapshotInput["confidence"]): CustomerBaselineConfidence {
  if (value === "high" || value === "medium" || value === "low") return value;
  return "low";
}

function approvalReady(approval: CustomerBaselineApproval | undefined) {
  return Boolean(approval?.approved === true && approval.approvedBy?.trim() && normalizedDate(approval.approvedAt));
}

function missingApprovals(approvals: CustomerBaselineApproval[] | undefined) {
  const byRole = new Map((approvals ?? []).map((approval) => [approval.role, approval]));
  return REQUIRED_APPROVALS.filter((role) => !approvalReady(byRole.get(role)));
}

function metricReady(metric: CustomerBaselineMetric) {
  return Boolean(metric.key.trim() && finiteNumber(metric.baselineValue) && metric.sourceName?.trim());
}

function sourceSnapshotReady(snapshot: CustomerBaselineSourceSnapshot) {
  return Boolean(
    snapshot.sourceName.trim()
    && snapshot.snapshotId?.trim()
    && snapshot.mappingVersion?.trim()
    && finiteNumber(snapshot.rowCount)
    && snapshot.rowCount > 0
    && snapshot.frozen === true
  );
}

function statusFor(blockers: string[], warnings: string[]): CustomerBaselineStatus {
  if (blockers.length > 0) return "blocked";
  if (warnings.length > 0) return "warning";
  return "ready";
}

function nextAction(blockers: string[], warnings: string[]) {
  if (blockers.length > 0) return blockers[0];
  if (warnings.length > 0) return warnings[0];
  return "Record baseline freeze decision and attach it to the customer launch packet.";
}

export function buildCustomerBaselineSnapshotDecision(input: CustomerBaselineSnapshotInput): CustomerBaselineSnapshotDecision {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const method = normalizeMethod(input.method);
  const confidence = normalizeConfidence(input.confidence);
  const periodStartAt = normalizedDate(input.periodStartAt);
  const periodEndAt = normalizedDate(input.periodEndAt);
  const freezeAt = normalizedDate(input.freezeAt);
  const approvalsMissing = missingApprovals(input.approvals);
  const sourceSnapshots = input.sourceSnapshots ?? [];
  const metrics = input.metrics ?? [];
  const exclusions = input.exclusions ?? [];

  if (!input.workspaceId?.trim()) blockers.push("Attach baseline to a workspace.");
  if (!input.app?.trim()) blockers.push("Record covered app for baseline.");
  if (!periodStartAt || !periodEndAt) {
    blockers.push("Set baseline period start and end dates.");
  } else if (periodStartAt >= periodEndAt) {
    blockers.push("Set baseline period end after start.");
  } else {
    const periodDays = (periodEndAt.getTime() - periodStartAt.getTime()) / 86_400_000;
    if (periodDays < 28) blockers.push("Use at least 28 days of baseline history.");
    if (periodDays > 120) warnings.push("Baseline period is longer than 120 days; confirm seasonality assumptions.");
  }

  if (!freezeAt) blockers.push("Set baseline freeze timestamp.");
  if (!input.eligiblePopulationName?.trim()) blockers.push("Define eligible baseline population.");
  if (!finiteNumber(input.eligiblePopulationCount) || input.eligiblePopulationCount <= 0) {
    blockers.push("Record positive eligible population count.");
  } else if (input.eligiblePopulationCount < 100) {
    warnings.push("Eligible population is small; confidence may be limited.");
  }
  if (!input.eligibleRevenueDefinition?.trim()) blockers.push("Define eligible revenue basis.");
  if (!input.currencyCode?.trim()) blockers.push("Set baseline currency code.");

  if (metrics.length === 0) blockers.push("Add at least one baseline metric.");
  for (const metric of metrics) {
    if (!metricReady(metric)) blockers.push(`Complete baseline metric ${metric.key || "unnamed metric"}.`);
    if (metric.unit === "rate" && finiteNumber(metric.baselineValue) && (metric.baselineValue < 0 || metric.baselineValue > 1)) {
      blockers.push(`Keep rate metric ${metric.key} between 0 and 1.`);
    }
  }

  if (sourceSnapshots.length === 0) blockers.push("Attach frozen source snapshots.");
  for (const snapshot of sourceSnapshots) {
    if (!sourceSnapshotReady(snapshot)) blockers.push(`Freeze source snapshot ${snapshot.sourceName || "unnamed source"}.`);
    if (finiteNumber(snapshot.rejectedRowCount) && snapshot.rejectedRowCount > 0) {
      warnings.push(`${snapshot.sourceName} baseline snapshot has ${snapshot.rejectedRowCount} rejected rows.`);
    }
  }

  for (const exclusion of exclusions) {
    if (!exclusion.reason?.trim()) blockers.push(`Explain baseline exclusion ${exclusion.id}.`);
    if (exclusion.approved !== true) blockers.push(`Approve baseline exclusion ${exclusion.id}.`);
    const startAt = normalizedDate(exclusion.startAt);
    const endAt = normalizedDate(exclusion.endAt);
    if (startAt && endAt && startAt >= endAt) blockers.push(`Set exclusion ${exclusion.id} end after start.`);
  }

  if (method !== "pre_post" && !input.controlDefinition?.trim()) {
    blockers.push("Define control or holdout population.");
  }
  if (method === "pre_post") {
    warnings.push("Pre/post baseline requires manual payout approval.");
  }
  if (input.stablePrePeriod !== true) {
    warnings.push("Confirm stable pre-period performance before billing.");
  }
  if (confidence === "low") {
    warnings.push("Low-confidence baseline requires stricter payout approval.");
    if (input.lowConfidenceManualApprovalRequired !== true) {
      blockers.push("Require manual payout approval for low-confidence baseline.");
    }
  }
  if (!input.confidenceRationale?.trim()) warnings.push("Record baseline confidence rationale.");
  if (approvalsMissing.length > 0) blockers.push(`Missing baseline approvals: ${approvalsMissing.join(", ")}.`);

  const frozen = Boolean(freezeAt && sourceSnapshots.length > 0 && sourceSnapshots.every(sourceSnapshotReady));
  const status = statusFor(blockers, warnings);
  const reportable = frozen && metrics.length > 0 && sourceSnapshots.length > 0 && blockers.every((blocker) => {
    return blocker.startsWith("Missing baseline approvals") || blocker.startsWith("Require manual payout approval");
  });
  const billingReady = status === "ready" && frozen && CONFIDENCE_RANK[confidence] >= CONFIDENCE_RANK.medium;

  return {
    status,
    frozen,
    billingReady,
    reportable,
    confidence,
    method,
    blockers,
    warnings,
    missingApprovals: approvalsMissing,
    nextRequiredAction: nextAction(blockers, warnings)
  };
}
