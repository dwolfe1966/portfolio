import { Prisma } from "@prisma/client";
import { apiCompatibilityError, apiError, apiOk, apiUnhandledError } from "@/lib/api-contract";
import { db } from "@/lib/db";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { isDemoMutationAllowed } from "@/lib/env-guard";
import { createEventId } from "@/lib/logging";
import { validatePricingExperimentInput, validatePricingSegmentInput, validatePricingVariantInput } from "@/lib/pricing-engine";

type CsvRow = Record<string, unknown>;

type PricingImportPayload = {
  sourceName?: unknown;
  sourceMetadata?: unknown;
  segments?: CsvRow[];
  variants?: CsvRow[];
  experiments?: CsvRow[];
  guardrails?: CsvRow[];
};

function clean(value: unknown, max = 180) {
  return String(value ?? "").trim().slice(0, max);
}

function dollarsToCents(value: unknown) {
  return Math.round(Number(value) * 100);
}

function readPercent(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function inferRiskBand(row: CsvRow) {
  const provided = clean(row.riskBand).toLowerCase();
  if (["low", "medium", "high"].includes(provided)) return provided;
  const churn = Number(row.baselineChurnRate);
  if (Number.isFinite(churn) && churn >= 0.08) return "high";
  if (Number.isFinite(churn) && churn >= 0.04) return "medium";
  return "low";
}

function readRows(value: unknown, maxRows: number) {
  return Array.isArray(value) ? value.slice(0, maxRows) as CsvRow[] : [];
}

function readSourceMetadata(value: unknown): Prisma.InputJsonValue | undefined {
  if (!value || typeof value !== "object") return undefined;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function validatePayload(payload: PricingImportPayload) {
  const errors: string[] = [];
  const rows = {
    segments: readRows(payload.segments, 500),
    variants: readRows(payload.variants, 100),
    experiments: readRows(payload.experiments, 100),
    guardrails: readRows(payload.guardrails, 250)
  };

  if (rows.segments.length === 0) errors.push("At least one pricing segment row is required.");
  if (rows.variants.length < 2) errors.push("At least two pricing variant rows are required: one control and one treatment.");
  if (rows.experiments.length === 0) errors.push("At least one pricing experiment row is required.");

  const segmentInputs = rows.segments.map((row) => ({
    name: row.name,
    eligibilityRule: row.eligibilityRule || "Imported CSV segment",
    baselineConversionRate: row.baselineConversionRate,
    baselineChurnRate: row.baselineChurnRate,
    baselineArpuCents: dollarsToCents(row.baselineARPU),
    grossMarginPercent: row.grossMarginPercent ?? 0.75,
    monthlyVolume: row.monthlyVolume,
    riskBand: inferRiskBand(row)
  }));

  const variantInputs = rows.variants.map((row) => ({
    name: row.name,
    monthlyPriceCents: dollarsToCents(row.monthlyPrice),
    annualPriceCents: clean(row.annualPrice) ? dollarsToCents(row.annualPrice) : null,
    packagingChange: row.packagingChange || "Imported CSV packaging change",
    marginImpactPercent: row.marginImpactPercent ?? 0,
    expectedSupportLoadDelta: row.expectedSupportLoadDelta ?? 0
  }));

  const guardrailByExperiment = new Map<string, CsvRow>();
  rows.guardrails.forEach((row) => {
    const experimentName = clean(row.experimentName, 120);
    if (experimentName) guardrailByExperiment.set(experimentName.toLowerCase(), row);
  });

  const experimentInputs = rows.experiments.map((row) => {
    const guardrail = guardrailByExperiment.get(clean(row.name, 120).toLowerCase()) ?? {};
    return {
      name: row.name,
      hypothesis: row.hypothesis,
      owner: row.owner || "pricing-import",
      state: "DRAFT",
      holdoutPercent: row.holdoutPercent,
      minimumSampleSize: row.minimumSampleSize,
      minGrossMarginPercent: row.minGrossMarginPercent,
      maxChurnDeltaPercent: row.maxChurnDeltaPercent,
      maxSupportLoadDelta: readPercent(guardrail.supportLoadPercent, 0.25),
      minConfidence: readPercent(row.minConfidence, 0.65),
      segmentIds: ["placeholder"],
      controlVariantId: "placeholder",
      treatmentVariantIds: ["placeholder"]
    };
  });

  segmentInputs.forEach((input, index) => {
    const parsed = validatePricingSegmentInput(input);
    if (!parsed.ok) errors.push(...parsed.errors.map((error) => `segments row ${index + 1}: ${error}`));
  });
  variantInputs.forEach((input, index) => {
    const parsed = validatePricingVariantInput(input);
    if (!parsed.ok) errors.push(...parsed.errors.map((error) => `variants row ${index + 1}: ${error}`));
  });
  experimentInputs.forEach((input, index) => {
    const parsed = validatePricingExperimentInput(input);
    if (!parsed.ok) errors.push(...parsed.errors.map((error) => `experiments row ${index + 1}: ${error}`));
  });

  return {
    errors: errors.slice(0, 40),
    rows,
    normalized: {
      segments: segmentInputs,
      variants: variantInputs,
      experiments: experimentInputs,
      guardrails: rows.guardrails
    }
  };
}

export async function POST(request: Request) {
  const eventId = createEventId("pricing_import");
  if (!isDemoMutationAllowed()) return apiError(403, "MUTATION_DISABLED", "Pricing data import is disabled.", { eventId });

  const body = await request.json().catch(() => ({})) as PricingImportPayload;
  const validation = validatePayload(body);
  const sourceName = clean(body.sourceName, 120) || "Pricing CSV upload";
  const sourceMetadata = readSourceMetadata(body.sourceMetadata);

  if (validation.errors.length > 0) {
    return apiError(400, "VALIDATION_ERROR", "Pricing import data is invalid.", {
      eventId,
      errors: validation.errors
    });
  }

  try {
    const result = await db.$transaction(async (tx) => {
      const segmentIds: string[] = [];
      const variantIds: string[] = [];
      let segmentsImported = 0;
      let variantsImported = 0;
      let experimentsImported = 0;

      for (const input of validation.normalized.segments) {
        const parsed = validatePricingSegmentInput(input);
        if (!parsed.ok) continue;
        const existing = await tx.pricingSegment.findFirst({ where: { name: parsed.value.name }, select: { id: true } });
        const segment = existing
          ? await tx.pricingSegment.update({ where: { id: existing.id }, data: parsed.value })
          : await tx.pricingSegment.create({ data: parsed.value });
        segmentIds.push(segment.id);
        segmentsImported++;
      }

      for (const input of validation.normalized.variants) {
        const parsed = validatePricingVariantInput(input);
        if (!parsed.ok) continue;
        const existing = await tx.pricingVariant.findFirst({ where: { name: parsed.value.name }, select: { id: true } });
        const variant = existing
          ? await tx.pricingVariant.update({ where: { id: existing.id }, data: parsed.value })
          : await tx.pricingVariant.create({ data: parsed.value });
        variantIds.push(variant.id);
        variantsImported++;
      }

      const controlVariantId = variantIds[0];
      const treatmentVariantIds = variantIds.slice(1);

      for (const input of validation.normalized.experiments) {
        const parsed = validatePricingExperimentInput({
          ...input,
          segmentIds,
          controlVariantId,
          treatmentVariantIds
        });
        if (!parsed.ok) continue;
        const { segmentIds: linkedSegmentIds, controlVariantId: controlId, treatmentVariantIds: treatmentIds, ...experimentData } = parsed.value;
        const existing = await tx.pricingExperiment.findFirst({ where: { name: experimentData.name }, select: { id: true } });
        const experiment = existing
          ? await tx.pricingExperiment.update({ where: { id: existing.id }, data: experimentData })
          : await tx.pricingExperiment.create({ data: experimentData });

        await tx.pricingExperimentSegment.deleteMany({ where: { experimentId: experiment.id } });
        await tx.pricingExperimentSegment.createMany({
          data: linkedSegmentIds.map((segmentId) => ({ experimentId: experiment.id, segmentId })),
          skipDuplicates: true
        });
        await tx.pricingExperimentVariant.deleteMany({ where: { experimentId: experiment.id } });
        await tx.pricingExperimentVariant.create({
          data: { experimentId: experiment.id, variantId: controlId, role: "control" }
        });
        await tx.pricingExperimentVariant.createMany({
          data: treatmentIds.map((variantId) => ({ experimentId: experiment.id, variantId, role: "treatment" })),
          skipDuplicates: true
        });
        experimentsImported++;
      }

      await tx.pricingAuditLog.create({
        data: {
          actor: "workspace-csv-import",
          action: "pricing_import",
          detail: `Imported pricing dataset: ${sourceName}.`,
          metadata: {
            eventId,
            sourceName,
            sourceMetadata,
            rowCounts: {
              segments: validation.rows.segments.length,
              variants: validation.rows.variants.length,
              experiments: validation.rows.experiments.length,
              guardrails: validation.rows.guardrails.length
            }
          }
        }
      });

      return { segmentsImported, variantsImported, experimentsImported, guardrailsImported: validation.rows.guardrails.length };
    });

    return apiOk({ eventId, import: result });
  } catch (error) {
    if (isMissingDemoTableError(error)) return apiCompatibilityError("Pricing tables are missing.", { eventId });
    return apiUnhandledError(error, eventId);
  }
}
