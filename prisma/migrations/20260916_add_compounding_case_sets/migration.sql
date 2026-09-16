-- Add lightweight CaseSet abstraction for Compounding Expertise experience provenance.

CREATE TABLE "CompoundingExpertiseCaseSet" (
  "id" TEXT NOT NULL,
  "analysisId" TEXT,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "sourceType" TEXT NOT NULL,
  "sourceSystemKey" TEXT,
  "sourceSystemLabel" TEXT,
  "sourceRunId" TEXT,
  "sourceRunLabel" TEXT,
  "sourceRunType" TEXT,
  "sourceRoute" TEXT,
  "sourceExternalUrl" TEXT,
  "generatedAt" TIMESTAMP(3),
  "importedAt" TIMESTAMP(3),
  "modelVersion" TEXT,
  "policyVersion" TEXT,
  "experimentId" TEXT,
  "isSynthetic" BOOLEAN NOT NULL DEFAULT false,
  "provenanceLabel" TEXT NOT NULL,
  "caseCount" INTEGER NOT NULL DEFAULT 0,
  "parentCaseSetId" TEXT,
  "derivationDescription" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CompoundingExpertiseCaseSet_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "CompoundingExpertiseCase"
  ADD COLUMN "caseSetId" TEXT;

CREATE INDEX "CompoundingExpertiseCaseSet_analysisId_createdAt_idx"
  ON "CompoundingExpertiseCaseSet"("analysisId", "createdAt");

CREATE INDEX "CompoundingExpertiseCaseSet_sourceType_sourceSystemKey_idx"
  ON "CompoundingExpertiseCaseSet"("sourceType", "sourceSystemKey");

CREATE INDEX "CompoundingExpertiseCaseSet_parentCaseSetId_idx"
  ON "CompoundingExpertiseCaseSet"("parentCaseSetId");

CREATE INDEX "CompoundingExpertiseCaseSet_isSynthetic_idx"
  ON "CompoundingExpertiseCaseSet"("isSynthetic");

CREATE INDEX "CompoundingExpertiseCase_caseSetId_decisionAt_idx"
  ON "CompoundingExpertiseCase"("caseSetId", "decisionAt");

ALTER TABLE "CompoundingExpertiseCaseSet"
  ADD CONSTRAINT "CompoundingExpertiseCaseSet_analysisId_fkey"
  FOREIGN KEY ("analysisId") REFERENCES "CompoundingExpertiseAnalysis"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CompoundingExpertiseCaseSet"
  ADD CONSTRAINT "CompoundingExpertiseCaseSet_parentCaseSetId_fkey"
  FOREIGN KEY ("parentCaseSetId") REFERENCES "CompoundingExpertiseCaseSet"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CompoundingExpertiseCase"
  ADD CONSTRAINT "CompoundingExpertiseCase_caseSetId_fkey"
  FOREIGN KEY ("caseSetId") REFERENCES "CompoundingExpertiseCaseSet"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
