import type { BillableExecutionGateDecision } from "@/lib/billable-execution-gates";
import type { CustomerLaunchMode } from "@/lib/customer-onboarding-readiness";
import type { WorkspaceLaunchReadiness } from "@/lib/workspace-launch-readiness";

export type WorkspaceExecutionControlKey =
  | "human_approved_provider_execution"
  | "agent_managed_execution"
  | "performance_billing";

export type WorkspaceExecutionControlState = {
  key: WorkspaceExecutionControlKey;
  enabled: boolean;
  label: string;
  reason: string;
};

export type WorkspaceExecutionUiGate = {
  maxAllowedLaunchMode: CustomerLaunchMode;
  billableGateStatus: BillableExecutionGateDecision["status"] | "missing";
  billableExecutionEnabled: boolean;
  humanApprovedProviderExecutionEnabled: boolean;
  agentManagedExecutionEnabled: boolean;
  controls: WorkspaceExecutionControlState[];
  nextRequiredAction: string;
};

const LAUNCH_MODE_RANK: Record<CustomerLaunchMode, number> = {
  audit_only: 0,
  recommendation_only: 1,
  human_approved_execution: 2,
  agent_managed_execution: 3
};

function rankAtLeast(value: CustomerLaunchMode, minimum: CustomerLaunchMode) {
  return LAUNCH_MODE_RANK[value] >= LAUNCH_MODE_RANK[minimum];
}

function blocker(readiness: WorkspaceLaunchReadiness, gate: BillableExecutionGateDecision | null) {
  return readiness.blockers[0] ?? gate?.blockers[0] ?? readiness.warnings[0] ?? gate?.warnings[0] ?? readiness.nextRequiredAction;
}

export function buildWorkspaceExecutionUiGate(readiness: WorkspaceLaunchReadiness): WorkspaceExecutionUiGate {
  const billableGate = readiness.packet.sections.billableGate ?? null;
  const humanApprovedProviderExecutionEnabled = rankAtLeast(readiness.maxAllowedLaunchMode, "human_approved_execution");
  const agentManagedExecutionEnabled = rankAtLeast(readiness.maxAllowedLaunchMode, "agent_managed_execution") && billableGate?.enabled === true;
  const billableExecutionEnabled = billableGate?.enabled === true;
  const blockedReason = blocker(readiness, billableGate);

  return {
    maxAllowedLaunchMode: readiness.maxAllowedLaunchMode,
    billableGateStatus: billableGate?.status ?? "missing",
    billableExecutionEnabled,
    humanApprovedProviderExecutionEnabled,
    agentManagedExecutionEnabled,
    nextRequiredAction: blockedReason,
    controls: [
      {
        key: "human_approved_provider_execution",
        enabled: humanApprovedProviderExecutionEnabled,
        label: humanApprovedProviderExecutionEnabled ? "Human-approved provider execution" : "Provider execution downgraded",
        reason: humanApprovedProviderExecutionEnabled
          ? "Operator-approved provider dry-runs can execute inside the governed queue."
          : blockedReason
      },
      {
        key: "agent_managed_execution",
        enabled: agentManagedExecutionEnabled,
        label: agentManagedExecutionEnabled ? "Agent-managed execution enabled" : "Agent-managed execution locked",
        reason: agentManagedExecutionEnabled
          ? "Launch readiness and billable controls allow agent-managed execution."
          : blockedReason
      },
      {
        key: "performance_billing",
        enabled: billableExecutionEnabled,
        label: billableExecutionEnabled ? "Performance billing enabled" : "Performance billing locked",
        reason: billableExecutionEnabled
          ? "Billable execution evidence is complete."
          : billableGate?.nextRequiredAction ?? blockedReason
      }
    ]
  };
}
