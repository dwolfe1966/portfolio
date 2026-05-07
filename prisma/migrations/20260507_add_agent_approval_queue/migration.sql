-- CreateTable
CREATE TABLE "AgentApprovalRequest" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "requestedByAccountUserId" TEXT,
    "decidedByAccountUserId" TEXT,
    "agentJobId" TEXT,
    "app" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "proposedAction" JSONB NOT NULL,
    "approvalPolicy" JSONB,
    "decisionReason" TEXT,
    "requiredApproverRole" TEXT,
    "escalationLevel" INTEGER NOT NULL DEFAULT 0,
    "dueAt" TIMESTAMP(3),
    "escalatedAt" TIMESTAMP(3),
    "decidedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentApprovalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgentApprovalRequest_workspaceId_status_dueAt_idx" ON "AgentApprovalRequest"("workspaceId", "status", "dueAt");

-- CreateIndex
CREATE INDEX "AgentApprovalRequest_requestedByAccountUserId_createdAt_idx" ON "AgentApprovalRequest"("requestedByAccountUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AgentApprovalRequest_decidedByAccountUserId_decidedAt_idx" ON "AgentApprovalRequest"("decidedByAccountUserId", "decidedAt");

-- CreateIndex
CREATE INDEX "AgentApprovalRequest_agentJobId_status_idx" ON "AgentApprovalRequest"("agentJobId", "status");

-- CreateIndex
CREATE INDEX "AgentApprovalRequest_app_actionType_status_idx" ON "AgentApprovalRequest"("app", "actionType", "status");

-- CreateIndex
CREATE INDEX "AgentApprovalRequest_riskLevel_status_idx" ON "AgentApprovalRequest"("riskLevel", "status");

-- AddForeignKey
ALTER TABLE "AgentApprovalRequest" ADD CONSTRAINT "AgentApprovalRequest_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentApprovalRequest" ADD CONSTRAINT "AgentApprovalRequest_requestedByAccountUserId_fkey" FOREIGN KEY ("requestedByAccountUserId") REFERENCES "AccountUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentApprovalRequest" ADD CONSTRAINT "AgentApprovalRequest_decidedByAccountUserId_fkey" FOREIGN KEY ("decidedByAccountUserId") REFERENCES "AccountUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentApprovalRequest" ADD CONSTRAINT "AgentApprovalRequest_agentJobId_fkey" FOREIGN KEY ("agentJobId") REFERENCES "AgentJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;
