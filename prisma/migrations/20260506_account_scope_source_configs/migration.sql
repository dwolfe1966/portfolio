-- Account-scope reusable CSV and Google Sheets source configs.
ALTER TABLE "LifecycleMappingPreset" ADD COLUMN "accountUserId" TEXT;

DROP INDEX IF EXISTS "LifecycleMappingPreset_workspaceId_app_sourceType_name_key";

CREATE INDEX "LifecycleMappingPreset_accountUserId_updatedAt_idx"
  ON "LifecycleMappingPreset"("accountUserId", "updatedAt");

ALTER TABLE "LifecycleMappingPreset"
  ADD CONSTRAINT "LifecycleMappingPreset_accountUserId_fkey"
  FOREIGN KEY ("accountUserId") REFERENCES "AccountUser"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
