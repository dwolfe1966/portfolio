export type CustomerOnboardingOwnerRole =
  | "executive_sponsor"
  | "workspace_owner"
  | "data_owner"
  | "channel_owner"
  | "consent_compliance_owner"
  | "finance_owner"
  | "operator_approver";

export type CustomerLaunchMode =
  | "audit_only"
  | "recommendation_only"
  | "human_approved_execution"
  | "agent_managed_execution";

export type CustomerOnboardingStatus = "ready" | "warning" | "blocked";

export type CustomerOnboardingPhase =
  | "owners"
  | "commercial_scope"
  | "workspace_access"
  | "data_mapping"
  | "policy_review"
  | "baseline"
  | "audit_evidence"
  | "launch_constraints"
  | "risk_ownership";

export type CustomerOnboardingOwner = {
  role: CustomerOnboardingOwnerRole;
  name?: string | null;
  email?: string | null;
  approved?: boolean | null;
};

export type CustomerOnboardingRisk = {
  id: string;
  severity?: "low" | "medium" | "high" | "critical" | string | null;
  ownerRole?: CustomerOnboardingOwnerRole | null;
  dueAt?: Date | string | null;
  resolved?: boolean | null;
};

export type CustomerOnboardingReadinessInput = {
  requestedLaunchMode?: CustomerLaunchMode | string | null;
  owners?: CustomerOnboardingOwner[];
  commercialScopeApproved?: boolean | null;
  launchModeApproved?: boolean | null;
  sourceReadGrantsReady?: boolean | null;
  channelWriteGrantsReady?: boolean | null;
  credentialRotationOwnerAssigned?: boolean | null;
  mappingApproved?: boolean | null;
  mappingVersion?: string | null;
  policyApproved?: boolean | null;
  consentApproved?: boolean | null;
  baselineFrozen?: boolean | null;
  baselineApproved?: boolean | null;
  auditExportEnabled?: boolean | null;
  launchConstraintsAccepted?: boolean | null;
  approvalQueueOwnerAssigned?: boolean | null;
  approvalSlaDefined?: boolean | null;
  emergencyStopTested?: boolean | null;
  rollbackEvidenceReady?: boolean | null;
  performanceBillingApproved?: boolean | null;
  unresolvedRisks?: CustomerOnboardingRisk[];
};

export type CustomerOnboardingPhaseSummary = {
  phase: CustomerOnboardingPhase;
  status: CustomerOnboardingStatus;
  blockers: string[];
  warnings: string[];
};

export type CustomerOnboardingReadiness = {
  status: CustomerOnboardingStatus;
  requestedLaunchMode: CustomerLaunchMode;
  maxAllowedLaunchMode: CustomerLaunchMode;
  requestedLaunchAllowed: boolean;
  missingOwners: CustomerOnboardingOwnerRole[];
  blockers: string[];
  warnings: string[];
  phases: CustomerOnboardingPhaseSummary[];
  nextRequiredAction: string;
};

const REQUIRED_OWNER_ROLES: CustomerOnboardingOwnerRole[] = [
  "executive_sponsor",
  "workspace_owner",
  "data_owner",
  "channel_owner",
  "consent_compliance_owner",
  "finance_owner",
  "operator_approver"
];

const LAUNCH_MODE_RANK: Record<CustomerLaunchMode, number> = {
  audit_only: 0,
  recommendation_only: 1,
  human_approved_execution: 2,
  agent_managed_execution: 3
};

const LAUNCH_MODES_BY_RANK: CustomerLaunchMode[] = [
  "audit_only",
  "recommendation_only",
  "human_approved_execution",
  "agent_managed_execution"
];

function bool(value: boolean | null | undefined) {
  return value === true;
}

function normalizeLaunchMode(value: CustomerOnboardingReadinessInput["requestedLaunchMode"]): CustomerLaunchMode {
  return LAUNCH_MODES_BY_RANK.includes(value as CustomerLaunchMode) ? value as CustomerLaunchMode : "recommendation_only";
}

