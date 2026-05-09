-- CreateTable
CREATE TABLE "AgentProviderWriteDryRun" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "accountUserId" TEXT,
    "agentJobId" TEXT NOT NULL,
    "app" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "operationType" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'dry_run',
    "status" TEXT NOT NULL DEFAULT 'ready',
    "idempotencyKey" TEXT,
    "externalAccountId" TEXT,
    "externalCampaignId" TEXT,
    "permissionChecks" JSONB NOT NULL,
    "providerObjects" JSONB NOT NULL,
    "spendExposureCents" INTEGER NOT NULL DEFAULT 0,
    "rollbackSupported" BOOLEAN NOT NULL DEFAULT false,
    "rollbackPlan" TEXT,
    "blockers" TEXT[],
    "warnings" TEXT[],
    "rawResult" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentProviderWriteDryRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AgentProviderWriteDryRun_agentJobId_key" ON "AgentProviderWriteDryRun"("agentJobId");

-- CreateIndex
CREATE INDEX "AgentProviderWriteDryRun_workspaceId_provider_operationType_createdAt_idx" ON "AgentProviderWriteDryRun"("workspaceId", "provider", "operationType", "createdAt");

-- CreateIndex
CREATE INDEX "AgentProviderWriteDryRun_accountUserId_createdAt_idx" ON "AgentProviderWriteDryRun"("accountUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AgentProviderWriteDryRun_status_createdAt_idx" ON "AgentProviderWriteDryRun"("status", "createdAt");

-- CreateIndex
CREATE INDEX "AgentProviderWriteDryRun_idempotencyKey_idx" ON "AgentProviderWriteDryRun"("idempotencyKey");

-- AddForeignKey
ALTER TABLE "AgentProviderWriteDryRun" ADD CONSTRAINT "AgentProviderWriteDryRun_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentProviderWriteDryRun" ADD CONSTRAINT "AgentProviderWriteDryRun_accountUserId_fkey" FOREIGN KEY ("accountUserId") REFERENCES "AccountUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentProviderWriteDryRun" ADD CONSTRAINT "AgentProviderWriteDryRun_agentJobId_fkey" FOREIGN KEY ("agentJobId") REFERENCES "AgentJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
