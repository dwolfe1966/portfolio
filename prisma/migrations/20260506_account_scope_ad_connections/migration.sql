-- Scope OAuth ad account connections to the signed-in account while preserving
-- legacy unowned rows for public/demo compatibility.
ALTER TABLE "AdAccountConnection" ADD COLUMN "accountUserId" TEXT;

DROP INDEX IF EXISTS "AdAccountConnection_provider_externalAccountId_key";

CREATE INDEX "AdAccountConnection_accountUserId_createdAt_idx"
  ON "AdAccountConnection"("accountUserId", "createdAt");

CREATE INDEX "AdAccountConnection_accountUserId_provider_idx"
  ON "AdAccountConnection"("accountUserId", "provider");

ALTER TABLE "AdAccountConnection"
  ADD CONSTRAINT "AdAccountConnection_accountUserId_fkey"
  FOREIGN KEY ("accountUserId") REFERENCES "AccountUser"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