function ownerReady(owner: CustomerOnboardingOwner | undefined) {
  return Boolean(owner && owner.approved === true && (owner.name?.trim() || owner.email?.trim()));
}

function missingOwners(owners: CustomerOnboardingOwner[] | undefined) {
  const byRole = new Map((owners ?? []).map((owner) => [owner.role, owner]));
  return REQUIRED_OWNER_ROLES.filter((role) => !ownerReady(byRole.get(role)));
}

function hasHighOpenRisk(risks: CustomerOnboardingRisk[] | undefined) {
  return (risks ?? []).some((risk) => {
    if (risk.resolved) return false;
    return risk.severity === "high" || risk.severity === "critical";
  });
}

function hasUnownedOpenRisk(risks: CustomerOnboardingRisk[] | undefined) {
  return (risks ?? []).some((risk) => !risk.resolved && !risk.ownerRole);
}

function hasOverdueOpenRisk(risks: CustomerOnboardingRisk[] | undefined, now = new Date()) {
  return (risks ?? []).some((risk) => {
    if (risk.resolved || !risk.dueAt) return false;
    const dueAt = risk.dueAt instanceof Date ? risk.dueAt : new Date(risk.dueAt);
    return Number.isFinite(dueAt.getTime()) && dueAt <= now;
  });
}

function phase(phaseName: CustomerOnboardingPhase, blockers: string[] = [], warnings: string[] = []): CustomerOnboardingPhaseSummary {
  return {
    phase: phaseName,
    status: blockers.length > 0 ? "blocked" : warnings.length > 0 ? "warning" : "ready",
    blockers,
    warnings
  };
}

function computeMaxAllowedLaunchMode(input: CustomerOnboardingReadinessInput, missing: CustomerOnboardingOwnerRole[]) {
  const recommendationReady = ownerReady((input.owners ?? []).find((owner) => owner.role === "workspace_owner"))
    && bool(input.commercialScopeApproved)
    && bool(input.sourceReadGrantsReady)
    && bool(input.auditExportEnabled);
  if (!recommendationReady) return "audit_only";

  const humanExecutionReady = missing.length === 0
    && bool(input.launchModeApproved)
    && bool(input.channelWriteGrantsReady)
    && bool(input.credentialRotationOwnerAssigned)
    && bool(input.mappingApproved)
    && bool(input.policyApproved)
    && bool(input.consentApproved)
    && bool(input.baselineFrozen)
    && bool(input.baselineApproved)
    && bool(input.launchConstraintsAccepted)
    && bool(input.approvalQueueOwnerAssigned)
    && bool(input.approvalSlaDefined)
    && !hasHighOpenRisk(input.unresolvedRisks)
    && !hasUnownedOpenRisk(input.unresolvedRisks)
    && !hasOverdueOpenRisk(input.unresolvedRisks);
  if (!humanExecutionReady) return "recommendation_only";

  const agentManagedReady = bool(input.emergencyStopTested)
    && bool(input.rollbackEvidenceReady)
    && bool(input.performanceBillingApproved);
  return agentManagedReady ? "agent_managed_execution" : "human_approved_execution";
}

function nextAction(phases: CustomerOnboardingPhaseSummary[], requestedAllowed: boolean, maxMode: CustomerLaunchMode) {
  const blocked = phases.find((item) => item.blockers.length > 0);
  if (blocked) return blocked.blockers[0];
  const warning = phases.find((item) => item.warnings.length > 0);
  if (warning) return warning.warnings[0];
  if (!requestedAllowed) return `Lower launch mode to ${maxMode} or complete the remaining gates.`;
  return "Record launch readiness decision and schedule the next customer review.";
}

