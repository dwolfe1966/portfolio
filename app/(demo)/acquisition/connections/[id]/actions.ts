"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { AcquisitionChannel } from "@prisma/client";
import {
  buildProviderWriteApprovalContext,
  createAgentApprovalRequest
} from "@/lib/agent-approval-queue";
import { ACCOUNT_SESSION_COOKIE, verifyAccountSessionToken } from "@/lib/account-session";
import { acquisitionProviderDryRunAdapterAvailable } from "@/lib/acquisition-agent-generalization";
import { applyAcquisitionDatasetSnapshot } from "@/lib/acquisition-dataset-apply";
import { GoogleAdsConnector, MetaAdsConnector } from "@/lib/ad-connectors";
import type { AdConnector, RemoteAdGroup, RemoteAdUnit, RemoteCampaign, RemotePerformance } from "@/lib/ad-connectors";
import { db } from "@/lib/db";
import { isDemoMutationAllowed } from "@/lib/env-guard";
import { buildProviderWritePreflight } from "@/lib/provider-preflight";
import { getDefaultWorkspace } from "@/lib/workspace";
import { createWorkspaceDatasetSnapshot } from "@/lib/workspace-dataset-snapshots";
import { providerConnectionSyncRedirectUrl } from "@/lib/acquisition-provider-sync-redirect";

function optionalString(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || null;
}

function numericCents(value: FormDataEntryValue | null) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount) : 0;
}

function syncErrorReason(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("PERMISSION_DENIED") || message.includes("does not have permission")) {
    return "permission_denied";
  }
  if (message.includes("GoogleAdsNotTestAccountError") || message.includes("Refusing to fetch from non-test")) {
    return "not_test_account";
  }
  return "sync_failed";
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function connectorForProvider(provider: string, accountUserId: string | null): AdConnector | null {
  if (provider === "google_ads") return new GoogleAdsConnector(accountUserId);
  if (provider === "meta_ads") return new MetaAdsConnector(accountUserId);
  return null;
}

function providerChannel(provider: string): AcquisitionChannel {
  return provider === "meta_ads" ? AcquisitionChannel.SOCIAL : AcquisitionChannel.SEARCH;
}

function centsToDollars(cents: number) {
  return Number((Math.max(0, cents) / 100).toFixed(2));
}

function safeCampaignName(providerLabel: string, campaign: RemoteCampaign) {
  return `${providerLabel} · ${campaign.name || campaign.externalCampaignId}`.slice(0, 120);
}

function defaultEndAfter(start: string | null) {
  const startTime = start && Number.isFinite(new Date(start).getTime()) ? new Date(start).getTime() : Date.now();
  return isoDate(new Date(startTime + 14 * 86400000));
}

function validCampaignEnd(start: string | null, end: string | null) {
  if (!end) return defaultEndAfter(start);
  const startTime = start && Number.isFinite(new Date(start).getTime()) ? new Date(start).getTime() : Date.now();
  const endTime = new Date(end).getTime();
  return Number.isFinite(endTime) && endTime > startTime ? end : defaultEndAfter(start);
}

function estimateTargets(performance: RemotePerformance | null) {
  const spendCents = performance?.totals.spendCents ?? 0;
  const conversions = performance?.totals.conversions ?? 0;
  const cpaCents = conversions > 0 ? Math.max(100, Math.round(spendCents / conversions)) : 14500;
  return {
    targetCacCents: cpaCents,
    targetLtvCents: Math.max(cpaCents + 1000, cpaCents * 4)
  };
}

function fallbackAudience(campaign: RemoteCampaign): RemoteAdGroup {
  return {
    externalCampaignId: campaign.externalCampaignId,
    externalAdGroupId: `${campaign.externalCampaignId}:all`,
    name: "All provider traffic",
    status: "UNKNOWN"
  };
}

