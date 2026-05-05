-- Account ownership foundation for workspace-scoped datasets and connector credentials.
CREATE TABLE "AccountUser" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AccountUser_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkspaceMembership" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "accountUserId" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'owner',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "WorkspaceMembership_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AccountUser_email_key" ON "AccountUser"("email");
CREATE INDEX "AccountUser_updatedAt_idx" ON "AccountUser"("updatedAt");
CREATE UNIQUE INDEX "WorkspaceMembership_workspaceId_accountUserId_key" ON "WorkspaceMembership"("workspaceId", "accountUserId");
CREATE INDEX "WorkspaceMembership_accountUserId_updatedAt_idx" ON "WorkspaceMembership"("accountUserId", "updatedAt");
CREATE INDEX "WorkspaceMembership_workspaceId_role_idx" ON "WorkspaceMembership"("workspaceId", "role");

ALTER TABLE "WorkspaceMembership"
  ADD CONSTRAINT "WorkspaceMembership_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkspaceMembership"
  ADD CONSTRAINT "WorkspaceMembership_accountUserId_fkey"
  FOREIGN KEY ("accountUserId") REFERENCES "AccountUser"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
