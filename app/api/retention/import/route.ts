import { Prisma } from "@prisma/client";
import { apiCompatibilityError, apiError, apiOk, apiUnhandledError } from "@/lib/api-contract";
import { db } from "@/lib/db";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { isDemoMutationAllowed } from "@/lib/env-guard";
import { createEventId } from "@/lib/logging";
import { createWorkspaceDatasetSnapshot } from "@/lib/workspace-dataset-snapshots";
import {
  validateRetentionAccountInput,
  validateRetentionPlaybookInput,
  validateRetentionPolicyInput
} from "@/lib/retention-engine";

type CsvRow = Record<string, unknown>;

type RetentionImportPayload = {
  sourceName?: unknown;
  sourceMetadata?: unknown;
  accounts?: CsvRow[];
  playbooks?: CsvRow[];
  policy?: CsvRow[];
};

function clean(value: unknown, max = 180) {
  return String(value ?? "").trim().slice(0, max);
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

function validatePayload(payload: RetentionImportPayload) {
  const errors: string[] = [];
  const rows = {
    accounts: readRows(payload.accounts, 1000),
    playbooks: readRows(payload.playbooks, 100),
    policy: readRows(payload.policy, 20)
  };

  if (rows.accounts.length === 0) errors.push("At least one retention account row is required.");
  if (rows.playbooks.length === 0) errors.push("At least one retention playbook row is required.");
  if (rows.policy.length === 0) errors.push("At least one retention policy row is required.");

  const accountInputs = rows.accounts.map((row) => ({
    name: row.name,
    segment: row.segment,
    mrrCents: dollarsToCents(row.MRR),
    usageScore: row.usageScore,
    supportTicketCount: row.supportTicketCount,
    npsScore: row.npsScore,
    renewalDays: row.renewalDays,
    paymentRiskScore: row.paymentRiskScore,
    executiveSponsor: parseBoolean(row.executiveSponsor),
    lastTouchedDays: row.lastTouchedDays,
    healthTrend: row.healthTrend
  }));

  const playbookInputs = rows.playbooks.map((row) => ({
    name: row.name,
    riskDriver: row.riskDriver,
    saveRateLift: row.saveRateLift,
    costCents: dollarsToCents(row.cost),
    maxDiscountPct: row.maxDiscountPct,
    slaHours: row.slaHours ?? 24
  }));

  const policyInputs = rows.policy.map((row) => ({
    name: row.name,
    highRiskThreshold: row.highRiskThreshold,
    mediumRiskThreshold: row.mediumRiskThreshold,
    maxDiscountPct: row.maxDiscountPct ?? 0.1,
    minPaybackRatio: row.minPaybackRatio,
    slaHoursHighRisk: row.slaHoursHighRisk ?? 24
  }));

  accountInputs.forEach((input, index) => {
    const parsed = validateRetentionAccountInput(input);
    if (!parsed.ok) errors.push(...parsed.errors.map((error) => `accounts row ${index + 1}: ${error}`));
  });
  playbookInputs.forEach((input, index) => {
    const parsed = validateRetentionPlaybookInput(input);
    if (!parsed.ok) errors.push(...parsed.errors.map((error) => `playbooks row ${index + 1}: ${error}`));
  });
  policyInputs.forEach((input, index) => {
    const parsed = validateRetentionPolicyInput(input);
    if (!parsed.ok) errors.push(...parsed.errors.map((error) => `policy row ${index + 1}: ${error}`));
  });

  return {
    errors: errors.slice(0, 40),
    rows,
    normalized: {
      accounts: accountInputs,
      playbooks: playbookInputs,
      policy: policyInputs
    }
  };
}

export async function POST(request: Request) {
  const eventId = createEventId("retention_import");
  if (!isDemoMutationAllowed()) return apiError(403, "MUTATION_DISABLED", "Retention data import is disabled.", { eventId });

  const body = await request.json().catch(() => ({})) as RetentionImportPayload;
  const validation = validatePayload(body);
  const sourceName = clean(body.sourceName, 120) || "Retention CSV upload";
  const sourceMetadata = readSourceMetadata(body.sourceMetadata);

  if (validation.errors.length > 0) {
    return apiError(400, "VALIDATION_ERROR", "Retention import data is invalid.", {
      eventId,
      errors: validation.errors
    });
  }

  try {
    const result = await db.$transaction(async (tx) => {
      let accountsImported = 0;
      let playbooksImported = 0;
      let policiesImported = 0;

      for (const input of validation.normalized.accounts) {
        const parsed = validateRetentionAccountInput(input);
        if (!parsed.ok) continue;
        const existing = await tx.retentionAccount.findFirst({ where: { name: parsed.value.name }, select: { id: true } });
        if (existing) {
          await tx.retentionAccount.update({ where: { id: existing.id }, data: parsed.value });
        } else {
          await tx.retentionAccount.create({ data: parsed.value });
        }
        accountsImported++;
      }

      for (const input of validation.normalized.playbooks) {
        const parsed = validateRetentionPlaybookInput(input);
        if (!parsed.ok) continue;
        const existing = await tx.retentionPlaybook.findFirst({ where: { name: parsed.value.name }, select: { id: true } });
        if (existing) {
          await tx.retentionPlaybook.update({ where: { id: existing.id }, data: parsed.value });
        } else {
          await tx.retentionPlaybook.create({ data: parsed.value });
        }
        playbooksImported++;
      }

      for (const input of validation.normalized.policy) {
        const parsed = validateRetentionPolicyInput(input);
        if (!parsed.ok) continue;
        const existing = await tx.retentionPolicy.findFirst({ where: { name: parsed.value.name }, select: { id: true } });
        if (existing) {
          await tx.retentionPolicy.update({ where: { id: existing.id }, data: parsed.value });
        } else {
          await tx.retentionPolicy.create({ data: parsed.value });
        }
        policiesImported++;
      }

      await tx.retentionAuditLog.create({
        data: {
          actor: "workspace-csv-import",
          action: "retention_import",
          detail: `Imported retention dataset: ${sourceName}.`,
          metadata: {
            eventId,
            sourceName,
            sourceMetadata,
            rowCounts: {
              accounts: validation.rows.accounts.length,
              playbooks: validation.rows.playbooks.length,
              policy: validation.rows.policy.length
            }
          }
        }
      });

      return { accountsImported, playbooksImported, policiesImported };
    });

    const rowCounts = {
      accounts: validation.rows.accounts.length,
      playbooks: validation.rows.playbooks.length,
      policy: validation.rows.policy.length
    };
    const dataset = await createWorkspaceDatasetSnapshot({
      app: "retention",
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
    if (isMissingDemoTableError(error)) return apiCompatibilityError("Retention tables are missing.", { eventId });
    return apiUnhandledError(error, eventId);
  }
}
