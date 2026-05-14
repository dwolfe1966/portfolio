import type { CustomerBaselineSnapshotDecision } from "@/lib/customer-baseline-snapshots";
import type { CustomerDataQualityGateDecision } from "@/lib/customer-data-quality-gates";
import type { CustomerLaunchMode, CustomerOnboardingReadiness } from "@/lib/customer-onboarding-readiness";

export type BillableExecutionMode = "performance_billing" | "agent_managed_execution";
export type BillableExecutionStatus = "ready" | "warning" | "blocked";

export type BillableExecutionGateInput = {
  requestedMode?: BillableExecutionMode | string | null;
  onboarding?: CustomerOnboardingReadiness | null;
  dataQuality?: CustomerDataQualityGateDecision | null;
  baseline?: CustomerBaselineSnapshotDecision | null;
  policyApproved?: boolean | null;
  credentialGrantsReady?: boolean | null;
  rollbackReady?: boolean | null;
  auditExportReady?: boolean | null;
  emergencyStopReady?: boolean | null;
  revenueProofReady?: boolean | null;
  performanceBillingApproved?: boolean | null;
};

export type BillableExecutionGateCheck = {
  key: string;
  status: BillableExecutionStatus;
  blockers: string[];
  warnings: string[];
};

export type BillableExecutionGateDecision = {
  enabled: boolean;
  status: BillableExecutionStatus;
  requestedMode: BillableExecutionMode;
  maxAllowedLaunchMode: CustomerLaunchMode;
  blockers: string[];
  warnings: string[];
  checks: BillableExecutionGateCheck[];
  nextRequiredAction: string;
};

function bool(value: boolean | null | undefined) {
  return value === true;
}

function normalizeMode(value: BillableExecutionGateInput["requestedMode"]): BillableExecutionMode {
  return value === "agent_managed_execution" ? "agent_managed_execution" : "performance_billing";
}

function check(key: string, blockers: string[] = [], warnings: string[] = []): BillableExecutionGateCheck {
  return {
    key,
    status: blockers.length > 0 ? "blocked" : warnings.length > 0 ? "warning" : "ready",
    blockers,
    warnings
  };
}

function launchModeRank(value: CustomerLaunchMode) {
  return {
    audit_only: 0,
    recommendation_only: 1,
    human_approved_execution: 2,
    agent_managed_execution: 3
  }[value];
}

function nextAction(blockers: string[], warnings: string[]) {
  if (blockers.length > 0) return blockers[0];
  if (warnings.length > 0) return warnings[0];
  return "Record billable execution gate approval and attach evidence to the customer launch packet.";
}

export function buildBillableExecutionGate(input: BillableExecutionGateInput): BillableExecutionGateDecision {
  const requestedMode = normalizeMode(input.requestedMode);
  const onboarding = input.onboarding ?? null;
  const dataQuality = input.dataQuality ?? null;
  const baseline = input.baseline ?? null;
  const checks = [
    check("onboarding", [
      ...(!onboarding ? ["Complete customer onboarding readiness review."] : []),
      ...(onboarding && onboarding.status === "blocked" ? onboarding.blockers : []),
      ...(onboarding && !onboarding.requestedLaunchAllowed ? [`Lower launch mode to ${onboarding.maxAllowedLaunchMode} or complete onboarding gates.`] : [])
    ], onboarding && onboarding.status === "warning" ? onboarding.warnings : []),
    check("data_quality", [
      ...(!dataQuality ? ["Complete data quality gate review."] : []),
      ...(dataQuality && !dataQuality.readyForExecution ? dataQuality.blockers : [])
    ], dataQuality && dataQuality.status === "warning" ? dataQuality.warnings : []),
    check("baseline", [
      ...(!baseline ? ["Freeze and approve baseline snapshot."] : []),
      ...(baseline && !baseline.billingReady ? baseline.blockers.length > 0 ? baseline.blockers : ["Baseline is not billing-ready."] : [])
    ], baseline && baseline.status === "warning" ? baseline.warnings : []),
    check("policy", !bool(input.policyApproved) ? ["Approve operating policy before billable execution."] : []),
    check("credentials", !bool(input.credentialGrantsReady) ? ["Confirm credential grants and token health."] : []),
    check("rollback", !bool(input.rollbackReady) ? ["Attach rollback evidence before billable execution."] : []),
    check("audit", !bool(input.auditExportReady) ? ["Enable customer-visible audit export."] : []),
    check("emergency_stop", !bool(input.emergencyStopReady) ? ["Test emergency stop before billable execution."] : []),
    check("revenue_proof", !bool(input.revenueProofReady) ? ["Publish revenue proof dashboard evidence."] : []),
    check("performance_billing", !bool(input.performanceBillingApproved) ? ["Approve performance billing evidence and fee trigger."] : [])
  ];

  if (requestedMode === "agent_managed_execution") {
    const maxAllowedLaunchMode = onboarding?.maxAllowedLaunchMode ?? "audit_only";
    if (launchModeRank(maxAllowedLaunchMode) < launchModeRank("agent_managed_execution")) {
      checks.push(check("agent_managed_launch_mode", [`Complete agent-managed launch gates; current maximum is ${maxAllowedLaunchMode}.`]));
    }
  }

  const blockers = checks.flatMap((item) => item.blockers);
  const warnings = checks.flatMap((item) => item.warnings);
  const status = blockers.length > 0 ? "blocked" : warnings.length > 0 ? "warning" : "ready";

  return {
    enabled: status === "ready",
    status,
    requestedMode,
    maxAllowedLaunchMode: onboarding?.maxAllowedLaunchMode ?? "audit_only",
    blockers,
    warnings,
    checks,
    nextRequiredAction: nextAction(blockers, warnings)
  };
}