function fallbackCreative(campaign: RemoteCampaign, group: RemoteAdGroup): RemoteAdUnit {
  return {
    externalCampaignId: campaign.externalCampaignId,
    externalAdGroupId: group.externalAdGroupId,
    externalAdId: `${campaign.externalCampaignId}:creative`,
    name: "Provider campaign creative",
    status: "UNKNOWN"
  };
}

type ProviderSnapshotBundle = {
  campaigns: RemoteCampaign[];
  adGroups: RemoteAdGroup[];
  ads: RemoteAdUnit[];
  performance: RemotePerformance[];
};

type ProviderSnapshotScope = {
  externalCampaignId: string | null;
  externalAdGroupId: string | null;
};

function normalizeProviderBundle({
  provider,
  providerLabel,
  bundle
}: {
  provider: string;
  providerLabel: string;
  bundle: ProviderSnapshotBundle;
}) {
  const channel = providerChannel(provider);
  const performanceByCampaign = new Map(bundle.performance.map((item) => [item.externalCampaignId, item]));
  const groupsByCampaign = new Map<string, RemoteAdGroup[]>();
  const adsByCampaign = new Map<string, RemoteAdUnit[]>();
  for (const group of bundle.adGroups) {
    groupsByCampaign.set(group.externalCampaignId, [...(groupsByCampaign.get(group.externalCampaignId) ?? []), group]);
  }
  for (const ad of bundle.ads) {
    adsByCampaign.set(ad.externalCampaignId, [...(adsByCampaign.get(ad.externalCampaignId) ?? []), ad]);
  }

  const campaigns = bundle.campaigns.map((campaign) => {
    const performance = performanceByCampaign.get(campaign.externalCampaignId) ?? null;
    const targets = estimateTargets(performance);
    const spendCents = performance?.totals.spendCents ?? 0;
    return {
      name: safeCampaignName(providerLabel, campaign),
      objective: `Imported from ${providerLabel} campaign ${campaign.externalCampaignId}`,
      budgetCents: Math.max(5000, spendCents || 5000),
      startAt: campaign.startDate ?? isoDate(new Date()),
      endAt: validCampaignEnd(campaign.startDate, campaign.endDate),
      channels: [channel],
      maxBudgetShiftPct: 0.2,
      minConfidence: 0.65,
      cooldownHours: 24,
      targetCacCents: targets.targetCacCents,
      targetLtvCents: targets.targetLtvCents,
      cacAutoPausePctOfTarget: 1.25,
      minLtvCacRatio: 2.5,
      approvalCapPct: 0.15
    };
  });

  const audiences = bundle.campaigns.flatMap((campaign) => {
    const groups = groupsByCampaign.get(campaign.externalCampaignId) ?? [fallbackAudience(campaign)];
    const performance = performanceByCampaign.get(campaign.externalCampaignId) ?? null;
    const cpcCents = performance && performance.totals.clicks > 0
      ? Math.round(performance.totals.spendCents / performance.totals.clicks)
      : 250;
    const targets = estimateTargets(performance);
    return groups.map((group) => ({
      campaignName: safeCampaignName(providerLabel, campaign),
      name: `${group.name || group.externalAdGroupId}`.slice(0, 80),
      audienceType: provider === "meta_ads" ? "provider_ad_set" : "provider_ad_group",
      targetingJson: {
        provider,
        externalCampaignId: campaign.externalCampaignId,
        externalAdGroupId: group.externalAdGroupId,
        status: group.status
      },
      predictedCpcCents: Math.max(1, cpcCents),
      predictedCacCents: targets.targetCacCents
    }));
  });

  const creatives = bundle.campaigns.flatMap((campaign) => {
    const groups = groupsByCampaign.get(campaign.externalCampaignId) ?? [fallbackAudience(campaign)];
    const ads = adsByCampaign.get(campaign.externalCampaignId) ?? [fallbackCreative(campaign, groups[0])];
    const performance = performanceByCampaign.get(campaign.externalCampaignId) ?? null;
    const predictedCtr = performance && performance.totals.impressions > 0
      ? Math.min(1, performance.totals.clicks / performance.totals.impressions)
      : 0.03;
    const predictedConversion = performance && performance.totals.clicks > 0
      ? Math.min(1, performance.totals.conversions / performance.totals.clicks)
      : 0.08;
    return ads.map((ad) => ({
      campaignName: safeCampaignName(providerLabel, campaign),
      headline: `${ad.name || ad.externalAdId}`.slice(0, 120),
      description: `Imported ${providerLabel} ad ${ad.externalAdId}`,
      callToAction: "Learn more",
      channel,
      predictedCtr,
      predictedConversion
    }));
  });

  const performance = bundle.campaigns.flatMap((campaign) => {
    const groups = groupsByCampaign.get(campaign.externalCampaignId) ?? [fallbackAudience(campaign)];
    const ads = adsByCampaign.get(campaign.externalCampaignId) ?? [fallbackCreative(campaign, groups[0])];
    const firstAudience = groups[0];
    const firstCreative = ads[0];
    const campaignPerformance = performanceByCampaign.get(campaign.externalCampaignId);
    const targets = estimateTargets(campaignPerformance ?? null);
    return (campaignPerformance?.daily ?? []).map((point) => ({
      campaignName: safeCampaignName(providerLabel, campaign),
      creativeHeadline: `${firstCreative.name || firstCreative.externalAdId}`.slice(0, 120),
      audienceName: `${firstAudience.name || firstAudience.externalAdGroupId}`.slice(0, 80),
      date: point.date,
      impressions: point.impressions,
      clicks: point.clicks,
      conversions: point.conversions,
      spendCents: point.spendCents,
      revenueCents: Math.round(point.conversions * targets.targetLtvCents)
    }));
  });

  return { campaigns, audiences, creatives, performance };
}

