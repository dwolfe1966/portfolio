-- Add inspectable scorebook cases for Compounding Expertise Lab V0.1.1.

CREATE TYPE "CompoundingCaseGrade" AS ENUM ('CORRECT', 'PARTIALLY_CORRECT', 'INCORRECT', 'UNRESOLVED');

CREATE TABLE "CompoundingExpertiseCase" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "externalCaseId" TEXT NOT NULL,
    "customerSegment" TEXT NOT NULL,
    "caseType" TEXT NOT NULL,
    "context" TEXT NOT NULL,
    "agentDecision" TEXT NOT NULL,
    "agentConfidence" DOUBLE PRECISION,
    "humanDecision" TEXT,
    "humanOverride" BOOLEAN NOT NULL DEFAULT false,
    "actionTaken" TEXT,
    "outcome" TEXT,
    "outcomeValue" DOUBLE PRECISION,
    "grade" "CompoundingCaseGrade" NOT NULL DEFAULT 'UNRESOLVED',
    "gradeConfidence" DOUBLE PRECISION,
    "decisionAt" TIMESTAMP(3),
    "outcomeAt" TIMESTAMP(3),
    "isEdgeCase" BOOLEAN NOT NULL DEFAULT false,
    "isSynthetic" BOOLEAN NOT NULL DEFAULT true,
    "sourceLabel" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompoundingExpertiseCase_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CompoundingExpertiseCase_analysisId_decisionAt_idx" ON "CompoundingExpertiseCase"("analysisId", "decisionAt");
CREATE INDEX "CompoundingExpertiseCase_analysisId_grade_idx" ON "CompoundingExpertiseCase"("analysisId", "grade");
CREATE INDEX "CompoundingExpertiseCase_analysisId_customerSegment_idx" ON "CompoundingExpertiseCase"("analysisId", "customerSegment");
CREATE INDEX "CompoundingExpertiseCase_analysisId_caseType_idx" ON "CompoundingExpertiseCase"("analysisId", "caseType");
CREATE INDEX "CompoundingExpertiseCase_analysisId_humanOverride_idx" ON "CompoundingExpertiseCase"("analysisId", "humanOverride");
CREATE INDEX "CompoundingExpertiseCase_analysisId_isEdgeCase_idx" ON "CompoundingExpertiseCase"("analysisId", "isEdgeCase");
CREATE INDEX "CompoundingExpertiseCase_analysisId_isSynthetic_idx" ON "CompoundingExpertiseCase"("analysisId", "isSynthetic");

ALTER TABLE "CompoundingExpertiseCase"
  ADD CONSTRAINT "CompoundingExpertiseCase_analysisId_fkey"
  FOREIGN KEY ("analysisId") REFERENCES "CompoundingExpertiseAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;
