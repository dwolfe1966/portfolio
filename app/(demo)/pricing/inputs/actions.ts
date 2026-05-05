"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ACCOUNT_SESSION_COOKIE, verifyAccountSessionToken } from "@/lib/account-session";
import { db } from "@/lib/db";
import { isDemoMutationAllowed } from "@/lib/env-guard";
import {
  validatePricingExperimentInput,
  validatePricingSegmentInput,
  validatePricingVariantInput
} from "@/lib/pricing-engine";

type PricingSnapshotRows = {
  source?: unknown;
  normalized: {
    segments: unknown[];
    variants: unknown[];
    experiments: unknown[];
    guardrails?: unknown[];
  };
};

function clean(value: unknown, max = 180) {
  return String(value ?? "").trim().slice(0, max);
}

function isPricingSnapshotRows(value: unknown): value is PricingSnapshotRows {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const normalized = (value as Record<string, unknown>).normalized;
  if (!normalized || typeof normalized !== "object" || Array.isArray(normalized)) return false;
  const record = normalized as Record<string, unknown>;
  return Array.isArray(record.segments)
    && Array.isArray(record.variants)
    && Array.isArray(record.experiments);
}

export async function applyPricingDatasetSnapshotAction(formData: FormData) {
  if (!isDemoMutationAllowed()) redirect("/pricing/inputs?datasetError=mutations-disabled");

  const datasetId = clean(formData.get("datasetId"), 120);
  if (!datasetId) redirect("/pricing/inputs?datasetError=missing-dataset");

  const cookieStore = await cookies();
  const session = verifyAccountSessionToken(cookieStore.get(ACCOUNT_SESSION_COOKIE)?.value);
  const dataset = await db.workspaceDataset.findFirst({
    where: {
      id: datasetId,
      app: "pricing",
      OR: session
        ? [{ accountUserId: session.userId }, { accountUserId: null }]
        : [{ accountUserId: null }]
    }
  });

  if (!dataset || !isPricingSnapshotRows(dataset.rowData)) {
    redirect("/pricing/inputs?datasetError=dataset-not-found");
  }

  const normalized = dataset.rowData.normalized;
  await db.$transaction(async (tx) => {
    await tx.pricingAuditLog.deleteMany();
    await tx.pricingDecision.deleteMany();
    await tx.pricingSegmentResult.deleteMany();
    await tx.pricingExperimentRun.deleteMany();
    await tx.pricingExperimentVariant.deleteMany();
    await tx.pricingExperimentSegment.deleteMany();
    await tx.pricingExperiment.deleteMany();
    await tx.pricingVariant.deleteMany();
    await tx.pricingSegment.deleteMany();

    const segmentIds: string[] = [];
    const variantIds: string[] = [];

    for (const input of normalized.segments) {
      const parsed = validatePricingSegmentInput(input);
      if (!parsed.ok) continue;
      const segment = await tx.pricingSegment.create({ data: parsed.value });
      segmentIds.push(segment.id);
    }

    for (const input of normalized.variants) {
      const parsed = validatePricingVariantInput(input);
      if (!parsed.ok) continue;
      const variant = await tx.pricingVariant.create({ data: parsed.value });
      variantIds.push(variant.id);
    }

    const controlVariantId = variantIds[0];
    const treatmentVariantIds = variantIds.slice(1);
    if (!controlVariantId || treatmentVariantIds.length === 0 || segmentIds.length === 0) return;

    for (const input of normalized.experiments) {
      const parsed = validatePricingExperimentInput({
        ...(input as Record<string, unknown>),
        segmentIds,
        controlVariantId,
        treatmentVariantIds
      });
      if (!parsed.ok) continue;
      const { segmentIds: linkedSegmentIds, controlVariantId: controlId, treatmentVariantIds: treatmentIds, ...experimentData } = parsed.value;
      const experiment = await tx.pricingExperiment.create({ data: experimentData });
      await tx.pricingExperimentSegment.createMany({
        data: linkedSegmentIds.map((segmentId) => ({ experimentId: experiment.id, segmentId })),
        skipDuplicates: true
      });
      await tx.pricingExperimentVariant.create({
        data: { experimentId: experiment.id, variantId: controlId, role: "control" }
      });
      await tx.pricingExperimentVariant.createMany({
        data: treatmentIds.map((variantId) => ({ experimentId: experiment.id, variantId, role: "treatment" })),
        skipDuplicates: true
      });
    }

    await tx.pricingAuditLog.create({
      data: {
        actor: "workspace-dataset-selector",
        action: "pricing_dataset_applied",
        detail: `Applied persisted pricing dataset: ${dataset.name}.`,
        metadata: {
          datasetId: dataset.id,
          sourceType: dataset.sourceType,
          rowCounts: dataset.rowCounts
        }
      }
    });
  });

  revalidatePath("/pricing/inputs");
  revalidatePath("/pricing/overview");
  revalidatePath("/pricing/simulations");
  revalidatePath("/pricing/outputs");
  redirect(`/pricing/inputs?datasetApplied=${encodeURIComponent(dataset.id)}`);
}
