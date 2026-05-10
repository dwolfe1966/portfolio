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

function googleCustomerResource(externalAccountId: unknown) {
  const customerId = clean(externalAccountId).replace(/-/g, "");
  return customerId ? `customers/${customerId}` : null;
}

function googleCampaignResource(externalAccountId: unknown, externalCampaignId: unknown) {
  const campaignId = clean(externalCampaignId);
  if (campaignId.startsWith("customers/")) return campaignId;
  const customer = googleCustomerResource(externalAccountId);
  return customer && campaignId ? `${customer}/campaigns/${campaignId}` : campaignId || null;
}

export class GoogleAdsProviderWriteDryRunAdapter implements AdProviderWriteDryRunAdapter {
  readonly name = "google_ads";

  dryRunProviderWrite(input: AdProviderWriteDryRunInput): AdProviderWriteDryRunResult {
    const proposedAction = input.proposedAction ?? {};
    const operationType = clean(input.operationType, "update_budget");
    const externalAccountId = clean(input.externalAccountId ?? proposedAction.externalAccountId, "") || null;
    const campaignResource = googleCampaignResource(
      externalAccountId,
      input.externalCampaignId ?? proposedAction.externalCampaignId ?? proposedAction.campaignId
    );
    const spendExposureCents = spendExposure(proposedAction.spendExposureCents ?? proposedAction.shiftAmountCents ?? proposedAction.amountCents);
    const blockers: string[] = [];
    const warnings: string[] = [];

    if (!externalAccountId) blockers.push("google_ads_external_account_id_missing");
    if (operationType !== "create_campaign" && !campaignResource) blockers.push("google_ads_campaign_resource_missing");
    if (!input.idempotencyKey) warnings.push("Idempotency key is missing from the dry-run payload.");

    return {
      mode: "dry_run",
      provider: "google_ads",
      operationType,
      idempotencyKey: input.idempotencyKey ?? null,
      externalAccountId,
      externalCampaignId: campaignResource,
      permissionChecks: [
        {
          capability: "google_ads.read_campaign",
          ok: Boolean(externalAccountId),
          reason: externalAccountId ? "Customer context is present for pre-mutation verification." : "Missing Google Ads customer id."
        },
        {
          capability: "google_ads.mutate_campaign",
          ok: true,
          reason: "Dry-run only: this adapter prepares the mutate shape but does not call Google Ads mutate endpoints."
        }
      ],
      providerObjects: [
        {
          resourceType: operationType === "create_campaign" ? "campaign_draft" : "campaign",
          resourceId: campaignResource ?? `${googleCustomerResource(externalAccountId) ?? "customers/unknown"}/campaigns/new`,
          before: {
            status: operationType === "create_campaign" ? null : proposedAction.previousStatus ?? "ENABLED",
            dailyBudgetCents: operationType === "create_campaign" ? null : proposedAction.previousBudgetCents ?? null,
            googleAdsResourceName: operationType === "create_campaign" ? null : campaignResource
          },
          after: {
            status: proposedAction.nextStatus ?? proposedAction.status ?? (operationType === "pause_resume" ? "PAUSED" : "ENABLED"),
            dailyBudgetCents: proposedAction.nextBudgetCents ?? proposedAction.budgetCents ?? null,
            googleAdsResourceName: campaignResource,
            mutateOperation: operationType
          }
        }
      ],
      spendExposureCents,
      rollbackSupported: operationType !== "create_campaign",
      rollbackPlan: operationType === "create_campaign"
        ? "Do not apply automatically until campaign creation rollback/delete semantics are implemented."
        : clean(proposedAction.rollbackPlan, "") || "Restore the previous Google Ads campaign status and budget from the dry-run before-state.",
      blockers,
      warnings
    };
  }
}

function metaAccountResource(externalAccountId: unknown) {
  const accountId = clean(externalAccountId).replace(/^act_/, "").replace(/[^0-9]/g, "");
  return accountId ? `act_${accountId}` : null;
}

function metaCampaignResource(externalCampaignId: unknown) {
  const campaignId = clean(externalCampaignId);
  return campaignId || null;
}

export class MetaAdsProviderWriteDryRunAdapter implements AdProviderWriteDryRunAdapter {
  readonly name = "meta_ads";

