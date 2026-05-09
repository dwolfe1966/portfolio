import type { AdWriteOperationType } from "@/lib/acquisition";
import type { AdProvider } from "./types";

export type AdProviderWriteDryRunInput = {
  provider?: AdProvider | string | null;
  operationType?: AdWriteOperationType | string | null;
  approvalRequestId?: string | null;
  idempotencyKey?: string | null;
  externalAccountId?: string | null;
  externalCampaignId?: string | null;
  proposedAction?: Record<string, unknown>;
};

export type AdProviderWriteDryRunResult = {
  mode: "dry_run";
  provider: AdProvider | "unknown";
  operationType: string;
  idempotencyKey: string | null;
  externalAccountId: string | null;
  externalCampaignId: string | null;
  permissionChecks: Array<{ capability: string; ok: boolean; reason?: string }>;
  providerObjects: Array<{
    resourceType: string;
    resourceId: string;
    before: Record<string, unknown>;
    after: Record<string, unknown>;
  }>;
  spendExposureCents: number;
  rollbackSupported: boolean;
  rollbackPlan: string | null;
  blockers: string[];
  warnings: string[];
};

export interface AdProviderWriteDryRunAdapter {
  readonly name: string;
  dryRunProviderWrite(input: AdProviderWriteDryRunInput): AdProviderWriteDryRunResult;
}

const KNOWN_PROVIDERS = new Set<string>(["simulated", "google_ads", "meta_ads"]);

function clean(value: unknown, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function providerValue(value: unknown): AdProvider | "unknown" {
  const provider = clean(value, "simulated");
  return KNOWN_PROVIDERS.has(provider) ? provider as AdProvider : "unknown";
}

function spendExposure(value: unknown) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount) : 0;
}

export function normalizeAdProviderWriteDryRunInput(payload: unknown): AdProviderWriteDryRunInput {
  const body = objectValue(payload);
  const proposedAction = objectValue(body.proposedAction ?? body.input);

  return {
    provider: clean(body.provider ?? proposedAction.provider, "simulated"),
    operationType: clean(body.operationType ?? proposedAction.operationType ?? proposedAction.type, "update_budget"),
    approvalRequestId: clean(body.approvalRequestId, "") || null,
    idempotencyKey: clean(body.idempotencyKey ?? proposedAction.idempotencyKey, "") || null,
    externalAccountId: clean(body.externalAccountId ?? proposedAction.externalAccountId, "") || null,
    externalCampaignId: clean(body.externalCampaignId ?? proposedAction.externalCampaignId ?? proposedAction.campaignId, "") || null,
    proposedAction
  };
}

export class SimulatedAdProviderWriteDryRunAdapter implements AdProviderWriteDryRunAdapter {
  readonly name = "simulated";

  dryRunProviderWrite(input: AdProviderWriteDryRunInput): AdProviderWriteDryRunResult {
    const proposedAction = input.proposedAction ?? {};
    const provider = providerValue(input.provider);
    const operationType = clean(input.operationType, "update_budget");
    const externalCampaignId = clean(input.externalCampaignId ?? proposedAction.campaignId, "simulated-campaign");
    const spendExposureCents = spendExposure(proposedAction.spendExposureCents ?? proposedAction.shiftAmountCents ?? proposedAction.amountCents);

    return {
      mode: "dry_run",
      provider,
      operationType,
      idempotencyKey: input.idempotencyKey ?? null,
      externalAccountId: input.externalAccountId ?? null,
      externalCampaignId,
      permissionChecks: [
        { capability: "read_campaigns", ok: true },
        { capability: "mutate_campaigns", ok: true, reason: "simulated dry-run adapter only; no provider mutation will occur" }
      ],
      providerObjects: [
        {
          resourceType: "campaign",
          resourceId: externalCampaignId,
          before: {
            status: proposedAction.previousStatus ?? "ENABLED",
            dailyBudgetCents: proposedAction.previousBudgetCents ?? null
          },
          after: {
            status: proposedAction.nextStatus ?? proposedAction.status ?? "ENABLED",
            dailyBudgetCents: proposedAction.nextBudgetCents ?? proposedAction.budgetCents ?? null
          }
        }
      ],
      spendExposureCents,
      rollbackSupported: true,
      rollbackPlan: clean(proposedAction.rollbackPlan, "") || "Restore the captured before-state from the dry-run diff.",
      blockers: [],
      warnings: provider === "unknown" ? ["Unknown provider; simulated dry-run used generic campaign diff."] : []
    };
  }
}

export function getAdProviderWriteDryRunAdapter(name = process.env.ACQUISITION_PROVIDER_DRY_RUN_ADAPTER): AdProviderWriteDryRunAdapter | null {
  const normalized = clean(name).toLowerCase();
  if (normalized === "simulated") return new SimulatedAdProviderWriteDryRunAdapter();
  return null;
}

export function hasAdProviderWriteDryRunAdapter(name = process.env.ACQUISITION_PROVIDER_DRY_RUN_ADAPTER) {
  return getAdProviderWriteDryRunAdapter(name) !== null;
}
