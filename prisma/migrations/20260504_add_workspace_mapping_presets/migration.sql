CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LifecycleMappingPreset" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "app" TEXT NOT NULL,
    "mappings" JSONB NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LifecycleMappingPreset_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Workspace_slug_key" ON "Workspace"("slug");
CREATE INDEX "LifecycleMappingPreset_workspaceId_app_sourceType_updatedAt_idx" ON "LifecycleMappingPreset"("workspaceId", "app", "sourceType", "updatedAt");
CREATE UNIQUE INDEX "LifecycleMappingPreset_workspaceId_app_sourceType_name_key" ON "LifecycleMappingPreset"("workspaceId", "app", "sourceType", "name");

ALTER TABLE "LifecycleMappingPreset" ADD CONSTRAINT "LifecycleMappingPreset_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