export function buildCustomerOnboardingReadiness(input: CustomerOnboardingReadinessInput): CustomerOnboardingReadiness {
  const requestedLaunchMode = normalizeLaunchMode(input.requestedLaunchMode);
  const missing = missingOwners(input.owners);
  const riskWarnings: string[] = [];
  const riskBlockers: string[] = [];

  if (hasUnownedOpenRisk(input.unresolvedRisks)) riskBlockers.push("Assign an owner to every unresolved risk.");
  if (hasHighOpenRisk(input.unresolvedRisks)) riskBlockers.push("Resolve high or critical launch risks before execution.");
  if (hasOverdueOpenRisk(input.unresolvedRisks)) riskBlockers.push("Resolve or re-date overdue launch risks.");
  if ((input.unresolvedRisks ?? []).some((risk) => !risk.resolved && risk.ownerRole && !risk.dueAt)) {
    riskWarnings.push("Add due dates to owned unresolved risks.");
  }

  const phases = [
    phase("owners", missing.length > 0 ? [`Missing approved owners: ${missing.join(", ")}.`] : []),
    phase("commercial_scope", [
      ...(!bool(input.commercialScopeApproved) ? ["Approve commercial scope."] : []),
      ...(!bool(input.launchModeApproved) ? ["Approve requested launch mode."] : [])
    ]),
    phase("workspace_access", [
      ...(!bool(input.sourceReadGrantsReady) ? ["Approve source read grants for measurement."] : []),
      ...(!bool(input.channelWriteGrantsReady) ? ["Approve channel write grants before execution."] : []),
      ...(!bool(input.credentialRotationOwnerAssigned) ? ["Assign credential rotation owner."] : [])
    ]),
    phase("data_mapping", !bool(input.mappingApproved) ? ["Approve data mapping version."] : [], !input.mappingVersion ? ["Record mapping version id."] : []),
    phase("policy_review", [
      ...(!bool(input.policyApproved) ? ["Approve policy constraints."] : []),
      ...(!bool(input.consentApproved) ? ["Approve consent and suppression policy."] : [])
    ]),
    phase("baseline", [
      ...(!bool(input.baselineFrozen) ? ["Freeze historical baseline snapshot."] : []),
      ...(!bool(input.baselineApproved) ? ["Approve baseline with data and finance owners."] : [])
    ]),
    phase("audit_evidence", !bool(input.auditExportEnabled) ? ["Enable audit evidence export."] : []),
    phase("launch_constraints", [
      ...(!bool(input.launchConstraintsAccepted) ? ["Accept launch constraints and escalation process."] : []),
      ...(!bool(input.approvalQueueOwnerAssigned) ? ["Assign approval queue owner."] : []),
      ...(!bool(input.approvalSlaDefined) ? ["Define approval response SLA."] : []),
      ...(!bool(input.emergencyStopTested) ? ["Test emergency stop before agent-managed execution."] : []),
      ...(!bool(input.rollbackEvidenceReady) ? ["Attach rollback evidence before agent-managed execution."] : []),
      ...(!bool(input.performanceBillingApproved) ? ["Approve performance billing evidence before agent-managed execution."] : [])
    ]),
    phase("risk_ownership", riskBlockers, riskWarnings)
  ];

  const blockers = phases.flatMap((item) => item.blockers);
  const warnings = phases.flatMap((item) => item.warnings);
  const maxAllowedLaunchMode = computeMaxAllowedLaunchMode(input, missing);
  const requestedLaunchAllowed = LAUNCH_MODE_RANK[requestedLaunchMode] <= LAUNCH_MODE_RANK[maxAllowedLaunchMode];
  const status: CustomerOnboardingStatus = !requestedLaunchAllowed || blockers.length > 0 && requestedLaunchMode !== "audit_only"
    ? "blocked"
    : warnings.length > 0 || blockers.length > 0
      ? "warning"
      : "ready";

  return {
    status,
    requestedLaunchMode,
    maxAllowedLaunchMode,
    requestedLaunchAllowed,
    missingOwners: missing,
    blockers,
    warnings,
    phases,
    nextRequiredAction: nextAction(phases, requestedLaunchAllowed, maxAllowedLaunchMode)
  };
}
