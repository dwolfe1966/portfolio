-- Account-scope reusable tool scenario/configuration presets.
ALTER TABLE "WorkspacePreset" ADD COLUMN "accountUserId" TEXT;

DROP INDEX IF EXISTS "WorkspacePreset_workspaceId_app_presetType_name_key";

CREATE INDEX "WorkspacePreset_accountUserId_updatedAt_idx"
  ON "WorkspacePreset"("accountUserId", "updatedAt");

ALTER TABLE "WorkspacePreset"
  ADD CONSTRAINT "WorkspacePreset_accountUserId_fkey"
  FOREIGN KEY ("accountUserId") REFERENCES "AccountUser"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
