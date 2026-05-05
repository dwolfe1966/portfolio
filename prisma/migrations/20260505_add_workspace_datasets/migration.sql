-- Durable imported dataset snapshots owned by a workspace and optionally by an account user.
CREATE TABLE "WorkspaceDataset" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "accountUserId" TEXT,
  "app" TEXT NOT NULL,
  "sourceType" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'imported',
  "rowData" JSONB NOT NULL,
  "rowCounts" JSONB NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "WorkspaceDataset_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WorkspaceDataset_workspaceId_app_createdAt_idx" ON "WorkspaceDataset"("workspaceId", "app", "createdAt");
CREATE INDEX "WorkspaceDataset_accountUserId_createdAt_idx" ON "WorkspaceDataset"("accountUserId", "createdAt");
CREATE INDEX "WorkspaceDataset_app_status_createdAt_idx" ON "WorkspaceDataset"("app", "status", "createdAt");

ALTER TABLE "WorkspaceDataset"
  ADD CONSTRAINT "WorkspaceDataset_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkspaceDataset"
  ADD CONSTRAINT "WorkspaceDataset_accountUserId_fkey"
  FOREIGN KEY ("accountUserId") REFERENCES "AccountUser"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
