import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { apiCompatibilityError, apiError, apiOk, apiUnhandledError } from "@/lib/api-contract";
import { createEventId } from "@/lib/logging";
import { isDemoMutationAllowed } from "@/lib/env-guard";
import { validatePricingExperimentInput } from "@/lib/pricing-engine";

export async function GET() {
  const eventId = createEventId("price_exp_get");
  try {
    const experiments = await db.pricingExperiment.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        segments: { include: { segment: true } },
        variants: { include: { variant: true } },
        runs: { orderBy: { createdAt: "desc" }, take: 1 },
        decisions: { orderBy: { createdAt: "desc" }, take: 1 }
      }
    });
    return apiOk({ experiments, eventId });
  } catch (error) {
    if (isMissingDemoTableError(error)) return apiOk({ compatibilityMode: true, experiments: [], eventId });
    return apiUnhandledError(error, eventId);
  }
}

export async function POST(req: NextRequest) {
  const eventId = createEventId("price_exp_post");
  if (!isDemoMutationAllowed()) {
    return apiError(403, "MUTATION_DISABLED", "Pricing experiment edits are disabled.", { eventId });
  }
  const body = await req.json().catch(() => ({}));
  const parsed = validatePricingExperimentInput(body);
  if (!parsed.ok) {
    return apiError(400, "INVALID_INPUT", "Pricing experiment validation failed.", { errors: parsed.errors, eventId });
  }

  try {
    const { segmentIds, controlVariantId, treatmentVariantIds, ...experimentData } = parsed.value;
    const experiment = await db.$transaction(async (tx) => {
      const created = await tx.pricingExperiment.create({ data: experimentData });
      await tx.pricingExperimentSegment.createMany({
        data: segmentIds.map((segmentId) => ({ experimentId: created.id, segmentId }))
      });
      await tx.pricingExperimentVariant.create({
        data: { experimentId: created.id, variantId: controlVariantId, role: "control" }
      });
      await tx.pricingExperimentVariant.createMany({
        data: treatmentVariantIds.map((variantId) => ({ experimentId: created.id, variantId, role: "treatment" }))
      });
      await tx.pricingAuditLog.create({
        data: {
          experimentId: created.id,
          actor: experimentData.owner,
          action: "experiment_created",
          detail: "Pricing experiment created from operator input.",
          metadata: { eventId }
        }
      });
      return created;
    });
    return apiOk({ experiment, eventId });
  } catch (error) {
    if (isMissingDemoTableError(error)) return apiCompatibilityError("Pricing tables are missing.", { eventId });
    return apiUnhandledError(error, eventId);
  }
}
