export type AcquisitionMutationGateSeverity = "pass" | "block";

export type AcquisitionMutationGateCheck = {
  key: string;
  label: string;
  severity: AcquisitionMutationGateSeverity;
  detail: string;
};

export type AcquisitionMutationCredentialGrant = {
  id: string;
  status: string;
  provider: string;
  externalAccountId?: string | null;
  environment?: string | null;
  capabilities: string[];
  tokenHealthStatus: string;
};

export type AcquisitionMutationDryRunEvidence = {
  id: string;
  workspaceId?: string | null;
  app: string;
  provider: string;
  operationType: string;
  mode: string;
  status: string;
  idempotencyKey?: string | null;
  externalAccountId?: string | null;
  externalCampaignId?: string | null;
  rollbackSupported: boolean;
  rollbackPlan?: string | null;
  blockers: string[];
};

export type AcquisitionMutationApprovalEvidence = {
  id: string;
  workspaceId?: string | null;
  app: string;
  actionType: string;
  status: string;
  riskLevel?: string | null;
  decidedAt?: Date | string | null;
};

export type AcquisitionMutationMeasurementEvidence = {
  id: string;
  workspaceId?: string | null;
  providerWriteDryRunId?: string | null;
  status: string;
  observationJobId?: string | null;
  measurementJobId?: string | null;
  measurementOutputs: string[];
};

export type AcquisitionMutationEnablementInput = {
  workspaceId?: string | null;
  workspaceExecutionEnabled?: boolean;
  provider?: string | null;
  externalAccountId?: string | null;
  externalCampaignId?: string | null;
  operationType?: string | null;
  targetAccountAllowed?: boolean;
  operationAllowed?: boolean;
  credentialGrant?: AcquisitionMutationCredentialGrant | null;
  dryRun?: AcquisitionMutationDryRunEvidence | null;
  approval?: AcquisitionMutationApprovalEvidence | null;
  measurement?: AcquisitionMutationMeasurementEvidence | null;
  mutationIdempotencyKey?: string | null;
  emergencyStopActive?: boolean;
};

export type AcquisitionMutationEnablementDecision = {
  enabled: boolean;
  status: "ready" | "blocked";
  blockers: string[];
  checks: AcquisitionMutationGateCheck[];
};

const MUTATION_APPROVAL_ACTION_TYPES = new Set([
  "provider_write_mutation",
  "approved_provider_write",
  "provider_write_execution"
]);

function clean(value: string | null | undefined) {
  return String(value ?? "").trim();
}

function addCheck(checks: AcquisitionMutationGateCheck[], check: AcquisitionMutationGateCheck) {
  checks.push(check);
}

function hasMutationCapability(grant: AcquisitionMutationCredentialGrant | null | undefined, provider: string) {
  if (!grant) return false;
  return grant.capabilities.some((capability) => {
    const normalized = capability.trim();
    return normalized === "provider_write.mutate"
      || normalized === "provider.mutate"
      || normalized === `${provider}.mutate`
      || normalized === `${provider}.campaign.mutate`;
  });
}

function sameIfPresent(left: string | null | undefined, right: string | null | undefined) {
  const leftClean = clean(left);
  const rightClean = clean(right);
  return !leftClean || !rightClean || leftClean === rightClean;
}

function checkWorkspace(input: AcquisitionMutationEnablementInput, checks: AcquisitionMutationGateCheck[]) {
  const workspaceId = clean(input.workspaceId);
  const dryRunWorkspaceMatches = sameIfPresent(input.workspaceId, input.dryRun?.workspaceId);
  const approvalWorkspaceMatches = sameIfPresent(input.workspaceId, input.approval?.workspaceId);
  const measurementWorkspaceMatches = sameIfPresent(input.workspaceId, input.measurement?.workspaceId);
  const pass = Boolean(workspaceId && input.workspaceExecutionEnabled && dryRunWorkspaceMatches && approvalWorkspaceMatches && measurementWorkspaceMatches);

  addCheck(checks, {
    key: "workspace",
    label: "Workspace",
    severity: pass ? "pass" : "block",
    detail: pass
      ? `Workspace ${workspaceId} is enabled and evidence is workspace-scoped.`
      : "Workspace execution must be enabled and all mutation evidence must match the workspace."
  });
}

function checkProvider(input: AcquisitionMutationEnablementInput, checks: AcquisitionMutationGateCheck[]) {
  const provider = clean(input.provider);
  const pass = Boolean(provider && input.dryRun?.provider === provider && input.credentialGrant?.provider === provider);

  addCheck(checks, {
    key: "provider",
    label: "Provider",
    severity: pass ? "pass" : "block",
    detail: pass
      ? `Provider ${provider} matches the credential grant and dry-run evidence.`
      : "Provider must be present and match credential grant plus dry-run evidence."
  });
}

function checkAccount(input: AcquisitionMutationEnablementInput, checks: AcquisitionMutationGateCheck[]) {
  const externalAccountId = clean(input.externalAccountId);
  const pass = Boolean(
    externalAccountId
    && input.targetAccountAllowed
    && sameIfPresent(externalAccountId, input.credentialGrant?.externalAccountId)
    && sameIfPresent(externalAccountId, input.dryRun?.externalAccountId)
  );

  addCheck(checks, {
    key: "account",
    label: "Account",
    severity: pass ? "pass" : "block",
    detail: pass
      ? `Account ${externalAccountId} is selected and allowed for mutation.`
      : "Target account must be selected, allowed, and match credential plus dry-run evidence."
  });
}

