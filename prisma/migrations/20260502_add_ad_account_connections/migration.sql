-- Storage for OAuth-backed ad-platform connections.
-- Tokens are stored encrypted at rest; encryption uses AES-256-GCM with
-- a key supplied via the OAUTH_ENCRYPTION_KEY env var.
-- Scope: test-tier credentials, read-only API calls only.
CREATE TABLE "AdAccountConnection" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "externalAccountId" TEXT NOT NULL,
  "accountName" TEXT NOT NULL,
  "isTestAccount" BOOLEAN NOT NULL DEFAULT true,
  "scopes" TEXT[],
  "encryptedAccessToken" TEXT NOT NULL,
  "encryptedRefreshToken" TEXT,
  "expiresAt" TIMESTAMP(3),
  "lastFetchedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AdAccountConnection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdAccountConnection_provider_externalAccountId_key"
  ON "AdAccountConnection"("provider", "externalAccountId");
CREATE INDEX "AdAccountConnection_provider_idx" ON "AdAccountConnection"("provider");
CREATE INDEX "AdAccountConnection_createdAt_idx" ON "AdAccountConnection"("createdAt");
