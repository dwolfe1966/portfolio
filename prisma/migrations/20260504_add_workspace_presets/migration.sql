CREATE TABLE "WorkspacePreset" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "app" TEXT NOT NULL,
    "presetType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "values" JSONB NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WorkspacePreset_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WorkspacePreset_workspaceId_app_presetType_updatedAt_idx" ON "WorkspacePreset"("workspaceId", "app", "presetType", "updatedAt");
CREATE UNIQUE INDEX "WorkspacePreset_workspaceId_app_presetType_name_key" ON "WorkspacePreset"("workspaceId", "app", "presetType", "name");

ALTER TABLE "WorkspacePreset" ADD CONSTRAINT "WorkspacePreset_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
