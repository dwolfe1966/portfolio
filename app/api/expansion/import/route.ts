import { Prisma } from "@prisma/client";
import { apiCompatibilityError, apiError, apiOk, apiUnhandledError } from "@/lib/api-contract";
import { db } from "@/lib/db";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { isDemoMutationAllowed } from "@/lib/env-guard";
import { createEventId } from "@/lib/logging";
import { createWorkspaceDatasetSnapshot } from "@/lib/workspace-dataset-snapshots";

type CsvRow = Record<string, unknown>;

type ExpansionImportPayload = {
  sourceName?: unknown;
  sourceMetadata?: unknown;
  accounts?: CsvRow[];
  offers?: CsvRow[];
  policy?: CsvRow[];
};

const TRENDS = new Set(["accelerating", "steady", "softening"]);
const MOTIONS = new Set(["seat_expansion", "feature_upgrade", "usage_commit", "services_attach"]);

function clean(value: unknown, max = 180) {
  return String(value ?? "").trim().slice(0, max);
}

function num(value: unknown, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function dollarsToCents(value: unknown) {
  return Math.round(Number(value) * 100);
}

function parseBoolean(value: unknown) {
  const normalized = clean(value).toLowerCase();
  return ["true", "1", "yes", "y"].includes(normalized);
}

function readRows(value: unknown, maxRows: number) {
  return Array.isArray(value) ? value.slice(0, maxRows) as CsvRow[] : [];
}

function readSourceMetadata(value: unknown): Prisma.InputJsonValue | undefined {
  if (!value || typeof value !== "object") return undefined;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function normalizeAccount(row: CsvRow) {
  const trend = clean(row.trend).toLowerCase();
  return {
    name: clean(row.name, 100),
    segment: clean(row.segment, 60),
    currentArrCents: Math.max(0, dollarsToCents(row.currentARR)),
    seatsPurchased: Math.max(1, Math.round(num(row.seatsPurchased, 1))),
    seatsActive: Math.max(0, Math.round(num(row.seatsActive))),
    usageGrowthRate: clamp(num(row.usageGrowthRate), -1, 1),
    productQualifiedScore: clamp(num(row.productQualifiedScore), 0, 1),
    supportHealthScore: clamp(num(row.supportHealthScore), 0, 1),
    renewalDays: Math.max(0, Math.round(num(row.renewalDays))),
    executiveSponsor: parseBoolean(row.executiveSponsor),
    openExpansionSignals: Math.max(0, Math.round(num(row.openExpansionSignals))),
    trend: TRENDS.has(trend) ? trend : "steady"
  };
}

function normalizeOffer(row: CsvRow) {
  const motion = clean(row.motion).toLowerCase();
  return {
    name: clean(row.name, 100),
    motion: MOTIONS.has(motion) ? motion : "seat_expansion",
    targetSegment: clean(row.targetSegment, 60),
    expectedLiftPercent: clamp(num(row.expectedLiftPercent), 0, 1),
    costCents: Math.max(0, dollarsToCents(row.cost)),
    marginPercent: clamp(num(row.marginPercent), 0, 1),
    slaDays: Math.max(1, Math.round(num(row.slaDays, 1)))
  };
}

function normalizePolicy(row: CsvRow) {
  return {
    name: clean(row.name, 100) || "Expansion policy",
    highReadinessThreshold: clamp(num(row.highReadinessThreshold, 0.72), 0, 1),
    mediumReadinessThreshold: clamp(num(row.mediumReadinessThreshold, 0.5), 0, 1),
    minMarginPercent: clamp(num(row.minMarginPercent, 0.65), 0, 1),
    minPaybackRatio: clamp(num(row.minPaybackRatio, 2.5), 0, 20),
    maxSlaDays: Math.max(1, Math.round(num(row.maxSlaDays, 30)))
  };
}

function validatePayload(payload: ExpansionImportPayload) {
  const errors: string[] = [];
  const rows = {
    accounts: readRows(payload.accounts, 1000),
    offers: readRows(payload.offers, 100),
    policy: readRows(payload.policy, 20)
  };

  if (rows.accounts.length === 0) errors.push("At least one expansion account row is required.");
  if (rows.offers.length === 0) errors.push("At least one expansion offer row is required.");
  if (rows.policy.length === 0) errors.push("At least one expansion policy row is required.");

  const accounts = rows.accounts.map(normalizeAccount);
  const offers = rows.offers.map(normalizeOffer);
  const policies = rows.policy.map(normalizePolicy);

  accounts.forEach((account, index) => {
    const label = `accounts row ${index + 1}`;
    if (account.name.length < 2) errors.push(`${label}: name must be at least 2 characters.`);
    if (account.segment.length < 2) errors.push(`${label}: segment must be at least 2 characters.`);
    if (account.seatsActive > account.seatsPurchased) errors.push(`${label}: seatsActive cannot exceed seatsPurchased.`);
  });
  offers.forEach((offer, index) => {
    const label = `offers row ${index + 1}`;
    if (offer.name.length < 2) errors.push(`${label}: name must be at least 2 characters.`);
    if (offer.targetSegment.length < 2) errors.push(`${label}: targetSegment must be at least 2 characters.`);
  });
  policies.forEach((policy, index) => {
    const label = `policy row ${index + 1}`;
    if (policy.mediumReadinessThreshold >= policy.highReadinessThreshold) {
      errors.push(`${label}: mediumReadinessThreshold must be below highReadinessThreshold.`);
    }
  });

  return {
    errors: errors.slice(0, 40),
    rows,
    normalized: { accounts, offers, policies }
  };
}

export async function POST(request: Request) {
  const eventId = createEventId("expansion_import");
  if (!isDemoMutationAllowed()) return apiError(403, "MUTATION_DISABLED", "Expansion data import is disabled.", { eventId });

  const body = await request.json().catch(() => ({})) as ExpansionImportPayload;
  const validation = validatePayload(body);
  const sourceName = clean(body.sourceName, 120) || "Expansion CSV upload";
  const sourceMetadata = readSourceMetadata(body.sourceMetadata);

  if (validation.errors.length > 0) {
    return apiError(400, "VALIDATION_ERROR", "Expansion import data is invalid.", {
      eventId,
      errors: validation.errors
    });
  }

  try {
    const result = await db.$transaction(async (tx) => {
      let accountsImported = 0;
      let offersImported = 0;
      let policiesImported = 0;

      for (const account of validation.normalized.accounts) {
        const existing = await tx.expansionAccount.findFirst({ where: { name: account.name }, select: { id: true } });
        if (existing) {
          await tx.expansionAccount.update({ where: { id: existing.id }, data: account });
        } else {
          await tx.expansionAccount.create({ data: account });
        }
        accountsImported++;
      }

      for (const offer of validation.normalized.offers) {
        const existing = await tx.expansionOffer.findFirst({ where: { name: offer.name }, select: { id: true } });
        if (existing) {
          await tx.expansionOffer.update({ where: { id: existing.id }, data: offer });
        } else {
          await tx.expansionOffer.create({ data: offer });
        }
        offersImported++;
      }

      for (const policy of validation.normalized.policies) {
        const existing = await tx.expansionPolicy.findFirst({ where: { name: policy.name }, select: { id: true } });
        if (existing) {
          await tx.expansionPolicy.update({ where: { id: existing.id }, data: policy });
        } else {
          await tx.expansionPolicy.create({ data: policy });
        }
        policiesImported++;
      }

      await tx.expansionAuditLog.create({
        data: {
          actor: "workspace-csv-import",
          action: "expansion_import",
          detail: `Imported expansion dataset: ${sourceName}.`,
          metadata: {
            eventId,
            sourceName,
            sourceMetadata,
            rowCounts: {
              accounts: validation.rows.accounts.length,
              offers: validation.rows.offers.length,
              policy: validation.rows.policy.length
            }
          }
        }
      });

      return { accountsImported, offersImported, policiesImported };
    });

    const rowCounts = {
      accounts: validation.rows.accounts.length,
      offers: validation.rows.offers.length,
      policy: validation.rows.policy.length
    };
    const dataset = await createWorkspaceDatasetSnapshot({
      app: "expansion",
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
    if (isMissingDemoTableError(error)) return apiCompatibilityError("Expansion tables are missing.", { eventId });
    return apiUnhandledError(error, eventId);
  }
}