function checkOperation(input: AcquisitionMutationEnablementInput, checks: AcquisitionMutationGateCheck[]) {
  const operationType = clean(input.operationType);
  const campaignSelected = Boolean(clean(input.externalCampaignId));
  const pass = Boolean(operationType && campaignSelected && input.operationAllowed && input.dryRun?.operationType === operationType);

  addCheck(checks, {
    key: "operation",
    label: "Operation",
    severity: pass ? "pass" : "block",
    detail: pass
      ? `Operation ${operationType} is allowed for campaign ${clean(input.externalCampaignId)}.`
      : "Operation type and campaign target must be selected, allowed, and match the dry-run evidence."
  });
}

function checkCredential(input: AcquisitionMutationEnablementInput, checks: AcquisitionMutationGateCheck[]) {
  const grant = input.credentialGrant ?? null;
  const provider = clean(input.provider);
  const pass = Boolean(
    grant
    && grant.status === "active"
    && grant.tokenHealthStatus === "valid"
    && hasMutationCapability(grant, provider)
  );

  addCheck(checks, {
    key: "credential_grant",
    label: "Credential grant",
    severity: pass ? "pass" : "block",
    detail: pass
      ? `Grant ${grant?.id} has active mutation capability.`
      : "An active, valid credential grant with mutation capability is required."
  });
}

function checkDryRun(input: AcquisitionMutationEnablementInput, checks: AcquisitionMutationGateCheck[]) {
  const dryRun = input.dryRun ?? null;
  const pass = Boolean(
    dryRun
    && dryRun.app === "acquisition"
    && dryRun.mode === "dry_run"
    && dryRun.status === "ready"
    && dryRun.blockers.length === 0
    && sameIfPresent(input.externalCampaignId, dryRun.externalCampaignId)
  );

  addCheck(checks, {
    key: "dry_run",
    label: "Dry-run evidence",
    severity: pass ? "pass" : "block",
    detail: pass
      ? `Ready dry-run ${dryRun?.id} has no blockers.`
      : "A ready acquisition dry-run with no blockers and matching provider target is required."
  });
}

function checkApproval(input: AcquisitionMutationEnablementInput, checks: AcquisitionMutationGateCheck[]) {
  const approval = input.approval ?? null;
  const pass = Boolean(
    approval
    && approval.app === "acquisition"
    && approval.status === "approved"
    && MUTATION_APPROVAL_ACTION_TYPES.has(approval.actionType)
    && approval.decidedAt
  );

  addCheck(checks, {
    key: "approval",
    label: "Approval",
    severity: pass ? "pass" : "block",
    detail: pass
      ? `Mutation approval ${approval?.id} is approved.`
      : "A decided acquisition mutation approval is required; dry-run-only approvals are not enough."
  });
}

function checkRollback(input: AcquisitionMutationEnablementInput, checks: AcquisitionMutationGateCheck[]) {
  const dryRun = input.dryRun ?? null;
  const pass = Boolean(dryRun?.rollbackSupported && clean(dryRun.rollbackPlan));

  addCheck(checks, {
    key: "rollback",
    label: "Rollback",
    severity: pass ? "pass" : "block",
    detail: pass
      ? "Rollback is supported and a rollback plan is attached to the dry-run evidence."
      : "Rollback support and a rollback plan are required before mutation."
  });
}

function checkIdempotency(input: AcquisitionMutationEnablementInput, checks: AcquisitionMutationGateCheck[]) {
  const mutationKey = clean(input.mutationIdempotencyKey);
  const dryRunKey = clean(input.dryRun?.idempotencyKey);
  const pass = Boolean(mutationKey && (!dryRunKey || mutationKey !== dryRunKey));

  addCheck(checks, {
    key: "idempotency",
    label: "Idempotency",
    severity: pass ? "pass" : "block",
    detail: pass
      ? "A mutation-specific idempotency key is present."
      : "A mutation-specific idempotency key is required and must differ from the dry-run idempotency key."
  });
}

function checkMeasurement(input: AcquisitionMutationEnablementInput, checks: AcquisitionMutationGateCheck[]) {
  const measurement = input.measurement ?? null;
  const status = measurement?.status ?? "";
  const pass = Boolean(
    measurement
    && sameIfPresent(input.dryRun?.id, measurement.providerWriteDryRunId)
    && ["queued", "ready", "completed"].includes(status)
    && clean(measurement.observationJobId)
    && clean(measurement.measurementJobId)
    && measurement.measurementOutputs.length > 0
  );

  addCheck(checks, {
    key: "measurement",
    label: "Measurement",
    severity: pass ? "pass" : "block",
    detail: pass
      ? `Measurement handoff ${measurement?.id} is ${status}.`
      : "Observation and measurement handoff jobs are required before mutation."
  });
}

function checkEmergencyStop(input: AcquisitionMutationEnablementInput, checks: AcquisitionMutationGateCheck[]) {
  const pass = input.emergencyStopActive === false;

  addCheck(checks, {
    key: "emergency_stop",
    label: "Emergency stop",
    severity: pass ? "pass" : "block",
    detail: pass ? "Emergency stop is clear." : "Emergency stop must be explicitly checked and clear."
  });
}

export function buildAcquisitionMutationEnablementGate(
  input: AcquisitionMutationEnablementInput
): AcquisitionMutationEnablementDecision {
  const checks: AcquisitionMutationGateCheck[] = [];

  checkWorkspace(input, checks);
  checkProvider(input, checks);
  checkAccount(input, checks);
  checkOperation(input, checks);
  checkCredential(input, checks);
  checkDryRun(input, checks);
  checkApproval(input, checks);
  checkRollback(input, checks);
  checkIdempotency(input, checks);
  checkMeasurement(input, checks);
  checkEmergencyStop(input, checks);

  const blockers = checks.filter((check) => check.severity === "block").map((check) => check.key);

  return {
    enabled: blockers.length === 0,
    status: blockers.length === 0 ? "ready" : "blocked",
    blockers,
    checks
  };
}