  dryRunProviderWrite(input: AdProviderWriteDryRunInput): AdProviderWriteDryRunResult {
    const proposedAction = input.proposedAction ?? {};
    const operationType = clean(input.operationType, "update_budget");
    const externalAccountId = metaAccountResource(input.externalAccountId ?? proposedAction.externalAccountId);
    const campaignId = metaCampaignResource(input.externalCampaignId ?? proposedAction.externalCampaignId ?? proposedAction.campaignId);
    const adSetId = clean(proposedAction.externalAdSetId ?? proposedAction.adSetId, "") || null;
    const adId = clean(proposedAction.externalAdId ?? proposedAction.adId, "") || null;
    const spendExposureCents = spendExposure(proposedAction.spendExposureCents ?? proposedAction.shiftAmountCents ?? proposedAction.amountCents);
    const blockers: string[] = [];
    const warnings: string[] = [];

    if (!externalAccountId) blockers.push("meta_ads_ad_account_id_missing");
    if (operationType !== "create_campaign" && !campaignId) blockers.push("meta_ads_campaign_id_missing");
    if (["update_ad_set_budget", "pause_resume_ad_set"].includes(operationType) && !adSetId) blockers.push("meta_ads_ad_set_id_missing");
    if (operationType === "pause_resume_ad" && !adId) blockers.push("meta_ads_ad_id_missing");
    if (!input.idempotencyKey) warnings.push("Idempotency key is missing from the dry-run payload.");

    const resourceType = operationType === "create_campaign"
      ? "campaign_draft"
      : operationType.includes("ad_set")
        ? "ad_set"
        : operationType.includes("_ad")
          ? "ad"
          : "campaign";
    const resourceId = resourceType === "ad_set"
      ? adSetId ?? "adset_unknown"
      : resourceType === "ad"
        ? adId ?? "ad_unknown"
        : campaignId ?? `${externalAccountId ?? "act_unknown"}/campaigns/new`;

    return {
      mode: "dry_run",
      provider: "meta_ads",
      operationType,
      idempotencyKey: input.idempotencyKey ?? null,
      externalAccountId,
      externalCampaignId: campaignId,
      permissionChecks: [
        {
          capability: "meta_ads.ads_read",
          ok: Boolean(externalAccountId),
          reason: externalAccountId ? "Ad account context is present for pre-mutation verification." : "Missing Meta ad account id."
        },
        {
          capability: "meta_ads.ads_management",
          ok: true,
          reason: "Dry-run only: this adapter prepares Graph API mutation metadata but does not call Meta write endpoints."
        }
      ],
      providerObjects: [
        {
          resourceType,
          resourceId,
          before: {
            status: operationType === "create_campaign" ? null : proposedAction.previousStatus ?? "ACTIVE",
            dailyBudgetCents: operationType === "create_campaign" ? null : proposedAction.previousBudgetCents ?? null,
            metaAdAccountId: externalAccountId,
            metaCampaignId: operationType === "create_campaign" ? null : campaignId,
            metaAdSetId: adSetId,
            metaAdId: adId
          },
          after: {
            status: proposedAction.nextStatus ?? proposedAction.status ?? (operationType.includes("pause") ? "PAUSED" : "ACTIVE"),
            dailyBudgetCents: proposedAction.nextBudgetCents ?? proposedAction.budgetCents ?? null,
            metaAdAccountId: externalAccountId,
            metaCampaignId: campaignId,
            metaAdSetId: adSetId,
            metaAdId: adId,
            graphApiOperation: operationType
          }
        }
      ],
      spendExposureCents,
      rollbackSupported: operationType !== "create_campaign",
      rollbackPlan: operationType === "create_campaign"
        ? "Do not apply automatically until Meta campaign creation rollback/delete semantics are implemented."
        : clean(proposedAction.rollbackPlan, "") || "Restore the previous Meta campaign, ad set, or ad status and budget from the dry-run before-state.",
      blockers,
      warnings
    };
  }
}

export function getAdProviderWriteDryRunAdapter(name = process.env.ACQUISITION_PROVIDER_DRY_RUN_ADAPTER): AdProviderWriteDryRunAdapter | null {
  const normalized = clean(name).toLowerCase();
  if (normalized === "simulated") return new SimulatedAdProviderWriteDryRunAdapter();
  if (normalized === "google_ads") return new GoogleAdsProviderWriteDryRunAdapter();
  if (normalized === "meta_ads") return new MetaAdsProviderWriteDryRunAdapter();
  return null;
}

export function hasAdProviderWriteDryRunAdapter(name = process.env.ACQUISITION_PROVIDER_DRY_RUN_ADAPTER) {
  return getAdProviderWriteDryRunAdapter(name) !== null;
}
