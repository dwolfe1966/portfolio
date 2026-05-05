import { apiCompatibilityError, apiError, apiOk, apiUnhandledError } from "@/lib/api-contract";
import { validateAdvertiserInput, validateBidInput, validateSlotInput } from "@/lib/auction-engine";
import { db } from "@/lib/db";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { isDemoMutationAllowed } from "@/lib/env-guard";
import { createEventId } from "@/lib/logging";
import { createWorkspaceDatasetSnapshot } from "@/lib/workspace-dataset-snapshots";

type CsvRow = Record<string, unknown>;

type AuctionImportPayload = {
  sourceName?: unknown;
  sourceMetadata?: unknown;
  advertisers?: CsvRow[];
  slots?: CsvRow[];
  bids?: CsvRow[];
  reserveSettings?: CsvRow[];
};

function clean(value: unknown, max = 180) {
  return String(value ?? "").trim().slice(0, max);
}

function dollarsToCents(value: unknown) {
  return Math.round(Number(value) * 100);
}

function readRows(value: unknown, maxRows: number) {
  return Array.isArray(value) ? value.slice(0, maxRows) as CsvRow[] : [];
}

function readSourceMetadata(value: unknown) {
  if (!value || typeof value !== "object") return undefined;
  return JSON.parse(JSON.stringify(value));
}

function validatePayload(payload: AuctionImportPayload) {
  const errors: string[] = [];
  const rows = {
    advertisers: readRows(payload.advertisers, 500),
    slots: readRows(payload.slots, 250),
    bids: readRows(payload.bids, 2000),
    reserveSettings: readRows(payload.reserveSettings, 20)
  };

  if (rows.advertisers.length === 0) errors.push("At least one auction advertiser row is required.");
  if (rows.slots.length === 0) errors.push("At least one auction slot row is required.");
  if (rows.bids.length === 0) errors.push("At least one auction bid row is required.");

  const advertisers = rows.advertisers.map((row) => ({
    name: row.name,
    qualityScore: row.qualityScore,
    dailyBudgetCents: dollarsToCents(row.dailyBudget),
    behaviorMode: row.behaviorMode,
    targetCacCents: clean(row.targetCAC) ? dollarsToCents(row.targetCAC) : null,
    smoothingFactor: row.smoothingFactor
  }));

  const slots = rows.slots.map((row) => ({
    name: row.name,
    reservePriceCents: dollarsToCents(row.reservePrice),
    expectedDailyVolume: row.expectedDailyVolume
  }));

  const bids = rows.bids.map((row) => ({
    advertiserName: clean(row.advertiserName, 100),
    slotName: clean(row.slotName, 100),
    bidCents: dollarsToCents(row.bid)
  }));

  advertisers.forEach((input, index) => {
    const parsed = validateAdvertiserInput(input);
    if (!parsed.ok) errors.push(...parsed.errors.map((error) => `advertisers row ${index + 1}: ${error}`));
  });
  slots.forEach((input, index) => {
    const parsed = validateSlotInput(input);
    if (!parsed.ok) errors.push(...parsed.errors.map((error) => `slots row ${index + 1}: ${error}`));
  });
  bids.forEach((input, index) => {
    const label = `bids row ${index + 1}`;
    if (!input.advertiserName) errors.push(`${label}: advertiserName is required.`);
    if (!input.slotName) errors.push(`${label}: slotName is required.`);
    if (!Number.isFinite(input.bidCents) || input.bidCents < 0 || input.bidCents > 1_000_000) {
      errors.push(`${label}: bid must be between $0 and $10,000.`);
    }
  });

  return {
    errors: errors.slice(0, 40),
    rows,
    normalized: { advertisers, slots, bids }
  };
}

