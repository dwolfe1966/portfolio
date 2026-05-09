export type AcquisitionProviderWriteMode = "simulated" | "dry_run" | "approved_mutation";

export type AcquisitionProviderWriteReadiness = {
  queueName: "acquisition:provider_write";
  followOnQueues: ["acquisition:observation", "acquisition:measurement"];
  currentMode: AcquisitionProviderWriteMode;
  nextMode: AcquisitionProviderWriteMode;
  approvalGates: string[];
  rollbackRequirements: string[];
  measurementOutputs: string[];
  readyForDryRun: boolean;
  readyForApprovedMutation: boolean;
  blockers: string[];
};

export function buildAcquisitionProviderWriteReadiness(input: {
  providerDryRunAdapterAvailable?: boolean;
  rollbackMetadataAvailable?: boolean;
  approvalPolicyConfigured?: boolean;
  measurementConfigured?: boolean;
  protectedCampaignChecksEnabled?: boolean;
  emergencyStopConfigured?: boolean;
} = {}): AcquisitionProviderWriteReadiness {
  const blockers: string[] = [];

  if (!input.providerDryRunAdapterAvailable) blockers.push("provider_dry_run_adapter_missing");
  if (!input.rollbackMetadataAvailable) blockers.push("rollback_metadata_missing");
  if (!input.approvalPolicyConfigured) blockers.push("approval_policy_missing");
  if (!input.measurementConfigured) blockers.push("measurement_outputs_missing");
  if (!input.protectedCampaignChecksEnabled) blockers.push("protected_campaign_checks_missing");
  if (!input.emergencyStopConfigured) blockers.push("emergency_stop_missing");

  const readyForDryRun = blockers.every((blocker) => blocker !== "provider_dry_run_adapter_missing");
  const readyForApprovedMutation = blockers.length === 0;

  return {
    queueName: "acquisition:provider_write",
    followOnQueues: ["acquisition:observation", "acquisition:measurement"],
    currentMode: "simulated",
    nextMode: readyForApprovedMutation ? "approved_mutation" : readyForDryRun ? "dry_run" : "simulated",
    approvalGates: [
      "over_cap_budget_shift",
      "high_risk_campaign_state_change",
      "protected_campaign",
      "low_confidence_recommendation",
      "cooldown_breach",
      "emergency_stop",
      "non_reversible_write"
    ],
    rollbackRequirements: [
      "idempotency_key",
      "previous_provider_state",
      "intended_provider_diff",
      "rollback_instructions",
      "provider_operation_id"
    ],
    measurementOutputs: [
      "spend_moved",
      "wasted_spend_avoided",
      "cac_ltv_movement",
      "roas_change",
      "conversion_quality_notes",
      "revenue_impact_attribution"
    ],
    readyForDryRun,
    readyForApprovedMutation,
    blockers
  };
}
