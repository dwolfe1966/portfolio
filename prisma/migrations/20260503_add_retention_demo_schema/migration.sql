CREATE TABLE "RetentionAccount" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "segment" TEXT NOT NULL,
    "mrrCents" INTEGER NOT NULL,
    "usageScore" DOUBLE PRECISION NOT NULL,
    "supportTicketCount" INTEGER NOT NULL,
    "npsScore" INTEGER NOT NULL,
    "renewalDays" INTEGER NOT NULL,
    "paymentRiskScore" DOUBLE PRECISION NOT NULL,
    "executiveSponsor" BOOLEAN NOT NULL DEFAULT false,
    "lastTouchedDays" INTEGER NOT NULL,
    "healthTrend" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RetentionAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RetentionPlaybook" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "riskDriver" TEXT NOT NULL,
    "saveRateLift" DOUBLE PRECISION NOT NULL,
    "costCents" INTEGER NOT NULL,
    "maxDiscountPct" DOUBLE PRECISION NOT NULL,
    "slaHours" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RetentionPlaybook_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RetentionPolicy" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "highRiskThreshold" DOUBLE PRECISION NOT NULL,
    "mediumRiskThreshold" DOUBLE PRECISION NOT NULL,
    "maxDiscountPct" DOUBLE PRECISION NOT NULL,
    "minPaybackRatio" DOUBLE PRECISION NOT NULL,
    "slaHoursHighRisk" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RetentionPolicy_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RetentionRiskRun" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "averageRiskScore" DOUBLE PRECISION NOT NULL,
    "highRiskAccounts" INTEGER NOT NULL,
    "preventableChurnCents" INTEGER NOT NULL,
    "expectedSavedRevenueCents" INTEGER NOT NULL,
    "saveRate" DOUBLE PRECISION NOT NULL,
    "paybackRatio" DOUBLE PRECISION NOT NULL,
    "recommendation" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RetentionRiskRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RetentionRiskRunRow" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "playbookId" TEXT,
    "riskScore" DOUBLE PRECISION NOT NULL,
    "riskBand" TEXT NOT NULL,
    "primaryDriver" TEXT NOT NULL,
    "expectedSavedRevenueCents" INTEGER NOT NULL,
    "interventionCostCents" INTEGER NOT NULL,
    "paybackRatio" DOUBLE PRECISION NOT NULL,
    "slaHours" INTEGER NOT NULL,

    CONSTRAINT "RetentionRiskRunRow_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RetentionIntervention" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "playbookId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "owner" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3),
    "savedRevenueCents" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RetentionIntervention_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RetentionAuditLog" (
    "id" TEXT NOT NULL,
    "runId" TEXT,
    "interventionId" TEXT,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RetentionAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RetentionAccount_segment_idx" ON "RetentionAccount"("segment");
CREATE INDEX "RetentionAccount_renewalDays_idx" ON "RetentionAccount"("renewalDays");
CREATE INDEX "RetentionPlaybook_riskDriver_idx" ON "RetentionPlaybook"("riskDriver");
CREATE INDEX "RetentionRiskRun_policyId_createdAt_idx" ON "RetentionRiskRun"("policyId", "createdAt");
CREATE INDEX "RetentionRiskRun_recommendation_createdAt_idx" ON "RetentionRiskRun"("recommendation", "createdAt");
CREATE INDEX "RetentionRiskRunRow_runId_idx" ON "RetentionRiskRunRow"("runId");
CREATE INDEX "RetentionRiskRunRow_accountId_idx" ON "RetentionRiskRunRow"("accountId");
CREATE INDEX "RetentionRiskRunRow_playbookId_idx" ON "RetentionRiskRunRow"("playbookId");
CREATE INDEX "RetentionRiskRunRow_riskBand_riskScore_idx" ON "RetentionRiskRunRow"("riskBand", "riskScore");
CREATE INDEX "RetentionIntervention_accountId_createdAt_idx" ON "RetentionIntervention"("accountId", "createdAt");
CREATE INDEX "RetentionIntervention_playbookId_idx" ON "RetentionIntervention"("playbookId");
CREATE INDEX "RetentionIntervention_status_createdAt_idx" ON "RetentionIntervention"("status", "createdAt");
CREATE INDEX "RetentionAuditLog_runId_createdAt_idx" ON "RetentionAuditLog"("runId", "createdAt");
CREATE INDEX "RetentionAuditLog_interventionId_createdAt_idx" ON "RetentionAuditLog"("interventionId", "createdAt");
CREATE INDEX "RetentionAuditLog_action_createdAt_idx" ON "RetentionAuditLog"("action", "createdAt");

ALTER TABLE "RetentionRiskRun" ADD CONSTRAINT "RetentionRiskRun_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "RetentionPolicy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RetentionRiskRunRow" ADD CONSTRAINT "RetentionRiskRunRow_runId_fkey" FOREIGN KEY ("runId") REFERENCES "RetentionRiskRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RetentionRiskRunRow" ADD CONSTRAINT "RetentionRiskRunRow_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "RetentionAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RetentionRiskRunRow" ADD CONSTRAINT "RetentionRiskRunRow_playbookId_fkey" FOREIGN KEY ("playbookId") REFERENCES "RetentionPlaybook"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RetentionIntervention" ADD CONSTRAINT "RetentionIntervention_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "RetentionAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RetentionIntervention" ADD CONSTRAINT "RetentionIntervention_playbookId_fkey" FOREIGN KEY ("playbookId") REFERENCES "RetentionPlaybook"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RetentionAuditLog" ADD CONSTRAINT "RetentionAuditLog_runId_fkey" FOREIGN KEY ("runId") REFERENCES "RetentionRiskRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RetentionAuditLog" ADD CONSTRAINT "RetentionAuditLog_interventionId_fkey" FOREIGN KEY ("interventionId") REFERENCES "RetentionIntervention"("id") ON DELETE CASCADE ON UPDATE CASCADE;