export async function POST(request: Request) {
  const eventId = createEventId("auction_import");
  if (!isDemoMutationAllowed()) return apiError(403, "MUTATION_DISABLED", "Auction data import is disabled.", { eventId });

  const body = await request.json().catch(() => ({})) as AuctionImportPayload;
  const validation = validatePayload(body);
  const sourceName = clean(body.sourceName, 120) || "Auction CSV upload";
  const sourceMetadata = readSourceMetadata(body.sourceMetadata);

  if (validation.errors.length > 0) {
    return apiError(400, "VALIDATION_ERROR", "Auction import data is invalid.", {
      eventId,
      errors: validation.errors
    });
  }

  try {
    const result = await db.$transaction(async (tx) => {
      const advertiserIdsByName = new Map<string, string>();
      const slotIdsByName = new Map<string, string>();
      let advertisersImported = 0;
      let slotsImported = 0;
      let bidsImported = 0;

      for (const input of validation.normalized.advertisers) {
        const parsed = validateAdvertiserInput(input);
        if (!parsed.ok) continue;
        const existing = await tx.auctionAdvertiser.findFirst({ where: { name: parsed.value.name }, select: { id: true } });
        const advertiser = existing
          ? await tx.auctionAdvertiser.update({ where: { id: existing.id }, data: parsed.value })
          : await tx.auctionAdvertiser.create({ data: parsed.value });
        advertiserIdsByName.set(advertiser.name.toLowerCase(), advertiser.id);
        advertisersImported++;
      }

      for (const input of validation.normalized.slots) {
        const parsed = validateSlotInput(input);
        if (!parsed.ok) continue;
        const existing = await tx.auctionSlot.findFirst({ where: { name: parsed.value.name }, select: { id: true } });
        const slot = existing
          ? await tx.auctionSlot.update({ where: { id: existing.id }, data: parsed.value })
          : await tx.auctionSlot.create({ data: parsed.value });
        slotIdsByName.set(slot.name.toLowerCase(), slot.id);
        slotsImported++;
      }

      for (const row of validation.normalized.bids) {
        const advertiserId = advertiserIdsByName.get(row.advertiserName.toLowerCase());
        const slotId = slotIdsByName.get(row.slotName.toLowerCase());
        if (!advertiserId || !slotId) continue;
        const parsed = validateBidInput({ advertiserId, slotId, bidCents: row.bidCents });
        if (!parsed.ok) continue;
        await tx.auctionBid.upsert({
          where: {
            advertiserId_slotId: {
              advertiserId,
              slotId
            }
          },
          create: parsed.value,
          update: { bidCents: parsed.value.bidCents }
        });
        bidsImported++;
      }

      await tx.auctionAuditLog.create({
        data: {
          actor: "workspace-csv-import",
          action: "auction_import",
          metadata: {
            eventId,
            sourceName,
            sourceMetadata,
            rowCounts: {
              advertisers: validation.rows.advertisers.length,
              slots: validation.rows.slots.length,
              bids: validation.rows.bids.length,
              reserveSettings: validation.rows.reserveSettings.length
            }
          }
        }
      });

      return { advertisersImported, slotsImported, bidsImported, reserveSettingsImported: validation.rows.reserveSettings.length };
    });

    const rowCounts = {
      advertisers: validation.rows.advertisers.length,
      slots: validation.rows.slots.length,
      bids: validation.rows.bids.length,
      reserveSettings: validation.rows.reserveSettings.length
    };
    const dataset = await createWorkspaceDatasetSnapshot({
      app: "auction",
      sourceType: "csv",
      name: sourceName,
      rowData: {
        source: validation.rows,
        normalized: validation.normalized
      },
      rowCounts,
      metadata: {
        eventId,
        sourceMetadata,
        imported: result
      },
      cookieHeader: request.headers.get("cookie")
    });

    return apiOk({ eventId, import: { datasetId: dataset?.id ?? null, ...result } });
  } catch (error) {
    if (isMissingDemoTableError(error)) return apiCompatibilityError("Auction tables are missing.", { eventId });
    return apiUnhandledError(error, eventId);
  }
}
