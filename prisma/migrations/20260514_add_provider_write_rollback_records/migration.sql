-- CreateTable
CREATE TABLE "AgentProviderWriteRollbackRecord" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "accountUserId" TEXT,
    "providerWriteDryRunId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "operationType" TEXT NOT NULL,
    "externalAccountId" TEXT,
    "externalCampaignId" TEXT,
    "mutationIdempotencyKey" TEXT NOT NULL,
    "providerOperationId" TEXT NOT NULL,
    "rollbackProviderOperationId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending_review',
    "reversalStatus" TEXT NOT NULL DEFAULT 'not_started',
    "beforeState" JSONB NOT NULL,
    "afterState" JSONB NOT NULL,
    "rollbackPlan" TEXT,
    "retentionExpiresAt" TIMESTAMP(3) NOT NULL,
    "reviewedByAccountUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewDecision" TEXT,
    "reversalProviderOperationId" TEXT,
    "reversedAt" TIMESTAMP(3),
    "rawMutationResult" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentProviderWriteRollbackRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AgentProviderWriteRollbackRecord_mutationIdempotencyKey_key" ON "AgentProviderWriteRollbackRecord"("mutationIdempotencyKey");

-- CreateIndex
CREATE INDEX "AgentProviderWriteRollbackRecord_workspaceId_status_retentionExpiresAt_idx" ON "AgentProviderWriteRollbackRecord"("workspaceId", "status", "retentionExpiresAt");

-- CreateIndex
CREATE INDEX "AgentProviderWriteRollbackRecord_workspaceId_provider_operationType_createdAt_idx" ON "AgentProviderWriteRollbackRecord"("workspaceId", "provider", "operationType", "createdAt");

-- CreateIndex
CREATE INDEX "AgentProviderWriteRollbackRecord_accountUserId_createdAt_idx" ON "AgentProviderWriteRollbackRecord"("accountUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AgentProviderWriteRollbackRecord_providerWriteDryRunId_createdAt_idx" ON "AgentProviderWriteRollbackRecord"("providerWriteDryRunId", "createdAt");

-- CreateIndex
CREATE INDEX "AgentProviderWriteRollbackRecord_providerOperationId_idx" ON "AgentProviderWriteRollbackRecord"("providerOperationId");

-- CreateIndex
CREATE INDEX "AgentProviderWriteRollbackRecord_reversalStatus_retentionExpiresAt_idx" ON "AgentProviderWriteRollbackRecord"("reversalStatus", "retentionExpiresAt");

-- AddForeignKey
ALTER TABLE "AgentProviderWriteRollbackRecord" ADD CONSTRAINT "AgentProviderWriteRollbackRecord_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentProviderWriteRollbackRecord" ADD CONSTRAINT "AgentProviderWriteRollbackRecord_accountUserId_fkey" FOREIGN KEY ("accountUserId") REFERENCES "AccountUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentProviderWriteRollbackRecord" ADD CONSTRAINT "AgentProviderWriteRollbackRecord_providerWriteDryRunId_fkey" FOREIGN KEY ("providerWriteDryRunId") REFERENCES "AgentProviderWriteDryRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
