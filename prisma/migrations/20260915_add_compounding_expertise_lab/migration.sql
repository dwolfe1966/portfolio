CREATE TYPE "CompoundingFramework" AS ENUM ('HELMER', 'SUN', 'WOLFE');
CREATE TYPE "CompoundingConfidence" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
CREATE TYPE "CompoundingEvidenceStatus" AS ENUM ('OBSERVED', 'SOURCED', 'ASSUMED', 'UNKNOWN');
CREATE TYPE "CompoundingDebateSource" AS ENUM ('SUN', 'WOLFE', 'USER', 'AI');

CREATE TABLE "CompoundingExpertiseAnalysis" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "accountUserId" TEXT,
    "companyName" TEXT NOT NULL,
    "productDescription" TEXT NOT NULL,
    "targetCustomer" TEXT NOT NULL,
    "workflow" TEXT NOT NULL,
    "decisionDescription" TEXT NOT NULL,
    "thesis" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompoundingExpertiseAnalysis_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CompoundingExpertiseKeyDebate" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "bullCase" TEXT NOT NULL,
    "bearCase" TEXT NOT NULL,
    "evidenceNeeded" TEXT NOT NULL,
    "increaseBelief" TEXT NOT NULL,
    "decreaseBelief" TEXT NOT NULL,
    "probability" INTEGER NOT NULL,
    "source" "CompoundingDebateSource" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompoundingExpertiseKeyDebate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CompoundingExpertiseDimensionAssessment" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "framework" "CompoundingFramework" NOT NULL,
    "dimension" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "confidence" "CompoundingConfidence" NOT NULL DEFAULT 'LOW',
    "rationale" TEXT NOT NULL,
    "evidenceStatus" "CompoundingEvidenceStatus" NOT NULL DEFAULT 'UNKNOWN',
    "source" "CompoundingDebateSource" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompoundingExpertiseDimensionAssessment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CompoundingExpertiseSimulationScenario" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startingCases" INTEGER NOT NULL,
    "casesPerMonth" DOUBLE PRECISION NOT NULL,
    "feedbackDelayDays" INTEGER NOT NULL,
    "transferability" DOUBLE PRECISION NOT NULL,
    "informationValue" DOUBLE PRECISION NOT NULL,
    "learningEfficiency" DOUBLE PRECISION NOT NULL,
    "stalenessRate" DOUBLE PRECISION NOT NULL,
    "baseCapability" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompoundingExpertiseSimulationScenario_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CompoundingExpertiseAnalysis_workspaceId_updatedAt_idx" ON "CompoundingExpertiseAnalysis"("workspaceId", "updatedAt");
CREATE INDEX "CompoundingExpertiseAnalysis_accountUserId_updatedAt_idx" ON "CompoundingExpertiseAnalysis"("accountUserId", "updatedAt");
CREATE INDEX "CompoundingExpertiseAnalysis_companyName_idx" ON "CompoundingExpertiseAnalysis"("companyName");
CREATE INDEX "CompoundingExpertiseKeyDebate_analysisId_updatedAt_idx" ON "CompoundingExpertiseKeyDebate"("analysisId", "updatedAt");
CREATE INDEX "CompoundingExpertiseKeyDebate_source_idx" ON "CompoundingExpertiseKeyDebate"("source");
CREATE UNIQUE INDEX "CompoundingExpertiseDimensionAssessment_analysisId_framework_dimension_key" ON "CompoundingExpertiseDimensionAssessment"("analysisId", "framework", "dimension");
CREATE INDEX "CompoundingExpertiseDimensionAssessment_analysisId_framework_idx" ON "CompoundingExpertiseDimensionAssessment"("analysisId", "framework");
CREATE INDEX "CompoundingExpertiseDimensionAssessment_evidenceStatus_idx" ON "CompoundingExpertiseDimensionAssessment"("evidenceStatus");
CREATE INDEX "CompoundingExpertiseSimulationScenario_analysisId_name_idx" ON "CompoundingExpertiseSimulationScenario"("analysisId", "name");

ALTER TABLE "CompoundingExpertiseAnalysis" ADD CONSTRAINT "CompoundingExpertiseAnalysis_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CompoundingExpertiseAnalysis" ADD CONSTRAINT "CompoundingExpertiseAnalysis_accountUserId_fkey" FOREIGN KEY ("accountUserId") REFERENCES "AccountUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CompoundingExpertiseKeyDebate" ADD CONSTRAINT "CompoundingExpertiseKeyDebate_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "CompoundingExpertiseAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CompoundingExpertiseDimensionAssessment" ADD CONSTRAINT "CompoundingExpertiseDimensionAssessment_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "CompoundingExpertiseAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CompoundingExpertiseSimulationScenario" ADD CONSTRAINT "CompoundingExpertiseSimulationScenario_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "CompoundingExpertiseAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;
