export type ProviderPreflightSeverity = "pass" | "warn" | "block";

export type ProviderPreflightCheck = {
  key: string;
  label: string;
  severity: ProviderPreflightSeverity;
  detail: string;
};

export type ProviderPreflightInput = {
  provider: string;
  externalAccountId?: string | null;
  externalCampaignId?: string | null;
  externalAdGroupId?: string | null;
  externalAdSetId?: string | null;
  credentialGrant?: {
    id: string;
    status: string;
    environment: string;
    capabilities: string[];
    tokenHealthStatus: string;
  } | null;
  liveDataError?: string | null;
  providerObjectSelected?: boolean;
  approvalPolicyConfigured?: boolean;
  dryRunAdapterAvailable?: boolean;
  measurementConfigured?: boolean;
};

export type ProviderPreflightResult = {
  status: "ready" | "warning" | "blocked";
  readyForApproval: boolean;
  readyForExecution: boolean;
  checks: ProviderPreflightCheck[];
  blockers: string[];
  warnings: string[];
};

function hasCapability(input: ProviderPreflightInput, capability: string) {
  return input.credentialGrant?.capabilities.includes(capability) ?? false;
}

function providerReadCapabilities(provider: string) {
  if (provider === "google_ads") return ["google_ads.customer.read", "google_ads.campaign.read"];
  if (provider === "meta_ads") return ["meta_ads.account.read", "meta_ads.campaign.read"];
  return ["provider.account.read", "provider.object.read"];
}

function addCheck(checks: ProviderPreflightCheck[], check: ProviderPreflightCheck) {
  checks.push(check);
}

export function buildProviderWritePreflight(input: ProviderPreflightInput): ProviderPreflightResult {
  const checks: ProviderPreflightCheck[] = [];
  const credential = input.credentialGrant ?? null;
  const readCapabilities = providerReadCapabilities(input.provider);
  const hasReadCapability = readCapabilities.every((capability) => hasCapability(input, capability))
    || (hasCapability(input, "provider.account.read") && hasCapability(input, "provider.object.read"));
  const hasDryRunCapability = hasCapability(input, "provider_write.dry_run");
  const selectedChildId = input.externalAdSetId || input.externalAdGroupId;

  addCheck(checks, credential
    ? {
        key: "credential_grant",
        label: "Credential grant",
        severity: credential.status === "active" ? "pass" : "block",
        detail: credential.status === "active"
          ? `${credential.environment} grant ${credential.id} is active.`
          : `Grant ${credential.id} is ${credential.status}.`
      }
    : {
        key: "credential_grant",
        label: "Credential grant",
        severity: "block",
        detail: "No credential grant is linked to this provider account."
      });

  addCheck(checks, {
    key: "token_health",
    label: "Token health",
    severity: credential?.tokenHealthStatus === "expired" ? "block" : credential ? "pass" : "block",
    detail: credential
      ? `Token health is ${credential.tokenHealthStatus}.`
      : "Token health is unavailable without a grant."
  });

  addCheck(checks, {
    key: "read_permission",
    label: "Read permission",
    severity: hasReadCapability ? "pass" : "block",
    detail: hasReadCapability
      ? "Provider read capabilities are present for account, campaign, and performance inspection."
      : `Missing one or more read capabilities: ${readCapabilities.join(", ")}.`
  });

  addCheck(checks, {
    key: "write_permission",
    label: "Write permission",
    severity: hasDryRunCapability ? "warn" : "block",
    detail: hasDryRunCapability
      ? "Dry-run capability is present; real provider mutation remains disabled until sandbox write gates exist."
      : "Provider-write dry-run capability is missing from the grant."
  });

  addCheck(checks, {
    key: "provider_object",
    label: "Selected object",
    severity: input.providerObjectSelected && input.externalAccountId && input.externalCampaignId ? "pass" : "block",
    detail: input.providerObjectSelected && input.externalAccountId && input.externalCampaignId
      ? `Selected account ${input.externalAccountId}, campaign ${input.externalCampaignId}${selectedChildId ? `, child ${selectedChildId}` : ""}.`
      : "Select a provider account and campaign before requesting approval."
  });

  addCheck(checks, {
    key: "live_read",
    label: "Live read",
    severity: input.liveDataError ? "block" : "pass",
    detail: input.liveDataError ?? "Live provider reads are available for this selection."
  });

  addCheck(checks, {
    key: "policy_readiness",
    label: "Policy readiness",
    severity: input.approvalPolicyConfigured ? "pass" : "block",
    detail: input.approvalPolicyConfigured
      ? "Approval and policy controls are configured."
      : "Approval and policy controls are not configured."
  });

  addCheck(checks, {
    key: "dry_run_adapter",
    label: "Dry-run adapter",
    severity: input.dryRunAdapterAvailable ? "pass" : "block",
    detail: input.dryRunAdapterAvailable
      ? "A provider dry-run adapter is configured for execution."
      : "No provider dry-run adapter is configured for execution."
  });

  addCheck(checks, {
    key: "measurement_readiness",
    label: "Measurement readiness",
    severity: input.measurementConfigured ? "pass" : "warn",
    detail: input.measurementConfigured
      ? "Measurement handoff is configured for post-write observation."
      : "Measurement handoff is not fully configured; dry-run evidence can still be reviewed."
  });

  const blockers = checks.filter((check) => check.severity === "block").map((check) => check.key);
  const warnings = checks.filter((check) => check.severity === "warn").map((check) => check.key);

  return {
    status: blockers.length > 0 ? "blocked" : warnings.length > 0 ? "warning" : "ready",
    readyForApproval: blockers.length === 0,
    readyForExecution: blockers.length === 0,
    checks,
    blockers,
    warnings
  };
}
