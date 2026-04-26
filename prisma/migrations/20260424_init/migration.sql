-- CreateEnum
CREATE TYPE "UserSegment" AS ENUM ('FREE', 'TRIAL', 'LAPSED', 'ACTIVE');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('NONE', 'TRIALING', 'ACTIVE', 'CANCELED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "DeltaChangeType" AS ENUM ('ADDRESS_CHANGE', 'PHONE_ADDED', 'PHONE_CHANGED', 'EMAIL_ADDED', 'ASSOCIATE_ADDED', 'LEGAL_RECORD_ADDED');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('PENDING', 'GENERATED', 'REVIEWED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AcquisitionChannel" AS ENUM ('SEARCH', 'SOCIAL', 'DISPLAY', 'VIDEO');

-- CreateEnum
CREATE TYPE "AcquisitionCampaignState" AS ENUM ('DRAFT', 'TESTING', 'SCALING', 'PAUSED', 'COMPLETED');

-- CreateTable
CREATE TABLE "AcquisitionCampaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "budgetCents" INTEGER NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "channels" "AcquisitionChannel"[],
    "maxBudgetShiftPct" DOUBLE PRECISION NOT NULL DEFAULT 0.2,
    "minConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0.65,
    "targetCacCents" INTEGER NOT NULL,
    "targetLtvCents" INTEGER NOT NULL,
    "state" "AcquisitionCampaignState" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcquisitionCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdCreative" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "callToAction" TEXT NOT NULL,
    "channel" "AcquisitionChannel" NOT NULL,
    "predictedCtr" DOUBLE PRECISION NOT NULL,
    "predictedConversion" DOUBLE PRECISION NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdCreative_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AudienceSegment" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "audienceType" TEXT NOT NULL,
    "targetingJson" JSONB NOT NULL,
    "predictedCpcCents" INTEGER NOT NULL,
    "predictedCacCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AudienceSegment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestCell" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "creativeId" TEXT NOT NULL,
    "audienceId" TEXT NOT NULL,
    "budgetCents" INTEGER NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "spendCents" INTEGER NOT NULL DEFAULT 0,
    "revenueCents" INTEGER NOT NULL DEFAULT 0,
    "cacCents" INTEGER NOT NULL DEFAULT 0,
    "roas" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "CampaignStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestCell_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdPerformance" (
    "id" TEXT NOT NULL,
    "testCellId" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "impressions" INTEGER NOT NULL,
    "clicks" INTEGER NOT NULL,
    "conversions" INTEGER NOT NULL,
    "spendCents" INTEGER NOT NULL,
    "revenueCents" INTEGER NOT NULL,
    "ctr" DOUBLE PRECISION NOT NULL,
    "conversionRate" DOUBLE PRECISION NOT NULL,
    "cpcCents" INTEGER NOT NULL,
    "cpaCents" INTEGER NOT NULL,
    "roas" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "AdPerformance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetActivity" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "fromTestCellId" TEXT,
    "toTestCellId" TEXT,
    "amountCents" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BudgetActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcquisitionAuditLog" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AcquisitionAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "segment" "UserSegment" NOT NULL,
    "subscriptionStatus" "SubscriptionStatus" NOT NULL,
    "lastActiveAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entity" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "city" TEXT,
    "state" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Entity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntityDelta" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "changeType" "DeltaChangeType" NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "deltaSummary" TEXT NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EntityDelta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterestEdge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "interestScore" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterestEdge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignCandidate" (
    "id" TEXT NOT NULL,
    "campaignRunId" TEXT,
    "userId" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityDeltaId" TEXT NOT NULL,
    "segmentAtGeneration" "UserSegment" NOT NULL,
    "priorityScore" DOUBLE PRECISION NOT NULL,
    "interestContribution" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "recencyContribution" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "segmentContribution" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "changeTypeContribution" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "CampaignStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedMessage" (
    "id" TEXT NOT NULL,
    "campaignCandidateId" TEXT NOT NULL,
    "subjectLine" TEXT NOT NULL,
    "previewText" TEXT NOT NULL,
    "emailBody" TEXT NOT NULL,
    "landingHeadline" TEXT NOT NULL,
    "landingBody" TEXT NOT NULL,
    "ctaText" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeneratedMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignRun" (
    "id" TEXT NOT NULL,
    "runName" TEXT NOT NULL,
    "assumptionSetId" TEXT,
    "assumptionsSnapshot" JSONB NOT NULL,
    "totalDeltas" INTEGER NOT NULL,
    "totalMatches" INTEGER NOT NULL,
    "totalHighPriority" INTEGER NOT NULL,
    "estimatedOpenRate" DOUBLE PRECISION NOT NULL,
    "estimatedCtr" DOUBLE PRECISION NOT NULL,
    "estimatedConversionRate" DOUBLE PRECISION NOT NULL,
    "estimatedRevenue" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssumptionSet" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "defaultTopN" INTEGER NOT NULL DEFAULT 10,
    "recencyScore" DOUBLE PRECISION NOT NULL DEFAULT 0.9,
    "minPriorityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "highPriorityThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
    "revenuePerHighPriority" DOUBLE PRECISION NOT NULL DEFAULT 18.5,
    "openRate" DOUBLE PRECISION NOT NULL DEFAULT 0.3,
    "clickRate" DOUBLE PRECISION NOT NULL DEFAULT 0.08,
    "engageRate" DOUBLE PRECISION NOT NULL DEFAULT 0.04,
    "purchaseRate" DOUBLE PRECISION NOT NULL DEFAULT 0.012,
    "avgOrderValue" DOUBLE PRECISION NOT NULL DEFAULT 89,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssumptionSet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TestCell_campaignId_score_idx" ON "TestCell"("campaignId", "score");

-- CreateIndex
CREATE INDEX "AdPerformance_testCellId_recordedAt_idx" ON "AdPerformance"("testCellId", "recordedAt");

-- CreateIndex
CREATE INDEX "AcquisitionAuditLog_campaignId_createdAt_idx" ON "AcquisitionAuditLog"("campaignId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "InterestEdge_userId_entityId_source_key" ON "InterestEdge"("userId", "entityId", "source");

-- CreateIndex
CREATE UNIQUE INDEX "GeneratedMessage_campaignCandidateId_key" ON "GeneratedMessage"("campaignCandidateId");

-- AddForeignKey
ALTER TABLE "AdCreative" ADD CONSTRAINT "AdCreative_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "AcquisitionCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AudienceSegment" ADD CONSTRAINT "AudienceSegment_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "AcquisitionCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestCell" ADD CONSTRAINT "TestCell_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "AcquisitionCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestCell" ADD CONSTRAINT "TestCell_creativeId_fkey" FOREIGN KEY ("creativeId") REFERENCES "AdCreative"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestCell" ADD CONSTRAINT "TestCell_audienceId_fkey" FOREIGN KEY ("audienceId") REFERENCES "AudienceSegment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdPerformance" ADD CONSTRAINT "AdPerformance_testCellId_fkey" FOREIGN KEY ("testCellId") REFERENCES "TestCell"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetActivity" ADD CONSTRAINT "BudgetActivity_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "AcquisitionCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcquisitionAuditLog" ADD CONSTRAINT "AcquisitionAuditLog_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "AcquisitionCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityDelta" ADD CONSTRAINT "EntityDelta_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterestEdge" ADD CONSTRAINT "InterestEdge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterestEdge" ADD CONSTRAINT "InterestEdge_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignCandidate" ADD CONSTRAINT "CampaignCandidate_campaignRunId_fkey" FOREIGN KEY ("campaignRunId") REFERENCES "CampaignRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignCandidate" ADD CONSTRAINT "CampaignCandidate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignCandidate" ADD CONSTRAINT "CampaignCandidate_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignCandidate" ADD CONSTRAINT "CampaignCandidate_entityDeltaId_fkey" FOREIGN KEY ("entityDeltaId") REFERENCES "EntityDelta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedMessage" ADD CONSTRAINT "GeneratedMessage_campaignCandidateId_fkey" FOREIGN KEY ("campaignCandidateId") REFERENCES "CampaignCandidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignRun" ADD CONSTRAINT "CampaignRun_assumptionSetId_fkey" FOREIGN KEY ("assumptionSetId") REFERENCES "AssumptionSet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

