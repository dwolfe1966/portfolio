import type {
  AcquisitionMutationDryRunEvidence,
  AcquisitionMutationEnablementDecision
} from "@/lib/acquisition-mutation-gates";

export type AdProviderSandboxWriteInput = {
  workspaceId: string;
  provider: string;
  operationType: string;
  externalAccountId: string;
  externalCampaignId: string;
  mutationIdempotencyKey: string;
  dryRun: AcquisitionMutationDryRunEvidence;
  gateDecision: AcquisitionMutationEnablementDecision;
};

export type AdProviderSandboxWriteResult = {
  mode: "sandbox_mutation";
  provider: string;
  operationType: string;
  status: "applied" | "blocked";
  idempotencyKey: string;
  providerOperationId: string | null;
  externalAccountId: string;
  externalCampaignId: string;
  appliedAt: string | null;
  providerObjects: Array<{
    resourceType: string;
    resourceId: string;
    before: Record<string, unknown>;
    after: Record<string, unknown>;
  }>;
  rollback: {
    supported: boolean;
    plan: string | null;
    providerOperationId: string | null;
    instructions: string[];
  };
  blockers: string[];
  warnings: string[];
};

export interface AdProviderSandboxWriteAdapter {
  readonly name: string;
  applySandboxMutation(input: AdProviderSandboxWriteInput): AdProviderSandboxWriteResult;
}

const SANDBOX_ALLOWED_OPERATIONS = new Set(["update_budget", "pause_resume", "update_ad_set_budget", "pause_resume_ad_set"]);

function clean(value: unknown, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function stableToken(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash.toString(36).padStart(7, "0");
}

function providerObjectsFromDryRun(dryRun: AcquisitionMutationDryRunEvidence) {
  const raw = dryRun as AcquisitionMutationDryRunEvidence & {
    providerObjects?: unknown;
  };
  return Array.isArray(raw.providerObjects)
    ? raw.providerObjects.filter((item): item is AdProviderSandboxWriteResult["providerObjects"][number] => {
        return Boolean(item && typeof item === "object" && !Array.isArray(item));
      })
    : [];
}

function blockedResult(input: AdProviderSandboxWriteInput, blockers: string[]): AdProviderSandboxWriteResult {
  return {
    mode: "sandbox_mutation",
    provider: input.provider,
    operationType: input.operationType,
    status: "blocked",
    idempotencyKey: input.mutationIdempotencyKey,
    providerOperationId: null,
    externalAccountId: input.externalAccountId,
    externalCampaignId: input.externalCampaignId,
    appliedAt: null,
    providerObjects: providerObjectsFromDryRun(input.dryRun),
    rollback: {
      supported: false,
      plan: input.dryRun.rollbackPlan ?? null,
      providerOperationId: null,
      instructions: []
    },
    blockers,
    warnings: []
  };
}

export class SimulatedAdProviderSandboxWriteAdapter implements AdProviderSandboxWriteAdapter {
  readonly name = "simulated_sandbox";

  applySandboxMutation(input: AdProviderSandboxWriteInput): AdProviderSandboxWriteResult {
    const blockers = [...input.gateDecision.blockers];
    const operationType = clean(input.operationType);

    if (!input.gateDecision.enabled) blockers.push("mutation_gate_blocked");
    if (!SANDBOX_ALLOWED_OPERATIONS.has(operationType)) blockers.push("sandbox_operation_not_allowed");
    if (input.dryRun.status !== "ready") blockers.push("dry_run_not_ready");
    if (input.dryRun.mode !== "dry_run") blockers.push("dry_run_evidence_missing");

    const uniqueBlockers = [...new Set(blockers)];
    if (uniqueBlockers.length > 0) return blockedResult(input, uniqueBlockers);

    const providerOperationId = [
      "sandbox",
      clean(input.provider, "provider"),
      stableToken(`${input.workspaceId}:${input.externalAccountId}:${input.externalCampaignId}:${input.mutationIdempotencyKey}`)
    ].join("_");
    const providerObjects = providerObjectsFromDryRun(input.dryRun);

    return {
      mode: "sandbox_mutation",
      provider: input.provider,
      operationType,
      status: "applied",
      idempotencyKey: input.mutationIdempotencyKey,
      providerOperationId,
      externalAccountId: input.externalAccountId,
      externalCampaignId: input.externalCampaignId,
      appliedAt: new Date().toISOString(),
      providerObjects,
      rollback: {
        supported: input.dryRun.rollbackSupported,
        plan: input.dryRun.rollbackPlan ?? null,
        providerOperationId: `rollback_${providerOperationId}`,
        instructions: [
          "Use the persisted dry-run before-state as the rollback source of truth.",
          "Apply rollback only through the same mutation gate and idempotency controls."
        ]
      },
      blockers: [],
      warnings: [
        "Sandbox adapter only: no live ad platform mutation was executed."
      ]
    };
  }
}

export function getAdProviderSandboxWriteAdapter(name = process.env.ACQUISITION_PROVIDER_SANDBOX_WRITE_ADAPTER): AdProviderSandboxWriteAdapter | null {
  const normalized = clean(name).toLowerCase();
  if (normalized === "simulated" || normalized === "simulated_sandbox") return new SimulatedAdProviderSandboxWriteAdapter();
  return null;
}

export function hasAdProviderSandboxWriteAdapter(name = process.env.ACQUISITION_PROVIDER_SANDBOX_WRITE_ADAPTER) {
  return getAdProviderSandboxWriteAdapter(name) !== null;
}
