-- Auction Desk demo schema (Tier C). All tables backed by the same Neon DB
-- as the lifecycle/acquisition demos.
CREATE TABLE "AuctionAdvertiser" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "qualityScore" DOUBLE PRECISION NOT NULL,
  "dailyBudgetCents" INTEGER NOT NULL,
  "smoothingFactor" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  "behaviorMode" TEXT NOT NULL DEFAULT 'truthful',
  "targetCacCents" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AuctionAdvertiser_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AuctionAdvertiser_behaviorMode_idx" ON "AuctionAdvertiser"("behaviorMode");

CREATE TABLE "AuctionSlot" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "reservePriceCents" INTEGER NOT NULL,
  "expectedDailyVolume" INTEGER NOT NULL DEFAULT 100,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AuctionSlot_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AuctionSlot_createdAt_idx" ON "AuctionSlot"("createdAt");

CREATE TABLE "AuctionBid" (
  "id" TEXT NOT NULL,
  "advertiserId" TEXT NOT NULL,
  "slotId" TEXT NOT NULL,
  "bidCents" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AuctionBid_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AuctionBid_advertiserId_fkey" FOREIGN KEY ("advertiserId") REFERENCES "AuctionAdvertiser"("id") ON DELETE CASCADE,
  CONSTRAINT "AuctionBid_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "AuctionSlot"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "AuctionBid_advertiserId_slotId_key" ON "AuctionBid"("advertiserId", "slotId");
CREATE INDEX "AuctionBid_slotId_idx" ON "AuctionBid"("slotId");

CREATE TABLE "AuctionRun" (
  "id" TEXT NOT NULL,
  "totalAuctions" INTEGER NOT NULL,
  "totalRevenueCents" INTEGER NOT NULL,
  "fillRate" DOUBLE PRECISION NOT NULL,
  "fillQuality" DOUBLE PRECISION NOT NULL,
  "revenueStability" DOUBLE PRECISION NOT NULL,
  "bidderTrustProxy" DOUBLE PRECISION NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuctionRun_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AuctionRun_createdAt_idx" ON "AuctionRun"("createdAt");

CREATE TABLE "AuctionResult" (
  "id" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "slotId" TEXT NOT NULL,
  "iterationIndex" INTEGER NOT NULL,
  "filled" BOOLEAN NOT NULL,
  "winnerAdvertiserId" TEXT,
  "clearingPriceCents" INTEGER,
  "reservePriceCents" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuctionResult_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AuctionResult_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AuctionRun"("id") ON DELETE CASCADE,
  CONSTRAINT "AuctionResult_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "AuctionSlot"("id")
);
CREATE INDEX "AuctionResult_runId_iterationIndex_idx" ON "AuctionResult"("runId", "iterationIndex");
CREATE INDEX "AuctionResult_slotId_createdAt_idx" ON "AuctionResult"("slotId", "createdAt");

CREATE TABLE "AuctionResultRow" (
  "id" TEXT NOT NULL,
  "resultId" TEXT NOT NULL,
  "advertiserId" TEXT NOT NULL,
  "bidCents" INTEGER NOT NULL,
  "effectiveBidCents" INTEGER NOT NULL,
  "qualityScore" DOUBLE PRECISION NOT NULL,
  "adjustedScore" DOUBLE PRECISION NOT NULL,
  "eligible" BOOLEAN NOT NULL,
  "ineligibilityReason" TEXT,
  "rank" INTEGER NOT NULL,
  CONSTRAINT "AuctionResultRow_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AuctionResultRow_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "AuctionResult"("id") ON DELETE CASCADE,
  CONSTRAINT "AuctionResultRow_advertiserId_fkey" FOREIGN KEY ("advertiserId") REFERENCES "AuctionAdvertiser"("id")
);
CREATE INDEX "AuctionResultRow_resultId_rank_idx" ON "AuctionResultRow"("resultId", "rank");

CREATE TABLE "AuctionAdvertiserSpend" (
  "id" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "advertiserId" TEXT NOT NULL,
  "totalSpendCents" INTEGER NOT NULL,
  "totalWins" INTEGER NOT NULL,
  "averageClearingCents" INTEGER NOT NULL,
  "fillShare" DOUBLE PRECISION NOT NULL,
  CONSTRAINT "AuctionAdvertiserSpend_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AuctionAdvertiserSpend_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AuctionRun"("id") ON DELETE CASCADE,
  CONSTRAINT "AuctionAdvertiserSpend_advertiserId_fkey" FOREIGN KEY ("advertiserId") REFERENCES "AuctionAdvertiser"("id")
);
CREATE UNIQUE INDEX "AuctionAdvertiserSpend_runId_advertiserId_key" ON "AuctionAdvertiserSpend"("runId", "advertiserId");
CREATE INDEX "AuctionAdvertiserSpend_advertiserId_idx" ON "AuctionAdvertiserSpend"("advertiserId");

CREATE TABLE "AuctionAuditLog" (
  "id" TEXT NOT NULL,
  "runId" TEXT,
  "actor" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "metadata" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuctionAuditLog_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AuctionAuditLog_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AuctionRun"("id") ON DELETE CASCADE
);
CREATE INDEX "AuctionAuditLog_runId_createdAt_idx" ON "AuctionAuditLog"("runId", "createdAt");
CREATE INDEX "AuctionAuditLog_action_createdAt_idx" ON "AuctionAuditLog"("action", "createdAt");
