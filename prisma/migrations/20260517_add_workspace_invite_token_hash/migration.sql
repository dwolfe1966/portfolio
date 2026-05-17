ALTER TABLE "WorkspaceInvite" ADD COLUMN "tokenHash" TEXT;

CREATE UNIQUE INDEX "WorkspaceInvite_tokenHash_key" ON "WorkspaceInvite"("tokenHash");
