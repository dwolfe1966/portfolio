"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ACCOUNT_SESSION_COOKIE, verifyAccountSessionToken } from "@/lib/account-session";
import { recordImportedDataSourceSelection } from "@/lib/app-data-source-selection";
import {
  validateAdvertiserInput,
  validateBidInput,
  validateSlotInput
} from "@/lib/auction-engine";
import { db } from "@/lib/db";
import { isDemoMutationAllowed } from "@/lib/env-guard";

type AuctionSnapshotRows = {
  source?: unknown;
  normalized: {
    advertisers: unknown[];
    slots: unknown[];
    bids: unknown[];
  };
};

type NormalizedBid = {
  advertiserName?: unknown;
  slotName?: unknown;
  bidCents?: unknown;
};

function clean(value: unknown, max = 180) {
  return String(value ?? "").trim().slice(0, max);
}

function isAuctionSnapshotRows(value: unknown): value is AuctionSnapshotRows {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const normalized = (value as Record<string, unknown>).normalized;
  if (!normalized || typeof normalized !== "object" || Array.isArray(normalized)) return false;
  const record = normalized as Record<string, unknown>;
  return Array.isArray(record.advertisers)
    && Array.isArray(record.slots)
    && Array.isArray(record.bids);
}

export async function applyAuctionDatasetSnapshotAction(formData: FormData) {
  if (!isDemoMutationAllowed()) redirect("/auction/inputs?datasetError=mutations-disabled");

  const datasetId = clean(formData.get("datasetId"), 120);
  if (!datasetId) redirect("/auction/inputs?datasetError=missing-dataset");

  const cookieStore = await cookies();
  const session = verifyAccountSessionToken(cookieStore.get(ACCOUNT_SESSION_COOKIE)?.value);
  const dataset = await db.workspaceDataset.findFirst({
    where: {
      id: datasetId,
      app: "auction",
      OR: session
        ? [{ accountUserId: session.userId }, { accountUserId: null }]
        : [{ accountUserId: null }]
    }
  });

  if (!dataset || !isAuctionSnapshotRows(dataset.rowData)) {
    redirect("/auction/inputs?datasetError=dataset-not-found");
  }

  const normalized = dataset.rowData.normalized;
  await db.$transaction(async (tx) => {
    await tx.auctionAuditLog.deleteMany();
    await tx.auctionAdvertiserSpend.deleteMany();
    await tx.auctionResultRow.deleteMany();
    await tx.auctionResult.deleteMany();
    await tx.auctionRun.deleteMany();
    await tx.auctionBid.deleteMany();
    await tx.auctionAdvertiser.deleteMany();
    await tx.auctionSlot.deleteMany();

    const advertiserIdsByName = new Map<string, string>();
    const slotIdsByName = new Map<string, string>();
    let advertisersApplied = 0;
    let slotsApplied = 0;
    let bidsApplied = 0;

    for (const input of normalized.advertisers) {
      const parsed = validateAdvertiserInput(input);
      if (!parsed.ok) continue;
      const advertiser = await tx.auctionAdvertiser.create({ data: parsed.value });
      advertiserIdsByName.set(advertiser.name.toLowerCase(), advertiser.id);
      advertisersApplied++;
    }

    for (const input of normalized.slots) {
      const parsed = validateSlotInput(input);
      if (!parsed.ok) continue;
      const slot = await tx.auctionSlot.create({ data: parsed.value });
      slotIdsByName.set(slot.name.toLowerCase(), slot.id);
      slotsApplied++;
    }

    for (const input of normalized.bids as NormalizedBid[]) {
      const advertiserId = advertiserIdsByName.get(clean(input.advertiserName, 100).toLowerCase());
      const slotId = slotIdsByName.get(clean(input.slotName, 100).toLowerCase());
      if (!advertiserId || !slotId) continue;
      const parsed = validateBidInput({ advertiserId, slotId, bidCents: input.bidCents });
      if (!parsed.ok) continue;
      await tx.auctionBid.create({ data: parsed.value });
      bidsApplied++;
    }

    await tx.auctionAuditLog.create({
      data: {
        actor: "workspace-dataset-selector",
        action: "auction_dataset_applied",
        metadata: {
          datasetId: dataset.id,
          sourceName: dataset.name,
          sourceType: dataset.sourceType,
          rowCounts: dataset.rowCounts,
          applied: { advertisersApplied, slotsApplied, bidsApplied }
        }
      }
    });
  });

  await recordImportedDataSourceSelection("auction", dataset, session?.userId);

  revalidatePath("/auction/inputs");
  revalidatePath("/auction/overview");
  revalidatePath("/auction/simulations");
  revalidatePath("/auction/outputs");
  revalidatePath("/auction/health");
  redirect(`/auction/inputs?datasetApplied=${encodeURIComponent(dataset.id)}`);
}
