CREATE TABLE "ExpansionAccount" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "segment" TEXT NOT NULL,
    "currentArrCents" INTEGER NOT NULL,
    "seatsPurchased" INTEGER NOT NULL,
    "seatsActive" INTEGER NOT NULL,
    "usageGrowthRate" DOUBLE PRECISION NOT NULL,
    "productQualifiedScore" DOUBLE PRECISION NOT NULL,
    "supportHealthScore" DOUBLE PRECISION NOT NULL,
    "renewalDays" INTEGER NOT NULL,
    "executiveSponsor" BOOLEAN NOT NULL DEFAULT false,
    "openExpansionSignals" INTEGER NOT NULL,
    "trend" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ExpansionAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExpansionOffer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "motion" TEXT NOT NULL,
    "targetSegment" TEXT NOT NULL,
    "expectedLiftPercent" DOUBLE PRECISION NOT NULL,
    "costCents" INTEGER NOT NULL,
    "marginPercent" DOUBLE PRECISION NOT NULL,
    "slaDays" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ExpansionOffer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExpansionPolicy" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "highReadinessThreshold" DOUBLE PRECISION NOT NULL,
    "mediumReadinessThreshold" DOUBLE PRECISION NOT NULL,
    "minMarginPercent" DOUBLE PRECISION NOT NULL,
    "minPaybackRatio" DOUBLE PRECISION NOT NULL,
    "maxSlaDays" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ExpansionPolicy_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExpansionRun" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "averageReadinessScore" DOUBLE PRECISION NOT NULL,
    "highReadinessAccounts" INTEGER NOT NULL,
    "pipelineArrCents" INTEGER NOT NULL,
    "expectedExpansionArrCents" INTEGER NOT NULL,
    "averageMarginPercent" DOUBLE PRECISION NOT NULL,
    "paybackRatio" DOUBLE PRECISION NOT NULL,
    "recommendation" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExpansionRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExpansionRunRow" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "offerId" TEXT,
    "readinessScore" DOUBLE PRECISION NOT NULL,
    "readinessBand" TEXT NOT NULL,
    "primaryMotion" TEXT NOT NULL,
    "expectedExpansionArrCents" INTEGER NOT NULL,
    "pursuitCostCents" INTEGER NOT NULL,
    "paybackRatio" DOUBLE PRECISION NOT NULL,
    "marginPercent" DOUBLE PRECISION NOT NULL,
    "slaDays" INTEGER NOT NULL,
    "decision" TEXT NOT NULL,
    CONSTRAINT "ExpansionRunRow_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExpansionAuditLog" (
    "id" TEXT NOT NULL,
    "runId" TEXT,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExpansionAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ExpansionAccount_segment_idx" ON "ExpansionAccount"("segment");
CREATE INDEX "ExpansionAccount_renewalDays_idx" ON "ExpansionAccount"("renewalDays");
CREATE INDEX "ExpansionOffer_motion_idx" ON "ExpansionOffer"("motion");
CREATE INDEX "ExpansionOffer_targetSegment_idx" ON "ExpansionOffer"("targetSegment");
CREATE INDEX "ExpansionRun_policyId_createdAt_idx" ON "ExpansionRun"("policyId", "createdAt");
CREATE INDEX "ExpansionRun_recommendation_createdAt_idx" ON "ExpansionRun"("recommendation", "createdAt");
CREATE INDEX "ExpansionRunRow_runId_idx" ON "ExpansionRunRow"("runId");
CREATE INDEX "ExpansionRunRow_accountId_idx" ON "ExpansionRunRow"("accountId");
CREATE INDEX "ExpansionRunRow_offerId_idx" ON "ExpansionRunRow"("offerId");
CREATE INDEX "ExpansionRunRow_readinessBand_readinessScore_idx" ON "ExpansionRunRow"("readinessBand", "readinessScore");
CREATE INDEX "ExpansionRunRow_decision_idx" ON "ExpansionRunRow"("decision");
CREATE INDEX "ExpansionAuditLog_runId_createdAt_idx" ON "ExpansionAuditLog"("runId", "createdAt");
CREATE INDEX "ExpansionAuditLog_action_createdAt_idx" ON "ExpansionAuditLog"("action", "createdAt");

ALTER TABLE "ExpansionRun" ADD CONSTRAINT "ExpansionRun_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "ExpansionPolicy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExpansionRunRow" ADD CONSTRAINT "ExpansionRunRow_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ExpansionRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExpansionRunRow" ADD CONSTRAINT "ExpansionRunRow_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "ExpansionAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExpansionRunRow" ADD CONSTRAINT "ExpansionRunRow_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "ExpansionOffer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ExpansionAuditLog" ADD CONSTRAINT "ExpansionAuditLog_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ExpansionRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
