-- CreateTable
CREATE TABLE "AgentProviderWriteMeasurementHandoff" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "accountUserId" TEXT,
    "providerWriteDryRunId" TEXT NOT NULL,
    "sourceAgentJobId" TEXT NOT NULL,
    "observationJobId" TEXT,
    "measurementJobId" TEXT,
    "app" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "operationType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "measurementOutputs" TEXT[],
    "measurementPayload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentProviderWriteMeasurementHandoff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AgentProviderWriteMeasurementHandoff_providerWriteDryRunId_key" ON "AgentProviderWriteMeasurementHandoff"("providerWriteDryRunId");

-- CreateIndex
CREATE INDEX "AgentProviderWriteMeasurementHandoff_workspaceId_provider_operationType_createdAt_idx" ON "AgentProviderWriteMeasurementHandoff"("workspaceId", "provider", "operationType", "createdAt");

-- CreateIndex
CREATE INDEX "AgentProviderWriteMeasurementHandoff_accountUserId_createdAt_idx" ON "AgentProviderWriteMeasurementHandoff"("accountUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AgentProviderWriteMeasurementHandoff_status_createdAt_idx" ON "AgentProviderWriteMeasurementHandoff"("status", "createdAt");

-- CreateIndex
CREATE INDEX "AgentProviderWriteMeasurementHandoff_observationJobId_idx" ON "AgentProviderWriteMeasurementHandoff"("observationJobId");

-- CreateIndex
CREATE INDEX "AgentProviderWriteMeasurementHandoff_measurementJobId_idx" ON "AgentProviderWriteMeasurementHandoff"("measurementJobId");

-- AddForeignKey
ALTER TABLE "AgentProviderWriteMeasurementHandoff" ADD CONSTRAINT "AgentProviderWriteMeasurementHandoff_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentProviderWriteMeasurementHandoff" ADD CONSTRAINT "AgentProviderWriteMeasurementHandoff_accountUserId_fkey" FOREIGN KEY ("accountUserId") REFERENCES "AccountUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentProviderWriteMeasurementHandoff" ADD CONSTRAINT "AgentProviderWriteMeasurementHandoff_providerWriteDryRunId_fkey" FOREIGN KEY ("providerWriteDryRunId") REFERENCES "AgentProviderWriteDryRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
