import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiCompatibilityError, apiError, apiOk, apiUnhandledError } from "@/lib/api-contract";
import { isMissingDemoTableError } from "@/lib/demo-db-errors";
import { isDemoMutationAllowed } from "@/lib/env-guard";
import { createEventId } from "@/lib/logging";
import { simulatePricingExperiment, validatePricingScenarioInput, type PricingRiskBand } from "@/lib/pricing-engine";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const eventId = createEventId("price_sim_post");
  if (!isDemoMutationAllowed()) return apiError(403, "MUTATION_DISABLED", "Pricing simulations are disabled.", { eventId });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const experiment = await db.pricingExperiment.findUnique({
      where: { id },
      include: {
        segments: { include: { segment: true } },
        variants: { include: { variant: true } }
      }
    });
    if (!experiment) return apiError(404, "NOT_FOUND", "Pricing experiment not found.", { eventId });
    const control = experiment.variants.find((v) => v.role === "control")?.variant;
    const treatments = experiment.variants.filter((v) => v.role === "treatment").map((v) => v.variant);
    if (!control || treatments.length === 0 || experiment.segments.length === 0) {
      return apiError(400, "INCOMPLETE_EXPERIMENT", "Experiment needs segments, control, and treatment variants.", { eventId });
    }
    const simulation = simulatePricingExperiment(
      {
        id: experiment.id,
        holdoutPercent: experiment.holdoutPercent,
        minimumSampleSize: experiment.minimumSampleSize,
        minGrossMarginPercent: experiment.minGrossMarginPercent,
        maxChurnDeltaPercent: experiment.maxChurnDeltaPercent,
        maxSupportLoadDelta: experiment.maxSupportLoadDelta,
        minConfidence: experiment.minConfidence
      },
      experiment.segments.map(({ segment }) => ({
        id: segment.id,
        name: segment.name,
        baselineConversionRate: segment.baselineConversionRate,
        baselineChurnRate: segment.baselineChurnRate,
        baselineArpuCents: segment.baselineArpuCents,
        grossMarginPercent: segment.grossMarginPercent,
        monthlyVolume: segment.monthlyVolume,
        riskBand: segment.riskBand as PricingRiskBand
      })),
      {
        id: control.id,
        name: control.name,
        monthlyPriceCents: control.monthlyPriceCents,
        marginImpactPercent: control.marginImpactPercent,
        expectedSupportLoadDelta: control.expectedSupportLoadDelta
      },
      treatments.map((variant) => ({
        id: variant.id,
        name: variant.name,
        monthlyPriceCents: variant.monthlyPriceCents,
        marginImpactPercent: variant.marginImpactPercent,
        expectedSupportLoadDelta: variant.expectedSupportLoadDelta
      })),
      validatePricingScenarioInput(body)
    );
    const run = await db.$transaction(async (tx) => {
      const created = await tx.pricingExperimentRun.create({
        data: {
          experimentId: experiment.id,
          arpuLiftPercent: simulation.arpuLiftPercent,
          conversionDeltaPercent: simulation.conversionDeltaPercent,
          churnDeltaPercent: simulation.churnDeltaPercent,
          grossMarginPercent: simulation.grossMarginPercent,
          netRevenueLiftCents: simulation.netRevenueLiftCents,
          supportLoadDelta: simulation.supportLoadDelta,
          confidence: simulation.confidence,
          holdoutHealth: simulation.holdoutHealth,
          recommendation: simulation.recommendation
        }
      });
      await tx.pricingSegmentResult.createMany({
        data: simulation.segmentResults.map((row) => ({ ...row, runId: created.id }))
      });
      await tx.pricingAuditLog.create({
        data: {
          experimentId: experiment.id,
          actor: "demo-operator",
          action: "simulation_run",
          detail: `Simulation completed with recommendation ${simulation.recommendation}.`,
          metadata: { eventId, recommendation: simulation.recommendation }
        }
      });
      return created;
    });
    return apiOk({ run, simulation, eventId });
  } catch (error) {
    if (isMissingDemoTableError(error)) return apiCompatibilityError("Pricing tables are missing.", { eventId });
    return apiUnhandledError(error, eventId);
  }
}