async function fetchProviderSnapshot(
  connector: AdConnector,
  externalAccountId: string,
  scope: ProviderSnapshotScope = { externalCampaignId: null, externalAdGroupId: null }
): Promise<ProviderSnapshotBundle> {
  const end = new Date();
  const start = new Date(end.getTime() - 13 * 86400000);
  const range = { start: isoDate(start), end: isoDate(end) };
  const fetchedCampaigns = await connector.fetchCampaigns(externalAccountId);
  const campaigns = scope.externalCampaignId
    ? fetchedCampaigns.filter((campaign) => campaign.externalCampaignId === scope.externalCampaignId)
    : fetchedCampaigns.slice(0, 25);
  const adGroups: RemoteAdGroup[] = [];
  const ads: RemoteAdUnit[] = [];
  const performance: RemotePerformance[] = [];

  for (const campaign of campaigns) {
    const groups = await connector.fetchAdGroups(externalAccountId, campaign.externalCampaignId);
    const scopedGroups = scope.externalAdGroupId
      ? groups.filter((group) => group.externalAdGroupId === scope.externalAdGroupId)
      : groups;
    adGroups.push(...scopedGroups);
    ads.push(...await connector.fetchAds(externalAccountId, campaign.externalCampaignId, scope.externalAdGroupId));
    performance.push(await connector.fetchPerformance(externalAccountId, campaign.externalCampaignId, range));
    if (scope.externalAdGroupId && scopedGroups.length === 0) {
      throw new Error(`Selected ad group ${scope.externalAdGroupId} was not found under campaign ${campaign.externalCampaignId}.`);
    }
  }

  if (scope.externalCampaignId && campaigns.length === 0) {
    throw new Error(`Selected campaign ${scope.externalCampaignId} was not found for this provider account.`);
  }

  return { campaigns, adGroups, ads, performance };
}

