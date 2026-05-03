CREATE TABLE "PricingSegment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "eligibilityRule" TEXT NOT NULL,
    "baselineConversionRate" DOUBLE PRECISION NOT NULL,
    "baselineChurnRate" DOUBLE PRECISION NOT NULL,
    "baselineArpuCents" INTEGER NOT NULL,
    "grossMarginPercent" DOUBLE PRECISION NOT NULL,
    "monthlyVolume" INTEGER NOT NULL,
    "riskBand" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingSegment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PricingVariant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "monthlyPriceCents" INTEGER NOT NULL,
    "annualPriceCents" INTEGER,
    "packagingChange" TEXT NOT NULL,
    "marginImpactPercent" DOUBLE PRECISION NOT NULL,
    "expectedSupportLoadDelta" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingVariant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PricingExperiment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hypothesis" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'DRAFT',
    "holdoutPercent" DOUBLE PRECISION NOT NULL,
    "minimumSampleSize" INTEGER NOT NULL,
    "minGrossMarginPercent" DOUBLE PRECISION NOT NULL,
    "maxChurnDeltaPercent" DOUBLE PRECISION NOT NULL,
    "maxSupportLoadDelta" DOUBLE PRECISION NOT NULL,
    "minConfidence" DOUBLE PRECISION NOT NULL,
    "startedAt" TIMESTAMP(3),
    "decisionDueAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingExperiment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PricingExperimentSegment" (
    "id" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "segmentId" TEXT NOT NULL,

    CONSTRAINT "PricingExperimentSegment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PricingExperimentVariant" (
    "id" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "role" TEXT NOT NULL,

    CONSTRAINT "PricingExperimentVariant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PricingExperimentRun" (
    "id" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "arpuLiftPercent" DOUBLE PRECISION NOT NULL,
    "conversionDeltaPercent" DOUBLE PRECISION NOT NULL,
    "churnDeltaPercent" DOUBLE PRECISION NOT NULL,
    "grossMarginPercent" DOUBLE PRECISION NOT NULL,
    "netRevenueLiftCents" INTEGER NOT NULL,
    "supportLoadDelta" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "holdoutHealth" TEXT NOT NULL,
    "recommendation" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PricingExperimentRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PricingSegmentResult" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "segmentId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "sampleSize" INTEGER NOT NULL,
    "conversionRate" DOUBLE PRECISION NOT NULL,
    "churnRate" DOUBLE PRECISION NOT NULL,
    "arpuCents" INTEGER NOT NULL,
    "grossMarginPercent" DOUBLE PRECISION NOT NULL,
    "netRevenueLiftCents" INTEGER NOT NULL,
    "guardrailBand" TEXT NOT NULL,

    CONSTRAINT "PricingSegmentResult_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PricingDecision" (
    "id" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PricingDecision_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PricingAuditLog" (
    "id" TEXT NOT NULL,
    "experimentId" TEXT,
    "action" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PricingAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PricingSegment_riskBand_idx" ON "PricingSegment"("riskBand");
CREATE INDEX "PricingExperiment_state_createdAt_idx" ON "PricingExperiment"("state", "createdAt");
CREATE UNIQUE INDEX "PricingExperimentSegment_experimentId_segmentId_key" ON "PricingExperimentSegment"("experimentId", "segmentId");
CREATE INDEX "PricingExperimentSegment_segmentId_idx" ON "PricingExperimentSegment"("segmentId");
CREATE UNIQUE INDEX "PricingExperimentVariant_experimentId_variantId_key" ON "PricingExperimentVariant"("experimentId", "variantId");
CREATE INDEX "PricingExperimentVariant_variantId_idx" ON "PricingExperimentVariant"("variantId");
CREATE INDEX "PricingExperimentRun_experimentId_createdAt_idx" ON "PricingExperimentRun"("experimentId", "createdAt");
CREATE INDEX "PricingExperimentRun_recommendation_createdAt_idx" ON "PricingExperimentRun"("recommendation", "createdAt");
CREATE INDEX "PricingSegmentResult_runId_idx" ON "PricingSegmentResult"("runId");
CREATE INDEX "PricingSegmentResult_segmentId_idx" ON "PricingSegmentResult"("segmentId");
CREATE INDEX "PricingSegmentResult_variantId_idx" ON "PricingSegmentResult"("variantId");
CREATE INDEX "PricingDecision_experimentId_createdAt_idx" ON "PricingDecision"("experimentId", "createdAt");
CREATE INDEX "PricingDecision_decision_createdAt_idx" ON "PricingDecision"("decision", "createdAt");
CREATE INDEX "PricingAuditLog_experimentId_createdAt_idx" ON "PricingAuditLog"("experimentId", "createdAt");
CREATE INDEX "PricingAuditLog_action_createdAt_idx" ON "PricingAuditLog"("action", "createdAt");

ALTER TABLE "PricingExperimentSegment" ADD CONSTRAINT "PricingExperimentSegment_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "PricingExperiment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PricingExperimentSegment" ADD CONSTRAINT "PricingExperimentSegment_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "PricingSegment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PricingExperimentVariant" ADD CONSTRAINT "PricingExperimentVariant_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "PricingExperiment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PricingExperimentVariant" ADD CONSTRAINT "PricingExperimentVariant_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "PricingVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PricingExperimentRun" ADD CONSTRAINT "PricingExperimentRun_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "PricingExperiment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PricingSegmentResult" ADD CONSTRAINT "PricingSegmentResult_runId_fkey" FOREIGN KEY ("runId") REFERENCES "PricingExperimentRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PricingSegmentResult" ADD CONSTRAINT "PricingSegmentResult_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "PricingSegment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PricingSegmentResult" ADD CONSTRAINT "PricingSegmentResult_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "PricingVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PricingDecision" ADD CONSTRAINT "PricingDecision_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "PricingExperiment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PricingAuditLog" ADD CONSTRAINT "PricingAuditLog_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "PricingExperiment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
