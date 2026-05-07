-- CreateTable
CREATE TABLE "AgentJob" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "accountUserId" TEXT,
    "app" TEXT NOT NULL,
    "queueName" TEXT NOT NULL,
    "jobType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "priority" INTEGER NOT NULL DEFAULT 100,
    "idempotencyKey" TEXT,
    "payload" JSONB NOT NULL,
    "result" JSONB,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "runAfter" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "deadLetteredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AgentJob_workspaceId_queueName_idempotencyKey_key" ON "AgentJob"("workspaceId", "queueName", "idempotencyKey");

-- CreateIndex
CREATE INDEX "AgentJob_workspaceId_status_runAfter_priority_idx" ON "AgentJob"("workspaceId", "status", "runAfter", "priority");

-- CreateIndex
CREATE INDEX "AgentJob_accountUserId_createdAt_idx" ON "AgentJob"("accountUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AgentJob_app_jobType_status_idx" ON "AgentJob"("app", "jobType", "status");

-- CreateIndex
CREATE INDEX "AgentJob_queueName_status_runAfter_idx" ON "AgentJob"("queueName", "status", "runAfter");

-- CreateIndex
CREATE INDEX "AgentJob_deadLetteredAt_idx" ON "AgentJob"("deadLetteredAt");

-- AddForeignKey
ALTER TABLE "AgentJob" ADD CONSTRAINT "AgentJob_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentJob" ADD CONSTRAINT "AgentJob_accountUserId_fkey" FOREIGN KEY ("accountUserId") REFERENCES "AccountUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
