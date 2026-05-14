-- AlterTable
ALTER TABLE "WorkspaceLaunchReadinessRecord" ADD COLUMN "scopeKey" TEXT NOT NULL DEFAULT 'workspace';

-- DropIndex
DROP INDEX "WorkspaceLaunchReadinessRecord_workspaceId_accountUserId_key";

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceLaunchReadinessRecord_workspaceId_scopeKey_key" ON "WorkspaceLaunchReadinessRecord"("workspaceId", "scopeKey");
