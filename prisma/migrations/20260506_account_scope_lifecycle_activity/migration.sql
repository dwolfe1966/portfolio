-- Account-scope lifecycle import logs and lifecycle campaign/model runs.
ALTER TABLE "LifecycleImportLog" ADD COLUMN "accountUserId" TEXT;
ALTER TABLE "CampaignRun" ADD COLUMN "accountUserId" TEXT;

CREATE INDEX "LifecycleImportLog_accountUserId_createdAt_idx"
  ON "LifecycleImportLog"("accountUserId", "createdAt");

CREATE INDEX "CampaignRun_accountUserId_createdAt_idx"
  ON "CampaignRun"("accountUserId", "createdAt");

ALTER TABLE "LifecycleImportLog"
  ADD CONSTRAINT "LifecycleImportLog_accountUserId_fkey"
  FOREIGN KEY ("accountUserId") REFERENCES "AccountUser"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CampaignRun"
  ADD CONSTRAINT "CampaignRun_accountUserId_fkey"
  FOREIGN KEY ("accountUserId") REFERENCES "AccountUser"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
