CREATE TABLE "LifecycleImportLog" (
    "id" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "usersImported" INTEGER NOT NULL DEFAULT 0,
    "entitiesImported" INTEGER NOT NULL DEFAULT 0,
    "interestEdgesImported" INTEGER NOT NULL DEFAULT 0,
    "changeEventsImported" INTEGER NOT NULL DEFAULT 0,
    "validationErrors" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LifecycleImportLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LifecycleImportLog_sourceType_createdAt_idx" ON "LifecycleImportLog"("sourceType", "createdAt");
CREATE INDEX "LifecycleImportLog_status_createdAt_idx" ON "LifecycleImportLog"("status", "createdAt");
