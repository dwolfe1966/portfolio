CREATE TABLE "LifecycleConnectorConfig" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "accountUserId" TEXT,
  "provider" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'configured',
  "capabilities" TEXT[] NOT NULL,
  "credentialGrantId" TEXT,
  "settings" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "LifecycleConnectorConfig_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LifecycleConnectorHealthSnapshot" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "connectorConfigId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "ok" BOOLEAN NOT NULL,
  "accountLabel" TEXT NOT NULL,
  "capabilities" TEXT[] NOT NULL,
  "permissionWarnings" JSONB,
  "freshnessWarnings" JSONB,
  "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSyncAt" TIMESTAMP(3),
  "nextSyncAt" TIMESTAMP(3),

  CONSTRAINT "LifecycleConnectorHealthSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LifecycleConnectorSyncRun" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "accountUserId" TEXT,
  "connectorConfigId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "idempotencyKey" TEXT,
  "cursor" TEXT,
  "objectKeys" TEXT[] NOT NULL,
  "normalizedCounts" JSONB,
  "rejectedRows" INTEGER NOT NULL DEFAULT 0,
  "warnings" JSONB,
  "metadata" JSONB,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),

  CONSTRAINT "LifecycleConnectorSyncRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LifecycleConnectorAuditEvent" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "accountUserId" TEXT,
  "connectorConfigId" TEXT,
  "syncRunId" TEXT,
  "provider" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "objectKey" TEXT,
  "idempotencyKey" TEXT,
  "metadata" JSONB NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "LifecycleConnectorAuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LifecycleConnectorConfig_workspaceId_accountUserId_provider_key"
ON "LifecycleConnectorConfig"("workspaceId", "accountUserId", "provider");

CREATE INDEX "LifecycleConnectorConfig_workspaceId_provider_idx"
ON "LifecycleConnectorConfig"("workspaceId", "provider");

CREATE INDEX "LifecycleConnectorConfig_accountUserId_updatedAt_idx"
ON "LifecycleConnectorConfig"("accountUserId", "updatedAt");

CREATE INDEX "LifecycleConnectorConfig_status_updatedAt_idx"
ON "LifecycleConnectorConfig"("status", "updatedAt");

CREATE INDEX "LifecycleConnectorHealthSnapshot_workspaceId_checkedAt_idx"
ON "LifecycleConnectorHealthSnapshot"("workspaceId", "checkedAt");

CREATE INDEX "LifecycleConnectorHealthSnapshot_connectorConfigId_checkedAt_idx"
ON "LifecycleConnectorHealthSnapshot"("connectorConfigId", "checkedAt");

CREATE INDEX "LifecycleConnectorHealthSnapshot_provider_checkedAt_idx"
ON "LifecycleConnectorHealthSnapshot"("provider", "checkedAt");

CREATE INDEX "LifecycleConnectorHealthSnapshot_ok_checkedAt_idx"
ON "LifecycleConnectorHealthSnapshot"("ok", "checkedAt");

CREATE INDEX "LifecycleConnectorSyncRun_workspaceId_startedAt_idx"
ON "LifecycleConnectorSyncRun"("workspaceId", "startedAt");

CREATE INDEX "LifecycleConnectorSyncRun_accountUserId_startedAt_idx"
ON "LifecycleConnectorSyncRun"("accountUserId", "startedAt");

CREATE INDEX "LifecycleConnectorSyncRun_connectorConfigId_startedAt_idx"
ON "LifecycleConnectorSyncRun"("connectorConfigId", "startedAt");

CREATE INDEX "LifecycleConnectorSyncRun_provider_action_startedAt_idx"
ON "LifecycleConnectorSyncRun"("provider", "action", "startedAt");

CREATE INDEX "LifecycleConnectorSyncRun_status_startedAt_idx"
ON "LifecycleConnectorSyncRun"("status", "startedAt");

CREATE INDEX "LifecycleConnectorAuditEvent_workspaceId_occurredAt_idx"
ON "LifecycleConnectorAuditEvent"("workspaceId", "occurredAt");

CREATE INDEX "LifecycleConnectorAuditEvent_accountUserId_occurredAt_idx"
ON "LifecycleConnectorAuditEvent"("accountUserId", "occurredAt");

CREATE INDEX "LifecycleConnectorAuditEvent_connectorConfigId_occurredAt_idx"
ON "LifecycleConnectorAuditEvent"("connectorConfigId", "occurredAt");

CREATE INDEX "LifecycleConnectorAuditEvent_syncRunId_occurredAt_idx"
ON "LifecycleConnectorAuditEvent"("syncRunId", "occurredAt");

CREATE INDEX "LifecycleConnectorAuditEvent_provider_eventType_occurredAt_idx"
ON "LifecycleConnectorAuditEvent"("provider", "eventType", "occurredAt");

ALTER TABLE "LifecycleConnectorConfig"
ADD CONSTRAINT "LifecycleConnectorConfig_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LifecycleConnectorConfig"
ADD CONSTRAINT "LifecycleConnectorConfig_accountUserId_fkey"
FOREIGN KEY ("accountUserId") REFERENCES "AccountUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LifecycleConnectorHealthSnapshot"
ADD CONSTRAINT "LifecycleConnectorHealthSnapshot_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LifecycleConnectorHealthSnapshot"
ADD CONSTRAINT "LifecycleConnectorHealthSnapshot_connectorConfigId_fkey"
FOREIGN KEY ("connectorConfigId") REFERENCES "LifecycleConnectorConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LifecycleConnectorSyncRun"
ADD CONSTRAINT "LifecycleConnectorSyncRun_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LifecycleConnectorSyncRun"
ADD CONSTRAINT "LifecycleConnectorSyncRun_accountUserId_fkey"
FOREIGN KEY ("accountUserId") REFERENCES "AccountUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LifecycleConnectorSyncRun"
ADD CONSTRAINT "LifecycleConnectorSyncRun_connectorConfigId_fkey"
FOREIGN KEY ("connectorConfigId") REFERENCES "LifecycleConnectorConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LifecycleConnectorAuditEvent"
ADD CONSTRAINT "LifecycleConnectorAuditEvent_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LifecycleConnectorAuditEvent"
ADD CONSTRAINT "LifecycleConnectorAuditEvent_accountUserId_fkey"
FOREIGN KEY ("accountUserId") REFERENCES "AccountUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LifecycleConnectorAuditEvent"
ADD CONSTRAINT "LifecycleConnectorAuditEvent_connectorConfigId_fkey"
FOREIGN KEY ("connectorConfigId") REFERENCES "LifecycleConnectorConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LifecycleConnectorAuditEvent"
ADD CONSTRAINT "LifecycleConnectorAuditEvent_syncRunId_fkey"
FOREIGN KEY ("syncRunId") REFERENCES "LifecycleConnectorSyncRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
