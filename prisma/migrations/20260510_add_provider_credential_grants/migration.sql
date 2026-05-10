CREATE TABLE "ProviderCredentialGrant" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "accountUserId" TEXT,
  "provider" TEXT NOT NULL,
  "externalAccountId" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "environment" TEXT NOT NULL DEFAULT 'test',
  "capabilities" TEXT[] NOT NULL,
  "scopes" TEXT[] NOT NULL,
  "tokenHealthStatus" TEXT NOT NULL DEFAULT 'unknown',
  "tokenExpiresAt" TIMESTAMP(3),
  "lastValidatedAt" TIMESTAMP(3),
  "rotationDueAt" TIMESTAMP(3),
  "ownerApprovedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ProviderCredentialGrant_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "AdAccountConnection" ADD COLUMN "credentialGrantId" TEXT;

CREATE UNIQUE INDEX "ProviderCredentialGrant_workspaceId_accountUserId_provider_externalAccountId_key"
ON "ProviderCredentialGrant"("workspaceId", "accountUserId", "provider", "externalAccountId");

CREATE INDEX "ProviderCredentialGrant_workspaceId_provider_environment_idx"
ON "ProviderCredentialGrant"("workspaceId", "provider", "environment");

CREATE INDEX "ProviderCredentialGrant_workspaceId_status_updatedAt_idx"
ON "ProviderCredentialGrant"("workspaceId", "status", "updatedAt");

CREATE INDEX "ProviderCredentialGrant_accountUserId_updatedAt_idx"
ON "ProviderCredentialGrant"("accountUserId", "updatedAt");

CREATE INDEX "ProviderCredentialGrant_provider_externalAccountId_idx"
ON "ProviderCredentialGrant"("provider", "externalAccountId");

CREATE INDEX "ProviderCredentialGrant_tokenHealthStatus_updatedAt_idx"
ON "ProviderCredentialGrant"("tokenHealthStatus", "updatedAt");

CREATE INDEX "AdAccountConnection_credentialGrantId_idx"
ON "AdAccountConnection"("credentialGrantId");

ALTER TABLE "ProviderCredentialGrant"
ADD CONSTRAINT "ProviderCredentialGrant_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProviderCredentialGrant"
ADD CONSTRAINT "ProviderCredentialGrant_accountUserId_fkey"
FOREIGN KEY ("accountUserId") REFERENCES "AccountUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AdAccountConnection"
ADD CONSTRAINT "AdAccountConnection_credentialGrantId_fkey"
FOREIGN KEY ("credentialGrantId") REFERENCES "ProviderCredentialGrant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
