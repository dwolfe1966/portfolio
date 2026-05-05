"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ACCOUNT_SESSION_COOKIE, verifyAccountSessionToken } from "@/lib/account-session";
import { db } from "@/lib/db";
import { isDemoMutationAllowed } from "@/lib/env-guard";

type ExpansionSnapshotRows = {
  source?: unknown;
  normalized: {
    accounts: unknown[];
    offers: unknown[];
    policies: unknown[];
  };
};

const TRENDS = new Set(["accelerating", "steady", "softening"]);
const MOTIONS = new Set(["seat_expansion", "feature_upgrade", "usage_commit", "services_attach"]);

function clean(value: unknown, max = 180) {
  return String(value ?? "").trim().slice(0, max);
}

function num(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function bool(value: unknown) {
  return value === true || ["true", "1", "yes", "y"].includes(clean(value).toLowerCase());
}

function isExpansionSnapshotRows(value: unknown): value is ExpansionSnapshotRows {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const normalized = (value as Record<string, unknown>).normalized;
  if (!normalized || typeof normalized !== "object" || Array.isArray(normalized)) return false;
  const record = normalized as Record<string, unknown>;
  return Array.isArray(record.accounts)
    && Array.isArray(record.offers)
    && Array.isArray(record.policies);
}

function readAccount(input: unknown) {
  const row = (input ?? {}) as Record<string, unknown>;
  const trend = clean(row.trend).toLowerCase();
  const name = clean(row.name, 100);
  const segment = clean(row.segment, 60);
  const seatsPurchased = Math.max(1, Math.round(num(row.seatsPurchased, 1)));
  const seatsActive = Math.max(0, Math.round(num(row.seatsActive)));
  if (name.length < 2 || segment.length < 2 || seatsActive > seatsPurchased) return null;
  return {
    name,
    segment,
    currentArrCents: Math.max(0, Math.round(num(row.currentArrCents))),
    seatsPurchased,
    seatsActive,
    usageGrowthRate: clamp(num(row.usageGrowthRate), -1, 1),
    productQualifiedScore: clamp(num(row.productQualifiedScore), 0, 1),
    supportHealthScore: clamp(num(row.supportHealthScore), 0, 1),
    renewalDays: Math.max(0, Math.round(num(row.renewalDays))),
    executiveSponsor: bool(row.executiveSponsor),
    openExpansionSignals: Math.max(0, Math.round(num(row.openExpansionSignals))),
    trend: TRENDS.has(trend) ? trend : "steady"
  };
}

function readOffer(input: unknown) {
  const row = (input ?? {}) as Record<string, unknown>;
  const motion = clean(row.motion).toLowerCase();
  const name = clean(row.name, 100);
  const targetSegment = clean(row.targetSegment, 60);
  if (name.length < 2 || targetSegment.length < 2) return null;
  return {
    name,
    motion: MOTIONS.has(motion) ? motion : "seat_expansion",
    targetSegment,
    expectedLiftPercent: clamp(num(row.expectedLiftPercent), 0, 1),
    costCents: Math.max(0, Math.round(num(row.costCents))),
    marginPercent: clamp(num(row.marginPercent), 0, 1),
    slaDays: Math.max(1, Math.round(num(row.slaDays, 1)))
  };
}

function readPolicy(input: unknown) {
  const row = (input ?? {}) as Record<string, unknown>;
  const highReadinessThreshold = clamp(num(row.highReadinessThreshold, 0.72), 0, 1);
  const mediumReadinessThreshold = clamp(num(row.mediumReadinessThreshold, 0.5), 0, 1);
  if (mediumReadinessThreshold >= highReadinessThreshold) return null;
  return {
    name: clean(row.name, 100) || "Expansion policy",
    highReadinessThreshold,
    mediumReadinessThreshold,
    minMarginPercent: clamp(num(row.minMarginPercent, 0.65), 0, 1),
    minPaybackRatio: clamp(num(row.minPaybackRatio, 2.5), 0, 20),
    maxSlaDays: Math.max(1, Math.round(num(row.maxSlaDays, 30)))
  };
}

export async function applyExpansionDatasetSnapshotAction(formData: FormData) {
  if (!isDemoMutationAllowed()) redirect("/expansion/inputs?datasetError=mutations-disabled");

  const datasetId = clean(formData.get("datasetId"), 120);
  if (!datasetId) redirect("/expansion/inputs?datasetError=missing-dataset");

  const cookieStore = await cookies();
  const session = verifyAccountSessionToken(cookieStore.get(ACCOUNT_SESSION_COOKIE)?.value);
  const dataset = await db.workspaceDataset.findFirst({
    where: {
      id: datasetId,
      app: "expansion",
      OR: session
        ? [{ accountUserId: session.userId }, { accountUserId: null }]
        : [{ accountUserId: null }]
    }
  });

  if (!dataset || !isExpansionSnapshotRows(dataset.rowData)) {
    redirect("/expansion/inputs?datasetError=dataset-not-found");
  }

  const normalized = dataset.rowData.normalized;
  await db.$transaction(async (tx) => {
    await tx.expansionAuditLog.deleteMany();
    await tx.expansionRunRow.deleteMany();
    await tx.expansionRun.deleteMany();
    await tx.expansionPolicy.deleteMany();
    await tx.expansionOffer.deleteMany();
    await tx.expansionAccount.deleteMany();

    let accountsApplied = 0;
    let offersApplied = 0;
    let policiesApplied = 0;

    for (const input of normalized.accounts) {
      const account = readAccount(input);
      if (!account) continue;
      await tx.expansionAccount.create({ data: account });
      accountsApplied++;
    }

    for (const input of normalized.offers) {
      const offer = readOffer(input);
      if (!offer) continue;
      await tx.expansionOffer.create({ data: offer });
      offersApplied++;
    }

    for (const input of normalized.policies) {
      const policy = readPolicy(input);
      if (!policy) continue;
      await tx.expansionPolicy.create({ data: policy });
      policiesApplied++;
    }

    await tx.expansionAuditLog.create({
      data: {
        actor: "workspace-dataset-selector",
        action: "expansion_dataset_applied",
        detail: `Applied persisted expansion dataset: ${dataset.name}.`,
        metadata: {
          datasetId: dataset.id,
          sourceType: dataset.sourceType,
          rowCounts: dataset.rowCounts,
          applied: { accountsApplied, offersApplied, policiesApplied }
        }
      }
    });
  });

  revalidatePath("/expansion/inputs");
  revalidatePath("/expansion/overview");
  revalidatePath("/expansion/simulations");
  revalidatePath("/expansion/outputs");
  revalidatePath("/expansion/accounts");
  redirect(`/expansion/inputs?datasetApplied=${encodeURIComponent(dataset.id)}`);
}