export async function syncProviderConnectionDatasetAction(formData: FormData) {
  if (!isDemoMutationAllowed()) return;

  const cookieStore = await cookies();
  const accountUserId = verifyAccountSessionToken(cookieStore.get(ACCOUNT_SESSION_COOKIE)?.value)?.userId ?? null;
  if (!accountUserId) return;

  const connectionId = optionalString(formData.get("connectionId"));
  if (!connectionId) return;

  const connection = await db.adAccountConnection.findFirst({
    where: {
      id: connectionId,
      OR: [{ accountUserId }, { accountUserId: null }]
    },
    select: {
      id: true,
      provider: true,
      externalAccountId: true,
      accountName: true
    }
  });
  if (!connection) return;

  const connector = connectorForProvider(connection.provider, accountUserId);
  if (!connector) return;

  const providerLabel = connection.provider === "meta_ads" ? "Meta Ads" : "Google Ads";
  const applyAfterSync = optionalString(formData.get("applyAfterSync")) === "1";
  const scope = {
    externalCampaignId: optionalString(formData.get("externalCampaignId")),
    externalAdGroupId: optionalString(formData.get("externalAdGroupId")) ?? optionalString(formData.get("externalAdSetId"))
  };
  const hasSelectedScope = Boolean(scope.externalCampaignId);
  let bundle: ProviderSnapshotBundle;
  try {
    bundle = await fetchProviderSnapshot(connector, connection.externalAccountId, scope);
  } catch (error) {
    revalidatePath(`/acquisition/connections/${connection.id}`);
    redirect(`/acquisition/connections/${connection.id}?syncError=${syncErrorReason(error)}`);
  }
  const normalized = normalizeProviderBundle({ provider: connection.provider, providerLabel, bundle });
  const rowCounts = {
    campaigns: normalized.campaigns.length,
    audiences: normalized.audiences.length,
    creatives: normalized.creatives.length,
    performance: normalized.performance.length
  };
  const syncedAt = new Date().toISOString();
  const dataset = await createWorkspaceDatasetSnapshot({
    app: "acquisition",
    sourceType: connection.provider,
    name: `${providerLabel} ${hasSelectedScope ? "selected scope" : "account"} sync · ${connection.externalAccountId}`,
    accountUserId,
    rowCounts,
    rowData: {
      source: {
        account: {
          provider: connection.provider,
          externalAccountId: connection.externalAccountId,
          accountName: connection.accountName
        },
        campaigns: bundle.campaigns,
        adGroups: bundle.adGroups,
        ads: bundle.ads,
        performance: bundle.performance
      },
      normalized
    },
    metadata: {
      provider: connection.provider,
      externalAccountId: connection.externalAccountId,
      externalCampaignId: scope.externalCampaignId,
      externalAdGroupId: scope.externalAdGroupId,
      connectionId: connection.id,
      syncScope: hasSelectedScope ? "selected_provider_scope" : "provider_account",
      syncedAt,
      sourceMetadata: {
        sourceFlow: "provider_oauth_sync",
        provider: connection.provider,
        externalAccountId: connection.externalAccountId,
        externalCampaignId: scope.externalCampaignId,
        externalAdGroupId: scope.externalAdGroupId,
        syncScope: hasSelectedScope ? "selected_provider_scope" : "provider_account"
      },
      providerRowCounts: {
        campaigns: bundle.campaigns.length,
        adGroups: bundle.adGroups.length,
        ads: bundle.ads.length,
        performanceSeries: bundle.performance.length,
        performancePoints: bundle.performance.reduce((sum, item) => sum + item.daily.length, 0)
      }
    }
  });

  if (dataset && applyAfterSync) {
    await applyAcquisitionDatasetSnapshot(dataset.id, accountUserId);
  }

  await db.adAccountConnection.update({
    where: { id: connection.id },
    data: { lastFetchedAt: new Date() }
  });

  revalidatePath("/workspace/datasets");
  revalidatePath("/demo/datasets");
  revalidatePath("/workspace/activity");
  revalidatePath("/demo/activity");
  revalidatePath("/acquisition/inputs");
  revalidatePath("/acquisition/overview");
  revalidatePath("/acquisition/simulations");
  revalidatePath("/acquisition/outputs");
  revalidatePath("/acquisition/campaigns");
  revalidatePath(`/acquisition/connections/${connection.id}`);
  if (dataset) {
    redirect(providerConnectionSyncRedirectUrl({ connectionId: connection.id, datasetId: dataset.id, applied: applyAfterSync, scope }));
  }
  redirect(`/acquisition/connections/${connection.id}?syncError=snapshot_failed`);
}

