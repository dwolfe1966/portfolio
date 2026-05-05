CREATE TABLE "AppDataSourceSelection" (
    "id" TEXT NOT NULL,
    "app" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sourceType" TEXT,
    "datasetId" TEXT,
    "rowCounts" JSONB,
    "accountUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppDataSourceSelection_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AppDataSourceSelection_app_updatedAt_idx" ON "AppDataSourceSelection"("app", "updatedAt");
CREATE INDEX "AppDataSourceSelection_accountUserId_updatedAt_idx" ON "AppDataSourceSelection"("accountUserId", "updatedAt");
CREATE INDEX "AppDataSourceSelection_datasetId_idx" ON "AppDataSourceSelection"("datasetId");

ALTER TABLE "AppDataSourceSelection" ADD CONSTRAINT "AppDataSourceSelection_accountUserId_fkey" FOREIGN KEY ("accountUserId") REFERENCES "AccountUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AppDataSourceSelection" ADD CONSTRAINT "AppDataSourceSelection_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "WorkspaceDataset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
