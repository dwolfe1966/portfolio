-- Add password credentials to workspace accounts while preserving existing passwordless rows.
ALTER TABLE "AccountUser"
  ADD COLUMN "passwordHash" TEXT,
  ADD COLUMN "passwordSetAt" TIMESTAMP(3);
