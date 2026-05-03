import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { apiCompatibilityError, apiError, apiOk, apiUnhandledError } from "@/lib/api-contract";
import { createEventId } from "@/lib/logging";
import { isDemoMutationAllowed } from "@/lib/env-guard";
import { validatePricingExperimentInput } from "@/lib/pricing-engine";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const eventId = createEventId("price_exp_detail");
  const { id } = await params;
  try {
    const experiment = await db.pricingExperiment.findUnique({
      where: { id },
      include: {
        segments: { include: { segment: true } },
        variants: { include: { variant: true } },
        runs: { orderBy: { createdAt: "desc" }, include: { segmentResults: { include: { segment: true, variant: true } } } },
        decisions: { orderBy: { createdAt: "desc" } },
        auditLogs: { orderBy: { createdAt: "desc" }, take: 30 }
      }
    });
    return apiOk({ experiment, eventId });
  } catch (error) {
    if (isMissingDemoTableError(error)) return apiOk({ compatibilityMode: true, experiment: null, eventId });
    return apiUnhandledError(error, eventId);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const eventId = createEventId("price_exp_patch");
  if (!isDemoMutationAllowed()) {
    return apiError(403, "MUTATION_DISABLED", "Pricing experiment edits are disabled.", { eventId });
  }
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = validatePricingExperimentInput(body);
  if (!parsed.ok) {
    return apiError(400, "INVALID_INPUT", "Pricing experiment validation failed.", { errors: parsed.errors, eventId });
  }

  try {
    const { segmentIds, controlVariantId, treatmentVariantIds, ...experimentData } = parsed.value;
    const experiment = await db.$transaction(async (tx) => {
      const updated = await tx.pricingExperiment.update({ where: { id }, data: experimentData });
      await tx.pricingExperimentSegment.deleteMany({ where: { experimentId: id } });
      await tx.pricingExperimentVariant.deleteMany({ where: { experimentId: id } });
      await tx.pricingExperimentSegment.createMany({
        data: segmentIds.map((segmentId) => ({ experimentId: id, segmentId }))
      });
      await tx.pricingExperimentVariant.create({
        data: { experimentId: id, variantId: controlVariantId, role: "control" }
      });
      await tx.pricingExperimentVariant.createMany({
        data: treatmentVariantIds.map((variantId) => ({ experimentId: id, variantId, role: "treatment" }))
      });
      await tx.pricingAuditLog.create({
        data: {
          experimentId: id,
          actor: experimentData.owner,
          action: "experiment_updated",
          detail: "Pricing experiment inputs updated by operator.",
          metadata: { eventId }
        }
      });
      return updated;
    });
    return apiOk({ experiment, eventId });
  } catch (error) {
    if (isMissingDemoTableError(error)) return apiCompatibilityError("Pricing tables are missing.", { eventId });
    return apiUnhandledError(error, eventId);
  }
}