export async function requestProviderWriteDryRunApprovalAction(formData: FormData) {
  const cookieStore = await cookies();
  const accountUserId = verifyAccountSessionToken(cookieStore.get(ACCOUNT_SESSION_COOKIE)?.value)?.userId ?? null;
  if (!accountUserId) return;

  const connectionId = optionalString(formData.get("connectionId"));
  const provider = optionalString(formData.get("provider"));
  const externalAccountId = optionalString(formData.get("externalAccountId"));
  const externalCampaignId = optionalString(formData.get("externalCampaignId"));
  if (!connectionId || !provider || !externalAccountId || !externalCampaignId) return;

  const connection = await db.adAccountConnection.findFirst({
    where: {
      id: connectionId,
      provider,
      externalAccountId,
      OR: [{ accountUserId }, { accountUserId: null }]
    },
    select: { id: true, credentialGrant: true }
  });
  if (!connection) return;

  const workspace = await getDefaultWorkspace();
  const externalAdGroupId = optionalString(formData.get("externalAdGroupId"));
  const externalAdSetId = optionalString(formData.get("externalAdSetId"));
  const preflight = buildProviderWritePreflight({
    provider,
    externalAccountId,
    externalCampaignId,
    externalAdGroupId,
    externalAdSetId,
    credentialGrant: connection.credentialGrant,
    providerObjectSelected: true,
    approvalPolicyConfigured: true,
    dryRunAdapterAvailable: acquisitionProviderDryRunAdapterAvailable(),
    measurementConfigured: Boolean(process.env.ACQUISITION_PROVIDER_MEASUREMENT_READY?.trim())
  });
  if (!preflight.readyForApproval) {
    revalidatePath(`/acquisition/connections/${connectionId}`);
    redirect(`/acquisition/connections/${connectionId}?preflight=blocked`);
  }

  const context = buildProviderWriteApprovalContext({
    provider,
    externalAccountId,
    externalCampaignId,
    campaignName: optionalString(formData.get("campaignName")),
    externalAdGroupId,
    externalAdSetId,
    operationType: optionalString(formData.get("operationType")),
    spendExposureCents: numericCents(formData.get("spendExposureCents"))
  });

  const existing = await db.agentApprovalRequest.findFirst({
    where: {
      workspaceId: workspace.id,
      requestedByAccountUserId: accountUserId,
      app: "acquisition",
      actionType: context.actionType,
      status: { in: ["pending", "escalated"] },
      proposedAction: {
        path: ["externalCampaignId"],
        equals: externalCampaignId
      }
    },
    select: { id: true }
  });

  const approval = existing ?? await createAgentApprovalRequest({
    workspaceId: workspace.id,
    requestedByAccountUserId: accountUserId,
    app: "acquisition",
    actionType: context.actionType,
    riskLevel: context.riskLevel,
    title: context.title,
    summary: context.summary,
    proposedAction: context.proposedAction,
    approvalPolicy: context.approvalPolicy,
    requiredApproverRole: context.requiredApproverRole,
    dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  });

  revalidatePath("/workspace/agents");
  revalidatePath("/demo/agents");
  revalidatePath(`/acquisition/connections/${connectionId}`);
  redirect(`/workspace/agents?approvalId=${approval.id}`);
}
