-- CreateTable
CREATE TABLE "WorkspaceLaunchReadinessRecord" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "accountUserId" TEXT,
    "customerName" TEXT NOT NULL,
    "requestedLaunchMode" TEXT NOT NULL,
    "launchDecisionMode" TEXT,
    "status" TEXT NOT NULL,
    "maxAllowedLaunchMode" TEXT NOT NULL,
    "exportable" BOOLEAN NOT NULL DEFAULT false,
    "nextRequiredAction" TEXT NOT NULL,
    "owners" JSONB NOT NULL,
    "connectedSystems" JSONB NOT NULL,
    "mappings" JSONB NOT NULL,
    "policy" JSONB,
    "unresolvedRisks" JSONB NOT NULL,
    "evidenceExports" JSONB NOT NULL,
    "launchPacket" JSONB NOT NULL,
    "lastEvaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceLaunchReadinessRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceLaunchReadinessRecord_workspaceId_accountUserId_key" ON "WorkspaceLaunchReadinessRecord"("workspaceId", "accountUserId");

-- CreateIndex
CREATE INDEX "WorkspaceLaunchReadinessRecord_workspaceId_status_updatedAt_idx" ON "WorkspaceLaunchReadinessRecord"("workspaceId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "WorkspaceLaunchReadinessRecord_workspaceId_maxAllowedLaunchMode_updatedAt_idx" ON "WorkspaceLaunchReadinessRecord"("workspaceId", "maxAllowedLaunchMode", "updatedAt");

-- CreateIndex
CREATE INDEX "WorkspaceLaunchReadinessRecord_accountUserId_updatedAt_idx" ON "WorkspaceLaunchReadinessRecord"("accountUserId", "updatedAt");

-- AddForeignKey
ALTER TABLE "WorkspaceLaunchReadinessRecord" ADD CONSTRAINT "WorkspaceLaunchReadinessRecord_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceLaunchReadinessRecord" ADD CONSTRAINT "WorkspaceLaunchReadinessRecord_accountUserId_fkey" FOREIGN KEY ("accountUserId") REFERENCES "AccountUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
